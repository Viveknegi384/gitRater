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

    console.log("\n=== SCORING CALCULATION DEBUG ===\n");

    // --- A. Profile Health (20%) ---
    console.log("📊 A. PROFILE HEALTH (Max 20 points)");
    
    // 1. Followers (5pts)
    const followerScore = logScale(profile.followers, 1000) * 0.05;
    console.log(`  1. Followers: ${profile.followers}`);
    console.log(`     Formula: logScale(${profile.followers}, 1000) × 0.05`);
    console.log(`     Score: ${followerScore.toFixed(4)} / 5`);

    // 2. Organization Count (5pts)
    const orgScore = Math.min(profile.orgCount, 5);
    console.log(`  2. Organizations: ${profile.orgCount}`);
    console.log(`     Formula: min(${profile.orgCount}, 5)`);
    console.log(`     Score: ${orgScore.toFixed(4)} / 5`);

    // 3. Volume (10pts)
    const volumeScore = logScale(totalCommits, 10000) * 0.10;
    console.log(`  3. Commit Volume: ${totalCommits}`);
    console.log(`     Formula: logScale(${totalCommits}, 10000) × 0.10`);
    console.log(`     Score: ${volumeScore.toFixed(4)} / 10`);
    
    // Total Health Score (Sum of sub-scores, Max 20)
    const healthPoints = followerScore + orgScore + volumeScore;
    console.log(`  ➜ HEALTH TOTAL: ${healthPoints.toFixed(4)} / 20\n`);
    
    // --- B. Engineering Quality (80%) ---
    console.log("⚙️  B. ENGINEERING QUALITY (Max 100 points, scaled to 80)");
    
    // 1. Acceptance Rate (35 points)
    const closedPRs = prs.filter(p => p.state === 'closed');
    const mergedPRs = closedPRs.filter(p => p.merged);
    const acceptanceRate = closedPRs.length > 0 ? (mergedPRs.length / closedPRs.length) : 0;
    const acceptancePoints = acceptanceRate * 35;
    console.log(`  1. PR Acceptance Rate:`);
    console.log(`     Closed PRs: ${closedPRs.length} | Merged: ${mergedPRs.length}`);
    console.log(`     Rate: ${(acceptanceRate * 100).toFixed(2)}%`);
    console.log(`     Formula: (${mergedPRs.length} / ${closedPRs.length}) × 35`);
    console.log(`     Score: ${acceptancePoints.toFixed(4)} / 35`);

    // 2. Impact Score (35 points)
    const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);
    const impactPoints = logScale(totalStars, 5000) * 0.35;
    console.log(`  2. Impact (Stars):`);
    console.log(`     Total Stars: ${totalStars} (from ${repos.length} repos)`);
    console.log(`     Formula: logScale(${totalStars}, 5000) × 35`);
    console.log(`     Score: ${impactPoints.toFixed(4)} / 35`);

    // 3. Issues Solved (15 points)
    const closedIssues = issues.filter(i => i.state === 'closed').length;
    const issuesPoints = logScale(closedIssues, 50) * 0.15;
    console.log(`  3. Issues Solved:`);
    console.log(`     Closed Issues: ${closedIssues}`);
    console.log(`     Formula: logScale(${closedIssues}, 50) × 15`);
    console.log(`     Score: ${issuesPoints.toFixed(4)} / 15`);

    // 4. Commit Quality (15 points) - AI ANALYZED
    const atomicityPoints = aiCommitScore;
    console.log(`  4. Commit Quality (AI):`);
    console.log(`     AI Commit Score: ${aiCommitScore}`);
    console.log(`     Score: ${atomicityPoints.toFixed(4)} / 15`);
    
    // Total Engineering Score
    const qualityPoints = acceptancePoints + impactPoints + issuesPoints + atomicityPoints;
    console.log(`  ➜ QUALITY SUBTOTAL: ${qualityPoints.toFixed(4)} / 100`);
    
    const finalQuality = qualityPoints * 0.8;
    console.log(`  ➜ QUALITY SCALED (×0.8): ${finalQuality.toFixed(4)} / 80\n`);

    // --- Final Calculation ---
    console.log("🎯 FINAL CALCULATION:");
    let totalScore = healthPoints + finalQuality;
    console.log(`  Base Score: ${healthPoints.toFixed(4)} + ${finalQuality.toFixed(4)} = ${totalScore.toFixed(4)}`);
    
    // Apply AI Multiplier
    console.log(`  AI Multiplier: ${aiMultiplier}x`);
    totalScore = totalScore * aiMultiplier;
    console.log(`  After Multiplier: ${totalScore.toFixed(4)}`);
    
    // Cap at 100
    const finalScore = Math.min(Math.round(totalScore), 100);
    console.log(`  Final (rounded & capped): ${finalScore} / 100`);
    console.log("\n=================================\n");

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
