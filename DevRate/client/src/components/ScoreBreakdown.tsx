import { RatingResponse } from '../types';

interface ScoreBreakdownProps {
  data: RatingResponse;
}

export default function ScoreBreakdown({ data }: ScoreBreakdownProps) {
  const details = [
    { label: 'Total Commits', value: data.total_commits, icon: '💻' },
    { label: 'Public Repos', value: data.public_repos, icon: '📁' },
    { label: 'Total Stars', value: data.total_stars, icon: '⭐' },
    { label: 'Followers', value: data.followers, icon: '👥' },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Score Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Score Components</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Profile Health</span>
              <span className="text-gray-900 dark:text-white font-semibold">{data.score_breakdown.health_score.toFixed(1)} / 20</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-1000"
                style={{ width: `${(data.score_breakdown.health_score / 20) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Engineering Quality</span>
              <span className="text-gray-900 dark:text-white font-semibold">{data.score_breakdown.quality_score.toFixed(1)} / 80</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-1000"
                style={{ width: `${(data.score_breakdown.quality_score / 80) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">AI Commit Quality</span>
              <span className="text-gray-900 dark:text-white font-semibold">{data.score_breakdown.ai_score.toFixed(1)} / 15</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-1000"
                style={{ width: `${(data.score_breakdown.ai_score / 15) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">GitHub Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          {details.map((item, index) => (
            <div key={index} className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{item.value.toLocaleString()}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
