import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface BulkResult {
    ID?: string | number;
    Name?: string;
    'GitHub Link'?: string;
    devRate_score?: string;
    devRate_total?: number;
    devRate_error?: string;
    job_fit_score?: number;
    match_reason?: string;
    [key: string]: any;
}

const BulkRate: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [sessionName, setSessionName] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [results, setResults] = useState<BulkResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file.');
            return;
        }

        if (!sessionName.trim()) {
            setError('Please enter a session name.');
            return;
        }

        setLoading(true);
        setError('');
        setResults([]);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionName', sessionName);
        if (jobDescription) {
            formData.append('jobDescription', jobDescription);
        }

        try {
            const response = await fetch('http://localhost:3000/api/bulk-rate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process file');
            }

            if (data.success) {
                setResults(data.data);
            } else {
                setError(data.error || 'Unknown error occurred');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Bulk Profile Rating</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                        ← Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/bulk-history')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                        View History
                    </button>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Session Name *
                        </label>
                        <input
                            type="text"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            placeholder="e.g., Frontend Engineers Q1 2026"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">Give this analysis a memorable name to find it later</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Upload Excel File (.xlsx)
                        </label>
                        <input 
                            type="file" 
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                        />
                        <p className="mt-1 text-xs text-gray-500">File should contain a specific column with GitHub URLs (e.g. "GitHub Link")</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Job Description (Optional - For "Job Match" Scoring)
                        </label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            rows={4}
                            placeholder="Paste job description here to see how well candidates match..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Processing...' : 'Start Bulk Rating'}
                    </button>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {results.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-x-auto">
                    <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Results</h2>
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Candidate</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">GitHub</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">DevRate Tier</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quality Score</th>
                                {jobDescription && (
                                    <>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Job Fit</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Match Reason</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {results.map((row, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {row.Name || row['Candidate Name'] || `Candidate ${index + 1}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-900 dark:text-blue-400">
                                        {row['GitHub Link'] || row['GitHub'] || row['github'] ? (
                                            <a href={String(row['GitHub Link'] || row['GitHub'] || row['github'])} target="_blank" rel="noopener noreferrer">
                                                View Profile
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                        {row.devRate_error ? (
                                            <span className="text-red-500">Error</span>
                                        ) : (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${row.devRate_score === 'Legendary' ? 'bg-purple-100 text-purple-800' : 
                                                  row.devRate_score === 'Elite' ? 'bg-green-100 text-green-800' : 
                                                  row.devRate_score === 'Senior' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {row.devRate_score}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                        {row.devRate_total ?? '-'}
                                    </td>
                                    {jobDescription && (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {row.job_fit_score !== undefined ? (
                                                    <div className="flex items-center">
                                                        <span className={`text-lg font-bold ${
                                                            (row.job_fit_score || 0) >= 80 ? 'text-green-600' : 
                                                            (row.job_fit_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                        }`}>
                                                            {row.job_fit_score}%
                                                        </span>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={row.match_reason}>
                                                {row.match_reason || '-'}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BulkRate;
