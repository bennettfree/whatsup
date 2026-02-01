// Shared types for backend search orchestration (deterministic pipeline).
// Kept dependency-free so they can be used across backend modules.

export type SearchIntent = {
  rawQuery: string;
  intentType: 'place' | 'event' | 'both';
  keywords: string[];
  vibe: string[];
  categories: string[];
  timeContext: {
    label?: 'now' | 'today' | 'tonight' | 'weekend' | 'specific';
    dayOfWeek?: string;
  };
  locationHint: {
    type: 'near_me' | 'city' | 'zip' | 'unknown';
    value?: string;
  };
  confidence: number;
};

export type ProviderPlan = {
  callPlaces: boolean;
  callEvents: boolean;
  placesQuery?: {
    types?: string[];
    radiusMeters: number;
    maxResults: number;
  };
  eventsQuery?: {
    radiusMiles: number;
    dateRange?: { start?: string; end?: string };
    maxResults: number;
  };
  reasoning: string[];
};

export type UserContext = {
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  timezone: string; // IANA, e.g. "America/Los_Angeles"
  nowISO: string; // current time in ISO format
};

export type ResolvedSearchPlan = {
  latitude: number;
  longitude: number;

  placesParams?: {
    radiusMeters: number;
    maxResults: number;
    types?: string[];
  };

  eventsParams?: {
    radiusMiles: number;
    maxResults: number;
    dateRange?: {
      start?: string;
      end?: string;
    };
  };

  resolutionNotes: string[];
};

export type SemanticRefinement = {
  /**
   * Optional, deterministic refinement output from a prior stage.
   * Example uses:
   * - narrowed place types: ["bar", "night_club"]
   * - better keyword list: ["pizza", "late-night"]
   */
  refinedPlaceTypes?: string[];
  refinedKeywords?: string[];
  reasonTemplates?: {
    place?: string[]; // e.g. ["Highly rated and close to you"]
    event?: string[]; // e.g. ["Happening this weekend nearby"]
  };
};

export type SearchResult = {
  id: string;
  type: 'place' | 'event';

  title: string;
  imageUrl?: string;
  /**
   * Google Place Photos (New) photo resource name.
   * When present, the client should resolve it via /api/place-photo.
   */
  photoName?: string;
  category?: string;

  location: {
    latitude: number;
    longitude: number;
  };

  startDate?: string; // events only
  endDate?: string;
  venueName?: string;
  isFree?: boolean;
  priceMin?: number;
  priceMax?: number;

  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  address?: string;
  isOpenNow?: boolean;
  url?: string;

  distanceMeters?: number;

  score: number; // internal ranking score (normalized)
  reason: string; // short factual “why this fits”
};

export type RankedResults = {
  results: SearchResult[];
  rankingNotes: string[];
};

