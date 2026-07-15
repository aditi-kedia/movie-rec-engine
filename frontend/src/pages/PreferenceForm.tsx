import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Save, Settings } from 'lucide-react';
import { preferenceApi } from '../services/preferences';
import { roomApi } from '../services/room';
import { recommendationsApi } from '../services/recommendations';
import type { RecommendationMovie } from '../services/recommendations';
import { RecommendationResults } from '../components/preferences/RecommendationResults';
import type { TMDbSelection, PreferenceRequest } from '../services/preferences';
import { favouritesApi } from '../services/favourites';
import type { FavouriteResponse } from '../services/favourites';
import { GenreSelector } from '../components/preferences/GenreSelector';
import { MovieSearchInput } from '../components/preferences/MovieSearchInput';
import { PersonSearchInput } from '../components/preferences/PersonSearchInput';
import { RuntimeSelector } from '../components/preferences/RuntimeSelector';
import { FreeTextInput } from '../components/preferences/FreeTextInput';
import { FavouriteSuggestions } from '../components/preferences/FavouriteSuggestions';
import { SelectedItemsList } from '../components/preferences/SelectedItemsList';

export const PreferenceForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomIdParam = searchParams.get('roomId');
  const roomId = roomIdParam ? Number(roomIdParam) : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendationMovie[] | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  // Form states
  const [similarMovies, setSimilarMovies] = useState<TMDbSelection[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<TMDbSelection[]>([]);
  const [preferredCast, setPreferredCast] = useState<TMDbSelection[]>([]);
  const [preferredCrew, setPreferredCrew] = useState<TMDbSelection[]>([]);
  const [minRuntime, setMinRuntime] = useState<number | ''>('');
  const [maxRuntime, setMaxRuntime] = useState<number | ''>('');
  const [freeText, setFreeText] = useState('');

  // Favorites state (original backend database records)
  const [rawFavourites, setRawFavourites] = useState<FavouriteResponse[]>([]);

  // Load latest preferences & user favorites
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch user favorites
      const favs = await favouritesApi.getFavourites();
      setRawFavourites(favs);

      // 2. Fetch latest saved preferences to pre-fill form ONLY if NOT in a room lobby!
      if (!roomId) {
        const latest = await preferenceApi.getLatestPreference();
        if (latest && latest.pref_id) {
          setSimilarMovies(latest.similar_movies || []);
          setSelectedGenres(latest.preferred_genres || []);
          setPreferredCast(latest.preferred_cast || []);
          setPreferredCrew(latest.preferred_crew || []);
          setMinRuntime(latest.runtime_min !== undefined && latest.runtime_min !== null ? latest.runtime_min : '');
          setMaxRuntime(latest.runtime_max !== undefined && latest.runtime_max !== null ? latest.runtime_max : '');
          setFreeText(latest.free_text || '');
        }
      }
    } catch (err) {
      console.error('Failed to load initial preference data', err);
      setError('Failed to load preference settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Map raw favorites into TMDbSelection format for components
  const getFavsByType = (type: 'movie' | 'genre' | 'cast' | 'crew'): TMDbSelection[] => {
    return rawFavourites
      .filter((f) => f.type === type)
      .map((f) => ({
        id: f.item_id,
        name: f.name,
        poster_path: f.meta?.poster_path,
        profile_path: f.meta?.profile_path,
      }));
  };

  const movieFavs = getFavsByType('movie');
  const genreFavs = getFavsByType('genre');
  const castFavs = getFavsByType('cast');
  const crewFavs = getFavsByType('crew');

  // Toggle favorite status on items
  const handleToggleFavourite = async (
    item: TMDbSelection,
    type: 'movie' | 'genre' | 'cast' | 'crew',
    isFav: boolean
  ) => {
    try {
      if (isFav) {
        await favouritesApi.deleteFavouriteByTmdboard(type, item.id);
        setRawFavourites((prev) =>
          prev.filter((f) => !(f.type === type && f.item_id === item.id))
        );
      } else {
        const meta: Record<string, any> = {};
        if (item.poster_path) meta.poster_path = item.poster_path;
        if (item.profile_path) meta.profile_path = item.profile_path;

        const saved = await favouritesApi.saveFavourite({
          type,
          item_id: item.id,
          name: item.name,
          meta,
        });
        setRawFavourites((prev) => [...prev, saved]);
      }
    } catch (err) {
      console.error('Failed to update favourite item', err);
    }
  };

  // Toggle genre in selection list
  const handleToggleGenre = (genre: TMDbSelection) => {
    if (selectedGenres.some((g) => g.id === genre.id)) {
      setSelectedGenres((prev) => prev.filter((g) => g.id !== genre.id));
    } else {
      setSelectedGenres((prev) => [...prev, genre]);
    }
  };

  // Submit Preference Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const req: PreferenceRequest = {
      similar_movies: similarMovies,
      preferred_genres: selectedGenres,
      preferred_cast: preferredCast,
      preferred_crew: preferredCrew,
      runtime_min: minRuntime !== '' ? Number(minRuntime) : undefined,
      runtime_max: maxRuntime !== '' ? Number(maxRuntime) : undefined,
      free_text: freeText || undefined,
    };

    try {
      const savedPref = await preferenceApi.createPreference(req);
      
      if (roomId) {
        // Link to the room
        await roomApi.selectRoomPreference(roomId, savedPref.pref_id);
        navigate(`/rooms/${roomId}`);
      } else {
        // Fetch recommendations inline
        setRecsLoading(true);
        try {
          const data = await recommendationsApi.getSoloRecommendations();
          setRecommendations(data);
        } catch (err) {
          console.error("Failed to load recommendations", err);
          setError("Your preferences were saved, but generating movie recommendations failed. Please try again.");
        } finally {
          setRecsLoading(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to save preference', err);
      setError(err.response?.data?.detail || 'Failed to save recommendations preset.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#00c030] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#9ab] text-sm font-semibold">Loading preferences form...</p>
      </div>
    );
  }

  if (recsLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#00c030] border-t-transparent rounded-full animate-spin mb-3 animate-pulse"></div>
        <p className="text-white text-sm font-bold">Querying TMDb discover engine...</p>
        <p className="text-[#9ab] text-xs mt-1">Filtering candidates against your preferences</p>
      </div>
    );
  }

  // If recommendations have been fetched, render the results view
  if (recommendations) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#24303c] pb-5">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-[#00c030] fill-[#00c030]/15" />
              Your Recommendations
            </h1>
            <p className="text-xs text-[#9ab] mt-1">
              Top 10 movie matches found from TMDb matching your active preferences.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setRecommendations(null)}
              className="px-4 py-2 bg-[#24303c] hover:bg-[#303840] border border-[#303840] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              Tweak Preferences
            </button>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-[#00c030] hover:bg-[#00a828] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit to Dashboard
            </Link>
          </div>
        </div>

        <RecommendationResults movies={recommendations} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header breadcrumb */}
      <div className="mb-6">
        <Link
          to={roomId ? `/rooms/${roomId}` : "/dashboard"}
          className="inline-flex items-center gap-1.5 text-sm text-[#9ab] hover:text-[#00c030] font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {roomId ? 'Back to Lobby' : 'Back to Dashboard'}
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-8 h-8 text-[#00c030] fill-[#00c030]/10" />
            {roomId ? 'Lobby Movie Preferences' : 'Movie Recommendation Preferences'}
          </h1>
          <p className="text-[#9ab] mt-1.5 text-sm">
            {roomId 
              ? 'Specify your movie preferences specifically for this group session.' 
              : 'Tune your preferences below. We use these filters to search TMDb and fine-tune your recommendations.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[#ff8000]/10 border border-[#ff8000]/30 text-[#ff8000] text-sm p-4 rounded-lg mb-8">
          {error}
        </div>
      )}

      {/* Main Grid Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Movie Genres */}
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#24303c] pb-2">
              1. Movie Genres
            </h2>
            <p className="text-xs text-[#9ab] mb-2">Select your favourite genres.</p>
            <GenreSelector
              selectedGenres={selectedGenres}
              onToggleGenre={handleToggleGenre}
            />
            <SelectedItemsList
              items={selectedGenres}
              type="genre"
              favourites={genreFavs}
              onRemove={(item) => setSelectedGenres((prev) => prev.filter((g) => g.id !== item.id))}
              onToggleFavourite={(item, isFav) => handleToggleFavourite(item, 'genre', isFav)}
            />
            <FavouriteSuggestions
              favourites={genreFavs}
              selectedIds={selectedGenres.map((g) => g.id)}
              onSelect={(item) => setSelectedGenres((prev) => [...prev, item])}
            />
          </div>

          {/* Similar Movies */}
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#24303c] pb-2">
              2. Similar Movies
            </h2>
            <p className="text-xs text-[#9ab] mb-2">
              Find recommendations based on movies you love. Search TMDb and add them.
            </p>
            <MovieSearchInput
              selectedMovies={similarMovies}
              onSelectMovie={(movie) => setSimilarMovies((prev) => [...prev, movie])}
            />
            <SelectedItemsList
              items={similarMovies}
              type="movie"
              favourites={movieFavs}
              onRemove={(item) => setSimilarMovies((prev) => prev.filter((m) => m.id !== item.id))}
              onToggleFavourite={(item, isFav) => handleToggleFavourite(item, 'movie', isFav)}
            />
            <FavouriteSuggestions
              favourites={movieFavs}
              selectedIds={similarMovies.map((m) => m.id)}
              onSelect={(item) => setSimilarMovies((prev) => [...prev, item])}
            />
          </div>

          {/* Preferred Cast Members */}
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#24303c] pb-2">
              3. Preferred Cast Members
            </h2>
            <p className="text-xs text-[#9ab] mb-2">Search and add actors you want to see in the movies.</p>
            <PersonSearchInput
              selectedPeople={preferredCast}
              onSelectPerson={(person) => setPreferredCast((prev) => [...prev, person])}
              placeholder="Search actors (e.g. Leonardo DiCaprio, Timothée Chalamet)..."
            />
            <SelectedItemsList
              items={preferredCast}
              type="cast"
              favourites={castFavs}
              onRemove={(item) => setPreferredCast((prev) => prev.filter((p) => p.id !== item.id))}
              onToggleFavourite={(item, isFav) => handleToggleFavourite(item, 'cast', isFav)}
            />
            <FavouriteSuggestions
              favourites={castFavs}
              selectedIds={preferredCast.map((p) => p.id)}
              onSelect={(item) => setPreferredCast((prev) => [...prev, item])}
            />
          </div>

          {/* Preferred Crew Members */}
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#24303c] pb-2">
              4. Preferred Crew Members
            </h2>
            <p className="text-xs text-[#9ab] mb-2">Search and add directors, writers, or crew members.</p>
            <PersonSearchInput
              selectedPeople={preferredCrew}
              onSelectPerson={(person) => setPreferredCrew((prev) => [...prev, person])}
              placeholder="Search directors/crew (e.g. Christopher Nolan, Greta Gerwig)..."
            />
            <SelectedItemsList
              items={preferredCrew}
              type="crew"
              favourites={crewFavs}
              onRemove={(item) => setPreferredCrew((prev) => prev.filter((p) => p.id !== item.id))}
              onToggleFavourite={(item, isFav) => handleToggleFavourite(item, 'crew', isFav)}
            />
            <FavouriteSuggestions
              favourites={crewFavs}
              selectedIds={preferredCrew.map((p) => p.id)}
              onSelect={(item) => setPreferredCrew((prev) => [...prev, item])}
            />
          </div>

          {/* Runtime Range */}
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#24303c] pb-2">
              5. Runtime Limit
            </h2>
            <RuntimeSelector
              minRuntime={minRuntime}
              maxRuntime={maxRuntime}
              onChangeMin={setMinRuntime}
              onChangeMax={setMaxRuntime}
            />
          </div>

          {/* Free-text Instructions */}
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl">
            <FreeTextInput value={freeText} onChange={setFreeText} />
          </div>
        </div>

        {/* Right Column - Live Session Summary Card */}
        <div className="space-y-6">
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl sticky top-8 space-y-5">
            <h3 className="font-extrabold text-base border-b border-[#24303c] pb-3 text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00c030]" />
              Live Preset Summary
            </h3>

            <div className="space-y-4 text-xs">
              {/* Selected Genres Summary */}
              <div>
                <p className="text-[10px] font-extrabold uppercase text-[#9ab] tracking-wider mb-1">
                  Selected Genres ({selectedGenres.length})
                </p>
                {selectedGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedGenres.map((g) => (
                      <span
                        key={g.id}
                        className="bg-[#24303c] border border-[#303840] text-white px-2 py-0.5 rounded text-[10px] font-semibold"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#9ab] italic">None selected</p>
                )}
              </div>

              {/* Similar Movies Summary */}
              <div>
                <p className="text-[10px] font-extrabold uppercase text-[#9ab] tracking-wider mb-1">
                  Similar Movies ({similarMovies.length})
                </p>
                {similarMovies.length > 0 ? (
                  <p className="text-white font-medium">{similarMovies.map((m) => m.name).join(', ')}</p>
                ) : (
                  <p className="text-[#9ab] italic">None selected</p>
                )}
              </div>

              {/* Cast Summary */}
              <div>
                <p className="text-[10px] font-extrabold uppercase text-[#9ab] tracking-wider mb-1">
                  Preferred Cast ({preferredCast.length})
                </p>
                {preferredCast.length > 0 ? (
                  <p className="text-white font-medium">{preferredCast.map((c) => c.name).join(', ')}</p>
                ) : (
                  <p className="text-[#9ab] italic">None selected</p>
                )}
              </div>

              {/* Crew Summary */}
              <div>
                <p className="text-[10px] font-extrabold uppercase text-[#9ab] tracking-wider mb-1">
                  Preferred Crew ({preferredCrew.length})
                </p>
                {preferredCrew.length > 0 ? (
                  <p className="text-white font-medium">{preferredCrew.map((c) => c.name).join(', ')}</p>
                ) : (
                  <p className="text-[#9ab] italic">None selected</p>
                )}
              </div>

              {/* Runtime Summary */}
              <div>
                <p className="text-[10px] font-extrabold uppercase text-[#9ab] tracking-wider mb-1">
                  Runtime Limits
                </p>
                {minRuntime || maxRuntime ? (
                  <p className="text-white font-medium">
                    {minRuntime ? `${minRuntime}m` : 'No min'} - {maxRuntime ? `${maxRuntime}m` : 'No max'}
                  </p>
                ) : (
                  <p className="text-[#9ab] italic">Any length</p>
                )}
              </div>

              {/* Custom instructions Summary */}
              {freeText.trim() && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-[#9ab] tracking-wider mb-1">
                    Custom Instructions
                  </p>
                  <p className="text-[#9ab] italic line-clamp-3">"{freeText}"</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#00c030] hover:bg-[#00a828] text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-1.5 shadow-lg shadow-[#00c030]/20 text-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving Preset...' : 'Save Preference'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
