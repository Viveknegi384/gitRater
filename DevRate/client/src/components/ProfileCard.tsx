import { RatingResponse } from '../types';

interface ProfileCardProps {
  data: RatingResponse;
}

export default function ProfileCard({ data }: ProfileCardProps) {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Legendary': return 'bg-yellow-500';
      case 'Elite': return 'bg-purple-500';
      case 'Senior': return 'bg-blue-500';
      case 'Mid-Level': return 'bg-green-500';
      case 'Junior': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case 'Legendary': return '👑';
      case 'Elite': return '🔥';
      case 'Senior': return '⭐';
      case 'Mid-Level': return '💪';
      case 'Junior': return '🌱';
      default: return '👨‍💻';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-10 border border-gray-200 dark:border-slate-700">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Avatar */}
        <img
          src={data.avatar_url}
          alt={data.username}
          className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-200 dark:border-slate-700 shadow-lg"
        />

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {data.name || data.username}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">@{data.username}</p>

          {/* Tier Badge */}
          <div className={`inline-flex items-center gap-2 px-5 py-2 ${getTierColor(data.tier)} rounded-full mb-4`}>
            <span className="text-2xl">{getTierEmoji(data.tier)}</span>
            <span className="font-bold text-white">{data.tier}</span>
          </div>
        </div>

        {/* Score Circle */}
        <div className="relative">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-slate-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(data.developer_impact_score / 100) * 439.6} 439.6`}
              strokeLinecap="round"
              className="text-blue-600 transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{data.developer_impact_score}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">/ 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
