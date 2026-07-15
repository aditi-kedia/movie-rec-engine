import React, { useState } from 'react';
import { Film, Calendar, ThumbsUp, ChevronDown, ChevronUp, User } from 'lucide-react';
import type { RecommendationMovie } from '../../services/recommendations';

interface RecommendationResultsProps {
  movies: RecommendationMovie[];
  isGroup?: boolean;
}

export const RecommendationResults: React.FC<RecommendationResultsProps> = ({
  movies,
  isGroup = false,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'bg-[#00c030]/10 border-[#00c030]/30 text-[#00c030]';
    if (score >= 50) return 'bg-[#ff8000]/10 border-[#ff8000]/30 text-[#ff8000]';
    return 'bg-[#ff4b4b]/10 border-[#ff4b4b]/30 text-[#ff4b4b]';
  };

  if (movies.length === 0) {
    return (
      <div className="py-12 text-center bg-[#1c252d] border border-[#24303c] rounded-xl text-[#9ab] flex flex-col items-center">
        <Film className="w-12 h-12 mb-4 opacity-25" />
        <p className="font-extrabold text-base text-white mb-1">No recommendations found</p>
        <p className="text-xs max-w-sm">
          Try expanding your genres, adding more similar movies, or widening your runtime limits to seed recommendation candidates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {movies.map((movie, index) => {
        const isExpanded = expandedId === movie.id;
        const scoreColor = getScoreColorClass(movie.score);
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

        return (
          <div
            key={movie.id}
            className="bg-[#1c252d] border border-[#24303c] hover:border-[#303840] rounded-xl overflow-hidden shadow-xl transition-all"
          >
            {/* Main Movie Row */}
            <div
              onClick={() => toggleExpand(movie.id)}
              className="p-5 flex gap-4 sm:gap-6 items-start cursor-pointer hover:bg-[#24303c]/20 transition-all select-none"
            >
              {/* Rank Badge */}
              <div className="text-2xl font-black text-[#303840] w-6 text-center select-none">
                {index + 1}
              </div>

              {/* Poster Mock / Image */}
              <div className="w-16 sm:w-20 aspect-[2/3] bg-[#24303c] border border-[#303840] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md">
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Film className="w-6 h-6 text-[#303840]" />
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="font-extrabold text-sm sm:text-base text-white truncate max-w-[280px] sm:max-w-md">
                    {movie.title}
                  </h3>
                  <span className="text-xs text-[#9ab] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {year}
                  </span>
                </div>

                {/* Score badge & Match reasons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black border tracking-wider ${scoreColor}`}
                  >
                    {movie.score}% MATCH
                  </span>
                  
                  {/* Reasons chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {movie.reasons.slice(0, 3).map((reason, idx) => (
                      <span
                        key={idx}
                        className="bg-[#24303c] text-[#9ab] border border-[#303840] px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-[#9ab] line-clamp-2 leading-relaxed">
                  {movie.overview || 'No synopsis available for this movie.'}
                </p>
              </div>

              {/* Expand Toggle Chevron */}
              <div className="text-[#9ab] hover:text-white p-1 rounded-full hover:bg-[#24303c] transition-all">
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* Expanded details (Synopsis & breakdown) */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-1 border-t border-[#24303c] bg-[#14181c]/20 text-xs space-y-4">
                {/* Full Synopsis */}
                {movie.overview && (
                  <div>
                    <h4 className="font-bold text-[10px] uppercase text-[#9ab] tracking-wider mb-1">Synopsis</h4>
                    <p className="text-[#9ab] leading-relaxed">{movie.overview}</p>
                  </div>
                )}

                {/* Match Reasons detail */}
                <div>
                  <h4 className="font-bold text-[10px] uppercase text-[#9ab] tracking-wider mb-1.5">
                    Full Compatibility Factors
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="bg-[#24303c] text-white border border-[#303840] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"
                      >
                        <ThumbsUp className="w-2.5 h-2.5 text-[#00c030] fill-current" />
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Individual Participant breakdown for groups */}
                {isGroup && movie.individual_scores && (
                  <div className="pt-2 border-t border-[#24303c]">
                    <h4 className="font-bold text-[10px] uppercase text-[#40bcf4] tracking-wider mb-2">
                      Individual Match Breakdowns
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(movie.individual_scores).map(([name, score]) => (
                        <div
                          key={name}
                          className="bg-[#1c252d] border border-[#24303c] rounded-lg p-2.5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5 text-white font-semibold truncate">
                            <User className="w-3.5 h-3.5 text-[#9ab] flex-shrink-0" />
                            <span className="truncate">{name}</span>
                          </div>
                          <span
                            className={`text-xs font-black px-1.5 py-0.5 rounded ${
                              score >= 80 ? 'text-[#00c030]' : score >= 50 ? 'text-[#ff8000]' : 'text-[#ff4b4b]'
                            }`}
                          >
                            {score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
