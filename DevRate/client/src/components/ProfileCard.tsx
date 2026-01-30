import { RatingResponse } from '../types';

interface ProfileCardProps {
  data: RatingResponse;
}

export default function ProfileCard({ data }: ProfileCardProps) {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Legendary': return 'from-yellow-400 to-orange-500';
      case 'Elite': return 'from-purple-400 to-pink-500';
      case 'Senior': return 'from-blue-400 to-cyan-500';
      case 'Mid-Level': return 'from-green-400 to-emerald-500';
      case 'Junior': return 'from-slate-400 to-slate-500';
      default: return 'from-slate-400 to-slate-500';
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
    <div className="glass rounded-3xl p-8 md:p-10">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Avatar */}
        <img
          src={data.avatar}
          alt={data.username}
          className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-slate-700/50 shadow-2xl"
        />

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">
            {data.name || data.username}
          </h2>
          <p className="text-slate-400 text-lg mb-4">@{data.username}</p>

          {/* Tier Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r {getTierColor(data.tier)} rounded-full mb-4">
            <span className="text-2xl">{getTierEmoji(data.tier)}</span>
            <span className="font-bold text-white">{data.tier}</span>
          </div>

          {/* AI Persona */}
          <div className="mt-6 glass rounded-xl p-4 border-purple-500/30">
            <p className="text-purple-300 font-semibold mb-1">🤖 {data.ai.persona}</p>
            <p className="text-slate-400 text-sm italic">{data.ai.summary}</p>
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
              className="text-slate-800"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(data.rating / 100) * 439.6} 439.6`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold gradient-text">{data.rating}</span>
            <span className="text-slate-500 text-sm">/ 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
