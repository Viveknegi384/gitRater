import * as github from './github';
import * as scoring from './scoring';
import * as ai from './ai';
import pool from '../db';
import { logger } from '../utils/logger';
import { recordSearchHistory } from './database';

export const getOrCalculateRating = async (username: string, userId?: string, jobDescription?: string) => {
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

                // Record search history if user provided
                if (userId) {
                    await recordSearchHistory(userId, username);
                }

                return {
                    cached: true,
                    lastUpdated: cachedProfile.last_updated,
                    data: formatResponse(cachedProfile, rating, aiAnalysis)
                };
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

    logger.info(`Fetched ${repos.length} repos, ${totalCommits} total commits.`);
    logger.debug(`Recent commits fetched: ${recentCommits.length}`);
    logger.debug(`PRs fetched: ${prs.length} (merged: ${prs.filter(p => p.merged).length})`);

    // 2. Prepare Data for AI - Fetch detailed PR info with reviews
    logger.info("Fetching detailed PR information with reviews...");
    const prDetailsWithReviews = await github.fetchPRDetailsForAI(prs);
    logger.debug(`PR details prepared for AI: ${prDetailsWithReviews.length}`);
    
    const commitLogs = recentCommits.slice(0, 20).map(c => `${c.date}: ${c.message}`);
    logger.debug(`Commit logs prepared for AI: ${commitLogs.length}`);

    // 3. Run AI Analysis
    logger.info("Running AI Analysis with PR reviews and commit quality...");
    const aiResult = await ai.analyzeProfile(username, prDetailsWithReviews, commitLogs, jobDescription);

    // 4. Calculate Score
    logger.info("Calculating Score...");
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

        // Record search history if user provided
        if (userId) {
            await recordSearchHistory(userId, profile.username);
        }

        logger.info(`Saved rating for ${username} to database`);
    } catch (dbError) {
        logger.error('Database save error:', dbError);
        // Continue even if DB save fails
    }

    // Construct response object
    // mimicking the structure expected by frontend (which matches cachedProfile structure + rating)
    const metrics = {
        followers: profile.followers,
        public_repos: profile.publicRepos,
        total_commits: totalCommits,
        total_stars: repos.reduce((sum, r) => sum + r.stars, 0),
        merged_prs: mergedPRs.length,
        pr_acceptance_rate: acceptanceRate,
        issues_closed: issuesClosed,
        language_breadth: languageBreadth
    };
    
    // Create a synthetic cached profile object to reuse formatResponse
    const syntheticProfile = {
        username: profile.username,
        name: profile.name,
        avatar_url: profile.avatarUrl,
        bio: profile.bio,
        location: profile.location,
        email: profile.email,
        blog: profile.blog,
        twitter_username: profile.twitterUsername,
        company: profile.company,
        metrics: metrics
    };

    const ratingData = {
        total_score: scoreBreakdown.total,
        health_score: scoreBreakdown.health.score,
        quality_score: scoreBreakdown.quality.score,
        ai_analysis: aiResult
    };

    return {
        cached: false,
        data: formatResponse(syntheticProfile, ratingData, aiResult)
    };
};

function formatResponse(profile: any, rating: any, aiAnalysis: any) {
    return {
        username: profile.username,
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        location: profile.location,
        email: profile.email,
        blog: profile.blog,
        twitter_username: profile.twitter_username,
        company: profile.company,
        followers: profile.metrics?.followers || 0,
        following: 0,
        public_repos: profile.metrics?.public_repos || 0,
        total_commits: profile.metrics?.total_commits || 0,
        total_stars: profile.metrics?.total_stars || 0,
        merged_prs: profile.metrics?.merged_prs || 0,
        pr_acceptance_rate: profile.metrics?.pr_acceptance_rate || 0,
        issues_closed: profile.metrics?.issues_closed || 0,
        language_breadth: profile.metrics?.language_breadth || 0,
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
    };
}

function getTier(score: number): string {
    const { TIER_THRESHOLDS } = require('../constants/scoring');
    if (score >= TIER_THRESHOLDS.LEGENDARY) return "Legendary";
    if (score >= TIER_THRESHOLDS.ELITE) return "Elite";
    if (score >= TIER_THRESHOLDS.SENIOR) return "Senior";
    if (score >= TIER_THRESHOLDS.MID_LEVEL) return "Mid-Level";
    return "Junior";
}
