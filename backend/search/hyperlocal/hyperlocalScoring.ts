/**
 * Hyperlocal Scoring System
 * 
 * Implements small venue boost, independent venue detection, event density clustering,
 * venue momentum tracking, and neighborhood context awareness.
 * 
 * Differentiates WhatsUp from major platforms by surfacing local gems.
 */

import type { SearchResult } from '../types';

export interface VenueSize {
  size: 'micro' | 'small' | 'medium' | 'large' | 'chain';
  confidence: number;
  signals: string[];
}

export interface VenueMomentum {
  venueId: string;
  momentumScore: number; // 0-1
  isNew: boolean; // < 90 days
  isTrending: boolean;
}

export interface VenueCluster {
  id: string;
  centroid: { lat: number; lng: number };
  venues: SearchResult[];
  density: number; // venues per km²
  vibrancyScore: number; // 0-1
}

export interface NeighborhoodProfile {
  name: string;
  bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } };
  demographics: {
    medianAge?: number;
    collegePopulation?: number; // percentage
    density: 'low' | 'medium' | 'high';
  };
  vibe: ('residential' | 'commercial' | 'nightlife' | 'artsy' | 'tech' | 'historic' | 'hipster' | 'family')[];
  peakTimes: {
    weekday: { start: number; end: number };
    weekend: { start: number; end: number };
  };
}

// Major chain names for detection
const CHAIN_NAMES = new Set([
  'mcdonalds', 'mcdonald\'s', 'starbucks', 'subway', 'chipotle',
  'taco bell', 'kfc', 'burger king', 'wendy\'s', 'pizza hut',
  'domino\'s', 'papa john\'s', 'applebee\'s', 'chili\'s', 'olive garden',
  'panera', 'dunkin', 'dunkin donuts', 'tim hortons', 'five guys',
]);

/**
 * Detect venue size (micro/small/chain)
 */
export function detectVenueSize(venue: SearchResult): VenueSize {
  let chainSignals = 0;
  let smallSignals = 0;
  const signals: string[] = [];
  
  const nameLower = venue.title.toLowerCase();
  
  // Chain detection signals
  for (const chain of CHAIN_NAMES) {
    if (nameLower.includes(chain)) {
      chainSignals += 1.0;
      signals.push(`chain_name: ${chain}`);
      break;
    }
  }
  
  if (nameLower.match(/\b(inc|llc|corp|corporation|franchise|franchised)\b/i)) {
    chainSignals += 0.2;
    signals.push('corporate_suffix');
  }
  
  if (venue.reviewCount && venue.reviewCount > 1000) {
    chainSignals += 0.3;
    signals.push(`high_review_count: ${venue.reviewCount}`);
  }
  
  if (venue.reviewCount && venue.reviewCount > 5000) {
    chainSignals += 0.5;
    signals.push(`very_high_review_count: ${venue.reviewCount}`);
  }
  
  // Small/local venue signals
  if (venue.reviewCount && venue.reviewCount < 50) {
    smallSignals += 0.5;
    signals.push(`low_review_count: ${venue.reviewCount}`);
  }
  
  if (venue.reviewCount && venue.reviewCount < 20) {
    smallSignals += 0.3;
    signals.push('very_low_review_count');
  }
  
  if (nameLower.match(/\b(local|indie|independent|family-owned|family owned|mom and pop)\b/i)) {
    smallSignals += 0.4;
    signals.push('local_keyword_in_name');
  }
  
  // Hidden gem: high rating but low reviews
  if (venue.rating && venue.rating >= 4.5 && venue.reviewCount && venue.reviewCount < 100) {
    smallSignals += 0.3;
    signals.push('hidden_gem_profile');
  }
  
  // Determine size
  if (chainSignals > 0.5) {
    return { size: 'chain', confidence: Math.min(chainSignals, 1.0), signals };
  }
  
  if (smallSignals > 0.6) {
    return { size: 'small', confidence: Math.min(smallSignals, 1.0), signals };
  }
  
  if (smallSignals > 0.3) {
    return { size: 'micro', confidence: Math.min(smallSignals, 1.0), signals };
  }
  
  if (venue.reviewCount && venue.reviewCount > 500) {
    return { size: 'large', confidence: 0.6, signals };
  }
  
  return { size: 'medium', confidence: 0.5, signals };
}

/**
 * Apply small venue boost to score
 */
export function applySmallVenueBoost(score: number, venue: SearchResult): number {
  const venueSize = detectVenueSize(venue);
  
  // Boost small/micro venues (local gems)
  if (venueSize.size === 'small') {
    return score * 1.25;
  }
  
  if (venueSize.size === 'micro') {
    return score * 1.35;
  }
  
  // Penalize chains (favor local discovery)
  if (venueSize.size === 'chain') {
    return score * 0.65;
  }
  
  // Slight penalty for very large venues
  if (venueSize.size === 'large') {
    return score * 0.85;
  }
  
  return score;
}

/**
 * Score venue independence
 */
export function scoreIndependence(venue: SearchResult): number {
  let score = 0;
  const nameLower = venue.title.toLowerCase();
  
  // Positive signals
  if (nameLower.match(/\b(local|indie|independent|family|owned)\b/i)) {
    score += 0.3;
  }
  
  if (venue.reviewCount && venue.reviewCount < 200) {
    score += 0.2; // Likely not a chain
  }
  
  if (venue.reviewCount && venue.reviewCount < 50) {
    score += 0.2; // Very likely local
  }
  
  // Negative signals
  if (nameLower.match(/\b(inc|llc|corp|franchise)\b/i)) {
    score -= 0.3;
  }
  
  for (const chain of CHAIN_NAMES) {
    if (nameLower.includes(chain)) {
      score -= 0.6;
      break;
    }
  }
  
  return Math.max(0, Math.min(score, 1.0));
}

/**
 * Apply independence boost to score
 */
export function applyIndependenceBoost(score: number, venue: SearchResult): number {
  const independence = scoreIndependence(venue);
  return score * (1 + independence * 0.25); // Up to 25% boost
}

/**
 * Calculate venue momentum (for newly trending venues)
 */
export function calculateMomentum(venue: SearchResult): VenueMomentum {
  let momentumScore = 0;
  let isNew = false;
  let isTrending = false;
  
  // New venue boost (inferred from low review count + high rating)
  if (venue.reviewCount && venue.reviewCount < 30 && venue.rating && venue.rating >= 4.0) {
    momentumScore += 0.5;
    isNew = true;
  }
  
  // Very new (< 10 reviews but excellent rating)
  if (venue.reviewCount && venue.reviewCount < 10 && venue.rating && venue.rating >= 4.5) {
    momentumScore += 0.3;
  }
  
  // Trending signal: high rating with moderate review count (accumulating quickly)
  if (venue.reviewCount && venue.reviewCount >= 20 && venue.reviewCount <= 100 && venue.rating && venue.rating >= 4.3) {
    momentumScore += 0.2;
    isTrending = true;
  }
  
  return {
    venueId: venue.id,
    momentumScore: Math.min(momentumScore, 1.0),
    isNew,
    isTrending,
  };
}

/**
 * Apply momentum boost to score
 */
export function applyMomentumBoost(score: number, venue: SearchResult): number {
  const momentum = calculateMomentum(venue);
  return score * (1 + momentum.momentumScore * 0.35); // Up to 35% boost for trending spots
}

/**
 * Calculate Haversine distance between two points
 */
function haversineDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;
  
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}

/**
 * Simple DBSCAN clustering for event density detection
 */
export function identifyEventDensityClusters(
  results: SearchResult[],
  epsilon: number = 500, // 500 meters
  minPoints: number = 3
): VenueCluster[] {
  const clusters: VenueCluster[] = [];
  const visited = new Set<string>();
  const clustered = new Set<string>();
  
  for (const point of results) {
    if (visited.has(point.id)) continue;
    visited.add(point.id);
    
    // Find neighbors within epsilon
    const neighbors = results.filter(other => 
      other.id !== point.id &&
      haversineDistance(point.location, other.location) <= epsilon
    );
    
    if (neighbors.length >= minPoints - 1) {
      // Create cluster
      const clusterVenues = [point, ...neighbors];
      const centroid = calculateCentroid(clusterVenues);
      const area = Math.PI * (epsilon / 1000) * (epsilon / 1000); // km²
      const density = clusterVenues.length / area;
      const vibrancyScore = calculateVibrancy(clusterVenues);
      
      clusters.push({
        id: `cluster_${clusters.length}`,
        centroid,
        venues: clusterVenues,
        density,
        vibrancyScore,
      });
      
      // Mark all as clustered
      clusterVenues.forEach(v => clustered.add(v.id));
    }
  }
  
  return clusters;
}

/**
 * Calculate centroid of cluster
 */
function calculateCentroid(venues: SearchResult[]): { lat: number; lng: number } {
  const sumLat = venues.reduce((sum, v) => sum + v.location.latitude, 0);
  const sumLng = venues.reduce((sum, v) => sum + v.location.longitude, 0);
  
  return {
    lat: sumLat / venues.length,
    lng: sumLng / venues.length,
  };
}

/**
 * Calculate vibrancy score for a cluster
 */
function calculateVibrancy(venues: SearchResult[]): number {
  let score = 0;
  
  // 1. Density (more venues = more vibrant)
  score += Math.min(venues.length / 10, 1.0) * 0.35;
  
  // 2. Average rating
  const ratedVenues = venues.filter(v => v.rating);
  if (ratedVenues.length > 0) {
    const avgRating = ratedVenues.reduce((sum, v) => sum + (v.rating || 0), 0) / ratedVenues.length;
    score += (avgRating / 5) * 0.25;
  }
  
  // 3. Event count (upcoming events add vibrancy)
  const events = venues.filter(v => v.type === 'event');
  const upcomingEvents = events.filter(v => {
    if (!v.startDate) return false;
    return new Date(v.startDate) > new Date();
  });
  score += Math.min(upcomingEvents.length / 5, 1.0) * 0.25;
  
  // 4. Diversity (variety of categories)
  const categories = new Set(venues.map(v => v.category).filter(Boolean));
  score += Math.min(categories.size / 5, 1.0) * 0.15;
  
  return Math.min(score, 1.0);
}

/**
 * Boost results in high-vibrancy clusters
 */
export function boostClusterResults(
  results: SearchResult[],
  clusters: VenueCluster[]
): SearchResult[] {
  return results.map(result => {
    const cluster = clusters.find(c =>
      c.venues.some(v => v.id === result.id)
    );
    
    if (cluster && cluster.vibrancyScore > 0.7) {
      return {
        ...result,
        score: result.score * 1.18,
        reason: result.reason ? `${result.reason} • In vibrant area` : 'In vibrant area',
      };
    }
    
    return result;
  });
}

/**
 * Neighborhood profiles for major cities
 * (Start with top neighborhoods, can be expanded)
 */
const NEIGHBORHOOD_PROFILES: NeighborhoodProfile[] = [
  // San Francisco
  {
    name: 'Mission District',
    bounds: {
      sw: { lat: 37.7476, lng: -122.4295 },
      ne: { lat: 37.7702, lng: -122.4058 },
    },
    demographics: { medianAge: 32, density: 'high' },
    vibe: ['artsy', 'nightlife', 'tech', 'hipster'],
    peakTimes: {
      weekday: { start: 18, end: 23 },
      weekend: { start: 12, end: 2 },
    },
  },
  {
    name: 'SOMA',
    bounds: {
      sw: { lat: 37.7698, lng: -122.4119 },
      ne: { lat: 37.7880, lng: -122.3892 },
    },
    demographics: { medianAge: 30, density: 'high' },
    vibe: ['tech', 'commercial', 'nightlife'],
    peakTimes: {
      weekday: { start: 17, end: 22 },
      weekend: { start: 19, end: 2 },
    },
  },
  {
    name: 'North Beach',
    bounds: {
      sw: { lat: 37.7980, lng: -122.4120 },
      ne: { lat: 37.8065, lng: -122.4045 },
    },
    demographics: { medianAge: 42, density: 'medium' },
    vibe: ['historic', 'nightlife', 'artsy'],
    peakTimes: {
      weekday: { start: 18, end: 23 },
      weekend: { start: 11, end: 1 },
    },
  },
  
  // New York
  {
    name: 'Williamsburg',
    bounds: {
      sw: { lat: 40.7000, lng: -73.9700 },
      ne: { lat: 40.7250, lng: -73.9400 },
    },
    demographics: { medianAge: 28, density: 'high' },
    vibe: ['hipster', 'artsy', 'nightlife'],
    peakTimes: {
      weekday: { start: 18, end: 1 },
      weekend: { start: 12, end: 3 },
    },
  },
  {
    name: 'East Village',
    bounds: {
      sw: { lat: 40.7200, lng: -73.9900 },
      ne: { lat: 40.7350, lng: -73.9750 },
    },
    demographics: { medianAge: 30, density: 'high' },
    vibe: ['nightlife', 'artsy', 'historic'],
    peakTimes: {
      weekday: { start: 17, end: 2 },
      weekend: { start: 14, end: 4 },
    },
  },
  
  // Los Angeles
  {
    name: 'Silver Lake',
    bounds: {
      sw: { lat: 34.0700, lng: -118.2750 },
      ne: { lat: 34.1000, lng: -118.2450 },
    },
    demographics: { medianAge: 33, density: 'medium' },
    vibe: ['hipster', 'artsy', 'tech'],
    peakTimes: {
      weekday: { start: 18, end: 23 },
      weekend: { start: 11, end: 1 },
    },
  },
  {
    name: 'Venice Beach',
    bounds: {
      sw: { lat: 33.9800, lng: -118.4800 },
      ne: { lat: 34.0050, lng: -118.4550 },
    },
    demographics: { medianAge: 35, density: 'high' },
    vibe: ['artsy', 'nightlife', 'hipster'],
    peakTimes: {
      weekday: { start: 11, end: 22 },
      weekend: { start: 10, end: 1 },
    },
  },
  
  // Can expand to more cities...
];

/**
 * Get neighborhood for a location
 */
export function getNeighborhood(
  location: { latitude: number; longitude: number }
): NeighborhoodProfile | null {
  for (const hood of NEIGHBORHOOD_PROFILES) {
    if (
      location.latitude >= hood.bounds.sw.lat &&
      location.latitude <= hood.bounds.ne.lat &&
      location.longitude >= hood.bounds.sw.lng &&
      location.longitude <= hood.bounds.ne.lng
    ) {
      return hood;
    }
  }
  
  return null;
}

/**
 * Adjust results based on neighborhood context
 */
export function adjustForNeighborhoodContext(
  results: SearchResult[],
  userLocation: { latitude: number; longitude: number },
  currentHour: number,
  isWeekend: boolean
): SearchResult[] {
  const neighborhood = getNeighborhood(userLocation);
  if (!neighborhood) return results;
  
  return results.map(result => {
    let boost = 1.0;
    const resultCategory = result.category?.toLowerCase() || '';
    const resultTitle = result.title.toLowerCase();
    
    // Boost results matching neighborhood vibe
    if (neighborhood.vibe.includes('artsy') && (resultCategory.includes('art') || resultCategory.includes('gallery'))) {
      boost *= 1.15;
    }
    
    if (neighborhood.vibe.includes('nightlife') && (resultCategory.includes('bar') || resultCategory.includes('club'))) {
      boost *= 1.15;
    }
    
    if (neighborhood.vibe.includes('tech') && (resultTitle.includes('startup') || resultTitle.includes('tech'))) {
      boost *= 1.15;
    }
    
    if (neighborhood.vibe.includes('hipster') && (resultCategory.includes('coffee') || resultCategory.includes('vintage'))) {
      boost *= 1.12;
    }
    
    if (neighborhood.vibe.includes('family') && resultTitle.match(/\b(family|kid|child)\b/i)) {
      boost *= 1.12;
    }
    
    // Adjust for peak times
    const peakTime = isWeekend ? neighborhood.peakTimes.weekend : neighborhood.peakTimes.weekday;
    if (currentHour >= peakTime.start && currentHour <= peakTime.end) {
      boost *= 1.1; // Boost during neighborhood peak hours
    }
    
    return {
      ...result,
      score: result.score * boost,
    };
  });
}

/**
 * Detect if venue is likely a chain by checking multiple locations
 * (Requires database of venue locations - placeholder for now)
 */
export function isChainByLocationCount(venueName: string): boolean {
  // TODO: Implement database lookup for venue location count
  // For now, use name-based detection only
  const nameLower = venueName.toLowerCase();
  return CHAIN_NAMES.has(nameLower);
}

/**
 * Calculate overall hyperlocal score combining all factors
 */
export function calculateHyperlocalScore(
  venue: SearchResult,
  userLocation: { latitude: number; longitude: number },
  currentHour: number,
  isWeekend: boolean
): number {
  let score = 1.0;
  
  // Apply all hyperlocal factors
  score = applySmallVenueBoost(score, venue);
  score = applyIndependenceBoost(score, venue);
  score = applyMomentumBoost(score, venue);
  
  // Neighborhood context (inline for single venue)
  const neighborhood = getNeighborhood(userLocation);
  if (neighborhood) {
    const peakTime = isWeekend ? neighborhood.peakTimes.weekend : neighborhood.peakTimes.weekday;
    if (currentHour >= peakTime.start && currentHour <= peakTime.end) {
      score *= 1.1;
    }
  }
  
  return score;
}
