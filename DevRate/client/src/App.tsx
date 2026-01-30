import { useState } from 'react';
import axios from 'axios';
import { RatingResponse } from './types';
import SearchBar from './components/SearchBar';
import ProfileCard from './components/ProfileCard';
import ScoreBreakdown from './components/ScoreBreakdown';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RatingResponse | null>(null);

  const handleSearch = async (searchUsername: string) => {
    if (!searchUsername.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setUsername(searchUsername);

    try {
      const response = await axios.get<RatingResponse>(
        `/api/rate/${searchUsername}`
      );
      setResult(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('GitHub user not found');
      } else if (err.response?.status === 403) {
        setError('GitHub API rate limit exceeded. Please try again later.');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch rating. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="text-center mb-12 md:mb-16">
          <h1 className="text-5xl md:text-7xl font-bold gradient-text mb-4">
            DevRate
          </h1>
          <p className="text-slate-400 text-lg md:text-xl">
            Evaluate GitHub Developers with AI-Powered Insights
          </p>
        </header>

        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} disabled={loading} />

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="glass rounded-lg p-4 border-red-500/50 bg-red-500/10">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-12">
            <LoadingSpinner username={username} />
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="mt-12 space-y-8 max-w-6xl mx-auto">
            <ProfileCard data={result} />
            <ScoreBreakdown data={result} />
          </div>
        )}

        {/* Footer */}
        {!result && !loading && (
          <div className="mt-24 text-center">
            <p className="text-slate-500 text-sm">
              Enter a GitHub username to see their developer rating
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
