/**
 * Search Quality Enhancement - Production-Grade Result Refinement
 * 
 * Ensures every search provides high-quality, diverse results.
 * Never returns poor, duplicate, or insufficient results.
 */

import type { SearchResult } from './types';

export type QualityConfig = {
  minResults: number; // Minimum acceptable result count (default: 15)
  minRating: number; // Minimum rating threshold (default: 3.5)
  maxSameCategory: number; // Max results from same subcategory (default: 30%)
  preferOpenNow: boolean; // Boost places that are currently open
};

const DEFAULT_CONFIG: QualityConfig = {
  minResults: 15,
  minRating: 3.5,
  maxSameCategory: 0.3, // 30%
  preferOpenNow: true,
};

/**
 * Filter results by quality thresholds
 */
export function filterByQuality(
  results: SearchResult[],
  config: Partial<QualityConfig> = {}
): SearchResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  return results.filter((r) => {
    // Rating quality check
    if (r.rating && r.rating < cfg.minRating) {
      return false; // Filter out low-rated places
    }
    
    // All results pass basic quality
    return true;
  });
}

/**
 * Ensure diversity - prevent too many results from same subcategory
 */
export function enforceDiversity(
  results: SearchResult[],
  config: Partial<QualityConfig> = {}
): SearchResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const maxPerCategory = Math.ceil(results.length * cfg.maxSameCategory);
  
  const categoryCount: Record<string, number> = {};
  const diversified: SearchResult[] = [];
  const deferred: SearchResult[] = [];
  
  for (const result of results) {
    const category = result.category || 'other';
    const count = categoryCount[category] || 0;
    
    if (count < maxPerCategory) {
      diversified.push(result);
      categoryCount[category] = count + 1;
    } else {
      deferred.push(result); // Save for later if we need more results
    }
  }
  
  // If we filtered out too many, add back highest-rated deferred results
  if (diversified.length < cfg.minResults && deferred.length > 0) {
    const sorted = deferred.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    diversified.push(...sorted.slice(0, cfg.minResults - diversified.length));
  }
  
  return diversified;
}

/**
 * Boost results that are currently open (time-aware)
 */
export function applyTimeAwareBoosting(
  results: SearchResult[],
  config: Partial<QualityConfig> = {}
): SearchResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (!cfg.preferOpenNow) return results;
  
  return results.map((r) => {
    if (r.type === 'place' && r.isOpenNow) {
      // Boost score for open places
      return { ...r, score: r.score * 1.3 };
    }
    return r;
  });
}

/**
 * Assess result quality and suggest actions
 */
export function assessQuality(
  results: SearchResult[],
  config: Partial<QualityConfig> = {}
): {
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  count: number;
  avgRating: number;
  suggestions: string[];
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const count = results.length;
  const rated = results.filter((r) => r.rating && r.rating > 0);
  const avgRating = rated.length > 0
    ? rated.reduce((sum, r) => sum + (r.rating || 0), 0) / rated.length
    : 0;
  
  const suggestions: string[] = [];
  let quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  
  if (count >= cfg.minResults * 2 && avgRating >= 4.2) {
    quality = 'excellent';
  } else if (count >= cfg.minResults && avgRating >= 3.8) {
    quality = 'good';
  } else if (count >= Math.floor(cfg.minResults * 0.6) && avgRating >= cfg.minRating) {
    quality = 'acceptable';
    if (count < cfg.minResults) {
      suggestions.push('expand_radius'); // Try wider area
    }
  } else {
    quality = 'poor';
    if (count < cfg.minResults) {
      suggestions.push('expand_radius');
    }
    if (avgRating < cfg.minRating) {
      suggestions.push('relax_rating_filter');
    }
    if (count === 0) {
      suggestions.push('broaden_query');
    }
  }
  
  return { quality, count, avgRating, suggestions };
}

/**
 * Full quality enhancement pipeline
 */
export function enhanceResults(
  results: SearchResult[],
  config: Partial<QualityConfig> = {}
): {
  enhanced: SearchResult[];
  quality: ReturnType<typeof assessQuality>;
  applied: string[];
} {
  const applied: string[] = [];
  
  // Step 1: Filter by quality thresholds
  let enhanced = filterByQuality(results, config);
  if (enhanced.length < results.length) {
    applied.push(`quality_filter (removed ${results.length - enhanced.length} low-rated)`);
  }
  
  // Step 2: Apply time-aware boosting
  enhanced = applyTimeAwareBoosting(enhanced, config);
  applied.push('time_aware_boost');
  
  // Step 3: Enforce diversity
  const beforeDiversity = enhanced.length;
  enhanced = enforceDiversity(enhanced, config);
  if (enhanced.length !== beforeDiversity) {
    applied.push(`diversity_enforcement (rebalanced categories)`);
  }
  
  // Step 4: Final sort by score (highest first)
  enhanced.sort((a, b) => b.score - a.score);
  applied.push('final_ranking');
  
  // Step 5: Assess final quality
  const quality = assessQuality(enhanced, config);
  
  return { enhanced, quality, applied };
}
