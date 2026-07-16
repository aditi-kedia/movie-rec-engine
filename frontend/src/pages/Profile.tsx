import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/user';
import { favouritesApi, type FavouriteResponse } from '../services/favourites';
import { MovieSearchInput } from '../components/preferences/MovieSearchInput';
import type { TMDbSelection } from '../services/preferences';
import { 
  Film, 
  User, 
  Mail, 
  Save, 
  Loader2, 
  Award, 
  Plus, 
  X, 
  Heart, 
  HeartCrack, 
  Sparkles, 
  Clapperboard, 
  Users2, 
  Smile 
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  
  // Profile state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Top 4 Favorite Movies states
  const [favMovies, setFavMovies] = useState<TMDbSelection[]>([]);
  const [favsSaving, setFavsSaving] = useState(false);

  // Preference forms favourites states
  const [rawFavourites, setRawFavourites] = useState<FavouriteResponse[]>([]);
  const [favouritesLoading, setFavouritesLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      
      // Map legacy string movie titles or new object structures
      const initialFavs = (user.favourite_movies || []).map((item: any) => {
        if (typeof item === 'string') {
          return { id: Math.floor(Math.random() * 1000000), name: item };
        }
        return item as TMDbSelection;
      });
      setFavMovies(initialFavs);
    }
  }, [user]);

  // Load user favourites from backend database
  const loadFavourites = async () => {
    setFavouritesLoading(true);
    try {
      const data = await favouritesApi.getFavourites();
      setRawFavourites(data);
    } catch (err) {
      console.error('Failed to load user favourites from DB', err);
    } finally {
      setFavouritesLoading(false);
    }
  };

  useEffect(() => {
    loadFavourites();
  }, []);

  const handleCancel = () => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
    setIsEditing(false);
    setProfileMsg(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      await userApi.updateProfile({ username, email });
      await refreshUser();
      setProfileMsg({ type: 'success', text: 'Account details updated successfully.' });
      setIsEditing(false);
    } catch (err: any) {
      setProfileMsg({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to update account details.' 
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateFavorites = async (e: React.FormEvent) => {
    e.preventDefault();
    setFavsSaving(true);
    setProfileMsg(null);

    try {
      await userApi.updateProfile({ favourite_movies: favMovies });
      await refreshUser();
      setProfileMsg({ type: 'success', text: 'Your 4 favourite movies have been updated!' });
    } catch (err: any) {
      setProfileMsg({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to update favourite movies.' 
      });
    } finally {
      setFavsSaving(false);
    }
  };

  const handleAddFavMovie = (movie: TMDbSelection) => {
    if (favMovies.some(m => m.id === movie.id)) {
      setProfileMsg({ type: 'error', text: `"${movie.name}" is already in your top 4.` });
      return;
    }
    if (favMovies.length >= 4) {
      setProfileMsg({ type: 'error', text: 'You can only have up to 4 favourite movies on your shelf.' });
      return;
    }
    setFavMovies(prev => [...prev, movie]);
    setProfileMsg(null);
  };

  const handleRemoveFavMovie = (id: number) => {
    setFavMovies(prev => prev.filter(m => m.id !== id));
  };

  const handleRemoveDbFavourite = async (type: 'movie' | 'genre' | 'cast' | 'crew', itemId: number) => {
    try {
      await favouritesApi.deleteFavouriteByTmdboard(type, itemId);
      setRawFavourites(prev => prev.filter(f => !(f.type === type && f.item_id === itemId)));
    } catch (err) {
      console.error(`Failed to remove DB favourite of type ${type}`, err);
    }
  };

  // Group favourites by type
  const dbGenres = rawFavourites.filter(f => f.type === 'genre');
  const dbCast = rawFavourites.filter(f => f.type === 'cast');
  const dbCrew = rawFavourites.filter(f => f.type === 'crew');
  const dbMovies = rawFavourites.filter(f => f.type === 'movie');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Header Banner */}
      <div className="relative bg-[#1c252d] border border-[#24303c] rounded-2xl p-6 sm:p-8 overflow-hidden shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#00c030]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-[#40bcf4]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 sm:gap-6 text-center sm:text-left flex-col sm:flex-row">
          <div className="w-16 h-16 bg-[#ff8000]/10 border border-[#ff8000]/30 rounded-2xl flex items-center justify-center text-[#ff8000] shadow-inner flex-shrink-0 animate-pulse">
            <Award className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
              Profile & Preferences
            </h1>
            <p className="text-xs sm:text-sm text-[#9ab] mt-1">
              Manage your personal credentials, showcase your top 4 movies, and manage forms preferences.
            </p>
          </div>
        </div>
        
        <div className="bg-[#24303c] border border-[#303840] rounded-xl px-4 py-2 text-center text-xs">
          <span className="text-[#9ab] block">Member Since</span>
          <span className="text-white font-bold">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'N/A'}
          </span>
        </div>
      </div>

      {profileMsg && (
        <div className={`p-4 rounded-xl text-sm border flex items-center justify-between animate-fade-in ${
          profileMsg.type === 'success' 
            ? 'bg-[#00c030]/10 border-[#00c030]/30 text-[#00c030]' 
            : 'bg-[#ff8000]/10 border-[#ff8000]/30 text-[#ff8000]'
        }`}>
          <span>{profileMsg.text}</span>
          <button 
            onClick={() => setProfileMsg(null)}
            className="p-1 rounded-full hover:bg-white/10 text-current transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Account Details (Span 2) */}
        <div className="lg:col-span-2 bg-[#1c252d] border border-[#24303c] rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
          <div>
            <h2 className="font-black text-lg border-b border-[#24303c] pb-3 text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#40bcf4]" />
              Account Details
            </h2>
            <p className="text-xs text-[#9ab] mt-1.5 mb-6">Update your login username and active email address.</p>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-[10px] font-bold text-[#9ab] uppercase tracking-wider mb-2">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#9ab] pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!isEditing}
                    className={`block w-full pl-10 pr-4 py-2.5 bg-[#24303c] border border-[#303840] rounded-xl text-white focus:outline-none focus:border-[#40bcf4] text-sm transition-colors ${
                      !isEditing ? 'opacity-65 cursor-not-allowed select-none bg-[#1c252d]/50' : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-[10px] font-bold text-[#9ab] uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#9ab] pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    className={`block w-full pl-10 pr-4 py-2.5 bg-[#24303c] border border-[#303840] rounded-xl text-white focus:outline-none focus:border-[#40bcf4] text-sm transition-colors ${
                      !isEditing ? 'opacity-65 cursor-not-allowed select-none bg-[#1c252d]/50' : ''
                    }`}
                  />
                </div>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-[#40bcf4] hover:bg-[#34a7db] transition-all cursor-pointer shadow-lg shadow-[#40bcf4]/10"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-[#9ab] bg-[#24303c] border border-[#303840] hover:bg-[#303840] hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-[#00c030] hover:bg-[#00a828] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-[#00c030]/10"
                  >
                    {profileLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Top 4 Favourites (Span 3) */}
        <div className="lg:col-span-3 bg-[#1c252d] border border-[#24303c] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#24303c] pb-3 gap-2">
            <div>
              <h2 className="font-black text-lg text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-[#ff8000]" />
                Top 4 Favourite Movies
              </h2>
              <p className="text-xs text-[#9ab] mt-1">Select your ultimate top 4 movies directly from TMDb database.</p>
            </div>
            {favMovies.length > 0 && (
              <button
                onClick={handleUpdateFavorites}
                disabled={favsSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00c030] hover:bg-[#00a828] transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#00c030]/10"
              >
                {favsSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Top 4
              </button>
            )}
          </div>

          {/* TMDb Auto-Complete search to select movie */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#9ab] uppercase tracking-wider mb-1">
              Search to Add Movie ({favMovies.length}/4)
            </label>
            <MovieSearchInput
              selectedMovies={favMovies}
              onSelectMovie={handleAddFavMovie}
            />
          </div>

          {/* Interactive Movie Poster Shelf */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {[0, 1, 2, 3].map((index) => {
              const movie = favMovies[index];
              if (movie) {
                return (
                  <div 
                    key={movie.id} 
                    className="relative group bg-[#24303c] border border-[#303840] rounded-xl overflow-hidden shadow-lg aspect-[2/3] flex flex-col justify-between hover:border-[#ff8000] hover:scale-[1.02] transition-all"
                  >
                    {/* Poster Picture */}
                    {movie.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                        alt={movie.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#24303c]">
                        <Clapperboard className="w-8 h-8 text-[#9ab] mb-2" />
                        <span className="text-[10px] font-bold text-white line-clamp-3">{movie.name}</span>
                      </div>
                    )}

                    {/* Hover Remove overlay */}
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                      <button
                        onClick={() => handleRemoveFavMovie(movie.id)}
                        className="p-2 bg-[#ff4b4b] hover:bg-[#e03b3b] text-white rounded-full transition-all hover:scale-110 mb-2 cursor-pointer shadow-lg shadow-[#ff4b4b]/20"
                        title="Remove from Shelf"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-bold text-white line-clamp-2 px-1">{movie.name}</span>
                    </div>
                    
                    {/* Visual Tag */}
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-black text-[#ff8000] tracking-wider select-none">
                      SLOT {index + 1}
                    </div>
                  </div>
                );
              }

              // Empty Slot render
              return (
                <div 
                  key={`empty-${index}`} 
                  className="border-2 border-dashed border-[#303840] rounded-xl aspect-[2/3] flex flex-col items-center justify-center text-center p-4 text-[#9ab] hover:border-[#ff8000] transition-colors"
                >
                  <Plus className="w-6 h-6 mb-2 opacity-40 text-[#9ab]" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide">Slot {index + 1}</span>
                  <span className="text-[9px] opacity-60 mt-0.5">Empty</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Favourites from Preference Forms */}
      <div className="bg-[#1c252d] border border-[#24303c] rounded-2xl p-6 sm:p-8 shadow-xl space-y-8 relative">
        <div className="absolute right-8 top-8 w-32 h-32 bg-[#00c030]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="border-b border-[#24303c] pb-4">
          <h2 className="font-black text-xl text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#00c030]" />
            Form Preference Favourites
          </h2>
          <p className="text-xs sm:text-sm text-[#9ab] mt-1">
            These are the genres, actors, and directors you favorited (hearted) while filling out preference forms.
          </p>
        </div>

        {favouritesLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#00c030]" />
            <span className="text-xs text-[#9ab]">Querying active favorites...</span>
          </div>
        ) : rawFavourites.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#9ab] border border-dashed border-[#24303c] rounded-xl flex flex-col items-center justify-center gap-2">
            <Heart className="w-10 h-10 opacity-30 text-[#9ab]" />
            <span className="font-extrabold text-sm text-white">No form favourites saved yet</span>
            <span className="max-w-xs">Heart genres, movies, cast, and crew members while adjusting preference forms to view them on your bookshelf.</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Favourite Genres */}
            {dbGenres.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-[#9ab] tracking-wider flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-[#ff8000]" />
                  Favourited Genres ({dbGenres.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dbGenres.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-[#24303c] border border-[#303840] hover:border-[#00c030]/40 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md group"
                    >
                      <span>{item.name}</span>
                      <button
                        onClick={() => handleRemoveDbFavourite('genre', item.item_id)}
                        className="p-1 rounded-full text-[#9ab] hover:text-[#ff4b4b] hover:bg-[#14181c] transition-colors cursor-pointer"
                        title="Unfavourite genre"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Favourite Cast Members */}
            {dbCast.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-[#9ab] tracking-wider flex items-center gap-1.5">
                  <Users2 className="w-4 h-4 text-[#40bcf4]" />
                  Favourited Cast Members ({dbCast.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {dbCast.map((person) => (
                    <div 
                      key={person.id}
                      className="bg-[#24303c] border border-[#303840] rounded-xl p-3 flex flex-col items-center text-center relative group hover:border-[#40bcf4] transition-all shadow-md"
                    >
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-[#303840] bg-[#1c252d] flex items-center justify-center mb-2 shadow-inner">
                        {person.meta?.profile_path ? (
                          <img 
                            src={`https://image.tmdb.org/t/p/w185${person.meta.profile_path}`}
                            alt={person.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-[#9ab]" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white line-clamp-2 w-full">{person.name}</span>
                      
                      {/* Unheart Overlay icon */}
                      <button
                        onClick={() => handleRemoveDbFavourite('cast', person.item_id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-[#ff8000] hover:text-[#ff4b4b] hover:bg-black transition-colors cursor-pointer opacity-100 sm:opacity-0 group-hover:opacity-100"
                        title="Remove favourite"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Favourite Crew Members */}
            {dbCrew.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-[#9ab] tracking-wider flex items-center gap-1.5">
                  <Clapperboard className="w-4 h-4 text-[#00c030]" />
                  Favourited Crew Members ({dbCrew.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {dbCrew.map((person) => (
                    <div 
                      key={person.id}
                      className="bg-[#24303c] border border-[#303840] rounded-xl p-3 flex flex-col items-center text-center relative group hover:border-[#00c030] transition-all shadow-md"
                    >
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-[#303840] bg-[#1c252d] flex items-center justify-center mb-2 shadow-inner">
                        {person.meta?.profile_path ? (
                          <img 
                            src={`https://image.tmdb.org/t/p/w185${person.meta.profile_path}`}
                            alt={person.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-[#9ab]" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white line-clamp-2 w-full">{person.name}</span>
                      
                      {/* Unheart Overlay icon */}
                      <button
                        onClick={() => handleRemoveDbFavourite('crew', person.item_id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-[#ff8000] hover:text-[#ff4b4b] hover:bg-black transition-colors cursor-pointer opacity-100 sm:opacity-0 group-hover:opacity-100"
                        title="Remove favourite"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Other Favourited Movies from Preference Form */}
            {dbMovies.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-[#9ab] tracking-wider flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-[#ff8000]" />
                  Other Favourited Movies ({dbMovies.length})
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-4">
                  {dbMovies.map((movie) => (
                    <div 
                      key={movie.id}
                      className="bg-[#24303c] border border-[#303840] rounded-xl overflow-hidden relative group hover:border-[#ff8000] transition-all shadow-md aspect-[2/3] flex flex-col justify-between"
                    >
                      {movie.meta?.poster_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w92${movie.meta.poster_path}`}
                          alt={movie.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-[#24303c]">
                          <Clapperboard className="w-6 h-6 text-[#9ab] mb-1" />
                          <span className="text-[9px] font-bold text-white line-clamp-3">{movie.name}</span>
                        </div>
                      )}

                      {/* Unheart Overlay icon */}
                      <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                        <button
                          onClick={() => handleRemoveDbFavourite('movie', movie.item_id)}
                          className="p-1.5 bg-[#ff4b4b] hover:bg-[#e03b3b] text-white rounded-full transition-all hover:scale-110 mb-1 cursor-pointer"
                          title="Remove movie favourite"
                        >
                          <HeartCrack className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[8px] font-bold text-white line-clamp-2">{movie.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
