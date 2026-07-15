import React, { useState, useEffect, useRef } from 'react';
import { tmdbApi } from '../../services/tmdb';
import type { TMDbSelection } from '../../services/preferences';
import { Search, Loader2, X, RefreshCw } from 'lucide-react';

interface MovieSearchInputProps {
  selectedMovies: TMDbSelection[];
  onSelectMovie: (movie: TMDbSelection) => void;
}

export const MovieSearchInput: React.FC<MovieSearchInputProps> = ({
  selectedMovies,
  onSelectMovie,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<TMDbSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debouncing query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const searchResults = await tmdbApi.searchMovies(debouncedQuery);
        setResults(searchResults);
      } catch (err) {
        console.error('Movie search failed', err);
        setError('Error connecting to TMDb search.');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (movie: TMDbSelection) => {
    if (!selectedMovies.some((m) => m.id === movie.id)) {
      onSelectMovie(movie);
    }
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search and add similar movies..."
          className="w-full bg-[#24303c] border border-[#303840] rounded-lg pl-10 pr-8 py-2.5 text-white focus:outline-none focus:border-[#00c030] text-sm transition-all"
        />
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#9ab]" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-3 text-[#9ab] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (query.trim().length > 0) && (
        <div className="absolute z-50 w-full mt-1.5 bg-[#1c252d] border border-[#303840] rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-[#9ab]">
              <Loader2 className="w-4 h-4 animate-spin text-[#00c030]" />
              Searching TMDb...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between p-3.5 text-xs text-[#ff8000] bg-[#ff8000]/10 border-b border-[#303840]">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setDebouncedQuery(query)}
                className="flex items-center gap-1 font-bold text-white hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="py-6 text-center text-xs text-[#9ab]">
              No movies found.
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="py-1">
              {results.map((movie) => {
                const isSelected = selectedMovies.some((m) => m.id === movie.id);
                return (
                  <button
                    key={movie.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => handleSelect(movie)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-all ${
                      isSelected
                        ? 'opacity-40 bg-transparent cursor-not-allowed text-[#9ab]'
                        : 'hover:bg-[#24303c] text-white'
                    }`}
                  >
                    <div className="w-6 h-9 bg-[#24303c] rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {movie.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt={movie.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] text-[#9ab]">Film</span>
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-bold truncate">{movie.name}</p>
                      {isSelected && <span className="text-[10px] text-[#00c030] font-bold">Added</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
