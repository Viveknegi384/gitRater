export interface RatingResponse {
  username: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  blog: string | null;
  twitter_username: string | null;
  company: string | null;
  followers: number;
  following: number;
  public_repos: number;
  total_commits: number;
  total_stars: number;
  developer_impact_score: number;
  tier: string;
  score_breakdown: {
    health_score: number;
    quality_score: number;
    ai_score: number;
  };
  ai_analysis: {
    persona: string;
    summary: string;
  };
}
