import api from './api';
import type { TMDbSelection } from './preferences';

export const tmdbApi = {
  searchMovies: async (query: string): Promise<TMDbSelection[]> => {
    const response = await api.get<TMDbSelection[]>('/tmdb/search/movie', {
      params: { query },
    });
    return response.data;
  },

  searchPeople: async (query: string): Promise<TMDbSelection[]> => {
    const response = await api.get<TMDbSelection[]>('/tmdb/search/person', {
      params: { query },
    });
    return response.data;
  },

  getGenres: async (): Promise<TMDbSelection[]> => {
    const response = await api.get<TMDbSelection[]>('/tmdb/genres');
    return response.data;
  },
};
