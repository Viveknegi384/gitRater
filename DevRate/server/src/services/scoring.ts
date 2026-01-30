import { UserProfile, RepoStats, PRStats, IssueStats, CommitInfo } from '../types';

export interface ScoreBreakdown {
    total: number;
    health: { count: number; score: number };
    quality: { count: number; score: number }; // Breakdown inside?
    details: {
        volume: number;
        acceptance: number;
        impact: number;
        issues: number;
        commits: number;
    }
}

// Helper: Logarithmic scaling to cap runaway numbers
// log10(1) = 0, log10(10)=1, log10(100)=2... 
// We want 1000 commits to be "Great" (10/10 points for that sub-metric)
function logScale(value: number, maxExpected: number): number {
    if (value <= 0) return 0;
    const logVal = Math.log10(value);
    const logMax = Math.log10(maxExpected);
    return Math.min((logVal / logMax) * 100, 100);
}

export const calculateScore = (
    profile: UserProfile, 
    repos: RepoStats[], 
    prs: PRStats[], 
    issues: IssueStats[],
    commits: CommitInfo[],
    totalCommits: number,
    aiMultiplier: number,
    aiCommitScore: number
): ScoreBreakdown => {

    // --- A. Profile Health (20%) ---
    // 1. Followers (5pts)
    const followerScore = logScale(profile.followers, 1000) * 0.05; 

    // 2. Organization Count (5pts)
    const orgScore = Math.min(profile.orgCount, 5); 

    // 3. Volume (10pts)
    // Using REAL total commits now. 
    // 100 commits -> log10(100)=2. log10(10000)=4. Score = 2/4 * 10 = 5 pts.
    // 1000 commits -> 3/4 * 10 = 7.5 pts.
    // 10000 commits -> 10 pts.
    const volumeScore = logScale(totalCommits, 10000) * 0.10;
    
    // Total Health Score (Sum of sub-scores, Max 20)
    const healthPoints = followerScore + orgScore + volumeScore;
    
    // --- B. Engineering Quality (80%) ---
    
    // 1. Acceptance Rate (35 points)
    const closedPRs = prs.filter(p => p.state === 'closed');
    const mergedPRs = closedPRs.filter(p => p.merged);
    const acceptanceRate = closedPRs.length > 0 ? (mergedPRs.length / closedPRs.length) : 0;
    const acceptancePoints = acceptanceRate * 35;

    // 2. Impact Score (35 points)
    // Sum of Log(Stars) for repos we contributed PRs to.
    const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);
    const impactPoints = logScale(totalStars, 5000) * 0.35; // Target 5k stars for max points.

    // 3. Issues Solved (15 points)
    // Target: 50 issues closed
    const issuesPoints = logScale(issues.filter(i => i.state === 'closed').length, 50) * 0.15;

    // 4. Commit Quality (15 points) - AI ANALYZED
    // We use the score directly from Gemini (0-15)
    // It checks for standards (feat: fix:) and atomicity.
    const atomicityPoints = aiCommitScore;
    
    // Total Engineering Score
    const qualityPoints = acceptancePoints + impactPoints + issuesPoints + atomicityPoints;

    // --- Final Calculation ---
    // Health (Max 20) + Quality (Max 100 -> Scaled to 80?) 
    // Wait, the weights were percentages of the FINAL score.
    // Health = 20 pts max.
    // Quality = 80 pts max.
    
    // Re-sum points:
    // Health: 5 (Followers) + 5 (Repos) + 10 (Volume) = 20.
    // Quality: 35 (Accept) + 35 (Impact) + 15 (Issues) + 15 (Commits) = 100.
    // Wait, 35+35+15+15 = 100. 
    // So Quality needs to be scaled by 0.8? Or did we mean 35% of the TOTAL?
    
    // Implementation Plan said:
    // A. Profile Health (20%)
    // B. Engineering Quality (80%) -> items inside sum to 100% of this section?
    // Let's assume the breakdown inside Quality sums to 100, then we multiply by 0.8.
    
    const finalQuality = qualityPoints * 0.8; 
    
    let totalScore = healthPoints + finalQuality;
    
    // Apply AI Multiplier
    totalScore = totalScore * aiMultiplier;
    
    // Cap at 100
    totalScore = Math.min(Math.round(totalScore), 100);

    return {
        total: totalScore,
        health: { count: healthPoints, score: healthPoints },
        quality: { count: qualityPoints, score: finalQuality },
        details: {
            volume: volumeScore * 100,
            acceptance: acceptancePoints, // Scaled to 35
            impact: impactPoints,
            issues: issuesPoints,
            commits: atomicityPoints
        }
    };
};
