import { apiClient, API_BASE_URL } from './apiClient';

export type SearchResult = {
  id: string;
  type: 'place' | 'event';
  title: string;
  imageUrl?: string;
  /**
   * Google Place Photos (New) photo resource name ("places/.../photos/...").
   * When present, the client should resolve it via `${EXPO_PUBLIC_API_URL}/api/place-photo`.
   */
  photoName?: string;
  category?: string;
  location: { latitude: number; longitude: number };
  startDate?: string;
  endDate?: string;
  venueName?: string;
  isFree?: boolean;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  address?: string;
  isOpenNow?: boolean;
  url?: string;
  distanceMeters?: number;
  score: number;
  reason: string;
};

export type SearchRequest = {
  query: string;
  userContext: {
    currentLocation?: { latitude: number; longitude: number };
    timezone: string;
    nowISO: string;
  };
};

export type SearchResponse = {
  results: SearchResult[];
  meta: {
    intentType: 'place' | 'event' | 'both';
    usedProviders: Array<'places' | 'events'>;
    usedAI: boolean;
    cacheHit: boolean;
  };
};

let backendUnavailable = false;
let lastBackendCheckMs = 0;
const BACKEND_RETRY_MS = 5000;
const BACKEND_OK_TTL_MS = 15000;

function nowMs(): number {
  return Date.now();
}

export const searchService = {
  /**
   * Best-effort health check to determine whether the backend is reachable.
   * When unreachable, callers must switch to mock paths (mutually exclusive).
   */
  async isBackendReachable(): Promise<boolean> {
    if (!API_BASE_URL) {
      console.log('🔴 No API_BASE_URL configured - using mock data');
      return false;
    }
    const now = nowMs();

    // If backend was recently confirmed reachable, avoid repeated health calls.
    if (!backendUnavailable && now - lastBackendCheckMs < BACKEND_OK_TTL_MS) {
      return true;
    }

    // Throttle checks when we recently marked it unavailable.
    if (backendUnavailable && now - lastBackendCheckMs < BACKEND_RETRY_MS) {
      console.log('🔴 Backend recently unavailable, throttling retry');
      return false;
    }

    lastBackendCheckMs = now;
    try {
      console.log('🔍 Checking backend health at:', API_BASE_URL);
      await apiClient.get('/api/health');
      backendUnavailable = false;
      console.log('✅ Backend is reachable!');
      return true;
    } catch (error) {
      console.log('🔴 Backend unreachable:', error instanceof Error ? error.message : 'Unknown error');
      backendUnavailable = true;
      return false;
    }
  },

  /**
   * Executes a unified search against /api/search.
   * Never throws: returns null on failure.
   */
  async search(request: SearchRequest): Promise<SearchResponse | null> {
    if (!API_BASE_URL) {
      console.log('🔴 No API_BASE_URL - cannot search');
      return null;
    }
    if (backendUnavailable) {
      console.log('🔴 Backend marked unavailable - skipping search');
      return null;
    }

    try {
      console.log('🔍 Searching backend:', request.query);
      const response = await apiClient.post<SearchResponse>('/api/search', request);
      backendUnavailable = false;
      console.log('✅ Backend search successful:', response.results.length, 'results');
      return response;
    } catch (error) {
      console.log('🔴 Backend search failed:', error instanceof Error ? error.message : 'Unknown error');
      backendUnavailable = true;
      return null;
    }
  },
};

