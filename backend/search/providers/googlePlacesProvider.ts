/**
 * Google Places provider execution (server-side).
 *
 * Deterministic + defensive:
 * - honors radius/maxResults caps
 * - uses at most one "type" (API supports single type filter)
 * - never throws; returns [] on failure
 */

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
  location: { latitude: number; longitude: number };
  address?: string;
  isOpenNow?: boolean;
  url?: string;
  source: 'google';
};

type GooglePlacesResponseApi = {
  results?: Array<{
    place_id: string;
    name: string;
    types?: string[];
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    geometry?: { location?: { lat: number; lng: number } };
    vicinity?: string;
    formatted_address?: string;
    opening_hours?: { open_now?: boolean };
    icon?: string;
  }>;
};

type GooglePlaceApi = NonNullable<GooglePlacesResponseApi['results']>[number];

const GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function mapGoogleTypesToCategory(types: string[]): string {
  if (types.includes('bar') || types.includes('night_club')) return 'bar';
  if (types.includes('restaurant')) return 'restaurant';
  if (types.includes('cafe') || types.includes('bakery')) return 'cafe';
  if (types.includes('museum') || types.includes('art_gallery')) return 'museum';
  if (types.includes('gym')) return 'gym';
  if (types.includes('spa') || types.includes('beauty_salon')) return 'spa';
  if (types.includes('lodging')) return 'hotel';
  if (types.includes('park') || types.includes('tourist_attraction')) return 'park';
  return types[0]?.replace(/_/g, ' ') || 'other';
}

function normalizeGooglePlace(raw: GooglePlaceApi | undefined): Place | null {
  if (!raw?.place_id || !raw.name || !raw.geometry?.location) return null;
  const { lat, lng } = raw.geometry.location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const types = raw.types ?? [];
  const category = mapGoogleTypesToCategory(types);
  const address = raw.vicinity ?? raw.formatted_address ?? undefined;

  const imageUrl = raw.icon; // deterministic, avoids photo token usage
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
    location: { latitude: lat, longitude: lng },
    address,
    isOpenNow: raw.opening_hours?.open_now,
    url,
    source: 'google',
  };
}

export async function fetchGooglePlacesNearby(params: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxResults: number;
  // API supports only one type; we take the first (controlled upstream).
  types?: string[];
  // Optional keyword to improve relevance; keep short to reduce variability.
  keyword?: string;
}): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === 'your_key_here' || apiKey.length < 10) return [];

  const { latitude, longitude } = params;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

  const radius = clampInt(params.radiusMeters, 100, 50000);
  const max = clampInt(params.maxResults, 1, 40);

  const requestParams: Record<string, string | number> = {
    key: apiKey,
    location: `${latitude},${longitude}`,
    radius,
  };

  const type = params.types?.[0];
  if (type) requestParams.type = type;

  const keyword = params.keyword?.trim();
  if (keyword && keyword.length >= 3 && keyword.length <= 40) {
    requestParams.keyword = keyword;
  }

  try {
    const { data } = await axios.get<GooglePlacesResponseApi>(GOOGLE_PLACES_URL, {
      params: requestParams,
      timeout: 8000,
    });

    const results = data.results ?? [];
    return results
      .map(normalizeGooglePlace)
      .filter((p): p is Place => p != null)
      .slice(0, max);
  } catch {
    return [];
  }
}

