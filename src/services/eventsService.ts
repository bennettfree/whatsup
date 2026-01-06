import { apiClient } from './apiClient';

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
}

// Shape based on Ticketmaster Discovery API. Kept as loose typing to keep
// the UI and higher-level code insulated from provider-specific details.
type TicketmasterEvent = any;

interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
}

const TICKETMASTER_BASE_URL = '/ticketmaster/events';

export const eventsService = {
  async fetchEvents(params: EventQuery): Promise<Event[]> {
    // This assumes your backend proxy exposes a Ticketmaster wrapper at
    // TICKETMASTER_BASE_URL. The mobile app talks only to your proxy,
    // never directly to Ticketmaster.
    const response = await apiClient.get<TicketmasterResponse>(TICKETMASTER_BASE_URL, {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius: params.radius,
        startDate: params.dateRange?.start,
        endDate: params.dateRange?.end,
      },
    });

    const rawEvents = response._embedded?.events ?? [];
    return rawEvents.map(normalizeTicketmasterEvent).filter(Boolean) as Event[];
  },
};

const normalizeTicketmasterEvent = (raw: TicketmasterEvent): Event | null => {
  if (!raw || !raw.id || !raw.name) return null;

  const dates = raw.dates ?? {};
  const startDateTime = dates.start?.dateTime ?? dates.start?.localDate;
  const endDateTime = dates.end?.dateTime ?? dates.end?.localDate;

  const priceRanges = Array.isArray(raw.priceRanges) ? raw.priceRanges : [];
  const priceMin = priceRanges.length ? priceRanges[0].min ?? undefined : undefined;
  const priceMax = priceRanges.length ? priceRanges[0].max ?? undefined : undefined;
  const isFree = priceMin === 0 || raw.priceRanges === undefined;

  const classifications = Array.isArray(raw.classifications) ? raw.classifications : [];
  const primaryClassification = classifications[0] ?? {};
  const category =
    primaryClassification.segment?.name ??
    primaryClassification.genre?.name ??
    primaryClassification.subGenre?.name ??
    'Event';

  const embedded = raw._embedded ?? {};
  const venue = Array.isArray(embedded.venues) ? embedded.venues[0] : undefined;

  const location = venue?.location;
  const latitude = location?.latitude ? Number(location.latitude) : NaN;
  const longitude = location?.longitude ? Number(location.longitude) : NaN;

  const images = Array.isArray(raw.images) ? raw.images : [];
  const imageUrl = images[0]?.url;

  return {
    id: raw.id,
    type: 'event',
    title: raw.name,
    description: raw.info ?? raw.pleaseNote ?? undefined,
    startDate: startDateTime ?? '',
    endDate: endDateTime,
    priceMin,
    priceMax,
    isFree: Boolean(isFree),
    category,
    imageUrl,
    venueName: venue?.name,
    location: {
      latitude: Number.isFinite(latitude) ? latitude : 0,
      longitude: Number.isFinite(longitude) ? longitude : 0,
    },
    url: raw.url,
    source: 'ticketmaster',
  };
};


