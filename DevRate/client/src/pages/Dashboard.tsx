import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import DeveloperCard from '../components/DeveloperCard';

interface SearchedProfile {
  id: number;
  searched_profile: string;
  searched_at: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  twitter_username: string | null;
  email: string | null;
  metrics: any;
  total_score: number;
  health_score: number;
  quality_score: number;
  ai_analysis: any;
}

function getTier(score: number): string {
  if (score >= 90) return "Legendary";
  if (score >= 75) return "Elite";
  if (score >= 60) return "Senior";
  if (score >= 40) return "Mid-Level";
  return "Junior";
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<SearchedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get<SearchedProfile[]>('/api/profiles');
      // Sort profiles by total_score in descending order
      const sortedProfiles = response.data.sort((a, b) => b.total_score - a.total_score);
      setProfiles(sortedProfiles);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteProfile = async (username: string) => {
    try {
      await axios.delete(`/api/profiles/${username}`);
      // Refresh dashboard after successful deletion
      await fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete profile');
    }
  };

  const tierOrder = ['All', 'Legendary', 'Elite', 'Senior', 'Mid-Level', 'Junior'];
  
  const getFilteredProfiles = () => {
    if (selectedTier === 'All') {
      return profiles;
    }
    return profiles.filter(p => getTier(p.total_score) === selectedTier);
  };

  const getTierCount = (tier: string) => {
    if (tier === 'All') return profiles.length;
    return profiles.filter(p => getTier(p.total_score) === tier).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Are you a cracked dev?
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Rank the best developers on GitHub with AI.
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
                to="/search"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Ranking
              </Link>
              
              <Link
                to="/bulk"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Bulk Rate
              </Link>
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Just paste the GitHub username below.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter GitHub username"
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                id="dashboard-search-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const username = e.currentTarget.value.trim().replace(/^https?:\/\/(www\.)?github\.com\//, '').split('/')[0];
                    if (username) navigate(`/search?q=${username}`);
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById('dashboard-search-input') as HTMLInputElement;
                  const username = input?.value.trim().replace(/^https?:\/\/(www\.)?github\.com\//, '').split('/')[0];
                  if (username) navigate(`/search?q=${username}`);
                }}
                className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Start Ranking
              </button>
            </div>
          </div>
        </header>

        {/* Tier Filter Tabs */}
        {profiles.length > 0 && (
          <div className="mb-8">
            <div className="flex gap-2 flex-wrap">
              {tierOrder.map((tier) => {
                const count = getTierCount(tier);
                return (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      selectedTier === tier
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tier} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Developer Cards Grid */}
        {getFilteredProfiles().length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getFilteredProfiles().map((profile) => (
              <DeveloperCard key={profile.id} profile={profile} onDelete={handleDeleteProfile} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {profiles.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-300 mb-2">No profiles searched yet</h3>
            <p className="text-gray-600 dark:text-gray-500 mb-6">Start searching for GitHub developers to see them here</p>
            <Link
              to="/search"
              className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Search Your First Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
