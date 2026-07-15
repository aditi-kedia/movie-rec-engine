import React from 'react';
import { Star } from 'lucide-react';
import type { TMDbSelection } from '../../services/preferences';

interface FavouriteSuggestionsProps {
  favourites: TMDbSelection[];
  selectedIds: number[];
  onSelect: (item: TMDbSelection) => void;
}

export const FavouriteSuggestions: React.FC<FavouriteSuggestionsProps> = ({
  favourites,
  selectedIds,
  onSelect,
}) => {
  if (favourites.length === 0) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex items-center gap-1 text-[10px] font-bold text-[#9ab] uppercase tracking-wider">
        <Star className="w-3 h-3 text-[#ff8000] fill-current" />
        <span>Saved Favourites Suggestions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {favourites.map((fav) => {
          const isAlreadySelected = selectedIds.includes(fav.id);
          return (
            <button
              key={fav.id}
              type="button"
              disabled={isAlreadySelected}
              onClick={() => onSelect(fav)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                isAlreadySelected
                  ? 'bg-[#14181c] border-[#24303c] text-[#9ab]/40 cursor-not-allowed'
                  : 'bg-[#1c252d] border-[#24303c] hover:border-[#ff8000] text-[#9ab] hover:text-white'
              }`}
            >
              + {fav.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
