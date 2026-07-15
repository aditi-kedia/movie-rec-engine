import api from './api';

export interface TMDbSelection {
  id: number;
  name: string;
  poster_path?: string;
  profile_path?: string;
}

export interface PreferenceRequest {
  similar_movies: TMDbSelection[];
  preferred_genres: TMDbSelection[];
  preferred_cast: TMDbSelection[];
  preferred_crew: TMDbSelection[];
  runtime_min?: number;
  runtime_max?: number;
  free_text?: string;
}

export interface PreferenceResponse extends PreferenceRequest {
  pref_id: number;
  user_id: number;
  created_at: string;
}

export const preferenceApi = {
  createPreference: async (data: PreferenceRequest): Promise<PreferenceResponse> => {
    const response = await api.post<PreferenceResponse>('/preferences', data);
    return response.data;
  },

  getPreferences: async (): Promise<PreferenceResponse[]> => {
    const response = await api.get<PreferenceResponse[]>('/preferences');
    return response.data;
  },

  getLatestPreference: async (): Promise<PreferenceResponse> => {
    const response = await api.get<PreferenceResponse>('/preferences/latest');
    return response.data;
  },
};
