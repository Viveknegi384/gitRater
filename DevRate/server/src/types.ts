export interface RepoStats {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  isFork: boolean;
}

export interface PRStats {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  mergedAt: string | null;
  createdAt: string;
  repoName: string;
  additions: number;
  deletions: number;
}

export interface IssueStats {
    id: number;
    title: string;
    state: 'open' | 'closed';
    createdAt: string;
    closedAt: string | null;
}

export interface UserProfile {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  followers: number;
  publicRepos: number;
  totalStars: number;
  company: string | null;
  orgCount: number;
}

export interface CommitInfo {
    message: string;
    date: string;
    repoName: string;
}

export interface AIResult {
    multiplier: number;
    persona: string;
    summary: string;
    commitScore: number;
}
