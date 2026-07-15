import api from './api';

export interface FavouriteRequest {
  type: 'movie' | 'genre' | 'cast' | 'crew';
  item_id: number;
  name: string;
  meta?: Record<string, any>;
}

export interface FavouriteResponse extends FavouriteRequest {
  id: number;
  user_id: number;
  created_at: string;
}

export const favouritesApi = {
  getFavourites: async (): Promise<FavouriteResponse[]> => {
    const response = await api.get<FavouriteResponse[]>('/favourites');
    return response.data;
  },

  saveFavourite: async (data: FavouriteRequest): Promise<FavouriteResponse> => {
    const response = await api.post<FavouriteResponse>('/favourites', data);
    return response.data;
  },

  deleteFavouriteById: async (id: number): Promise<void> => {
    await api.delete(`/favourites/${id}`);
  },

  deleteFavouriteByTmdboard: async (type: 'movie' | 'genre' | 'cast' | 'crew', itemId: number): Promise<void> => {
    await api.delete(`/favourites/${type}/${itemId}`);
  },
};
