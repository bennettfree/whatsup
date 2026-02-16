/**
 * Adaptive Multi-Factor Ranking Engine
 * 
 * Context-aware ranking with 8 scoring components:
 * 1. Proximity
 * 2. Rating
 * 3. Popularity
 * 4. Novelty
 * 5. Temporal relevance
 * 6. Intent match
 * 7. Vibrancy
 * 8. Independence
 * 
 * Weights adapt based on intent, mood, urgency, and context.
 */

import type { SearchResult } from '../types';
import type { EnhancedIntentClassification, MoodIntent } from '../preprocessing/intentClassifier';
import { isMicroCategory } from '../taxonomy/categorySystem';

export interface RankingContext {
  intent: EnhancedIntentClassification;
  userLocation: { latitude: number; longitude: number };
  currentHour: number;
  isWeekend: boolean;
  urgency: 'immediate' | 'near_future' | 'planning';
}

export interface RankingWeights {
  proximity: number;
  rating: number;
  popularity: number;
  novelty: number;
  temporal: number;
  intentMatch: number;
  vibrancy: number;
  independence: number;
}

export interface ScoredResult extends SearchResult {
  scoreBreakdown?: {
    proximity: number;
    rating: number;
    popularity: number;
    novelty: number;
    temporal: number;
    intentMatch: number;
    vibrancy: number;
    independence: number;
  };
}

/**
 * Calculate adaptive weights based on context
 */
export function calculateAdaptiveWeights(context: RankingContext): RankingWeights {
  // Base weights (sum = 1.0)
  const base: RankingWeights = {
    proximity: 0.30,
    rating: 0.15,
    popularity: 0.10,
    novelty: 0.05,
    temporal: 0.15,
    intentMatch: 0.20,
    vibrancy: 0.03,
    independence: 0.02,
  };
  
  // Adapt based on intent type
  if (context.intent.intentType === 'place') {
    base.proximity += 0.08; // Places more proximity-sensitive
    base.temporal -= 0.05;
    base.rating += 0.03;
  } else if (context.intent.intentType === 'event') {
    base.temporal += 0.12; // Events highly time-sensitive
    base.proximity -= 0.08;
    base.novelty += 0.03;
  }
  
  // Adapt based on urgency
  if (context.urgency === 'immediate') {
    base.temporal += 0.10; // "Tonight" needs immediate availability
    base.proximity += 0.05;
    base.rating -= 0.05; // Less critical when urgent
  } else if (context.urgency === 'planning') {
    base.rating += 0.05; // More time to choose = value quality
    base.temporal -= 0.05;
  }
  
  // Adapt based on mood
  const mood = context.intent.subIntents.moodIntent?.mood;
  if (mood === 'adventurous') {
    base.novelty += 0.12; // Boost unique/new places
    base.popularity -= 0.07; // Avoid touristy spots
    base.independence += 0.03;
  } else if (mood === 'relaxing') {
    base.vibrancy -= 0.02; // Prefer quieter areas
    base.rating += 0.05; // Value quality for relaxation
    base.proximity += 0.03;
  } else if (mood === 'romantic') {
    base.rating += 0.08; // Quality critical for dates
    base.popularity -= 0.05; // Avoid crowds
    base.proximity -= 0.03; // Willing to travel for good spot
  } else if (mood === 'social') {
    base.vibrancy += 0.05; // Prefer vibrant areas
    base.popularity += 0.03;
  }
  
  // Adapt based on budget
  const budget = context.intent.subIntents.budgetIntent?.level;
  if (budget === 'free' || budget === 'budget') {
    base.popularity -= 0.05; // Cheap spots often less popular
    base.independence += 0.03; // Local spots often more affordable
  } else if (budget === 'upscale') {
    base.rating += 0.08; // Quality critical for upscale
    base.popularity += 0.03;
  }
  
  // Normalize to sum = 1.0
  const sum = Object.values(base).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(base) as (keyof RankingWeights)[]) {
    base[key] /= sum;
  }
  
  return base;
}

/**
 * Calculate Haversine distance
 */
function haversineDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 6371e3;
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;
  
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * 1. Proximity Score (exponential decay)
 */
export function scoreProximity(
  result: SearchResult,
  userLocation: { latitude: number; longitude: number }
): number {
  const distanceMeters = result.distanceMeters || haversineDistance(result.location, userLocation);
  
  // Exponential decay: closer = much better
  if (distanceMeters <= 500) return 1.0;   // < 0.5km
  if (distanceMeters <= 1000) return 0.85; // < 1km
  if (distanceMeters <= 2000) return 0.65; // < 2km
  if (distanceMeters <= 5000) return 0.40; // < 5km
  if (distanceMeters <= 10000) return 0.20; // < 10km
  if (distanceMeters <= 20000) return 0.10; // < 20km
  return 0.05; // > 20km
}

/**
 * 2. Rating Score (normalized 0-5 to 0-1)
 */
export function scoreRating(result: SearchResult): number {
  if (!result.rating) return 0.5; // Neutral for no rating
  return result.rating / 5;
}

/**
 * 3. Popularity Score (sigmoid to prevent chain dominance)
 */
export function scorePopularity(result: SearchResult): number {
  if (!result.reviewCount) return 0.25; // Low default (prefer less discovered)
  
  // Sigmoid function: prevents mega-chains from dominating
  // reviewCount: 0-10 = ~0.15, 50 = ~0.35, 100 = ~0.5, 500 = ~0.75, 1000+ = ~0.85
  const normalized = 1 / (1 + Math.exp(-0.008 * (result.reviewCount - 250)));
  
  return normalized;
}

/**
 * 4. Novelty Score (new venues + hidden gems)
 */
export function scoreNovelty(result: SearchResult): number {
  let novelty = 0;
  
  // Hidden gem: high rating but low review count
  if (result.rating && result.rating >= 4.5 && result.reviewCount && result.reviewCount < 50) {
    novelty += 0.4;
  }
  
  // Very hidden gem: excellent rating, very few reviews
  if (result.rating && result.rating >= 4.7 && result.reviewCount && result.reviewCount < 20) {
    novelty += 0.3;
  }
  
  // New venue inferred from low review count
  if (result.reviewCount && result.reviewCount < 15) {
    novelty += 0.2;
  }
  
  // Micro-category bonus (unique venue types)
  if (result.category && isMicroCategory(result.category)) {
    novelty += 0.15;
  }
  
  return Math.min(novelty, 1.0);
}

/**
 * 5. Temporal Relevance Score
 */
export function scoreTemporal(
  result: SearchResult,
  context: RankingContext
): number {
  // For places
  if (result.type === 'place') {
    if (context.urgency === 'immediate') {
      // "Tonight" or "now" queries
      if (result.isOpenNow === true) return 1.0;
      if (result.isOpenNow === false) return 0.05; // Heavily penalize closed
      return 0.5; // Unknown status = neutral
    }
    
    // Non-urgent place queries
    if (result.isOpenNow === true) return 0.7; // Slight bonus for open
    return 0.5;
  }
  
  // For events
  if (result.type === 'event' && result.startDate) {
    const eventStart = new Date(result.startDate);
    const now = new Date();
    const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Already started or past
    if (hoursUntilEvent < 0) {
      const hoursSinceStart = Math.abs(hoursUntilEvent);
      if (hoursSinceStart < 3) return 0.8; // Currently happening
      return 0.1; // Past event
    }
    
    // Immediate urgency
    if (context.urgency === 'immediate') {
      if (hoursUntilEvent < 3) return 1.0; // Happening very soon
      if (hoursUntilEvent < 6) return 0.85; // Happening tonight
      if (hoursUntilEvent < 24) return 0.5; // Today but later
      return 0.2; // Not today
    }
    
    // Near future
    if (context.urgency === 'near_future') {
      if (hoursUntilEvent < 48) return 1.0; // This weekend
      if (hoursUntilEvent < 168) return 0.7; // This week
      return 0.4;
    }
    
    // Planning
    if (hoursUntilEvent < 720) return 0.9; // Within a month
    return 0.6;
  }
  
  return 0.5; // Neutral
}

/**
 * 6. Intent Match Score
 */
export function scoreIntentMatch(
  result: SearchResult,
  intent: EnhancedIntentClassification
): number {
  let score = 0;
  
  // 1. Type match (place vs event)
  if (intent.intentType === result.type) {
    score += 0.35;
  } else if (intent.intentType === 'both') {
    score += 0.25;
  } else {
    score += 0.05; // Wrong type but might still be relevant
  }
  
  // 2. Category match
  const resultCategory = result.category?.toLowerCase() || '';
  for (const intentCategory of intent.categories) {
    if (resultCategory.includes(intentCategory.toLowerCase())) {
      score += 0.25;
      break;
    }
  }
  
  // 3. Keyword match in title
  const titleLower = result.title.toLowerCase();
  let keywordMatches = 0;
  for (const keyword of intent.keywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }
  if (keywordMatches > 0) {
    score += Math.min(keywordMatches * 0.15, 0.3);
  }
  
  // 4. Vibe match
  if (intent.vibe && intent.vibe.length > 0) {
    for (const vibe of intent.vibe) {
      if (titleLower.includes(vibe.toLowerCase())) {
        score += 0.1;
        break;
      }
    }
  }
  
  return Math.min(score, 1.0);
}

/**
 * 7. Vibrancy Score (based on nearby venue density)
 */
export function scoreVibrancy(
  result: SearchResult,
  allResults: SearchResult[]
): number {
  // Find nearby results (within 200m)
  const nearby = allResults.filter(other => {
    if (other.id === result.id) return false;
    
    const distance = result.distanceMeters && other.distanceMeters
      ? Math.abs(result.distanceMeters - other.distanceMeters)
      : haversineDistance(result.location, other.location);
    
    return distance <= 200;
  });
  
  // More nearby venues = more vibrant area
  const density = Math.min(nearby.length / 10, 1.0);
  
  return density;
}

/**
 * 8. Independence Score
 */
export function scoreIndependence(result: SearchResult): number {
  const nameLower = result.title.toLowerCase();
  let score = 0.5; // Neutral default
  
  // Positive signals
  if (nameLower.match(/\b(local|indie|independent|family)\b/i)) {
    score += 0.3;
  }
  
  if (result.reviewCount && result.reviewCount < 200) {
    score += 0.2;
  }
  
  // Negative signals (chain detection)
  const chains = ['starbucks', 'mcdonalds', 'subway', 'chipotle', 'taco bell'];
  for (const chain of chains) {
    if (nameLower.includes(chain)) {
      score -= 0.6;
      break;
    }
  }
  
  if (nameLower.match(/\b(inc|llc|corp|franchise)\b/i)) {
    score -= 0.2;
  }
  
  return Math.max(0, Math.min(score, 1.0));
}

/**
 * Calculate final weighted score for a result
 */
export function calculateFinalScore(
  result: SearchResult,
  allResults: SearchResult[],
  context: RankingContext,
  weights: RankingWeights
): ScoredResult {
  // Calculate individual component scores
  const scores = {
    proximity: scoreProximity(result, context.userLocation),
    rating: scoreRating(result),
    popularity: scorePopularity(result),
    novelty: scoreNovelty(result),
    temporal: scoreTemporal(result, context),
    intentMatch: scoreIntentMatch(result, context.intent),
    vibrancy: scoreVibrancy(result, allResults),
    independence: scoreIndependence(result),
  };
  
  // Calculate weighted sum
  const finalScore =
    scores.proximity * weights.proximity +
    scores.rating * weights.rating +
    scores.popularity * weights.popularity +
    scores.novelty * weights.novelty +
    scores.temporal * weights.temporal +
    scores.intentMatch * weights.intentMatch +
    scores.vibrancy * weights.vibrancy +
    scores.independence * weights.independence;
  
  return {
    ...result,
    score: finalScore,
    scoreBreakdown: scores,
  };
}

/**
 * Rank all results with adaptive scoring
 */
export function rankResults(
  results: SearchResult[],
  context: RankingContext
): ScoredResult[] {
  // 1. Calculate adaptive weights
  const weights = calculateAdaptiveWeights(context);
  
  // 2. Score all results
  const scored = results.map(result =>
    calculateFinalScore(result, results, context, weights)
  );
  
  // 3. Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);
  
  return scored;
}

/**
 * Get mood tags for matching
 */
function getMoodTags(mood: MoodIntent['mood']): string[] {
  const moodTagMap: Record<MoodIntent['mood'], string[]> = {
    romantic: ['intimate', 'cozy', 'date_spot', 'romantic'],
    energetic: ['lively', 'vibrant', 'energetic', 'fun'],
    relaxing: ['peaceful', 'calm', 'quiet', 'relaxed'],
    adventurous: ['unique', 'different', 'adventure'],
    social: ['social', 'group', 'networking'],
    quiet: ['quiet', 'peaceful', 'calm'],
  };
  
  return moodTagMap[mood] || [];
}

/**
 * Check if result matches budget constraint
 */
function matchesBudget(
  priceLevel: number,
  budgetLevel: 'free' | 'budget' | 'moderate' | 'upscale'
): boolean {
  if (budgetLevel === 'free') return priceLevel === 0;
  if (budgetLevel === 'budget') return priceLevel <= 1;
  if (budgetLevel === 'moderate') return priceLevel <= 2;
  if (budgetLevel === 'upscale') return priceLevel >= 3;
  return true;
}

/**
 * Apply anti-bias strategies
 */
export function applyAntiBiasStrategies(results: ScoredResult[]): ScoredResult[] {
  return results.map(result => {
    let adjustedScore = result.score;
    
    // 1. Chain penalty (beyond weight adjustments)
    if (result.reviewCount && result.reviewCount > 2000) {
      adjustedScore *= 0.95;
    }
    
    // 2. Novelty boost for hidden gems
    if (result.rating && result.rating >= 4.6 && result.reviewCount && result.reviewCount < 30) {
      adjustedScore *= 1.15;
    }
    
    // 3. Diversity enforcement happens in qualityEnhancer.ts
    
    return {
      ...result,
      score: adjustedScore,
    };
  });
}

/**
 * Generate human-readable ranking explanation
 */
export function explainRanking(
  result: ScoredResult,
  weights: RankingWeights
): string {
  if (!result.scoreBreakdown) return result.reason || '';
  
  const breakdown = result.scoreBreakdown;
  const factors: string[] = [];
  
  // Find top contributing factors
  const contributions = [
    { name: 'proximity', score: breakdown.proximity * weights.proximity },
    { name: 'rating', score: breakdown.rating * weights.rating },
    { name: 'temporal', score: breakdown.temporal * weights.temporal },
    { name: 'intent', score: breakdown.intentMatch * weights.intentMatch },
  ].sort((a, b) => b.score - a.score);
  
  // Top factor
  if (contributions[0].name === 'proximity' && breakdown.proximity > 0.7) {
    factors.push('Very close');
  } else if (contributions[0].name === 'rating' && breakdown.rating > 0.8) {
    factors.push('Highly rated');
  } else if (contributions[0].name === 'temporal' && breakdown.temporal > 0.8) {
    factors.push('Perfect timing');
  } else if (contributions[0].name === 'intent' && breakdown.intentMatch > 0.7) {
    factors.push('Great match');
  }
  
  // Additional factors
  if (breakdown.novelty > 0.5) factors.push('Hidden gem');
  if (breakdown.independence > 0.7) factors.push('Local favorite');
  if (breakdown.vibrancy > 0.6) factors.push('Vibrant area');
  
  return factors.length > 0 ? factors.join(' • ') : result.reason || 'Recommended';
}
