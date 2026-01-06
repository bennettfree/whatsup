import { apiClient } from './apiClient';

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

export interface PlaceQuery {
  lat: number;
  lng: number;
  radius: number; // meters (match Google Places expectations)
  query?: string;
}

type GooglePlaceResult = any;

interface GooglePlacesResponse {
  results?: GooglePlaceResult[];
}

const PLACES_BASE_URL = '/places/nearby';

export const placesService = {
  async fetchPlaces(params: PlaceQuery): Promise<Place[]> {
    // This assumes your backend proxy exposes a Google Places wrapper at
    // PLACES_BASE_URL. The mobile app talks only to your proxy, never
    // directly to Google APIs.
    const response = await apiClient.get<GooglePlacesResponse>(PLACES_BASE_URL, {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius: params.radius,
        query: params.query,
      },
    });

    const results = response.results ?? [];
    return results.map(normalizeGooglePlace).filter(Boolean) as Place[];
  },
};

const normalizeGooglePlace = (raw: GooglePlaceResult): Place | null => {
  if (!raw || !raw.place_id || !raw.name || !raw.geometry?.location) return null;

  const types: string[] = Array.isArray(raw.types) ? raw.types : [];
  const category = mapGoogleTypesToCategory(types);

  const location = raw.geometry.location;
  const latitude = typeof location.lat === 'number' ? location.lat : Number(location.lat);
  const longitude = typeof location.lng === 'number' ? location.lng : Number(location.lng);

  // Prefer the first photo if present; backend should expand this to a real URL.
  const photo = Array.isArray(raw.photos) ? raw.photos[0] : undefined;
  const imageUrl = photo?.photo_reference
    ? undefined // backend can generate a photo URL from reference
    : raw.icon;

  const address: string | undefined =
    raw.vicinity ?? raw.formatted_address ?? undefined;

  const url = raw.place_id
    ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${raw.place_id}`
    : undefined;

  return {
    id: raw.place_id,
    type: 'place',
    name: raw.name,
    category,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    reviewCount:
      typeof raw.user_ratings_total === 'number' ? raw.user_ratings_total : undefined,
    priceLevel:
      typeof raw.price_level === 'number' ? raw.price_level : undefined,
    imageUrl,
    location: {
      latitude: Number.isFinite(latitude) ? latitude : 0,
      longitude: Number.isFinite(longitude) ? longitude : 0,
    },
    address,
    isOpenNow: raw.opening_hours?.open_now ?? undefined,
    url,
    source: 'google',
  };
};

const mapGoogleTypesToCategory = (types: string[]): string => {
  if (!types.length) return 'Place';

  if (types.includes('bar') || types.includes('night_club')) return 'Bar';
  if (types.includes('restaurant')) return 'Restaurant';
  if (types.includes('cafe')) return 'Café';
  if (types.includes('bakery')) return 'Bakery';
  if (types.includes('meal_takeaway') || types.includes('meal_delivery'))
    return 'Food';

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

  return types[0].replace(/_/g, ' ');
};


