import api from './api';

export interface RecommendationMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  release_date: string;
  score: number;
  reasons: string[];
  individual_scores?: Record<string, number>; // Maps username -> match score
  director?: string;
  cast?: string[];
  runtime?: number;
  genres?: string[];
}

export const recommendationsApi = {
  getSoloRecommendations: async (relaxConstraints?: boolean): Promise<RecommendationMovie[]> => {
    const response = await api.get<RecommendationMovie[]>('/recommendations/solo', {
      params: { relax_constraints: relaxConstraints }
    });
    return response.data;
  },

  getRoomRecommendations: async (roomId: number, relaxConstraints?: boolean): Promise<RecommendationMovie[]> => {
    const response = await api.get<RecommendationMovie[]>(`/rooms/${roomId}/recommendations`, {
      params: { relax_constraints: relaxConstraints }
    });
    return response.data;
  },
};
