/**
 * Smart Fallback Strategies
 * 
 * Auto-expansion logic for radius, date ranges, and categories when results are insufficient.
 */

import type { SearchResult } from '../types';
import type { EnhancedIntentClassification } from '../preprocessing/intentClassifier';

export interface FallbackStrategy {
  type: 'radius' | 'date' | 'category' | 'rating';
  applied: boolean;
  oldValue: any;
  newValue: any;
  reasoning: string;
}

export interface FallbackResult {
  shouldRetry: boolean;
  strategies: FallbackStrategy[];
  newParams: any;
}

/**
 * Check if radius should be expanded
 */
export function shouldExpandRadius(
  results: SearchResult[],
  currentRadius: number
): boolean {
  // Expand if insufficient results and haven't hit max radius
  if (results.length < 5 && currentRadius < 50) {
    return true;
  }
  
  // Expand if low quality results
  if (results.length > 0) {
    const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
    if (avgScore < 0.4 && currentRadius < 30) {
      return true;
    }
  }
  
  return false;
}

/**
 * Expand radius intelligently
 */
export function expandRadius(currentRadius: number): number {
  // Progressive expansion
  if (currentRadius < 5) return 5;
  if (currentRadius < 10) return 10;
  if (currentRadius < 25) return 25;
  return Math.min(currentRadius * 2, 50);
}

/**
 * Check if date range should be expanded
 */
export function shouldExpandDateRange(
  results: SearchResult[],
  timeLabel?: string
): boolean {
  // Only expand for time-specific queries
  if (!timeLabel) return false;
  
  // Expand if very few event results for "tonight"
  const events = results.filter(r => r.type === 'event');
  
  if (timeLabel === 'tonight' && events.length < 3) {
    return true;
  }
  
  if (timeLabel === 'weekend' && events.length < 5) {
    return true;
  }
  
  return false;
}

/**
 * Expand date range by 1-2 days
 */
export function expandDateRange(timeLabel: string): string {
  const expansionMap: Record<string, string> = {
    'tonight': 'tonight + tomorrow',
    'today': 'today + tomorrow',
    'weekend': 'extended weekend',
  };
  
  return expansionMap[timeLabel] || timeLabel;
}

/**
 * Check if rating threshold should be relaxed
 */
export function shouldRelaxRating(
  results: SearchResult[],
  currentMinRating: number
): boolean {
  // Relax if very few results and current threshold is high
  return results.length < 8 && currentMinRating > 3.0;
}

/**
 * Relax rating threshold
 */
export function relaxRating(currentMinRating: number): number {
  // Step down by 0.3-0.5
  if (currentMinRating >= 4.0) return 3.5;
  if (currentMinRating >= 3.5) return 3.0;
  return 2.5; // Minimum acceptable
}

/**
 * Suggest alternative categories
 */
export function suggestAlternativeCategories(
  intent: EnhancedIntentClassification,
  results: SearchResult[]
): string[] {
  if (results.length >= 10) return [];
  
  const primaryCategory = intent.categories[0];
  
  const categoryRelationships: Record<string, string[]> = {
    'jazz': ['live_music', 'music', 'lounge'],
    'sushi': ['japanese', 'asian', 'seafood'],
    'rooftop': ['bar', 'outdoor', 'lounge'],
    'comedy': ['entertainment', 'show', 'nightlife'],
    'yoga': ['fitness', 'wellness', 'meditation'],
    'coffee': ['cafe', 'breakfast', 'work'],
    'brunch': ['breakfast', 'food', 'weekend'],
  };
  
  return categoryRelationships[primaryCategory] || [];
}

/**
 * Determine fallback strategy
 */
export function determineFallbackStrategy(
  results: SearchResult[],
  currentRadius: number,
  currentMinRating: number,
  timeLabel?: string
): FallbackResult {
  const strategies: FallbackStrategy[] = [];
  let newParams: any = {};
  
  // Strategy 1: Expand radius
  if (shouldExpandRadius(results, currentRadius)) {
    const newRadius = expandRadius(currentRadius);
    strategies.push({
      type: 'radius',
      applied: true,
      oldValue: currentRadius,
      newValue: newRadius,
      reasoning: `Expanded search radius from ${currentRadius} to ${newRadius} miles to find more results`,
    });
    newParams.radiusMiles = newRadius;
  }
  
  // Strategy 2: Expand date range
  if (shouldExpandDateRange(results, timeLabel)) {
    const newLabel = expandDateRange(timeLabel);
    strategies.push({
      type: 'date',
      applied: true,
      oldValue: timeLabel,
      newValue: newLabel,
      reasoning: `Expanded time range to include more events`,
    });
    newParams.expandedTime = newLabel;
  }
  
  // Strategy 3: Relax rating
  if (shouldRelaxRating(results, currentMinRating)) {
    const newRating = relaxRating(currentMinRating);
    strategies.push({
      type: 'rating',
      applied: true,
      oldValue: currentMinRating,
      newValue: newRating,
      reasoning: `Relaxed minimum rating from ${currentMinRating} to ${newRating} to include more options`,
    });
    newParams.minRating = newRating;
  }
  
  return {
    shouldRetry: strategies.some(s => s.applied),
    strategies,
    newParams,
  };
}

/**
 * Calculate result quality score
 */
export function calculateResultQuality(results: SearchResult[]): number {
  if (results.length === 0) return 0;
  
  let qualityScore = 0;
  
  // 1. Quantity (0-1 based on result count)
  qualityScore += Math.min(results.length / 15, 1.0) * 0.3;
  
  // 2. Average score
  const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
  qualityScore += avgScore * 0.4;
  
  // 3. Data completeness (% with images, ratings, etc.)
  const withImages = results.filter(r => r.imageUrl || r.photoName).length;
  const withRatings = results.filter(r => r.rating !== undefined).length;
  const completeness = ((withImages + withRatings) / (results.length * 2));
  qualityScore += completeness * 0.3;
  
  return Math.min(qualityScore, 1.0);
}

/**
 * Check intent purity (% of results matching primary intent)
 */
export function scoreIntentPurity(
  results: SearchResult[],
  intent: EnhancedIntentClassification
): number {
  if (results.length === 0) return 0;
  
  const matchingResults = results.filter(r => 
    r.type === intent.intentType || intent.intentType === 'both'
  );
  
  const purity = matchingResults.length / results.length;
  
  if (purity < 0.5) {
    console.warn(`[Precision] Low intent purity: ${(purity * 100).toFixed(0)}%`);
  }
  
  return purity;
}
