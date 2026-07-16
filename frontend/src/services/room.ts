import api from './api';
import type { UserResponse } from './auth';
import type { PreferenceResponse } from './preferences';

export interface GroupMemberResponse {
  room_id: number;
  user_id: number;
  pref_id?: number;
  user?: UserResponse;
  preference?: PreferenceResponse;
}

export interface RoomResponse {
  room_id: number;
  host_id: number;
  room_code: string;
  status: string;
  created_at: string;
  host?: UserResponse;
  members: GroupMemberResponse[];
}

export const roomApi = {
  createRoom: async (): Promise<RoomResponse> => {
    const response = await api.post<RoomResponse>('/rooms');
    return response.data;
  },

  joinRoom: async (roomCode: string): Promise<RoomResponse> => {
    const response = await api.post<RoomResponse>('/rooms/join', { room_code: roomCode });
    return response.data;
  },

  getActiveRooms: async (): Promise<RoomResponse[]> => {
    const response = await api.get<RoomResponse[]>('/rooms/active');
    return response.data;
  },

  getRoomDetails: async (roomId: number): Promise<RoomResponse> => {
    const response = await api.get<RoomResponse>(`/rooms/${roomId}`);
    return response.data;
  },

  selectRoomPreference: async (roomId: number, prefId: number): Promise<GroupMemberResponse> => {
    const response = await api.put<GroupMemberResponse>(`/rooms/${roomId}/preference/${prefId}`);
    return response.data;
  },

  dissolveRoom: async (roomId: number): Promise<void> => {
    await api.delete(`/rooms/${roomId}`);
  },
};
