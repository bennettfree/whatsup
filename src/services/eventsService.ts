import { apiClient, API_BASE_URL, ENABLE_MOCK_DATA } from './apiClient';
import { apiCache } from '@/utils/apiCache';

export type Event = {
  id: string;
  type: 'event';

  title: string;
  description?: string;

  startDate: string;
  endDate?: string;

  priceMin?: number;
  priceMax?: number;
  isFree: boolean;

  category: string;

  imageUrl?: string;

  venueName?: string;
  location: {
    latitude: number;
    longitude: number;
  };

  url?: string;
  source: 'ticketmaster';
};

export interface EventQuery {
  lat: number;
  lng: number;
  radius: number; // miles (match Ticketmaster unit)
  dateRange?: {
    start: string; // ISO8601
    end: string; // ISO8601
  };
  keyword?: string; // Search keyword
  category?: string; // Category filter (e.g., 'music', 'sports')
}

// Shape based on Ticketmaster Discovery API. Kept as loose typing to keep
// the UI and higher-level code insulated from provider-specific details.
type TicketmasterEvent = any;

// Track backend availability to prevent infinite error loops
let backendUnavailable = false;
let lastErrorTime = 0;
const ERROR_THROTTLE_MS = 10000; // Only log error once per 10 seconds

export const eventsService = {
  async fetchEvents(params: EventQuery): Promise<Event[]> {
    // If no backend URL is configured, skip network calls and fall back
    // to whatever the caller uses for mock data.
    if (!API_BASE_URL) {
      if (__DEV__) {
        console.warn(
          '[eventsService] EXPO_PUBLIC_API_URL is not set; skipping events fetch.',
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
    if (params.dateRange?.start) query.startDate = params.dateRange.start;
    if (params.dateRange?.end) query.endDate = params.dateRange.end;
    if (params.keyword) query.keyword = params.keyword;
    if (params.category) query.category = params.category;

    // Check cache first
    const cacheKey = apiCache.generateKey({ ...query, endpoint: 'events' });
    const cached = apiCache.get<Event[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const events = await apiClient.get<Event[]>('/api/events', { params: query });
      backendUnavailable = false; // Reset if successful
      
      // Cache successful results
      apiCache.set(cacheKey, events);
      
      return events;
    } catch (error: any) {
      // Mark backend as unavailable on network error or 404
      if (error?.message?.includes('Network Error') || 
          error?.message?.includes('timeout') ||
          error?.response?.status === 404) {
        backendUnavailable = true;
        const now = Date.now();
        if (__DEV__ && now - lastErrorTime > ERROR_THROTTLE_MS) {
          if (error?.message?.includes('timeout')) {
            console.warn(
              ENABLE_MOCK_DATA
                ? '[eventsService] Backend timeout (API keys may be missing). Mock fallback is enabled.'
                : '[eventsService] Backend timeout (API keys may be missing).',
            );
          } else {
            console.warn(
              ENABLE_MOCK_DATA
                ? '[eventsService] Backend unavailable. Mock fallback is enabled. Run: npm run dev:api'
                : '[eventsService] Backend unavailable. Run: npm run dev:api',
            );
          }
          lastErrorTime = now;
        }
      } else if (__DEV__) {
        console.warn('[eventsService] Failed to fetch events:', error?.message);
      }
      return [];
    }
  },
};



