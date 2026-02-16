/**
 * Entity Extraction
 * 
 * Extracts structured entities from natural language queries:
 * - Dates (tonight, tomorrow, next Friday, 12/25)
 * - Times (happy hour, after work, 7pm)
 * - Locations (near me, downtown, Brooklyn, 10001)
 * - Price ranges (free, under $20, $$)
 * - Distances (within 5 miles, walking distance)
 * 
 * Pure functions, deterministic.
 */

export interface ExtractedEntities {
  dates: DateEntity[];
  times: TimeEntity[];
  locations: LocationEntity[];
  priceRanges: PriceEntity[];
  distances: DistanceEntity[];
  socialContext: SocialEntity[];
}

export interface DateEntity {
  raw: string;
  type: 'absolute' | 'relative' | 'named';
  label?: 'tonight' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month';
  dayOfWeek?: string;
  specificDate?: string; // ISO date string
  position: { start: number; end: number };
}

export interface TimeEntity {
  raw: string;
  type: 'named' | 'absolute' | 'range';
  label?: 'happy_hour' | 'after_work' | 'brunch' | 'late_night' | 'morning' | 'afternoon' | 'evening';
  startTime?: string; // HH:MM format
  endTime?: string;
  position: { start: number; end: number };
}

export interface LocationEntity {
  raw: string;
  type: 'proximity' | 'neighborhood' | 'city' | 'zip' | 'landmark';
  value: string;
  confidence: number;
  position: { start: number; end: number };
}

export interface PriceEntity {
  raw: string;
  type: 'free' | 'range' | 'max' | 'symbol';
  min?: number;
  max?: number;
  priceSymbols?: number; // Number of $ symbols
  position: { start: number; end: number };
}

export interface DistanceEntity {
  raw: string;
  value: number; // in miles
  unit: 'miles' | 'km' | 'blocks';
  position: { start: number; end: number };
}

export interface SocialEntity {
  raw: string;
  type: 'group_size' | 'context';
  groupSize?: 'solo' | 'date' | 'small_group' | 'large_group';
  keywords: string[];
  position: { start: number; end: number };
}

// Regex patterns for entity extraction
const DATE_PATTERNS = [
  { pattern: /\b(tonight)\b/gi, type: 'named' as const, label: 'tonight' as const },
  { pattern: /\b(today)\b/gi, type: 'named' as const, label: 'today' as const },
  { pattern: /\b(tomorrow|tmrw)\b/gi, type: 'named' as const, label: 'tomorrow' as const },
  { pattern: /\b(this weekend|weekend|wknd)\b/gi, type: 'named' as const, label: 'weekend' as const },
  { pattern: /\b(this week)\b/gi, type: 'named' as const, label: 'week' as const },
  { pattern: /\b(this month)\b/gi, type: 'named' as const, label: 'month' as const },
  { pattern: /\b(next (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi, type: 'relative' as const },
  { pattern: /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/g, type: 'absolute' as const },
];

const TIME_PATTERNS = [
  { pattern: /\b(happy hour)\b/gi, type: 'named' as const, label: 'happy_hour' as const },
  { pattern: /\b(after work)\b/gi, type: 'named' as const, label: 'after_work' as const },
  { pattern: /\b(brunch)\b/gi, type: 'named' as const, label: 'brunch' as const },
  { pattern: /\b(late night|late-night)\b/gi, type: 'named' as const, label: 'late_night' as const },
  { pattern: /\b(morning)\b/gi, type: 'named' as const, label: 'morning' as const },
  { pattern: /\b(afternoon)\b/gi, type: 'named' as const, label: 'afternoon' as const },
  { pattern: /\b(evening)\b/gi, type: 'named' as const, label: 'evening' as const },
  { pattern: /\b(\d{1,2})\s*(am|pm)\b/gi, type: 'absolute' as const },
  { pattern: /\b(\d{1,2}:\d{2})\s*(am|pm)?\b/gi, type: 'absolute' as const },
];

const LOCATION_PATTERNS = [
  { pattern: /\b(near me|nearby|around here|close to me|in my area)\b/gi, type: 'proximity' as const },
  { pattern: /\b(downtown|midtown|uptown)\b/gi, type: 'neighborhood' as const },
  { pattern: /\b(\d{5})\b/g, type: 'zip' as const },
  { pattern: /\bin\s+([a-zA-Z][a-zA-Z\s]{2,30})\b/gi, type: 'city' as const },
];

const PRICE_PATTERNS = [
  { pattern: /\b(free)\b/gi, type: 'free' as const },
  { pattern: /\b(cheap|budget|affordable|inexpensive)\b/gi, type: 'max' as const, maxPrice: 2 },
  { pattern: /\bunder\s*\$?\s*(\d+)\b/gi, type: 'max' as const },
  { pattern: /\b(\$+)\b/g, type: 'symbol' as const },
  { pattern: /\b\$?\s*(\d+)\s*-\s*\$?\s*(\d+)\b/g, type: 'range' as const },
];

const DISTANCE_PATTERNS = [
  { pattern: /\bwithin\s+(\d+(?:\.\d+)?)\s*(miles?|mi)\b/gi, unit: 'miles' as const },
  { pattern: /\bwithin\s+(\d+(?:\.\d+)?)\s*(km|kilometers?)\b/gi, unit: 'km' as const },
  { pattern: /\bwithin\s+(\d+)\s*(blocks?)\b/gi, unit: 'blocks' as const },
  { pattern: /\b(walking distance|walkable)\b/gi, value: 0.5, unit: 'miles' as const },
];

const SOCIAL_PATTERNS = [
  { pattern: /\b(solo|alone|by myself)\b/gi, groupSize: 'solo' as const },
  { pattern: /\b(date|date night|romantic)\b/gi, groupSize: 'date' as const },
  { pattern: /\b(with friends|group|friends)\b/gi, groupSize: 'small_group' as const },
  { pattern: /\b(party|everyone|crowd)\b/gi, groupSize: 'large_group' as const },
];

/**
 * Extract date entities from query
 */
export function extractDates(query: string): DateEntity[] {
  const dates: DateEntity[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const { pattern, type, label } of DATE_PATTERNS) {
    const matches = [...query.matchAll(pattern)];
    
    for (const match of matches) {
      if (!match[0] || !match.index) continue;
      
      const entity: DateEntity = {
        raw: match[0],
        type,
        position: { start: match.index, end: match.index + match[0].length },
      };
      
      if (label) {
        entity.label = label;
      }
      
      // Extract day of week for relative dates
      if (type === 'relative' && match[2]) {
        entity.dayOfWeek = match[2].toLowerCase();
      }
      
      // Parse absolute dates
      if (type === 'absolute' && match[1]) {
        entity.specificDate = match[1];
      }
      
      dates.push(entity);
    }
  }
  
  return dates;
}

/**
 * Extract time entities from query
 */
export function extractTimes(query: string): TimeEntity[] {
  const times: TimeEntity[] = [];
  
  for (const { pattern, type, label } of TIME_PATTERNS) {
    const matches = [...query.matchAll(pattern)];
    
    for (const match of matches) {
      if (!match[0] || match.index === undefined) continue;
      
      const entity: TimeEntity = {
        raw: match[0],
        type,
        position: { start: match.index, end: match.index + match[0].length },
      };
      
      if (label) {
        entity.label = label;
      }
      
      // Parse absolute times
      if (type === 'absolute' && match[1]) {
        const hourMatch = match[1];
        const meridian = match[2]?.toLowerCase();
        
        if (hourMatch.includes(':')) {
          entity.startTime = hourMatch;
        } else {
          const hour = parseInt(hourMatch);
          entity.startTime = `${hour}:00`;
        }
      }
      
      times.push(entity);
    }
  }
  
  return times;
}

/**
 * Extract location entities from query
 */
export function extractLocations(query: string): LocationEntity[] {
  const locations: LocationEntity[] = [];
  
  for (const { pattern, type } of LOCATION_PATTERNS) {
    const matches = [...query.matchAll(pattern)];
    
    for (const match of matches) {
      if (!match[0] || match.index === undefined) continue;
      
      const value = type === 'city' && match[1] ? match[1].trim() : match[0];
      
      const entity: LocationEntity = {
        raw: match[0],
        type,
        value,
        confidence: type === 'zip' || type === 'proximity' ? 0.9 : 0.6,
        position: { start: match.index, end: match.index + match[0].length },
      };
      
      locations.push(entity);
    }
  }
  
  return locations;
}

/**
 * Extract price entities from query
 */
export function extractPrices(query: string): PriceEntity[] {
  const prices: PriceEntity[] = [];
  
  for (const { pattern, type, maxPrice } of PRICE_PATTERNS) {
    const matches = [...query.matchAll(pattern)];
    
    for (const match of matches) {
      if (!match[0] || match.index === undefined) continue;
      
      const entity: PriceEntity = {
        raw: match[0],
        type,
        position: { start: match.index, end: match.index + match[0].length },
      };
      
      if (type === 'free') {
        entity.min = 0;
        entity.max = 0;
      } else if (type === 'max') {
        if (maxPrice) {
          entity.max = maxPrice;
        } else if (match[1]) {
          entity.max = parseInt(match[1]);
        }
      } else if (type === 'symbol') {
        entity.priceSymbols = match[1].length;
        entity.min = match[1].length;
        entity.max = match[1].length;
      } else if (type === 'range' && match[1] && match[2]) {
        entity.min = parseInt(match[1]);
        entity.max = parseInt(match[2]);
      }
      
      prices.push(entity);
    }
  }
  
  return prices;
}

/**
 * Extract distance entities from query
 */
export function extractDistances(query: string): DistanceEntity[] {
  const distances: DistanceEntity[] = [];
  
  for (const { pattern, value, unit } of DISTANCE_PATTERNS) {
    const matches = [...query.matchAll(pattern)];
    
    for (const match of matches) {
      if (!match[0] || match.index === undefined) continue;
      
      let distanceValue: number;
      
      if (value !== undefined) {
        // Predefined value (e.g., "walking distance" = 0.5 miles)
        distanceValue = value;
      } else if (match[1]) {
        // Extracted numeric value
        distanceValue = parseFloat(match[1]);
        
        // Convert to miles if needed
        if (unit === 'km') {
          distanceValue = distanceValue * 0.621371;
        } else if (unit === 'blocks') {
          distanceValue = distanceValue * 0.05; // ~20 blocks per mile
        }
      } else {
        continue;
      }
      
      const entity: DistanceEntity = {
        raw: match[0],
        value: distanceValue,
        unit,
        position: { start: match.index, end: match.index + match[0].length },
      };
      
      distances.push(entity);
    }
  }
  
  return distances;
}

/**
 * Extract social context entities from query
 */
export function extractSocialContext(query: string): SocialEntity[] {
  const social: SocialEntity[] = [];
  
  for (const { pattern, groupSize } of SOCIAL_PATTERNS) {
    const matches = [...query.matchAll(pattern)];
    
    for (const match of matches) {
      if (!match[0] || match.index === undefined) continue;
      
      const entity: SocialEntity = {
        raw: match[0],
        type: 'group_size',
        groupSize,
        keywords: [match[0].toLowerCase()],
        position: { start: match.index, end: match.index + match[0].length },
      };
      
      social.push(entity);
    }
  }
  
  return social;
}

/**
 * Extract all entities from query
 */
export function extractEntities(query: string): ExtractedEntities {
  try {
    return {
      dates: extractDates(query),
      times: extractTimes(query),
      locations: extractLocations(query),
      priceRanges: extractPrices(query),
      distances: extractDistances(query),
      socialContext: extractSocialContext(query),
    };
  } catch (error) {
    console.error('[EntityExtractor] Error:', error);
    return {
      dates: [],
      times: [],
      locations: [],
      priceRanges: [],
      distances: [],
      socialContext: [],
    };
  }
}

/**
 * Helper: Check if query has time sensitivity
 */
export function hasTimeSensitivity(entities: ExtractedEntities): boolean {
  return entities.dates.length > 0 || entities.times.length > 0;
}

/**
 * Helper: Check if query has location specificity
 */
export function hasLocationSpecificity(entities: ExtractedEntities): boolean {
  return entities.locations.length > 0 || entities.distances.length > 0;
}

/**
 * Helper: Check if query has budget constraint
 */
export function hasBudgetConstraint(entities: ExtractedEntities): boolean {
  return entities.priceRanges.length > 0;
}

/**
 * Helper: Get primary date entity (first or most specific)
 */
export function getPrimaryDate(entities: ExtractedEntities): DateEntity | null {
  if (entities.dates.length === 0) return null;
  
  // Prefer absolute dates over relative/named
  const absolute = entities.dates.find(d => d.type === 'absolute');
  if (absolute) return absolute;
  
  // Return first
  return entities.dates[0];
}

/**
 * Helper: Get primary location entity
 */
export function getPrimaryLocation(entities: ExtractedEntities): LocationEntity | null {
  if (entities.locations.length === 0) return null;
  
  // Sort by confidence and return highest
  const sorted = [...entities.locations].sort((a, b) => b.confidence - a.confidence);
  return sorted[0];
}

/**
 * Helper: Get budget level from price entities
 */
export function getBudgetLevel(entities: ExtractedEntities): 'free' | 'budget' | 'moderate' | 'upscale' | null {
  if (entities.priceRanges.length === 0) return null;
  
  const price = entities.priceRanges[0];
  
  if (price.type === 'free') return 'free';
  
  if (price.type === 'symbol') {
    if (price.priceSymbols === 1) return 'budget';
    if (price.priceSymbols === 2) return 'moderate';
    if (price.priceSymbols! >= 3) return 'upscale';
  }
  
  if (price.type === 'max') {
    if (price.max && price.max <= 15) return 'budget';
    if (price.max && price.max <= 40) return 'moderate';
    if (price.max && price.max > 40) return 'upscale';
  }
  
  return 'moderate';
}

/**
 * Helper: Get distance constraint in miles
 */
export function getDistanceConstraint(entities: ExtractedEntities): number | null {
  if (entities.distances.length === 0) return null;
  
  // Return the smallest distance (most restrictive)
  const sorted = [...entities.distances].sort((a, b) => a.value - b.value);
  return sorted[0].value;
}

/**
 * Helper: Get group size
 */
export function getGroupSize(entities: ExtractedEntities): SocialEntity['groupSize'] | null {
  const social = entities.socialContext.find(s => s.groupSize);
  return social?.groupSize || null;
}
