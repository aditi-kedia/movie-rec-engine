import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { roomApi } from '../services/room';
import type { RoomResponse } from '../services/room';
import { preferenceApi } from '../services/preferences';
import type { PreferenceResponse } from '../services/preferences';
import { Film, Plus, Users, ArrowRight, ArrowLeft, Users2, Compass } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'choice' | 'group'>('choice');
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [latestPref, setLatestPref] = useState<PreferenceResponse | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const activeRooms = await roomApi.getActiveRooms();
      setRooms(activeRooms);
    } catch (err) {
      console.error("Failed to load rooms", err);
    } finally {
      setRoomsLoading(false);
    }

    try {
      const latest = await preferenceApi.getLatestPreference();
      setLatestPref(latest.pref_id ? latest : null);
    } catch (err) {
      console.error("Failed to load latest preference", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRoom = async () => {
    setActionError(null);
    try {
      const newRoom = await roomApi.createRoom();
      setRooms([newRoom, ...rooms]);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || "Failed to create room.");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setActionError(null);
    try {
      const joined = await roomApi.joinRoom(roomCode);
      if (!rooms.some(r => r.room_id === joined.room_id)) {
        setRooms([joined, ...rooms]);
      }
      setRoomCode('');
    } catch (err: any) {
      setActionError(err.response?.data?.detail || "Failed to join room. Verify code is active.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[80vh]">
      {actionError && (
        <div className="w-full max-w-2xl bg-[#ff8000]/10 border border-[#ff8000]/30 text-[#ff8000] text-sm p-4 rounded-lg mb-8">
          {actionError}
        </div>
      )}

      {viewMode === 'choice' ? (
        <div className="w-full max-w-2xl text-center space-y-12 animate-fade-in">
          {/* Question / Welcome Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-[#00c030]/10 border border-[#00c030]/20 rounded-2xl mb-2 text-[#00c030]">
              <Film className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              How are you watching a movie today?
            </h1>
            <p className="text-[#9ab] max-w-md mx-auto text-sm md:text-base">
              Select an option below to tailor your recommendation session or join a lobby with friends.
            </p>
          </div>

          {/* Big Selectable Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {/* Solo Card */}
            <button
              onClick={() => navigate('/preferences')}
              className="bg-[#1c252d] border border-[#24303c] hover:border-[#00c030] rounded-2xl p-8 text-left transition-all shadow-xl group hover:-translate-y-1 flex flex-col justify-between min-h-[220px] cursor-pointer"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#00c030]/10 rounded-xl flex items-center justify-center text-[#00c030] group-hover:bg-[#00c030] group-hover:text-white transition-all">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white group-hover:text-[#00c030] transition-colors">
                    Watch Solo
                  </h3>
                  <p className="text-xs text-[#9ab] mt-1.5 leading-relaxed">
                    Set up your personal preferences, genres, cast, and runtime limits to generate individual movie recommendations.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#00c030] mt-6 group-hover:translate-x-1.5 transition-transform">
                Configure taste profile <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Group Card */}
            <button
              onClick={() => setViewMode('group')}
              className="bg-[#1c252d] border border-[#24303c] hover:border-[#40bcf4] rounded-2xl p-8 text-left transition-all shadow-xl group hover:-translate-y-1 flex flex-col justify-between min-h-[220px] cursor-pointer"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#40bcf4]/10 rounded-xl flex items-center justify-center text-[#40bcf4] group-hover:bg-[#40bcf4] group-hover:text-white transition-all">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white group-hover:text-[#40bcf4] transition-colors">
                    With a Group
                  </h3>
                  <p className="text-xs text-[#9ab] mt-1.5 leading-relaxed">
                    Host or join a virtual room lobby. Combine tastes with friends to discover movies that satisfy everyone in the room.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#40bcf4] mt-6 group-hover:translate-x-1.5 transition-transform">
                Lobby room dashboard <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* Room logic view */
        <div className="w-full max-w-2xl bg-[#1c252d] border border-[#24303c] rounded-2xl p-8 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b border-[#24303c] pb-4">
            <button
              onClick={() => setViewMode('choice')}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#9ab] hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <h2 className="font-black text-xl text-white flex items-center gap-2">
              <Users2 className="w-5 h-5 text-[#40bcf4]" />
              Group Room Lobbies
            </h2>
          </div>

          <p className="text-xs text-[#9ab]">
            Host a new room or join an active one using a room code to combine tastes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Host Button Card */}
            <div className="p-5 bg-[#24303c]/40 border border-[#303840] rounded-xl flex flex-col justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-white">Host a Lobby</h4>
                <p className="text-[11px] text-[#9ab] mt-1">Create a room and invite others using a code.</p>
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full py-2.5 bg-[#40bcf4] hover:bg-[#34a7db] text-white rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Room
              </button>
            </div>

            {/* Join Form Card */}
            <form onSubmit={handleJoinRoom} className="p-5 bg-[#24303c]/40 border border-[#303840] rounded-xl flex flex-col justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-white">Join a Lobby</h4>
                <p className="text-[11px] text-[#9ab] mt-1">Enter a friends lobby room code.</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="CODE"
                  className="w-full bg-[#24303c] border border-[#303840] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#40bcf4] placeholder-[#9ab]/40 uppercase tracking-widest font-black text-center text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1c252d] border border-[#303840] hover:border-[#40bcf4] hover:bg-[#40bcf4] text-white rounded-lg font-bold text-xs transition-all cursor-pointer"
                >
                  Join
                </button>
              </div>
            </form>
          </div>

          {/* List Active Rooms */}
          <div className="space-y-3 pt-4 border-t border-[#24303c]">
            <h3 className="text-xs font-bold text-[#9ab] uppercase tracking-wider">Active Lobbies</h3>
            {roomsLoading ? (
              <div className="h-16 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#40bcf4] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : rooms.length > 0 ? (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div key={room.room_id} className="flex items-center justify-between p-4 bg-[#24303c] border border-[#303840] rounded-xl hover:border-[#40bcf4] transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs tracking-widest text-[#40bcf4] bg-[#40bcf4]/10 py-0.5 px-2 rounded border border-[#40bcf4]/20">
                          {room.room_code}
                        </span>
                        <span className="text-[10px] text-[#9ab]">Hosted by {room.host?.username || `User #${room.host_id}`}</span>
                      </div>
                      <p className="text-[10px] text-[#9ab] mt-1.5 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {room.members.length} {room.members.length === 1 ? 'member' : 'members'} active
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {latestPref && !room.members.find(m => m.user_id === user?.user_id)?.pref_id && (
                        <button
                          onClick={async () => {
                            try {
                              await roomApi.selectRoomPreference(room.room_id, latestPref.pref_id);
                              loadData();
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="bg-[#00c030]/10 hover:bg-[#00c030]/20 border border-[#00c030]/30 text-[#00c030] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
                        >
                          Use My Pref
                        </button>
                      )}
                      <Link
                        to={`/rooms/${room.room_id}`}
                        className="bg-[#40bcf4]/15 hover:bg-[#40bcf4] border border-[#40bcf4]/30 hover:border-[#40bcf4] text-[#40bcf4] hover:text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
                      >
                        Enter Lobby
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center bg-[#24303c]/20 border border-[#303840] rounded-xl text-[#9ab] text-xs">
                You are not in any active rooms. Create or join one above!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
