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
}

export const recommendationsApi = {
  getSoloRecommendations: async (): Promise<RecommendationMovie[]> => {
    const response = await api.get<RecommendationMovie[]>('/recommendations/solo');
    return response.data;
  },

  getRoomRecommendations: async (roomId: number): Promise<RecommendationMovie[]> => {
    const response = await api.get<RecommendationMovie[]>(`/rooms/${roomId}/recommendations`);
    return response.data;
  },
};
