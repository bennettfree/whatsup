import type { Request, Response } from 'express';
import axios from 'axios';

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

interface GoogleLocation {
  lat: number;
  lng: number;
}

interface GoogleOpeningHours {
  open_now?: boolean;
}

interface GooglePhoto {
  photo_reference?: string;
}

interface GooglePlaceApi {
  place_id: string;
  name: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  geometry?: { location?: GoogleLocation };
  vicinity?: string;
  formatted_address?: string;
  opening_hours?: GoogleOpeningHours;
  photos?: GooglePhoto[];
  icon?: string;
}

interface GooglePlacesResponseApi {
  results?: GooglePlaceApi[];
}

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_URL =
  'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

export async function getPlaces(req: Request, res: Response) {
  if (!GOOGLE_PLACES_KEY) {
    console.error('Missing GOOGLE_PLACES_API_KEY');
    return res.json(getFallbackPlaces());
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Number(req.query.radius) || 2000;
  const query = typeof req.query.query === 'string' ? req.query.query : undefined;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'lat and lng are required numbers' });
  }

  try {
    const params: Record<string, string | number> = {
      key: GOOGLE_PLACES_KEY,
      location: `${lat},${lng}`,
      radius,
    };
    if (query) params.keyword = query;

    const { data } = await axios.get<GooglePlacesResponseApi>(GOOGLE_PLACES_URL, {
      params,
    });

    const results = data.results ?? [];
    const places = results.slice(0, 50).map(normalizeGooglePlace).filter(Boolean);

    return res.json(places);
  } catch (err) {
    console.error('Google Places API error', err);
    return res.json(getFallbackPlaces());
  }
}

function normalizeGooglePlace(raw: GooglePlaceApi | undefined): Place | null {
  if (!raw || !raw.place_id || !raw.name || !raw.geometry?.location) {
    return null;
  }

  const types = raw.types ?? [];
  const category = mapGoogleTypesToCategory(types);

  const { lat, lng } = raw.geometry.location;
  const latitude = lat;
  const longitude = lng;

  const address = raw.vicinity ?? raw.formatted_address ?? undefined;

  const photo = raw.photos?.[0];
  const imageUrl = photo?.photo_reference ? undefined : raw.icon;

  const url = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${raw.place_id}`;

  return {
    id: `gp_${raw.place_id}`,
    type: 'place',
    name: raw.name,
    category,
    rating: raw.rating,
    reviewCount: raw.user_ratings_total,
    priceLevel: raw.price_level,
    imageUrl,
    location: {
      latitude,
      longitude,
    },
    address,
    isOpenNow: raw.opening_hours?.open_now,
    url,
    source: 'google',
  };
}

function mapGoogleTypesToCategory(types: string[]): string {
  if (types.includes('bar') || types.includes('night_club')) return 'Bar';
  if (types.includes('restaurant')) return 'Restaurant';
  if (types.includes('cafe')) return 'Café';
  if (types.includes('bakery')) return 'Bakery';
  if (types.includes('meal_takeaway') || types.includes('meal_delivery')) return 'Food';
  if (types.includes('museum') || types.includes('art_gallery')) return 'Culture';
  if (types.includes('movie_theater')) return 'Cinema';
  if (types.includes('gym')) return 'Gym';
  if (types.includes('spa') || types.includes('beauty_salon')) return 'Spa';
  if (types.includes('lodging')) return 'Hotel';
  if (
    types.includes('shopping_mall') ||
    types.includes('supermarket') ||
    types.includes('grocery_or_supermarket') ||
    types.includes('department_store')
  ) {
    return 'Market';
  }
  if (types.includes('park') || types.includes('tourist_attraction')) return 'Outdoor';

  return types[0]?.replace(/_/g, ' ') || 'Place';
}

function getFallbackPlaces(): Place[] {
  return [];
}


