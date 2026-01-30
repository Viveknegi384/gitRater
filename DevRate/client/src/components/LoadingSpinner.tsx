interface LoadingSpinnerProps {
  username: string;
}

export default function LoadingSpinner({ username }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold text-lg mb-2">
          Analyzing @{username}
        </p>
        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span>Fetching GitHub data & running AI analysis</span>
        </div>
      </div>
    </div>
  );
}
