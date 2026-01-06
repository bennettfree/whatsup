export type Place = {
  id: string;
  type: 'place';

  title: string;
  address?: string;

  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  primaryType?: string;

  imageUrl?: string;

  location: {
    latitude: number;
    longitude: number;
  };
};

export interface FetchPlacesNearbyParams {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  types?: string[];
  maxResults?: number;
}

interface GooglePhoto {
  name?: string;
}

interface GoogleLocation {
  latitude?: number;
  longitude?: number;
}

interface GoogleDisplayName {
  text?: string;
}

interface GooglePlaceApi {
  id?: string;
  displayName?: GoogleDisplayName;
  formattedAddress?: string;
  location?: GoogleLocation;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  photos?: GooglePhoto[];
}

interface PlacesNearbyResponse {
  places?: GooglePlaceApi[];
}

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

const isDev = () => process.env.NODE_ENV !== 'production';

const mapPriceLevel = (priceLevel?: string): number | undefined => {
  switch (priceLevel) {
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1;
    case 'PRICE_LEVEL_MODERATE':
      return 2;
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4;
    default:
      return undefined;
  }
};

const buildPhotoUrl = (photo: GooglePhoto | undefined, apiKey: string): string | undefined => {
  if (!photo?.name) return undefined;
  const encodedName = encodeURIComponent(photo.name);
  return `https://places.googleapis.com/v1/${encodedName}/media?maxHeightPx=600&maxWidthPx=600&key=${apiKey}`;
};

const normalizePlace = (raw: GooglePlaceApi, apiKey: string): Place | null => {
  const id = raw.id;
  const title = raw.displayName?.text;
  const loc = raw.location;

  if (!id || !title || !loc || loc.latitude == null || loc.longitude == null) {
    return null;
  }

  const latitude = loc.latitude;
  const longitude = loc.longitude;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const photo = raw.photos?.[0];
  const imageUrl = buildPhotoUrl(photo, apiKey);

  return {
    id,
    type: 'place',
    title,
    address: raw.formattedAddress,
    rating: raw.rating,
    userRatingCount: raw.userRatingCount,
    priceLevel: mapPriceLevel(raw.priceLevel),
    primaryType: raw.primaryType,
    imageUrl,
    location: {
      latitude,
      longitude,
    },
  };
};

export async function fetchPlacesNearby(params: FetchPlacesNearbyParams): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    if (isDev()) {
      console.warn('GOOGLE_PLACES_API_KEY is missing; returning empty places array.');
    }
    return [];
  }

  const { latitude, longitude } = params;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    if (isDev()) {
      console.error('Invalid coordinates passed to fetchPlacesNearby');
    }
    return [];
  }

  const radiusMeters =
    params.radiusMeters && params.radiusMeters > 0 ? params.radiusMeters : 5000;
  const maxResults =
    params.maxResults && params.maxResults > 0
      ? Math.min(params.maxResults, 40)
      : 40;

  const body: Record<string, unknown> = {
    locationRestriction: {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius: radiusMeters,
      },
    },
    maxResultCount: maxResults,
  };

  if (params.types && params.types.length > 0) {
    (body as any).includedTypes = params.types;
  }

  try {
    const response = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.photos',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (isDev()) {
        console.warn(`Google Places responded with ${response.status}; returning empty array.`);
      }
      return [];
    }

    const data = (await response.json()) as PlacesNearbyResponse;
    const rawPlaces = data.places ?? [];

    const normalized = rawPlaces
      .map((p) => normalizePlace(p, apiKey))
      .filter((p): p is Place => p != null);

    return normalized.slice(0, 40);
  } catch (error) {
    if (isDev()) {
      console.error('Error fetching Google Places nearby', error);
    }
    return [];
  }
}

export const placesService = {
  fetchPlacesNearby,
};


