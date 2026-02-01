/**
 * Google Places provider execution (server-side).
 *
 * Deterministic + defensive:
 * - honors radius/maxResults caps
 * - uses at most one "type" (we pass at most one includedTypes entry)
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
  /**
   * Place Photos (New) photo resource name:
   * "places/PLACE_ID/photos/PHOTO_RESOURCE"
   *
   * Do not cache this on the client; request fresh names from Places responses.
   * We proxy the photo via /api/place-photo to keep the API key server-side.
   */
  photoName?: string;
  location: { latitude: number; longitude: number };
  address?: string;
  isOpenNow?: boolean;
  url?: string;
  source: 'google';
};

type GooglePlacesNewPlaceApi = {
  id: string; // place_id
  displayName?: { text?: string };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string; // PRICE_LEVEL_...
  location?: { latitude?: number; longitude?: number };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  regularOpeningHours?: { openNow?: boolean };
  photos?: Array<{ name?: string }>;
};

type GooglePlacesNewNearbyResponse = {
  places?: GooglePlacesNewPlaceApi[];
};

const GOOGLE_PLACES_NEW_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const GOOGLE_PLACES_LEGACY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

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

function mapPriceLevel(level?: string): number | undefined {
  const v = String(level || '').toUpperCase();
  if (!v) return undefined;
  if (v.includes('INEXPENSIVE')) return 1;
  if (v.includes('MODERATE')) return 2;
  if (v.includes('EXPENSIVE') && !v.includes('VERY')) return 3;
  if (v.includes('VERY_EXPENSIVE')) return 4;
  return undefined;
}

function normalizeGooglePlace(raw: GooglePlacesNewPlaceApi | undefined): Place | null {
  const placeId = raw?.id;
  const name = raw?.displayName?.text;
  const lat = raw?.location?.latitude;
  const lng = raw?.location?.longitude;
  if (!placeId || !name) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const types = raw.types ?? [];
  const category = mapGoogleTypesToCategory(types);
  const address = raw.shortFormattedAddress ?? raw.formattedAddress ?? undefined;
  const photoName = raw.photos?.[0]?.name || undefined;

  const url = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${placeId}`;

  return {
    id: `gp_${placeId}`,
    type: 'place',
    name,
    category,
    rating: raw.rating,
    reviewCount: raw.userRatingCount,
    priceLevel: mapPriceLevel(raw.priceLevel),
    // Leave imageUrl empty; client can resolve via /api/place-photo using photoName.
    imageUrl: undefined,
    photoName,
    location: { latitude: lat as number, longitude: lng as number },
    address,
    isOpenNow: raw.regularOpeningHours?.openNow,
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

  try {
    const type = params.types?.[0];
    const keyword = params.keyword?.trim();

    const body: Record<string, any> = {
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius,
        },
      },
      maxResultCount: max,
      rankPreference: 'DISTANCE',
    };

    if (type) body.includedTypes = [type];
    if (keyword && keyword.length >= 3 && keyword.length <= 40) body.keyword = keyword;

    const { data } = await axios.post<GooglePlacesNewNearbyResponse>(GOOGLE_PLACES_NEW_URL, body, {
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Request photo resource names via photos[] so client can fetch Place Photos (New).
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.types,places.rating,places.userRatingCount,places.priceLevel,places.location,places.shortFormattedAddress,places.formattedAddress,places.regularOpeningHours.openNow,places.photos',
      },
    });

    const results = data.places ?? [];
    return results
      .map(normalizeGooglePlace)
      .filter((p): p is Place => p != null)
      .slice(0, max);
  } catch {
    // Fallback to legacy Nearby Search if Places API (New) isn't available/enabled.
    // This does NOT provide photo names; callers will have `imageUrl` only.
    try {
      type LegacyResponse = {
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

      const { data } = await axios.get<LegacyResponse>(GOOGLE_PLACES_LEGACY_URL, {
        params: requestParams,
        timeout: 8000,
      });

      const legacy = data.results ?? [];
      return legacy
        .map((raw): Place | null => {
          const placeId = raw.place_id;
          const name = raw.name;
          const lat = raw.geometry?.location?.lat;
          const lng = raw.geometry?.location?.lng;
          if (!placeId || !name) return null;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const types = raw.types ?? [];
          const category = mapGoogleTypesToCategory(types);
          const address = raw.vicinity ?? raw.formatted_address ?? undefined;
          return {
            id: `gp_${placeId}`,
            type: 'place',
            name,
            category,
            rating: raw.rating,
            reviewCount: raw.user_ratings_total,
            priceLevel: raw.price_level,
            imageUrl: raw.icon,
            photoName: undefined,
            location: { latitude: lat as number, longitude: lng as number },
            address,
            isOpenNow: raw.opening_hours?.open_now,
            url: `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${placeId}`,
            source: 'google',
          };
        })
        .filter((p): p is Place => p != null)
        .slice(0, max);
    } catch {
      return [];
    }
  }
}

