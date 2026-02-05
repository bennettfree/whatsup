import { apiClient, API_BASE_URL, ENABLE_MOCK_DATA } from './apiClient';
import { apiCache } from '@/utils/apiCache';

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
  type?: string; // Category filter (e.g., 'bar', 'restaurant')
}

type GooglePlaceResult = any;

// Track backend availability to prevent infinite error loops
let backendUnavailable = false;
let lastErrorTime = 0;
const ERROR_THROTTLE_MS = 10000; // Only log error once per 10 seconds

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

    // If backend was previously unavailable, skip silently to prevent error spam
    if (backendUnavailable) {
      return [];
    }

    const query: Record<string, string | number> = {
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
    };
    if (params.query) query.query = params.query;
    if (params.type) query.type = params.type;

    // Check cache first
    const cacheKey = apiCache.generateKey({ ...query, endpoint: 'places' });
    const cached = apiCache.get<Place[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const places = await apiClient.get<Place[]>('/api/places', { params: query });
      backendUnavailable = false; // Reset if successful
      
      // Cache successful results
      apiCache.set(cacheKey, places);
      
      return places;
    } catch (error: any) {
      // Mark backend as unavailable on network error, timeout, or 404
      if (error?.message?.includes('Network Error') || 
          error?.message?.includes('timeout') ||
          error?.response?.status === 404) {
        backendUnavailable = true;
        const now = Date.now();
        if (__DEV__ && now - lastErrorTime > ERROR_THROTTLE_MS) {
          if (error?.message?.includes('timeout')) {
            console.warn(
              ENABLE_MOCK_DATA
                ? '[placesService] Backend timeout (API keys may be missing). Mock fallback is enabled.'
                : '[placesService] Backend timeout (API keys may be missing).',
            );
          } else {
            console.warn(
              ENABLE_MOCK_DATA
                ? '[placesService] Backend unavailable. Mock fallback is enabled. Run: npm run dev:api'
                : '[placesService] Backend unavailable. Run: npm run dev:api',
            );
          }
          lastErrorTime = now;
        }
      } else if (__DEV__) {
        console.warn('[placesService] Failed to fetch places:', error?.message);
      }
      return [];
    }
  },
};

