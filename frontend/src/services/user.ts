import api from './api';
import type { UserResponse } from './auth';

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  favourite_movies?: any[];
}

export const userApi = {
  updateProfile: async (data: UserUpdateRequest): Promise<UserResponse> => {
    const response = await api.put<UserResponse>('/users/profile', data);
    return response.data;
  },
};
