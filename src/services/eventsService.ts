import { apiClient, API_BASE_URL } from './apiClient';

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

    const query: Record<string, string | number> = {
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
    };
    if (params.dateRange?.start) query.startDate = params.dateRange.start;
    if (params.dateRange?.end) query.endDate = params.dateRange.end;
    if (params.keyword) query.keyword = params.keyword;
    if (params.category) query.category = params.category;

    try {
      const events = await apiClient.get<Event[]>('/events', { params: query });
      return events;
    } catch (error) {
      if (__DEV__) {
        console.warn('[eventsService] Failed to fetch events', error);
      }
      return [];
    }
  },
};



