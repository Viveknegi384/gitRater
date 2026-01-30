export interface RatingResponse {
  username: string;
  avatar: string;
  name: string | null;
  rating: number;
  tier: string;
  breakdown: {
    total: number;
    health: {
      count: number;
      score: number;
    };
    quality: {
      count: number;
      score: number;
    };
    details: {
      volume: number;
      acceptance: number;
      impact: number;
      issues: number;
      commits: number;
    };
  };
  ai: {
    persona: string;
    summary: string;
    multiplier: number;
  };
}
