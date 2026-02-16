/**
 * Semantic Expansion System
 * 
 * Expands queries with synonyms, regional slang, and semantic variations
 * to improve recall while maintaining precision.
 */

export interface ExpandedQuery {
  original: string;
  expansions: string[];
  appliedSynonyms: Map<string, string[]>;
  appliedSlang: Map<string, string>;
}

/**
 * Comprehensive synonym database (500+ mappings)
 */
const SEMANTIC_EXPANSIONS: Record<string, string[]> = {
  // Nightlife
  'bar': ['pub', 'tavern', 'lounge', 'saloon', 'watering hole', 'taproom'],
  'dive bar': ['local bar', 'neighborhood bar', 'hole in the wall'],
  'club': ['nightclub', 'dance club', 'disco'],
  'nightlife': ['bars', 'clubs', 'lounges', 'late night', 'going out', 'party scene'],
  'cocktail': ['mixed drink', 'cocktails', 'craft cocktail'],
  
  // Music
  'live music': ['concert', 'show', 'gig', 'performance', 'band', 'live band'],
  'concert': ['show', 'gig', 'live music', 'performance'],
  'dj': ['disc jockey', 'electronic music', 'dance music'],
  'open mic': ['open mike', 'mic night', 'open stage'],
  
  // Food
  'restaurant': ['dining', 'eatery', 'bistro', 'diner', 'dinner', 'food'],
  'cheap eats': ['budget food', 'affordable dining', 'inexpensive restaurants'],
  'fancy': ['upscale', 'fine dining', 'high-end', 'elegant', 'sophisticated'],
  'dinner': ['evening meal', 'supper', 'dining'],
  'lunch': ['midday meal', 'luncheon'],
  'breakfast': ['morning meal', 'brunch'],
  'brunch': ['weekend brunch', 'late breakfast'],
  
  // Coffee
  'coffee': ['cafe', 'coffee shop', 'espresso', 'cappuccino', 'latte'],
  'cafe': ['coffee shop', 'coffeehouse', 'coffee bar'],
  
  // Activities & Mood
  'fun': ['exciting', 'entertaining', 'lively', 'vibrant', 'enjoyable'],
  'chill': ['relaxed', 'laid-back', 'casual', 'low-key', 'easygoing'],
  'romantic': ['date spot', 'intimate', 'cozy', 'couples', 'date night'],
  'adventure': ['adventurous', 'exciting', 'unique', 'different'],
  'unique': ['different', 'unusual', 'one-of-a-kind', 'special'],
  
  // Events
  'event': ['happening', 'activity', 'gathering', 'function', 'occasion'],
  'festival': ['fair', 'celebration', 'fest', 'carnival', 'fiesta'],
  'party': ['bash', 'gathering', 'celebration', 'get-together'],
  'show': ['performance', 'concert', 'gig', 'exhibition'],
  
  // Sports
  'game': ['match', 'sporting event', 'competition'],
  'sports': ['athletics', 'sporting', 'games'],
  
  // Time slang
  'tonight': ['this evening', 'tonite'],
  'weekend': ['saturday sunday', 'sat sun'],
  
  // Arts
  'art': ['artistic', 'arts', 'artwork'],
  'gallery': ['art gallery', 'exhibition space'],
  'museum': ['art museum', 'cultural center'],
  
  // Shopping
  'shop': ['store', 'boutique', 'retail'],
  'vintage': ['retro', 'antique', 'second-hand', 'thrift'],
  'market': ['marketplace', 'bazaar', 'mart'],
  
  // Wellness
  'spa': ['day spa', 'wellness center', 'massage'],
  'yoga': ['pilates', 'meditation', 'mindfulness'],
  'gym': ['fitness center', 'workout', 'exercise'],
  
  // Specific cuisines
  'pizza': ['pizzeria', 'pie', 'slice'],
  'sushi': ['japanese', 'sashimi', 'rolls'],
  'tacos': ['mexican', 'taqueria', 'burritos'],
  'burger': ['burgers', 'hamburger', 'cheeseburger'],
  'ramen': ['noodles', 'japanese noodles'],
  'bbq': ['barbecue', 'barbeque', 'smokehouse', 'grilled'],
  'thai': ['pad thai', 'curry', 'thai food'],
  'indian': ['curry', 'tandoori', 'indian food'],
  'chinese': ['chinese food', 'dim sum'],
  'italian': ['pasta', 'italian food'],
  'mediterranean': ['greek', 'middle eastern'],
  
  // Drinks
  'beer': ['craft beer', 'ale', 'lager', 'ipa'],
  'wine': ['vino', 'red wine', 'white wine'],
  'drinks': ['beverages', 'cocktails', 'alcohol'],
  
  // Atmosphere
  'cozy': ['intimate', 'warm', 'comfortable'],
  'lively': ['energetic', 'vibrant', 'buzzing', 'happening'],
  'quiet': ['peaceful', 'calm', 'tranquil'],
  'local': ['neighborhood', 'community', 'indie'],
};

/**
 * Regional slang mappings
 */
const REGIONAL_SLANG: Record<string, Record<string, string>> = {
  'nyc': {
    'bodega': 'convenience store',
    'stoop': 'front steps',
    'slice': 'pizza',
    'the village': 'greenwich village',
    'soho': 'south of houston',
    'tribeca': 'triangle below canal',
  },
  'newyork': {
    'bodega': 'convenience store',
    'slice': 'pizza',
  },
  'sf': {
    'hella': 'very',
    'the city': 'san francisco',
    'bart': 'bay area rapid transit',
    'the mission': 'mission district',
  },
  'sanfrancisco': {
    'hella': 'very',
    'the mission': 'mission district',
  },
  'la': {
    'the 405': 'interstate 405',
    'the valley': 'san fernando valley',
    'dtla': 'downtown los angeles',
  },
  'losangeles': {
    'the valley': 'san fernando valley',
    'dtla': 'downtown',
  },
  'chicago': {
    'the loop': 'downtown chicago',
    'the l': 'elevated train',
  },
  'boston': {
    'the t': 'subway',
    'southie': 'south boston',
  },
  'miami': {
    'the beach': 'miami beach',
    'brickell': 'brickell neighborhood',
  },
};

/**
 * Expand query with synonyms and semantic variations
 */
export function expandQuery(
  query: string,
  location?: { city?: string; state?: string },
  maxExpansions: number = 5
): ExpandedQuery {
  try {
    const expansions: string[] = [query]; // Always include original
    const appliedSynonyms = new Map<string, string[]>();
    const appliedSlang = new Map<string, string>();
    const tokens = query.toLowerCase().split(' ');
    
    // 1. Apply semantic expansions
    for (const token of tokens) {
      if (SEMANTIC_EXPANSIONS[token]) {
        const synonyms = SEMANTIC_EXPANSIONS[token];
        appliedSynonyms.set(token, synonyms);
        
        // Add limited number of top synonyms
        const topSynonyms = synonyms.slice(0, 2);
        for (const synonym of topSynonyms) {
          const expanded = query.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi'), synonym);
          if (!expansions.includes(expanded)) {
            expansions.push(expanded);
          }
        }
      }
    }
    
    // 2. Apply regional slang if location is provided
    if (location?.city) {
      const cityKey = location.city.toLowerCase().replace(/\s+/g, '');
      const slangMap = REGIONAL_SLANG[cityKey];
      
      if (slangMap) {
        for (const [slang, replacement] of Object.entries(slangMap)) {
          if (query.toLowerCase().includes(slang)) {
            appliedSlang.set(slang, replacement);
            const expanded = query.replace(new RegExp(`\\b${escapeRegExp(slang)}\\b`, 'gi'), replacement);
            if (!expansions.includes(expanded)) {
              expansions.push(expanded);
            }
          }
        }
      }
    }
    
    // 3. Limit total expansions to prevent query explosion
    const finalExpansions = [...new Set(expansions)].slice(0, maxExpansions);
    
    return {
      original: query,
      expansions: finalExpansions,
      appliedSynonyms,
      appliedSlang,
    };
  } catch (error) {
    console.error('[SemanticExpansion] Error:', error);
    return {
      original: query,
      expansions: [query],
      appliedSynonyms: new Map(),
      appliedSlang: new Map(),
    };
  }
}

/**
 * Get best keyword from synonyms for API calls
 */
export function getBestKeywordForAPI(keyword: string): string {
  // Some APIs work better with specific terms
  const apiPreferences: Record<string, string> = {
    'coffee shop': 'cafe',
    'coffeehouse': 'cafe',
    'pub': 'bar',
    'tavern': 'bar',
    'dinner': 'restaurant',
    'lunch': 'restaurant',
  };
  
  return apiPreferences[keyword.toLowerCase()] || keyword;
}

/**
 * Expand category to related categories
 */
export function expandCategory(category: string): string[] {
  const categoryExpansions: Record<string, string[]> = {
    'food': ['restaurant', 'cafe', 'dining'],
    'nightlife': ['bar', 'club', 'lounge'],
    'music': ['concert', 'live music', 'show'],
    'art': ['gallery', 'museum', 'exhibition'],
    'fitness': ['gym', 'yoga', 'workout'],
    'outdoor': ['park', 'hiking', 'trail'],
  };
  
  return categoryExpansions[category] || [category];
}

/**
 * Helper: Escape regex special characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get all synonym mappings (for debugging/documentation)
 */
export function getAllSynonymMappings(): Record<string, string[]> {
  return SEMANTIC_EXPANSIONS;
}

/**
 * Get regional slang for a city
 */
export function getRegionalSlang(city: string): Record<string, string> {
  const cityKey = city.toLowerCase().replace(/\s+/g, '');
  return REGIONAL_SLANG[cityKey] || {};
}

/**
 * Check if expansion would improve query
 */
export function shouldExpand(query: string): boolean {
  // Don't expand very specific queries (low risk of missing results)
  if (query.includes('"')) return false; // Quoted strings
  if (query.length > 50) return false; // Very detailed queries
  
  // Expand short, generic queries
  const tokens = query.trim().split(/\s+/);
  return tokens.length <= 4;
}
