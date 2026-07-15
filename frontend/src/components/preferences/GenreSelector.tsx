import React, { useEffect, useState } from 'react';
import { tmdbApi } from '../../services/tmdb';
import type { TMDbSelection } from '../../services/preferences';
import { RefreshCw } from 'lucide-react';

interface GenreSelectorProps {
  selectedGenres: TMDbSelection[];
  onToggleGenre: (genre: TMDbSelection) => void;
}

export const GenreSelector: React.FC<GenreSelectorProps> = ({
  selectedGenres,
  onToggleGenre,
}) => {
  const [genres, setGenres] = useState<TMDbSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenres = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tmdbApi.getGenres();
      setGenres(data);
    } catch (err) {
      console.error('Failed to load genres', err);
      setError('Failed to load genres from TMDb.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-[#9ab]">
        <div className="w-3.5 h-3.5 border border-t-transparent border-[#00c030] rounded-full animate-spin"></div>
        Loading genres...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 bg-[#ff8000]/10 border border-[#ff8000]/20 rounded-lg text-xs text-[#ff8000]">
        <span>{error}</span>
        <button
          type="button"
          onClick={fetchGenres}
          className="flex items-center gap-1 font-bold text-white hover:underline cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  const isSelected = (id: number) => selectedGenres.some((g) => g.id === id);

  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {genres.map((genre) => {
        const active = isSelected(genre.id);
        return (
          <button
            key={genre.id}
            type="button"
            onClick={() => onToggleGenre(genre)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
              active
                ? 'bg-[#00c030] border-[#00c030] text-white shadow-md shadow-[#00c030]/20 hover:bg-[#00a828]'
                : 'bg-[#24303c] border-[#303840] hover:border-[#9ab]/50 text-[#9ab] hover:text-white'
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
};
