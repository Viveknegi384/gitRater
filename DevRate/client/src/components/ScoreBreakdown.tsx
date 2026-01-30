import { RatingResponse } from '../types';

interface ScoreBreakdownProps {
  data: RatingResponse;
}

export default function ScoreBreakdown({ data }: ScoreBreakdownProps) {
  const details = [
    { label: 'Commit Volume', value: data.breakdown.details.volume.toFixed(1), max: 100, color: 'bg-blue-500' },
    { label: 'PR Acceptance', value: data.breakdown.details.acceptance.toFixed(1), max: 35, color: 'bg-green-500' },
    { label: 'Impact Score', value: data.breakdown.details.impact.toFixed(1), max: 35, color: 'bg-purple-500' },
    { label: 'Issues Solved', value: data.breakdown.details.issues.toFixed(1), max: 15, color: 'bg-yellow-500' },
    { label: 'Commit Quality', value: data.breakdown.details.commits.toFixed(1), max: 15, color: 'bg-pink-500' },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Health & Quality Summary */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold text-slate-200 mb-6">Score Components</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-400">Profile Health</span>
              <span className="text-slate-200 font-semibold">{data.breakdown.health.score.toFixed(1)} / 20</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000"
                style={{ width: `${(data.breakdown.health.score / 20) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-400">Engineering Quality</span>
              <span className="text-slate-200 font-semibold">{data.breakdown.quality.score.toFixed(1)} / 80</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                style={{ width: `${(data.breakdown.quality.score / 80) * 100}%` }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-300 font-semibold">AI Multiplier</span>
              <span className="text-purple-400 font-bold">×{data.ai.multiplier.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold text-slate-200 mb-6">Detailed Breakdown</h3>
        <div className="space-y-4">
          {details.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 text-sm">{item.label}</span>
                <span className="text-slate-200 font-semibold text-sm">{item.value} / {item.max}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-1000`}
                  style={{ width: `${(parseFloat(item.value) / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
