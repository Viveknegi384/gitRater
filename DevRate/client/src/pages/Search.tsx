import { useState, useEffect } from 'react';
import axios from 'axios';
import { RatingResponse } from '../types';
import SearchBar from '../components/SearchBar';
import ProfileCard from '../components/ProfileCard';
import ScoreBreakdown from '../components/ScoreBreakdown';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useSearchParams } from 'react-router-dom';

export default function Search() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RatingResponse | null>(null);
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const queryUsername = searchParams.get('q');
    if (queryUsername && !hasSearched) {
      setHasSearched(true);
      handleSearch(queryUsername);
    }
  }, [searchParams]);

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
      const response = await axios.get(`/api/rating/${searchUsername}`);
      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('GitHub user not found');
      } else if (err.response?.status === 429) {
        setError('GitHub API rate limit exceeded. Please try again later.');
      } else if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => logout(), 2000);
      } else {
        setError(err.response?.data?.error || 'Failed to fetch rating. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                DevRate
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Evaluate GitHub Developers with AI-Powered Insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              
              <Link
                to="/dashboard"
                className="px-6 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} disabled={loading} />

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
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
            
            <div className="text-center">
              <Link
                to="/dashboard"
                className="inline-block px-8 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                View All Searched Profiles →
              </Link>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!result && !loading && (
          <div className="mt-24 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Enter a GitHub username to see their developer rating
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
