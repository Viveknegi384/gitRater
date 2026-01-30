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
    // This is expensive per repo. We will sample the "Events" API instead.
    const { data } = await octokit.rest.activity.listPublicEventsForUser({
        username,
        per_page: 50
    });

    const commits: CommitInfo[] = [];

    data.forEach((event: any) => {
        if (event.type === 'PushEvent' && event.payload?.commits) {
             // @ts-ignore
             event.payload.commits.forEach((commit: any) => {
                 commits.push({
                     message: commit.message,
                     date: event.created_at || '',
                     repoName: event.repo.name
                 });
             });
        }
    });

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
