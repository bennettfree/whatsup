import mockEventsData from './mockEvents.json';

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
};

type DateRange = {
  start?: string;
  end?: string;
};

export interface FetchEventsNearbyParams {
  latitude: number;
  longitude: number;
  radius?: number;
  dateRange?: DateRange;
  pageSize?: number;
}

interface TicketmasterDates {
  start?: { dateTime?: string; localDate?: string };
  end?: { dateTime?: string; localDate?: string };
}

interface TicketmasterClassification {
  segment?: { name?: string };
  genre?: { name?: string };
  subGenre?: { name?: string };
}

interface TicketmasterVenue {
  name?: string;
  location?: {
    latitude?: string | number;
    longitude?: string | number;
  };
}

interface TicketmasterImage {
  url?: string;
  width?: number;
  height?: number;
}

interface TicketmasterEventApi {
  id: string;
  name: string;
  info?: string;
  description?: string;
  dates?: TicketmasterDates;
  priceRanges?: { min?: number; max?: number }[];
  classifications?: TicketmasterClassification[];
  images?: TicketmasterImage[];
  _embedded?: { venues?: TicketmasterVenue[] };
}

interface TicketmasterResponseApi {
  _embedded?: { events?: TicketmasterEventApi[] };
}

const TICKETMASTER_URL =
  'https://app.ticketmaster.com/discovery/v2/events.json';

const isDev = () => process.env.NODE_ENV !== 'production';

const normalizeEvent = (raw: TicketmasterEventApi): Event | null => {
  if (!raw || !raw.id || !raw.name) return null;

  const dates = raw.dates ?? {};
  const startDateTime =
    dates.start?.dateTime ?? dates.start?.localDate ?? '';
  const endDateTime = dates.end?.dateTime ?? dates.end?.localDate;

  const priceRanges = raw.priceRanges ?? [];
  const firstRange = priceRanges[0];
  const priceMin = firstRange?.min;
  const priceMax = firstRange?.max;
  const isFree = priceMin === 0 || priceMin === undefined;

  const classifications = raw.classifications ?? [];
  const primary = classifications[0];
  const category =
    primary?.segment?.name ??
    primary?.genre?.name ??
    primary?.subGenre?.name ??
    'Other';

  const venue = raw._embedded?.venues?.[0];
  const loc = venue?.location;
  const lat = loc?.latitude;
  const lng = loc?.longitude;
  if (lat == null || lng == null) return null;

  const latitude =
    typeof lat === 'number' ? lat : Number(lat);
  const longitude =
    typeof lng === 'number' ? lng : Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const images = raw.images ?? [];
  const bestImage =
    images.length === 0
      ? undefined
      : images.reduce<TicketmasterImage | undefined>((best, img) => {
          if (!img.url) return best;
          if (!best) return img;
          const bestWidth = best.width ?? 0;
          const imgWidth = img.width ?? 0;
          return imgWidth > bestWidth ? img : best;
        }, undefined);

  return {
    id: `tm_${raw.id}`,
    type: 'event',
    title: raw.name,
    description: raw.info ?? raw.description ?? undefined,
    startDate: startDateTime,
    endDate: endDateTime,
    priceMin,
    priceMax,
    isFree: Boolean(isFree),
    category,
    imageUrl: bestImage?.url,
    venueName: venue?.name,
    location: {
      latitude,
      longitude,
    },
  };
};

const normalizeMany = (rawEvents: TicketmasterEventApi[]): Event[] => {
  return rawEvents
    .map(normalizeEvent)
    .filter((e): e is Event => e != null)
    .slice(0, 50);
};

async function fetchFromTicketmaster(
  params: FetchEventsNearbyParams,
): Promise<Event[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    if (isDev()) {
      console.warn(
        'TICKETMASTER_API_KEY is missing; using mock Ticketmaster events.',
      );
    }
    return normalizeMany(mockEventsData as TicketmasterEventApi[]);
  }

  if (
    !Number.isFinite(params.latitude) ||
    !Number.isFinite(params.longitude)
  ) {
    if (isDev()) {
      console.error('Invalid coordinates passed to fetchEventsNearby');
    }
    return [];
  }

  const radius =
    params.radius && Number.isFinite(params.radius)
      ? params.radius
      : 25;
  const requestedSize =
    params.pageSize && params.pageSize > 0
      ? params.pageSize
      : 50;
  const size = Math.min(requestedSize, 50);

  const searchParams = new URLSearchParams();
  searchParams.set('apikey', apiKey);
  searchParams.set(
    'latlong',
    `${params.latitude},${params.longitude}`,
  );
  searchParams.set('radius', String(radius));
  searchParams.set('unit', 'miles');
  searchParams.set('countryCode', 'US');
  searchParams.set('page', '0');
  searchParams.set('size', String(size));
  searchParams.set('sort', 'date,asc');

  if (params.dateRange?.start) {
    searchParams.set('startDateTime', params.dateRange.start);
  }
  if (params.dateRange?.end) {
    searchParams.set('endDateTime', params.dateRange.end);
  }

  try {
    const response = await fetch(
      `${TICKETMASTER_URL}?${searchParams.toString()}`,
    );

    if (!response.ok) {
      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status >= 500
      ) {
        if (isDev()) {
          console.warn(
            `Ticketmaster responded with ${response.status}; using mock events.`,
          );
        }
        return normalizeMany(mockEventsData as TicketmasterEventApi[]);
      }

      if (isDev()) {
        console.error(
          `Ticketmaster responded with ${response.status}`,
        );
      }
      return [];
    }

    const data = (await response.json()) as TicketmasterResponseApi;
    const rawEvents = data._embedded?.events ?? [];
    return normalizeMany(rawEvents);
  } catch (error) {
    if (isDev()) {
      console.error('Error fetching Ticketmaster events', error);
    }
    return normalizeMany(mockEventsData as TicketmasterEventApi[]);
  }
}

export async function fetchEventsNearby(
  params: FetchEventsNearbyParams,
): Promise<Event[]> {
  return fetchFromTicketmaster(params);
}

export const eventsService = {
  fetchEventsNearby,
};


