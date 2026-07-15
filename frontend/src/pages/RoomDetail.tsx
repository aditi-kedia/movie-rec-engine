import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { roomApi } from '../services/room';
import type { RoomResponse } from '../services/room';
import { preferenceApi } from '../services/preferences';
import type { PreferenceResponse } from '../services/preferences';
import { recommendationsApi } from '../services/recommendations';
import type { RecommendationMovie } from '../services/recommendations';
import { RecommendationResults } from '../components/preferences/RecommendationResults';

export const RoomDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const roomId = Number(id);
  const { user } = useAuth();
  
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationMovie[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomData = async (showLoadingState = false) => {
    if (showLoadingState) setLoading(true);
    try {
      const roomData = await roomApi.getRoomDetails(roomId);
      setRoom(roomData);

      // Check if all active members have configured preferences
      const activePrefsCount = roomData.members.filter(m => m.pref_id).length;
      if (activePrefsCount > 0) {
        // Fetch recommendations
        const recs = await recommendationsApi.getRoomRecommendations(roomId);
        setRecommendations(recs);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error('Failed to load room details', err);
      setError(err.response?.data?.detail || 'Failed to fetch group room lobbies details.');
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRoomData(true);
  }, [roomId]);

  // Real-time polling every 10 seconds to update lobby members and recommendations
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRoomData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [roomId]);

  // Polling updates room lobby details automatically

  const handleManualRefresh = async () => {
    setRecsLoading(true);
    setError(null);
    try {
      await fetchRoomData(false);
    } finally {
      setRecsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#40bcf4] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#9ab] text-sm font-semibold">Loading group lobby room...</p>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-[#ff8000]/10 border border-[#ff8000]/30 text-[#ff8000] text-sm p-4 rounded-lg">
          {error}
        </div>
        <Link to="/dashboard" className="text-xs text-[#40bcf4] hover:underline font-bold">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!room) return null;

  const currentMember = room.members.find(m => m.user_id === user?.user_id);
  const activePrefsCount = room.members.filter(m => m.pref_id).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header and Back Button */}
      <div className="flex justify-between items-center border-b border-[#24303c] pb-5">
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-[#9ab] hover:text-[#40bcf4] font-bold transition-all mb-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Lobbies Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-lg tracking-widest text-[#40bcf4] bg-[#40bcf4]/10 py-1 px-3.5 rounded border border-[#40bcf4]/20 shadow-md">
              {room.room_code}
            </span>
            <h1 className="text-2xl font-black text-white">Group Recommendation Lobby</h1>
          </div>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={recsLoading}
          className="px-4 py-2 bg-[#24303c] hover:bg-[#303840] border border-[#303840] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} />
          Refresh Room
        </button>
      </div>

      {error && (
        <div className="bg-[#ff8000]/10 border border-[#ff8000]/30 text-[#ff8000] text-sm p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Main Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Room Members and Preference Select */}
        <div className="lg:col-span-1 space-y-6">
          {/* Members Card */}
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#24303c] pb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#40bcf4]" />
              Lobby Members ({room.members.length})
            </h2>

            <div className="space-y-3">
              {room.members.map((member) => {
                const hasSelected = !!member.pref_id;
                const isSelf = member.user_id === user?.user_id;

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#24303c]/40 border border-[#303840]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-extrabold text-white truncate">
                        {member.user?.username || `User #${member.user_id}`}
                        {isSelf && <span className="text-[10px] text-[#40bcf4] ml-1 font-black">(YOU)</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasSelected ? (
                        <span className="text-[10px] font-bold text-[#00c030] flex items-center gap-1 bg-[#00c030]/10 py-1 px-2 border border-[#00c030]/20 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 fill-current text-[#14181c]" /> Ready
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#ff8000] flex items-center gap-1 bg-[#ff8000]/10 py-1 px-2 border border-[#ff8000]/20 rounded-full animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5 fill-current text-[#14181c]" /> Choosing
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lobby Preferences Submit & Edit Card */}
          {currentMember && (
            <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#24303c] pb-2">
                Your Lobby Preferences
              </h2>
              {currentMember.pref_id ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#00c030]/5 border border-[#00c030]/20 text-xs">
                    <p className="font-bold text-[#00c030] flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-4 h-4 fill-current text-[#14181c]" /> Preferences Active
                    </p>
                    <p className="text-[#9ab] leading-relaxed">
                      You have submitted preferences specifically for this lobby session. Your movie taste profile is injected into the group recommendation engine.
                    </p>
                  </div>
                  <Link
                    to={`/preferences?roomId=${roomId}`}
                    className="w-full text-center block bg-[#24303c] hover:bg-[#303840] border border-[#303840] text-white py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Update My Preferences
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#ff8000]/5 border border-[#ff8000]/20 text-xs">
                    <p className="font-bold text-[#ff8000] flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-4 h-4 fill-current text-[#14181c]" /> Action Required
                    </p>
                    <p className="text-[#9ab] leading-relaxed">
                      You haven't submitted your preferences for this group session yet. Submit a fresh profile to seed candidate recommendations.
                    </p>
                  </div>
                  <Link
                    to={`/preferences?roomId=${roomId}`}
                    className="w-full text-center block bg-[#00c030] hover:bg-[#00a828] text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-[#00c030]/10 cursor-pointer"
                  >
                    Submit Lobby Preferences
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Group Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1c252d] border border-[#24303c] rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#24303c] pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00c030] fill-[#00c030]/10" />
              Lobby Joint Movie Recommendations
            </h2>

            {recsLoading ? (
              <div className="py-20 flex flex-col justify-center items-center">
                <div className="w-8 h-8 border-4 border-[#00c030] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-white text-xs font-bold">Blending preferences and scoring movies...</p>
              </div>
            ) : activePrefsCount > 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-[#9ab] leading-relaxed">
                  Generated from <span className="text-white font-bold">{activePrefsCount}</span> active taste profiles. Matches are ranked by average score and adjusted for strict exclusions.
                </p>
                <RecommendationResults movies={recommendations} isGroup={true} />
              </div>
            ) : (
              <div className="py-20 text-center bg-[#24303c]/10 border border-dashed border-[#303840] rounded-xl flex flex-col items-center justify-center p-6">
                <Users className="w-12 h-12 text-[#9ab]/30 mb-4 animate-bounce" />
                <p className="font-extrabold text-base text-white mb-1">Waiting for preference profiles</p>
                <p className="text-xs text-[#9ab] max-w-sm">
                  At least one lobby member must select an active preference preset on the left side of the room to seed candidates and generate recommendations!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
