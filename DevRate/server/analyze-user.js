const https = require('https');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const username = process.argv[2] || 'pavankumar07s';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function httpsGet(url, token) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'GitRater-Analysis',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function analyzeUser(username) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`   GITHUB DEVELOPER ANALYSIS: ${username}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        // Note: This requires authentication, so we'll call the GitHub API directly
        const githubToken = process.env.GITHUB_TOKEN;

        if (!githubToken) {
            console.error('❌ Error: GITHUB_TOKEN not found in environment variables');
            console.log('Please set your GitHub token in .env file\n');
            return;
        }

        console.log('📊 Fetching data from GitHub...\n');

        // Fetch user profile
        const profile = await httpsGet(`https://api.github.com/users/${username}`, githubToken);

        // Fetch repos
        const repos = await httpsGet(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, githubToken);

        // Fetch PRs
        const prsData = await httpsGet(`https://api.github.com/search/issues?q=author:${username}+type:pr+is:public&per_page=100`, githubToken);
        const prs = prsData.items;

        // Fetch issues
        const issuesData = await httpsGet(`https://api.github.com/search/issues?q=assignee:${username}+type:issue+state:closed+is:public&per_page=50`, githubToken);
        const issues = issuesData.items;

        // Fetch total commits
        const commitsOptions = {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'GitRater-Analysis',
                'Accept': 'application/vnd.github.cloak-preview'
            }
        };

        let totalCommits = 0;
        try {
            const commitsData = await httpsGet(`https://api.github.com/search/commits?q=author:${username}&per_page=1`, githubToken);
            totalCommits = commitsData.total_count;
        } catch (e) {
            console.log('Note: Could not fetch commit count');
        }

        // Fetch recent commit messages for AI analysis
        let recentCommits = [];
        try {
            const eventsData = await httpsGet(`https://api.github.com/users/${username}/events/public?per_page=100`, githubToken);
            recentCommits = eventsData
                .filter(e => e.type === 'PushEvent' && e.payload?.commits)
                .flatMap(e => e.payload.commits.map(c => `${e.created_at.split('T')[0]}: ${c.message}`))
                .slice(0, 30);
        } catch (e) {
            console.log('Note: Could not fetch recent commits for AI analysis');
        }

        // Calculate metrics
        const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
        const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
        const languages = new Set(repos.map(r => r.language).filter(l => l));

        const closedPRs = prs.filter(pr => pr.state === 'closed');
        const mergedPRs = closedPRs.filter(pr => pr.pull_request?.merged_at);
        const acceptanceRate = closedPRs.length > 0 ? (mergedPRs.length / closedPRs.length * 100) : 0;

        // Run AI Analysis
        console.log('🤖 Running AI Analysis...\n');
        let aiResult = {
            multiplier: 1.0,
            persona: 'The Pragmatist',
            summary: 'AI Analysis unavailable',
            commitScore: 10
        };

        if (process.env.GEMINI_API_KEY && recentCommits.length > 0) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

                const prSummaries = prs.slice(0, 5).map(pr => `PR #${pr.number}: ${pr.title} (${pr.state})`);

                const prompt = `
You are a Senior Engineering Manager evaluating a developer profile.

**Developer**: ${username}

**Recent PR Activity**:
${prSummaries.join('\n')}

**Recent Commit Messages**:
${recentCommits.join('\n')}

**Task**:
1. Evaluate the "Engineering Quality Multiplier" (0.8 = Amateur/Spam, 1.0 = Average, 1.2 = Exceptional).
2. Assign a "Persona Title" (e.g., "The Architect", "The Bug Slayer", "The Full-Stack Wizard").
3. Write a 2-sentence summary of their coding style.
4. **Commit Quality Score (0-15)**: Evaluate commit messages:
   - Follow conventions (feat:, fix:, etc.)? 
   - Atomic and descriptive?
   - Good practices vs chaotic ("fix", "update")?

**Output JSON only**:
{
    "multiplier": 1.05,
    "persona": "The Code Craftsperson",
    "summary": "Writes clean, atomic commits with clear purpose.",
    "commitScore": 12
}`;

                const result = await model.generateContent(prompt);
                const text = result.response.text();
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                aiResult = JSON.parse(cleanText);
                console.log('✅ AI Analysis Complete\n');
            } catch (e) {
                console.log('⚠️  AI Analysis failed, using defaults\n');
            }
        } else {
            console.log('⚠️  Skipping AI Analysis (No API key or commits)\n');
        }

        // Display Profile Info
        console.log('👤 PROFILE INFORMATION');
        console.log('─'.repeat(60));
        console.log(`Name:           ${profile.name || 'N/A'}`);
        console.log(`Username:       @${profile.login}`);
        console.log(`Bio:            ${profile.bio || 'N/A'}`);
        console.log(`Location:       ${profile.location || 'N/A'}`);
        console.log(`Company:        ${profile.company || 'N/A'}`);
        console.log(`Blog:           ${profile.blog || 'N/A'}`);
        console.log(`Twitter:        ${profile.twitter_username ? '@' + profile.twitter_username : 'N/A'}`);
        console.log(`Created:        ${new Date(profile.created_at).toLocaleDateString()}`);
        console.log();

        // Display AI Analysis
        console.log('🤖 AI ANALYSIS');
        console.log('─'.repeat(60));
        console.log(`Persona:        ${aiResult.persona}`);
        console.log(`Summary:        ${aiResult.summary}`);
        console.log(`Quality Score:  ${aiResult.commitScore}/15`);
        console.log(`Multiplier:     ${aiResult.multiplier}x`);
        console.log();

        // Display Key Metrics
        console.log('📈 KEY METRICS');
        console.log('─'.repeat(60));
        console.log(`Followers:                    ${profile.followers}`);
        console.log(`Following:                    ${profile.following}`);
        console.log(`Public Repos:                 ${profile.public_repos}`);
        console.log(`Total Commits (All-time):     ${totalCommits}`);
        console.log(`Total Stars Earned:           ${totalStars}`);
        console.log(`Total Forks:                  ${totalForks}`);
        console.log(`Language Breadth:             ${languages.size} languages`);
        console.log(`Languages: ${Array.from(languages).slice(0, 10).join(', ')}`);
        console.log();

        // Display PR/Issue Metrics
        console.log('🔧 CONTRIBUTION METRICS');
        console.log('─'.repeat(60));
        console.log(`Total PRs Created:            ${prs.length}`);
        console.log(`Merged PRs:                   ${mergedPRs.length}`);
        console.log(`Closed PRs:                   ${closedPRs.length}`);
        console.log(`PR Acceptance Rate:           ${acceptanceRate.toFixed(1)}%`);
        console.log(`Issues Closed (Assigned):     ${issues.length}`);
        console.log();

        // Calculate estimated score
        console.log('🎯 ESTIMATED DEVELOPER IMPACT SCORE');
        console.log('─'.repeat(60));

        // Profile Health (20 points)
        const followerScore = Math.min((Math.log10(profile.followers || 1) / Math.log10(1000)) * 5, 5);
        const orgScore = Math.min(profile.public_repos > 0 ? 5 : 0, 5);
        const volumeScore = Math.min((Math.log10(totalCommits || 1) / Math.log10(10000)) * 10, 10);
        const healthScore = followerScore + orgScore + volumeScore;

        console.log(`Profile Health (20 max):      ${healthScore.toFixed(2)}`);
        console.log(`  - Followers:                ${followerScore.toFixed(2)}/5`);
        console.log(`  - Activity:                 ${orgScore.toFixed(2)}/5`);
        console.log(`  - Commit Volume:            ${volumeScore.toFixed(2)}/10`);
        console.log();

        // Engineering Quality (80 points before scaling)
        const acceptancePoints = (acceptanceRate / 100) * 35;
        const impactPoints = Math.min((Math.log10(totalStars || 1) / Math.log10(5000)) * 35, 35);
        const issuesPoints = Math.min((Math.log10(issues.length || 1) / Math.log10(50)) * 15, 15);
        const aiPoints = aiResult.commitScore; // Using actual AI score

        const qualityScore = (acceptancePoints + impactPoints + issuesPoints + aiPoints) * 0.8;

        console.log(`Engineering Quality (80 max): ${qualityScore.toFixed(2)}`);
        console.log(`  - PR Acceptance:            ${acceptancePoints.toFixed(2)}/35 (×0.8)`);
        console.log(`  - Impact (Stars):           ${impactPoints.toFixed(2)}/35 (×0.8)`);
        console.log(`  - Issues Solved:            ${issuesPoints.toFixed(2)}/15 (×0.8)`);
        console.log(`  - Commit Quality (AI):      ${aiPoints.toFixed(2)}/15 (×0.8)`);
        console.log();

        const subtotal = healthScore + qualityScore;
        const estimatedScore = Math.min(Math.round(subtotal * aiResult.multiplier), 100);
        const tier = estimatedScore >= 90 ? 'Legendary' :
            estimatedScore >= 75 ? 'Elite' :
                estimatedScore >= 60 ? 'Senior' :
                    estimatedScore >= 40 ? 'Mid-Level' : 'Junior';

        console.log(`SUBTOTAL (before AI):         ${subtotal.toFixed(2)}/100`);
        console.log(`AI MULTIPLIER:                ${aiResult.multiplier}x`);
        console.log(`TOTAL SCORE:                  ${estimatedScore}/100`);
        console.log(`TIER:                         ${tier}`);
        console.log();

        // Top Repositories
        console.log('⭐ TOP REPOSITORIES');
        console.log('─'.repeat(60));
        const topRepos = repos
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 5);

        topRepos.forEach((repo, i) => {
            console.log(`${i + 1}. ${repo.name}`);
            console.log(`   ⭐ ${repo.stargazers_count} stars | 🍴 ${repo.forks_count} forks | 📝 ${repo.language || 'N/A'}`);
            console.log(`   ${repo.description || 'No description'}`);
            console.log();
        });

        console.log('─'.repeat(60));
        console.log('✅ Analysis Complete!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\nPlease make sure your GITHUB_TOKEN is set in the .env file.\n');
    }
}

analyzeUser(username);
