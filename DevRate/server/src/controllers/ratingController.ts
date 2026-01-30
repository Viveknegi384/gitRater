import { Request, Response } from 'express';
import * as github from '../services/github';
import * as scoring from '../services/scoring';
import * as ai from '../services/ai';

export const getRating = async (req: Request, res: Response) => {
    const username = req.params.username as string;

    if (!username) {
        res.status(400).json({ error: 'Username is required' });
        return; // Ensure function execution stops here
    }

    try {
        console.log(`Fetching data for ${username}...`);
        
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

        // 2. Prepare Data for AI
        // We only send a sample to save tokens
        const prSummaries = prs.slice(0, 5).map(p => `PR #${p.number}: ${p.title} (Merged: ${p.merged})`);
        const commitLogs = recentCommits.slice(0, 20).map(c => `${c.date}: ${c.message}`);

        // 3. Run AI Analysis
        console.log("Running AI Analysis...");
        const aiResult = await ai.analyzeProfile(username, prSummaries, commitLogs);

        // 4. Calculate Score
        console.log("Calculating Score...");
        const scoreBreakdown = scoring.calculateScore(
            profile, 
            repos, 
            prs, 
            issues, 
            recentCommits,
            totalCommits,
            aiResult.multiplier, // 0.8 to 1.2
            aiResult.commitScore // 0 to 15 (AI analyzed)
        );

        // 5. Construct Response
        const responseCallback = {
            username: profile.username,
            avatar: profile.avatarUrl,
            name: profile.name,
            rating: scoreBreakdown.total,
            tier: getTier(scoreBreakdown.total),
            breakdown: scoreBreakdown,
            ai: {
                persona: aiResult.persona,
                summary: aiResult.summary,
                multiplier: aiResult.multiplier
            }
        };

        res.json(responseCallback);

    } catch (error: any) {
        console.error("Error generating rating:", error);
        // Handle Rate Limits specifically
        if (error.status === 403) {
            res.status(403).json({ error: "GitHub API Rate Limit Exceeded. Please try again later." });
            return; // Ensure function execution stops here
        }
        res.status(500).json({ error: "Failed to generate rating", details: error.message });
        return; // Ensure function execution stops here
    }
};

function getTier(score: number): string {
    if (score >= 90) return "Legendary";
    if (score >= 75) return "Elite";
    if (score >= 60) return "Senior";
    if (score >= 40) return "Mid-Level";
    return "Junior";
}
