import { UserProfile, RepoStats, PRStats, IssueStats, CommitInfo } from '../types';
import { logger } from '../utils/logger';

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

    logger.debug("\n=== SCORING CALCULATION DEBUG ===\n");

    // --- A. Profile Health (20%) ---
    logger.debug("📊 A. PROFILE HEALTH (Max 20 points)");
    
    // 1. Followers (5pts)
    // 1. Followers (5pts)
    const followerScore = logScale(profile.followers, 1000) * 0.05;
    logger.debug(`  1. Followers: ${profile.followers}`);
    logger.debug(`     Formula: logScale(${profile.followers}, 1000) × 0.05`);
    logger.debug(`     Score: ${followerScore.toFixed(4)} / 5`);

    // 2. Organization Count (5pts)
    const orgScore = Math.min(profile.orgCount, 5);
    logger.debug(`  2. Organizations: ${profile.orgCount}`);
    logger.debug(`     Formula: min(${profile.orgCount}, 5)`);
    logger.debug(`     Score: ${orgScore.toFixed(4)} / 5`);

    // 3. Volume (10pts)
    const volumeScore = logScale(totalCommits, 10000) * 0.10;
    logger.debug(`  3. Commit Volume: ${totalCommits}`);
    logger.debug(`     Formula: logScale(${totalCommits}, 10000) × 0.10`);
    logger.debug(`     Score: ${volumeScore.toFixed(4)} / 10`);
    
    // Total Health Score (Sum of sub-scores, Max 20)
    const healthPoints = followerScore + orgScore + volumeScore;
    logger.debug(`  ➜ HEALTH TOTAL: ${healthPoints.toFixed(4)} / 20\n`);
    
    // --- B. Engineering Quality (80%) ---
    logger.debug("⚙️  B. ENGINEERING QUALITY (Max 100 points, scaled to 80)");
    
    // 1. Acceptance Rate (35 points)
    const closedPRs = prs.filter(p => p.state === 'closed');
    const mergedPRs = closedPRs.filter(p => p.merged);
    const acceptanceRate = closedPRs.length > 0 ? (mergedPRs.length / closedPRs.length) : 0;
    const acceptancePoints = acceptanceRate * 35;
    logger.debug(`  1. PR Acceptance Rate:`);
    logger.debug(`     Closed PRs: ${closedPRs.length} | Merged: ${mergedPRs.length}`);
    logger.debug(`     Rate: ${(acceptanceRate * 100).toFixed(2)}%`);
    logger.debug(`     Formula: (${mergedPRs.length} / ${closedPRs.length}) × 35`);
    logger.debug(`     Score: ${acceptancePoints.toFixed(4)} / 35`);

    // 2. Impact Score (35 points)
    const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);
    const impactPoints = logScale(totalStars, 5000) * 0.35;
    logger.debug(`  2. Impact (Stars):`);
    logger.debug(`     Total Stars: ${totalStars} (from ${repos.length} repos)`);
    logger.debug(`     Formula: logScale(${totalStars}, 5000) × 35`);
    logger.debug(`     Score: ${impactPoints.toFixed(4)} / 35`);

    // 3. Issues Solved (15 points)
    const closedIssues = issues.filter(i => i.state === 'closed').length;
    const issuesPoints = logScale(closedIssues, 50) * 0.15;
    logger.debug(`  3. Issues Solved:`);
    logger.debug(`     Closed Issues: ${closedIssues}`);
    logger.debug(`     Formula: logScale(${closedIssues}, 50) × 15`);
    logger.debug(`     Score: ${issuesPoints.toFixed(4)} / 15`);

    // 4. Commit Quality (15 points) - AI ANALYZED
    const atomicityPoints = aiCommitScore;
    logger.debug(`  4. Commit Quality (AI):`);
    logger.debug(`     AI Commit Score: ${aiCommitScore}`);
    logger.debug(`     Score: ${atomicityPoints.toFixed(4)} / 15`);
    
    // Total Engineering Score
    const qualityPoints = acceptancePoints + impactPoints + issuesPoints + atomicityPoints;
    logger.debug(`  ➜ QUALITY SUBTOTAL: ${qualityPoints.toFixed(4)} / 100`);
    
    const finalQuality = qualityPoints * 0.8;
    logger.debug(`  ➜ QUALITY SCALED (×0.8): ${finalQuality.toFixed(4)} / 80\n`);

    // --- Final Calculation ---
    logger.debug("🎯 FINAL CALCULATION:");
    let totalScore = healthPoints + finalQuality;
    logger.debug(`  Base Score: ${healthPoints.toFixed(4)} + ${finalQuality.toFixed(4)} = ${totalScore.toFixed(4)}`);
    
    // Apply AI Multiplier
    logger.debug(`  AI Multiplier: ${aiMultiplier}x`);
    totalScore = totalScore * aiMultiplier;
    logger.debug(`  After Multiplier: ${totalScore.toFixed(4)}`);
    
    // Cap at 100
    const finalScore = Math.min(Math.round(totalScore), 100);
    logger.debug(`  Final (rounded & capped): ${finalScore} / 100`);
    logger.debug("\n=================================\n");

    return {
        total: finalScore,
        health: { count: healthPoints, score: healthPoints },
        quality: { count: qualityPoints, score: finalQuality },
        details: {
            volume: volumeScore * 100,
            acceptance: acceptancePoints,
            impact: impactPoints,
            issues: issuesPoints,
            commits: atomicityPoints
        }
    };
};
