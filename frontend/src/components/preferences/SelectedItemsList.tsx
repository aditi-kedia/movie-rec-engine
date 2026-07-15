import React from 'react';
import { Heart, X } from 'lucide-react';
import type { TMDbSelection } from '../../services/preferences';

interface SelectedItemsListProps {
  items: TMDbSelection[];
  type: 'movie' | 'genre' | 'cast' | 'crew';
  favourites: TMDbSelection[];
  onRemove: (item: TMDbSelection) => void;
  onToggleFavourite: (item: TMDbSelection, isFav: boolean) => void;
}

export const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
  items,
  type,
  favourites,
  onRemove,
  onToggleFavourite,
}) => {
  if (items.length === 0) return null;

  const isFavourited = (id: number) => favourites.some((fav) => fav.id === id);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item) => {
        const isFav = isFavourited(item.id);
        return (
          <div
            key={item.id}
            className="flex items-center gap-2 bg-[#24303c] border border-[#303840] rounded-full pl-3 pr-2 py-1.5 text-xs text-white hover:border-[#9ab]/50 transition-all shadow-md group"
          >
            {type === 'movie' && item.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                alt={item.name}
                className="w-4 h-6 object-cover rounded"
              />
            )}
            {type === 'cast' && item.profile_path && (
              <img
                src={`https://image.tmdb.org/t/p/w92${item.profile_path}`}
                alt={item.name}
                className="w-5 h-5 object-cover rounded-full"
              />
            )}
            {type === 'crew' && item.profile_path && (
              <img
                src={`https://image.tmdb.org/t/p/w92${item.profile_path}`}
                alt={item.name}
                className="w-5 h-5 object-cover rounded-full"
              />
            )}
            <span className="font-semibold">{item.name}</span>
            <div className="flex items-center gap-1 ml-1 border-l border-[#303840] pl-1.5">
              <button
                type="button"
                onClick={() => onToggleFavourite(item, isFav)}
                className={`p-1 rounded-full hover:bg-[#14181c] transition-all cursor-pointer ${
                  isFav ? 'text-[#ff8000]' : 'text-[#9ab] hover:text-[#ff8000]'
                }`}
                title={isFav ? 'Remove from Favourites' : 'Save as Favourite'}
              >
                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="p-1 text-[#9ab] hover:text-white rounded-full hover:bg-[#14181c] transition-all cursor-pointer"
                title="Remove selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
