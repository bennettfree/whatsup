// Search query classification and parsing utilities

export type QueryType = 'location' | 'venue_type' | 'event_type' | 'hybrid';

export interface ParsedQuery {
  type: QueryType;
  location?: string;
  venueTypes?: string[];
  eventTypes?: string[];
  rawQuery: string;
}

// Enhanced venue type keywords with descriptors and activities
const VENUE_KEYWORDS = [
  'restaurant', 'restaurants', 'food', 'dining', 'eat', 'places to eat',
  'bar', 'bars', 'pub', 'pubs', 'brewery', 'breweries', 'drinks',
  'cafe', 'cafes', 'coffee', 'coffee shop', 'coffee shops',
  'hotel', 'hotels', 'lodging', 'accommodation', 'stay',
  'museum', 'museums', 'gallery', 'galleries', 'art',
  'park', 'parks', 'beach', 'beaches', 'outdoor',
  'shopping', 'mall', 'malls', 'store', 'stores', 'market', 'markets', 'shop',
  'gym', 'gyms', 'fitness', 'workout',
  'spa', 'spas', 'massage', 'wellness',
  'sushi', 'pizza', 'burger', 'burgers', 'italian', 'mexican', 'chinese', 'thai',
  'brunch', 'breakfast', 'lunch', 'dinner',
];

// Price descriptors
const PRICE_DESCRIPTORS = ['cheap', 'affordable', 'budget', 'expensive', 'luxury', 'upscale', 'pricey'];

// Vibe/atmosphere descriptors
const VIBE_DESCRIPTORS = ['romantic', 'cozy', 'lively', 'quiet', 'family-friendly', 'casual', 'fancy', 'trendy'];

// Time context keywords
const TIME_KEYWORDS = ['tonight', 'today', 'now', 'this weekend', 'tomorrow'];

// Location context keywords
const LOCATION_CONTEXT = ['near me', 'nearby', 'close', 'around here', 'in the area'];

// Common event type keywords
const EVENT_KEYWORDS = [
  'concert', 'concerts', 'show', 'shows', 'performance', 'performances',
  'music', 'live music', 'jazz', 'rock', 'pop',
  'event', 'events', 'festival', 'festivals',
  'sports', 'game', 'games', 'match', 'matches',
  'theater', 'theatre', 'play', 'plays', 'musical', 'musicals',
  'comedy', 'stand-up', 'standup',
  'nightlife', 'club', 'clubs', 'party', 'parties',
  'workshop', 'workshops', 'class', 'classes',
  'karaoke', // Added karaoke
  'trivia', 'trivia night', // Added trivia
  'open mic', 'open mike', // Added open mic
];

// Location indicators (city, address, etc.)
const LOCATION_INDICATORS = [
  // Prepositions that indicate location
  ' in ', ' near ', ' at ', ' around ',
  // Common address words
  'street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd',
  'drive', 'dr', 'lane', 'ln', 'way', 'plaza', 'square',
  // City/state patterns (will also check for zip codes)
];

/**
 * Enhanced classifier for natural language queries
 * Handles: "cheap sushi near me", "things to do tonight", "romantic dinner"
 */
export const classifyQuery = (query: string): ParsedQuery => {
  const lowerQuery = query.toLowerCase().trim();
  
  // Check for zip code pattern (5 digits or 5-4 digits)
  const zipCodePattern = /\b\d{5}(-\d{4})?\b/;
  if (zipCodePattern.test(lowerQuery)) {
    return {
      type: 'location',
      location: query,
      rawQuery: query,
    };
  }

  // Handle "near me" queries (use current location)
  const hasNearMe = LOCATION_CONTEXT.some(ctx => lowerQuery.includes(ctx));
  
  // Check for venue type keywords
  const hasVenueKeyword = VENUE_KEYWORDS.some(keyword => 
    lowerQuery.includes(keyword.toLowerCase())
  );

  // Check for event type keywords
  const hasEventKeyword = EVENT_KEYWORDS.some(keyword => 
    lowerQuery.includes(keyword.toLowerCase())
  );

  // Check for location indicators
  const hasLocationIndicator = LOCATION_INDICATORS.some(indicator => 
    lowerQuery.includes(indicator.toLowerCase())
  );

  // "near me" + venue type: "sushi near me", "bars around here"
  if (hasNearMe && (hasVenueKeyword || hasEventKeyword)) {
    return {
      type: 'venue_type', // Use current location, just filter by type
      venueTypes: hasVenueKeyword ? extractVenueTypes(lowerQuery) : undefined,
      eventTypes: hasEventKeyword ? extractEventTypes(lowerQuery) : undefined,
      rawQuery: query,
    };
  }

  // Hybrid query: "bars in brooklyn", "coffee shops near central park"
  if ((hasVenueKeyword || hasEventKeyword) && hasLocationIndicator) {
    const extracted = extractHybridQuery(lowerQuery);
    return {
      type: 'hybrid',
      location: extracted.location,
      venueTypes: hasVenueKeyword ? extracted.types : undefined,
      eventTypes: hasEventKeyword ? extracted.types : undefined,
      rawQuery: query,
    };
  }

  // Venue type only: "sushi", "coffee shops", "bars", "things to do"
  if (hasVenueKeyword) {
    return {
      type: 'venue_type',
      venueTypes: extractVenueTypes(lowerQuery),
      rawQuery: query,
    };
  }

  // Event type only: "concerts", "jazz shows", "things to do tonight"
  if (hasEventKeyword) {
    return {
      type: 'event_type',
      eventTypes: extractEventTypes(lowerQuery),
      rawQuery: query,
    };
  }

  // Default: assume it's a general search query (let backend handle it)
  // Backend has hybrid OpenAI system that can understand complex queries
  // Don't try to geocode abstract queries like "I want to meet women"
  return {
    type: 'venue_type', // Changed from 'location' to 'venue_type'
    venueTypes: [query], // Pass query to backend as-is
    rawQuery: query,
  };
};

/**
 * Extract location and types from hybrid queries like "bars in brooklyn"
 */
const extractHybridQuery = (query: string): { location?: string; types: string[] } => {
  // Try to split by location indicators
  const patterns = [
    { regex: /(.+?)\s+in\s+(.+)/, typeIndex: 1, locationIndex: 2 },
    { regex: /(.+?)\s+near\s+(.+)/, typeIndex: 1, locationIndex: 2 },
    { regex: /(.+?)\s+at\s+(.+)/, typeIndex: 1, locationIndex: 2 },
    { regex: /(.+?)\s+around\s+(.+)/, typeIndex: 1, locationIndex: 2 },
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern.regex);
    if (match) {
      return {
        location: match[pattern.locationIndex].trim(),
        types: [match[pattern.typeIndex].trim()],
      };
    }
  }

  return { types: [] };
};

/**
 * Extract venue type keywords from query
 */
const extractVenueTypes = (query: string): string[] => {
  const found: string[] = [];
  for (const keyword of VENUE_KEYWORDS) {
    if (query.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }
  return found.length > 0 ? found : [query]; // Return raw query if no matches
};

/**
 * Extract event type keywords from query
 */
const extractEventTypes = (query: string): string[] => {
  const found: string[] = [];
  for (const keyword of EVENT_KEYWORDS) {
    if (query.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }
  return found.length > 0 ? found : [query]; // Return raw query if no matches
};

/**
 * Map venue type keywords to Google Places categories
 */
export const mapVenueTypeToCategory = (venueType: string): string => {
  const lowerType = venueType.toLowerCase();
  
  // Map common search terms to our app categories
  if (lowerType.includes('bar') || lowerType.includes('pub') || lowerType.includes('brewery')) {
    return 'bar';
  }
  if (lowerType.includes('restaurant') || lowerType.includes('food') || lowerType.includes('dining') ||
      lowerType.includes('sushi') || lowerType.includes('pizza') || lowerType.includes('burger') ||
      lowerType.includes('italian') || lowerType.includes('mexican') || lowerType.includes('chinese') ||
      lowerType.includes('thai')) {
    return 'restaurant';
  }
  if (lowerType.includes('cafe') || lowerType.includes('coffee')) {
    return 'cafe';
  }
  if (lowerType.includes('hotel') || lowerType.includes('lodging') || lowerType.includes('accommodation')) {
    return 'hotel';
  }
  if (lowerType.includes('museum') || lowerType.includes('gallery') || lowerType.includes('art')) {
    return 'museum';
  }
  if (lowerType.includes('park') || lowerType.includes('beach')) {
    return 'park';
  }
  if (lowerType.includes('shopping') || lowerType.includes('mall') || lowerType.includes('store') || lowerType.includes('market')) {
    return 'shopping';
  }
  if (lowerType.includes('gym') || lowerType.includes('fitness') || lowerType.includes('workout')) {
    return 'gym';
  }
  if (lowerType.includes('spa') || lowerType.includes('massage') || lowerType.includes('wellness')) {
    return 'spa';
  }
  
  return 'restaurant'; // Default fallback
};

/**
 * Map event type keywords to our event categories
 */
export const mapEventTypeToCategory = (eventType: string): string => {
  const lowerType = eventType.toLowerCase();
  
  if (lowerType.includes('music') || lowerType.includes('concert') || lowerType.includes('jazz') ||
      lowerType.includes('rock') || lowerType.includes('pop')) {
    return 'music';
  }
  if (lowerType.includes('sport') || lowerType.includes('game') || lowerType.includes('match')) {
    return 'sports';
  }
  if (lowerType.includes('art') || lowerType.includes('gallery') || lowerType.includes('museum')) {
    return 'art';
  }
  if (lowerType.includes('food') || lowerType.includes('dining')) {
    return 'food';
  }
  if (lowerType.includes('nightlife') || lowerType.includes('club') || lowerType.includes('party')) {
    return 'nightlife';
  }
  if (lowerType.includes('theater') || lowerType.includes('theatre') || lowerType.includes('play') ||
      lowerType.includes('musical') || lowerType.includes('comedy')) {
    return 'culture';
  }
  if (lowerType.includes('workshop') || lowerType.includes('class')) {
    return 'workshop';
  }
  if (lowerType.includes('festival')) {
    return 'festival';
  }
  
  return 'music'; // Default fallback
};
