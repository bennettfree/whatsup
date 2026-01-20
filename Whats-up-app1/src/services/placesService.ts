import { apiClient, API_BASE_URL } from './apiClient';

export type Place = {
  id: string;
  type: 'place';

  name: string;
  category: string;

  rating?: number;
  reviewCount?: number;
  priceLevel?: number;

  imageUrl?: string;

  location: {
    latitude: number;
    longitude: number;
  };

  address?: string;

  isOpenNow?: boolean;
  url?: string;
  source: 'google';
};

export interface PlaceQuery {
  lat: number;
  lng: number;
  radius: number; // meters (match Google Places expectations)
  query?: string;
}

type GooglePlaceResult = any;

export const placesService = {
  async fetchPlaces(params: PlaceQuery): Promise<Place[]> {
    // If no backend URL is configured, skip network calls and fall back
    // to whatever the caller uses for mock data.
    if (!API_BASE_URL) {
      if (__DEV__) {
        console.warn(
          '[placesService] EXPO_PUBLIC_API_URL is not set; skipping places fetch.',
        );
      }
      return [];
    }

    const query: Record<string, string | number> = {
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
    };
    if (params.query) query.query = params.query;

    try {
      const places = await apiClient.get<Place[]>('/places', { params: query });
      return places;
    } catch (error) {
      if (__DEV__) {
        console.warn('[placesService] Failed to fetch places', error);
      }
      return [];
    }
  },
};

