/**
 * Ticketmaster provider execution (server-side).
 *
 * Deterministic + defensive:
 * - honors radius/maxResults caps
 * - optionally applies dateRange
 * - never throws; returns [] on failure
 */

import axios from 'axios';

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
  location: { latitude: number; longitude: number };
  url?: string;
  source: 'ticketmaster';
};

type TicketmasterResponseApi = {
  _embedded?: {
    events?: Array<{
      id: string;
      name: string;
      url?: string;
      info?: string;
      pleaseNote?: string;
      dates?: { start?: { dateTime?: string; localDate?: string }; end?: { dateTime?: string; localDate?: string } };
      priceRanges?: Array<{ min?: number; max?: number }>;
      classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string }; subGenre?: { name?: string } }>;
      images?: Array<{ url?: string; width?: number; height?: number }>;
      _embedded?: { venues?: Array<{ name?: string; location?: { latitude?: string | number; longitude?: string | number } }> };
    }>;
  };
};

type TicketmasterEventApi = NonNullable<NonNullable<TicketmasterResponseApi['_embedded']>['events']>[number];

const TM_DISCOVERY_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalizeTicketmasterEvent(raw: TicketmasterEventApi | undefined): Event | null {
  if (!raw?.id || !raw.name) return null;

  const dates = raw.dates ?? {};
  const startDateTime = dates.start?.dateTime ?? dates.start?.localDate ?? '';
  const endDateTime = dates.end?.dateTime ?? dates.end?.localDate;

  const priceRanges = raw.priceRanges ?? [];
  const firstRange = priceRanges[0];
  const priceMin = firstRange?.min;
  const priceMax = firstRange?.max;
  const isFree = priceMin === 0 || priceMin === undefined;

  const classifications = raw.classifications ?? [];
  const primary = classifications[0];
  const category =
    primary?.segment?.name ?? primary?.genre?.name ?? primary?.subGenre?.name ?? 'Event';

  const venue = raw._embedded?.venues?.[0];
  const loc = venue?.location;
  const lat = loc?.latitude;
  const lng = loc?.longitude;
  const latitude = typeof lat === 'number' ? lat : lat != null ? Number(lat) : NaN;
  const longitude = typeof lng === 'number' ? lng : lng != null ? Number(lng) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const images = raw.images ?? [];
  const best = images.reduce<{ url?: string; width?: number } | null>(
    (acc: { url?: string; width?: number } | null, img: { url?: string; width?: number }) => {
      if (!img.url) return acc;
      if (!acc) return img;
      return (img.width ?? 0) > (acc.width ?? 0) ? img : acc;
    },
    null,
  );

  return {
    id: `tm_${raw.id}`,
    type: 'event',
    title: raw.name,
    description: raw.info ?? raw.pleaseNote ?? undefined,
    startDate: startDateTime,
    endDate: endDateTime,
    priceMin,
    priceMax,
    isFree: Boolean(isFree),
    category,
    imageUrl: best?.url,
    venueName: venue?.name,
    location: { latitude, longitude },
    url: raw.url,
    source: 'ticketmaster',
  };
}

export async function fetchTicketmasterEventsNearby(params: {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  maxResults: number;
  dateRange?: { start?: string; end?: string };
  keyword?: string;
  category?: string; // Ticketmaster classificationName
}): Promise<Event[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey || apiKey === 'your_key_here' || apiKey.length < 10) return [];

  const { latitude, longitude } = params;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

  const radius = clampInt(params.radiusMiles, 1, 100);
  const size = clampInt(params.maxResults, 1, 50);

  const requestParams: Record<string, string | number> = {
    apikey: apiKey,
    latlong: `${latitude},${longitude}`,
    radius,
    unit: 'miles',
    size,
    page: 0,
    sort: 'date,asc',
  };

  if (params.dateRange?.start) requestParams.startDateTime = params.dateRange.start;
  if (params.dateRange?.end) requestParams.endDateTime = params.dateRange.end;

  const keyword = params.keyword?.trim();
  if (keyword && keyword.length >= 3 && keyword.length <= 60) requestParams.keyword = keyword;

  const category = params.category?.trim();
  if (category) requestParams.classificationName = category;

  try {
    const { data } = await axios.get<TicketmasterResponseApi>(TM_DISCOVERY_URL, {
      params: requestParams,
      timeout: 8000,
    });
    const rawEvents = data._embedded?.events ?? [];
    return rawEvents
      .map(normalizeTicketmasterEvent)
      .filter((e): e is Event => e != null)
      .slice(0, size);
  } catch {
    return [];
  }
}

