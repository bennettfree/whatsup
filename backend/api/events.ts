import type { Request, Response } from 'express';
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
  location: {
    latitude: number;
    longitude: number;
  };
  url?: string;
  source: 'ticketmaster';
};

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
}

interface TicketmasterEventApi {
  id: string;
  name: string;
  url?: string;
  info?: string;
  pleaseNote?: string;
  dates?: TicketmasterDates;
  priceRanges?: { min?: number; max?: number }[];
  classifications?: TicketmasterClassification[];
  images?: TicketmasterImage[];
  _embedded?: { venues?: TicketmasterVenue[] };
}

interface TicketmasterResponseApi {
  _embedded?: { events?: TicketmasterEventApi[] };
}

const TM_API_KEY = process.env.TICKETMASTER_API_KEY;
const TM_DISCOVERY_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

export async function getEvents(req: Request, res: Response) {
  if (!TM_API_KEY) {
    console.error('Missing TICKETMASTER_API_KEY');
    return res.json(getFallbackEvents());
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Number(req.query.radius) || 10;
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'lat and lng are required numbers' });
  }

  try {
    const params: Record<string, string | number> = {
      apikey: TM_API_KEY,
      latlong: `${lat},${lng}`,
      radius,
      unit: 'miles',
      size: 50,
    };
    if (startDate) params.startDateTime = startDate;
    if (endDate) params.endDateTime = endDate;
    if (keyword) params.keyword = keyword;
    
    // Map category to Ticketmaster classification ID
    if (category) {
      const classificationId = mapCategoryToTicketmasterClassification(category);
      if (classificationId) {
        params.classificationName = classificationId;
      }
    }

    const { data } = await axios.get<TicketmasterResponseApi>(TM_DISCOVERY_URL, {
      params,
    });

    const rawEvents = data._embedded?.events ?? [];
    const events = rawEvents.slice(0, 50).map(normalizeTicketmasterEvent).filter(Boolean);

    return res.json(events);
  } catch (err) {
    console.error('Ticketmaster API error', err);
    return res.json(getFallbackEvents());
  }
}

function normalizeTicketmasterEvent(raw: TicketmasterEventApi | undefined): Event | null {
  if (!raw) return null;

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
    primary?.segment?.name ??
    primary?.genre?.name ??
    primary?.subGenre?.name ??
    'Event';

  const venue = raw._embedded?.venues?.[0];
  const loc = venue?.location;
  const lat = loc?.latitude;
  const lng = loc?.longitude;
  const latitude =
    typeof lat === 'number' ? lat : lat != null ? Number(lat) : 0;
  const longitude =
    typeof lng === 'number' ? lng : lng != null ? Number(lng) : 0;

  const imageUrl = raw.images?.[0]?.url;

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
    imageUrl,
    venueName: venue?.name,
    location: {
      latitude: Number.isFinite(latitude) ? latitude : 0,
      longitude: Number.isFinite(longitude) ? longitude : 0,
    },
    url: raw.url,
    source: 'ticketmaster',
  };
}

// Map our app categories to Ticketmaster classification names
function mapCategoryToTicketmasterClassification(category: string): string | null {
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes('music') || lowerCategory.includes('concert')) return 'Music';
  if (lowerCategory.includes('sports') || lowerCategory.includes('sport')) return 'Sports';
  if (lowerCategory.includes('art') || lowerCategory.includes('arts')) return 'Arts & Theatre';
  if (lowerCategory.includes('theater') || lowerCategory.includes('theatre')) return 'Arts & Theatre';
  if (lowerCategory.includes('festival')) return 'Miscellaneous'; // Festivals are in Misc
  if (lowerCategory.includes('family')) return 'Family';
  
  return null; // No specific classification
}

function getFallbackEvents(): Event[] {
  return [];
}
