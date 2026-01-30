import { useState } from 'react';

interface ProfileCardProps {
  profile: {
    id: number;
    searched_profile: string;
    name: string | null;
    avatar_url: string;
    total_score: number;
    metrics: {
      total_commits: number;
      public_repos: number;
      followers: number;
      merged_prs: number;
      pr_acceptance_rate: number;
      total_stars: number;
      issues_closed: number;
      language_breadth: number;
    };
  };
  onDelete: (username: string) => void;
}

function getTier(score: number): string {
  if (score >= 90) return "Legendary";
  if (score >= 75) return "Elite";
  if (score >= 60) return "Senior";
  if (score >= 40) return "Mid-Level";
  return "Junior";
}

export default function ProfileCard({ profile, onDelete }: ProfileCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    if (!confirm(`Remove ${profile.name || profile.searched_profile} from your dashboard?`)) return;
    
    setIsDeleting(true);
    onDelete(profile.searched_profile);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Legendary': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400';
      case 'Elite': return 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400';
      case 'Senior': return 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400';
      case 'Mid-Level': return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
      case 'Junior': return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const tier = getTier(profile.total_score);

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all">
      {/* Delete button */}
      <button 
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Remove from dashboard"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <img
          src={profile.avatar_url}
          alt={profile.searched_profile}
          className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-slate-700 mb-4"
        />

        {/* Name */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {profile.name || profile.searched_profile}
        </h3>

        {/* Username */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          @{profile.searched_profile}
        </p>

        {/* Score Section */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">Developer Impact Score:</span>
            {/* Info Icon */}
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="relative text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="View score breakdown"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{profile.total_score}</span>
        </div>

        {/* Score Breakdown Tooltip */}
        {showBreakdown && (
          <div className="absolute top-0 left-0 right-0 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-xl p-4 shadow-2xl z-10 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">Score Breakdown</h4>
              <button 
                onClick={() => setShowBreakdown(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recency-decayed Commits:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile.metrics?.total_commits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Active Repositories:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile.metrics?.public_repos || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Followers:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile.metrics?.followers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recency-decayed Merged PRs:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile.metrics?.merged_prs || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">PR Acceptance Rate:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile.metrics?.pr_acceptance_rate?.toFixed(1) || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recency-decayed Stars:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile.metrics?.total_stars || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Issues Closed:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile.metrics?.issues_closed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Language Breadth:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile.metrics?.language_breadth || 0}</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
              This is a summary of raw metrics. For the full formula, see the <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Developer Impact Score Algorithm</a> in the footer.
            </p>
          </div>
        )}

        {/* Links section */}
        <div className="w-full space-y-2 mb-6 text-sm">
          <a href={`https://github.com/${profile.searched_profile}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub Profile
          </a>
        </div>

        {/* Tier Badge */}
        <div className={`w-full py-3 rounded-lg font-semibold ${getTierColor(tier)}`}>
          {tier}
        </div>
      </div>
    </div>
  );
}
