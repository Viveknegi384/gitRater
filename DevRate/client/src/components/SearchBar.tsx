import { useState, FormEvent } from 'react';

interface SearchBarProps {
  onSearch: (username: string) => void;
  disabled?: boolean;
}

export default function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(input);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter GitHub username (e.g., torvalds)"
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            disabled={disabled}
          />
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Analyzing...' : 'Rate'}
        </button>
      </div>
    </form>
  );
}
