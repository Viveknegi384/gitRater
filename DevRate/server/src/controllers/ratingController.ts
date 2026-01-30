import { Response } from 'express';
import * as github from '../services/github';
import * as scoring from '../services/scoring';
import * as ai from '../services/ai';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { recordSearchHistory } from '../services/database';


export const getRating = async (req: AuthRequest, res: Response): Promise<void> => {
    const username = req.params.username as string;

    if (!username) {
        res.status(400).json({ success: false, error: 'Username is required' });
        return;
    }


    try {
        // Check if profile exists and when it was last updated
        const profileResult = await pool.query(
            `SELECT username, name, avatar_url, bio, metrics, location, blog, twitter_username, company, email, last_updated 
             FROM github_profiles 
             WHERE username = $1`,
            [username]
        );

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // If profile exists and was updated within 24 hours, return cached data
        if (profileResult.rows.length > 0) {
            const cachedProfile = profileResult.rows[0];
            const lastUpdated = new Date(cachedProfile.last_updated);

            if (lastUpdated > twentyFourHoursAgo) {
                logger.info(`Returning cached data for ${username} (last updated: ${lastUpdated.toISOString()})`);

                // Get the latest rating for this profile
                const ratingResult = await pool.query(
                    `SELECT total_score, health_score, quality_score, breakdown, ai_analysis, created_at
                     FROM ratings 
                     WHERE username = $1 
                     ORDER BY created_at DESC 
                     LIMIT 1`,
                    [username]
                );

                if (ratingResult.rows.length > 0) {
                    const rating = ratingResult.rows[0];
                    const aiAnalysis = rating.ai_analysis;

                    // Record search history
                    if (req.user?.userId) {
                        await recordSearchHistory(req.user.userId, username);
                    }

                    res.json({
                        success: true,
                        message: 'Profile data retrieved from cache (updated within 24 hours)',
                        cached: true,
                        lastUpdated: cachedProfile.last_updated,
                        data: {
                            username: cachedProfile.username,
                            name: cachedProfile.name,
                            avatar_url: cachedProfile.avatar_url,
                            bio: cachedProfile.bio,
                            location: cachedProfile.location,
                            email: cachedProfile.email,
                            blog: cachedProfile.blog,
                            twitter_username: cachedProfile.twitter_username,
                            company: cachedProfile.company,
                            followers: cachedProfile.metrics?.followers || 0,
                            following: 0,
                            public_repos: cachedProfile.metrics?.public_repos || 0,
                            total_commits: cachedProfile.metrics?.total_commits || 0,
                            total_stars: cachedProfile.metrics?.total_stars || 0,
                            merged_prs: cachedProfile.metrics?.merged_prs || 0,
                            pr_acceptance_rate: cachedProfile.metrics?.pr_acceptance_rate || 0,
                            issues_closed: cachedProfile.metrics?.issues_closed || 0,
                            language_breadth: cachedProfile.metrics?.language_breadth || 0,
                            developer_impact_score: rating.total_score,
                            tier: getTier(rating.total_score),
                            score_breakdown: {
                                health_score: rating.health_score,
                                quality_score: rating.quality_score,
                                ai_score: aiAnalysis?.commitScore || 0
                            },
                            ai_analysis: {
                                summary: aiAnalysis?.summary || '',
                                persona: aiAnalysis?.persona || ''
                            }
                        }
                    });
                    return;
                }
            }
        }

        // Profile doesn't exist or is older than 24 hours - fetch fresh data from GitHub
        logger.info(`Fetching fresh data for ${username} from GitHub...`);
        
        // 1. Fetch Data in Parallel
        const [profile, repos, prs, issues, recentCommits, totalCommits] = await Promise.all([
            github.fetchUserProfile(username),
            github.fetchUserRepos(username),
            github.fetchRecentPRs(username),
            github.fetchResolvedIssues(username),
            github.fetchRecentCommits(username),
            github.fetchTotalCommits(username)
        ]);

        console.log(`Fetched ${repos.length} repos, ${totalCommits} total commits.`);
        console.log(`DEBUG: Recent commits fetched: ${recentCommits.length}`);
        console.log(`DEBUG: PRs fetched: ${prs.length} (merged: ${prs.filter(p => p.merged).length})`);

        // 2. Prepare Data for AI - Fetch detailed PR info with reviews
        console.log("Fetching detailed PR information with reviews...");
        const prDetailsWithReviews = await github.fetchPRDetailsForAI(prs);
        console.log(`DEBUG: PR details prepared for AI: ${prDetailsWithReviews.length}`);
        
        const commitLogs = recentCommits.slice(0, 20).map(c => `${c.date}: ${c.message}`);
        console.log(`DEBUG: Commit logs prepared for AI: ${commitLogs.length}`);

        // 3. Run AI Analysis
        console.log("Running AI Analysis with PR reviews and commit quality...");
        const aiResult = await ai.analyzeProfile(username, prDetailsWithReviews, commitLogs);

        // 4. Calculate Score
        console.log("Calculating Score...");
        const scoreBreakdown = scoring.calculateScore(
            profile, 
            repos, 
            prs, 
            issues, 
            recentCommits,
            totalCommits,
            aiResult.multiplier,
            aiResult.commitScore
        );

        // 5. Calculate additional metrics for frontend
        const closedPRs = prs.filter(p => p.state === 'closed');
        const mergedPRs = closedPRs.filter(p => p.merged);
        const acceptanceRate = closedPRs.length > 0 ? (mergedPRs.length / closedPRs.length) * 100 : 0;
        const issuesClosed = issues.filter(i => i.state === 'closed').length;
        
        // Calculate language breadth (unique languages from repos)
        const uniqueLanguages = new Set(repos.map(r => r.language).filter(l => l));
        const languageBreadth = uniqueLanguages.size;

        // 6. Save to database
        try {
            // Upsert GitHub profile
            await pool.query(
                `INSERT INTO github_profiles (username, name, avatar_url, bio, metrics, location, blog, twitter_username, company, email, last_updated)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
                 ON CONFLICT (username) 
                 DO UPDATE SET 
                    name = EXCLUDED.name,
                    avatar_url = EXCLUDED.avatar_url,
                    bio = EXCLUDED.bio,
                    metrics = EXCLUDED.metrics,
                    location = EXCLUDED.location,
                    blog = EXCLUDED.blog,
                    twitter_username = EXCLUDED.twitter_username,
                    company = EXCLUDED.company,
                    email = EXCLUDED.email,
                    last_updated = CURRENT_TIMESTAMP`,
                [
                    profile.username,
                    profile.name,
                    profile.avatarUrl,
                    profile.bio,
                    JSON.stringify({
                        followers: profile.followers,
                        public_repos: profile.publicRepos,
                        total_commits: totalCommits,
                        total_stars: repos.reduce((sum, r) => sum + r.stars, 0),
                        merged_prs: mergedPRs.length,
                        pr_acceptance_rate: acceptanceRate,
                        issues_closed: issuesClosed,
                        language_breadth: languageBreadth
                    }),
                    profile.location,
                    profile.blog,
                    profile.twitterUsername,
                    profile.company,
                    profile.email
                ]
            );

            // Insert rating
            await pool.query(
                `INSERT INTO ratings (username, total_score, health_score, quality_score, breakdown, ai_analysis)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    profile.username,
                    scoreBreakdown.total,
                    scoreBreakdown.health.score,
                    scoreBreakdown.quality.score,
                    JSON.stringify(scoreBreakdown),
                    JSON.stringify(aiResult)
                ]
            );

            // Record search history (auth is compulsory)
            if (!req.user?.userId) {
                throw new Error('User ID is required');
            }
            await recordSearchHistory(req.user.userId, profile.username);

            logger.info(`Saved rating for ${username} to database`);
        } catch (dbError) {
            logger.error('Database save error:', dbError);
            // Continue even if DB save fails
        }

        // 7. Return Response
        res.json({
            success: true,
            message: 'Profile rating calculated and saved successfully',
            cached: false,
            data: {
                username: profile.username,
                name: profile.name,
                avatar_url: profile.avatarUrl,
                bio: profile.bio,
                location: profile.location,
                email: profile.email,
                blog: profile.blog,
                twitter_username: profile.twitterUsername,
                company: profile.company,
                followers: profile.followers,
                following: 0, // UserProfile doesn't have following
                public_repos: profile.publicRepos,
                total_commits: totalCommits,
                total_stars: repos.reduce((sum, r) => sum + r.stars, 0),
                merged_prs: mergedPRs.length,
                pr_acceptance_rate: acceptanceRate,
                issues_closed: issuesClosed,
                language_breadth: languageBreadth,
                developer_impact_score: scoreBreakdown.total,
                tier: getTier(scoreBreakdown.total),
                score_breakdown: {
                    health_score: scoreBreakdown.health.score,
                    quality_score: scoreBreakdown.quality.score,
                    ai_score: aiResult.commitScore
                },
                ai_analysis: {
                    summary: aiResult.summary,
                    persona: aiResult.persona
                }
            }
        });

    } catch (error: any) {
        console.error('Error in getRating:', error);
        
        if (error.status === 403 || error.status === 429) {
            res.status(429).json({ 
                success: false,
                error: "GitHub API Rate Limit Exceeded. Please try again later.",
                retryAfter: error.response?.headers?.['retry-after'] || 3600
            });
            return;
        }

        if (error.status === 404) {
            res.status(404).json({ success: false, error: `GitHub user '${username}' not found` });
            return;
        }

        res.status(500).json({ success: false, error: 'Failed to calculate rating' });
    }
};

function getTier(score: number): string {
    const { TIER_THRESHOLDS } = require('../constants/scoring');
    if (score >= TIER_THRESHOLDS.LEGENDARY) return "Legendary";
    if (score >= TIER_THRESHOLDS.ELITE) return "Elite";
    if (score >= TIER_THRESHOLDS.SENIOR) return "Senior";
    if (score >= TIER_THRESHOLDS.MID_LEVEL) return "Mid-Level";
    return "Junior";
}

