import { Octokit } from 'octokit';
import { UserProfile, RepoStats, PRStats, IssueStats, CommitInfo } from '../types';
import dotenv from 'dotenv';

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

import { logger } from '../utils/logger';

export const fetchUserProfile = async (username: string): Promise<UserProfile> => {
  logger.info(`Fetching GitHub Profile`, { username });
  const { data: profile } = await octokit.rest.users.getByUsername({ username });
  
  // Fetch Orgs
  const { data: orgs } = await octokit.rest.orgs.listForUser({ username, per_page: 100 });

  return {
    username: profile.login,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    followers: profile.followers,
    publicRepos: profile.public_repos,
    totalStars: 0, // Placeholder
    company: profile.company,
    location: profile.location,
    blog: profile.blog,
    email: profile.email,
    twitterUsername: profile.twitter_username,
    orgCount: orgs.length
  };
};

export const fetchUserRepos = async (username: string): Promise<RepoStats[]> => {
  // Fetch up to 100 recent repos
  logger.info(`Fetching User Repos`, { username });
  const { data } = await octokit.rest.repos.listForUser({
    username,
    sort: 'pushed',
    per_page: 100,
    type: 'owner' // Only repos owned by user
  });

    return data.map((repo: any) => ({
    name: repo.name,
    description: repo.description,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    language: repo.language,
    isFork: repo.fork,
  }));
};

export const fetchRecentPRs = async (username: string): Promise<PRStats[]> => {
  // Search API is better for finding PRs across *any* repo (even ones they don't own)
  const query = `author:${username} type:pr is:public`;
  const { data } = await octokit.rest.search.issuesAndPullRequests({
    q: query,
    per_page: 100, // Top 100 PRs (all time)
  });

  return data.items.map((item: any) => ({
    id: item.id,
    number: item.number,
    title: item.title,
    state: item.state,
    merged: item.pull_request?.merged_at ? true : false, // Check payload. Search API structure is specific
    mergedAt: item.pull_request?.merged_at || null,
    createdAt: item.created_at,
    repoName: extractRepoName(item.repository_url),
    additions: 0, // Search API doesn't give diff size. We might need detailed fetch if critical.
    deletions: 0
  }));
};

// Fetch detailed PR information with reviews for AI analysis
export const fetchPRDetailsForAI = async (prs: PRStats[]): Promise<string[]> => {
  // Get top 5 merged PRs for analysis
  const topPRs = prs
    .filter(pr => pr.merged)
    .sort((a, b) => new Date(b.mergedAt || 0).getTime() - new Date(a.mergedAt || 0).getTime())
    .slice(0, 5);
  
  const prDetails: string[] = [];
  
  for (const pr of topPRs) {
    try {
      // Extract owner and repo from repoName
      const [owner, repo] = pr.repoName.split('/');
      
      console.log(`Fetching details for PR #${pr.number} in ${pr.repoName}...`);
      
      // Fetch PR details
      const { data: prData } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pr.number
      });
      
      // Fetch reviews
      const { data: reviews } = await octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pr.number
      });
      
      console.log(`  Reviews found: ${reviews.length}`);
      
      // Fetch review comments
      const { data: comments } = await octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pr.number
      });
      
      console.log(`  Review comments found: ${comments.length}`);
      
      let prSummary = `PR #${pr.number}: ${pr.title}\n`;
      prSummary += `Repo: ${pr.repoName} | Status: MERGED\n`;
      prSummary += `Description: ${prData.body?.substring(0, 200) || 'No description'}\n`;
      prSummary += `Changes: +${prData.additions} -${prData.deletions} lines\n`;
      
      if (reviews.length > 0) {
        prSummary += `Reviews (${reviews.length}): ${reviews.map((r: any) => r.state).join(', ')}\n`;
        reviews.forEach((r: any) => {
          if (r.body) {
            prSummary += `  Review by ${r.user?.login}: ${r.body.substring(0, 150)}...\n`;
          }
        });
      }
      
      if (comments.length > 0) {
        prSummary += `Review Comments (${comments.length}): \n`;
        comments.slice(0, 3).forEach((c: any) => {
          prSummary += `  - ${c.user?.login}: ${c.body?.substring(0, 100)}...\n`;
        });
      }
      
      prDetails.push(prSummary);
    } catch (error: any) {
      // If detailed fetch fails, use basic info
      logger.warn(`Could not fetch details for PR #${pr.number}: ${error.message}`);
      prDetails.push(`PR #${pr.number}: ${pr.title} (${pr.repoName}) - MERGED`);
    }
  }
  
  return prDetails;
};

// Helper: Issues Solved
export const fetchResolvedIssues = async (username: string): Promise<IssueStats[]> => {
   // "involves:username" or "assignee:username"? 
   // "author:username" implies they opened it. 
   // We want issues they *closed*? Hard to track via API directly without events.
   // Proxy: Issues assigned to them that are closed? Or Issues they authored that are closed?
   // Let's go with: Issues they were assigned to and are closed.
   const query = `assignee:${username} type:issue state:closed is:public`;
   const { data } = await octokit.rest.search.issuesAndPullRequests({
     q: query,
     per_page: 50, // Top 50 closed issues (all time)
   });

   return data.items.map((item: any) => ({
       id: item.id,
       title: item.title,
       state: item.state,
       createdAt: item.created_at,
       closedAt: item.closed_at
   }));
};

// Helper: Fetch Recent Commits (for Quality Analysis)
export const fetchRecentCommits = async (username: string): Promise<CommitInfo[]> => {
    logger.info(`Fetching recent commits for ${username}`);
    
    // First try Events API (faster, last 90 days)
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
        username,
        per_page: 50
    });

    console.log(`DEBUG: Total events fetched: ${events.length}`);
    const pushEvents = events.filter((e: any) => e.type === 'PushEvent');
    console.log(`DEBUG: Push events found: ${pushEvents.length}`);

    const commits: CommitInfo[] = [];

    events.forEach((event: any) => {
        if (event.type === 'PushEvent' && event.payload?.commits) {
             event.payload.commits.forEach((commit: any) => {
                 commits.push({
                     message: commit.message,
                     date: event.created_at || '',
                     repoName: event.repo.name
                 });
             });
        }
    });
    
    console.log(`DEBUG: Commits from events: ${commits.length}`);
    
    // If we have enough commits from events, return them
    if (commits.length >= 20) {
        return commits.slice(0, 50);
    }
    
    // Otherwise, fetch from repositories directly
    console.log(`DEBUG: Not enough commits from events, fetching from repos...`);
    
    try {
        // Get user's repositories
        const { data: repos } = await octokit.rest.repos.listForUser({
            username,
            sort: 'pushed',
            per_page: 10, // Top 10 most recently pushed repos
            type: 'owner'
        });
        
        console.log(`DEBUG: Fetching commits from ${repos.length} repos...`);
        
        // Fetch commits from each repo
        for (const repo of repos) {
            if (commits.length >= 50) break;
            
            try {
                const { data: repoCommits } = await octokit.rest.repos.listCommits({
                    owner: username,
                    repo: repo.name,
                    author: username,
                    per_page: 10
                });
                
                repoCommits.forEach((commit: any) => {
                    if (commits.length < 50) {
                        commits.push({
                            message: commit.commit.message,
                            date: commit.commit.author.date,
                            repoName: `${username}/${repo.name}`
                        });
                    }
                });
            } catch (error) {
                // Skip repos we can't access
                console.log(`DEBUG: Couldn't fetch commits from ${repo.name}`);
            }
        }
        
        console.log(`DEBUG: Total commits collected: ${commits.length}`);
    } catch (error) {
        console.warn(`Failed to fetch commits from repos: ${error}`);
    }

    return commits;
};

export const fetchTotalCommits = async (username: string): Promise<number> => {
    try {
        const { data } = await octokit.rest.search.commits({
            q: `author:${username}`,
            per_page: 1
        });
        return data.total_count;
    } catch (error) {
        console.warn("Failed to fetch total commits (Search API limit?), defaulting to 0");
        return 0;
    }
};

// Utilities
function getOneYearAgoDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0];
}

function extractRepoName(url: string): string {
  // url: https://api.github.com/repos/owner/repo
  const parts = url.split('/');
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}
