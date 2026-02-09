import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface BulkSession {
    id: number;
    session_name: string;
    total_profiles: number;
    created_at: string;
}

interface BulkProfile {
    id: number;
    candidate_name: string;
    github_url: string;
    github_username: string;
    devrate_tier: string;
    quality_score: number;
    job_fit_score: number;
    match_reason: string;
    error_message: string;
}

const BulkHistory: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<BulkSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<BulkSession | null>(null);
    const [profiles, setProfiles] = useState<BulkProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:3000/api/bulk-sessions', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch sessions');
            }

            setSessions(data.data);
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionDetails = async (sessionId: number) => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`http://localhost:3000/api/bulk-sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch session details');
            }

            setSelectedSession(data.session);
            setProfiles(data.profiles);
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleSessionClick = (session: BulkSession) => {
        fetchSessionDetails(session.id);
    };

    const handleBackToSessions = () => {
        setSelectedSession(null);
        setProfiles([]);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                    >
                        ← Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                        {selectedSession ? selectedSession.session_name : 'Bulk Analysis History'}
                    </h1>
                </div>
                {selectedSession ? (
                    <button
                        onClick={handleBackToSessions}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                        ← Back to Sessions
                    </button>
                ) : (
                    <button
                        onClick={() => navigate('/bulk')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        + New Analysis
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            )}

            {!loading && !selectedSession && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sessions.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                            No bulk analysis sessions found. Start by creating a new analysis!
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => handleSessionClick(session)}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
                            >
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                                    {session.session_name}
                                </h3>
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <p>
                                        <span className="font-medium">Profiles:</span> {session.total_profiles}
                                    </p>
                                    <p>
                                        <span className="font-medium">Created:</span> {formatDate(session.created_at)}
                                    </p>
                                </div>
                                <div className="mt-4">
                                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                                        View Details →
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {!loading && selectedSession && profiles.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-x-auto">
                    <div className="mb-4 text-gray-600 dark:text-gray-400">
                        <p>Created: {formatDate(selectedSession.created_at)}</p>
                        <p>Total Profiles: {selectedSession.total_profiles}</p>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Candidate
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    GitHub
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    DevRate Tier
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Quality Score
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Job Fit
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Match Reason
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {profiles.map((profile) => (
                                <tr key={profile.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {profile.candidate_name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-900 dark:text-blue-400">
                                        {profile.github_url ? (
                                            <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                                                {profile.github_username || 'View Profile'}
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                        {profile.error_message ? (
                                            <span className="text-red-500">Error</span>
                                        ) : (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${profile.devrate_tier === 'Legendary' ? 'bg-purple-100 text-purple-800' : 
                                                  profile.devrate_tier === 'Elite' ? 'bg-green-100 text-green-800' : 
                                                  profile.devrate_tier === 'Senior' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {profile.devrate_tier || 'N/A'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                        {profile.quality_score || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {profile.job_fit_score ? (
                                            <span className={`text-lg font-bold ${
                                                profile.job_fit_score >= 80 ? 'text-green-600' : 
                                                profile.job_fit_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                                {profile.job_fit_score}%
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={profile.match_reason}>
                                        {profile.match_reason || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BulkHistory;
