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
      <div className="glass rounded-2xl p-2 flex items-center gap-2 glow">
        <div className="flex-1 flex items-center gap-3 px-4">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter GitHub username (e.g., torvalds)"
            className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500"
            disabled={disabled}
          />
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Analyzing...' : 'Rate'}
        </button>
      </div>
    </form>
  );
}
