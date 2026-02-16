/**
 * UX Feedback Generator
 * 
 * Generates refinement chips, helper text, and filter suggestions to guide users.
 */

import type { SearchResult } from '../types';
import type { EnhancedIntentClassification } from '../preprocessing/intentClassifier';
import type { FallbackStrategy } from './smartFallbacks';

export interface UXFeedback {
  chips: string[]; // Quick refinement chips
  helperText: string;
  expandedQuery: boolean;
  suggestedFilters: FilterSuggestion[];
  warnings: string[];
}

export interface FilterSuggestion {
  type: 'category' | 'time' | 'price' | 'distance' | 'rating';
  label: string;
  value: any;
  count?: number; // How many results match this filter
}

/**
 * Generate UX feedback for search results
 */
export function generateUXFeedback(
  results: SearchResult[],
  intent: EnhancedIntentClassification,
  fallbackStrategies: FallbackStrategy[] = []
): UXFeedback {
  const chips: string[] = [];
  const suggestedFilters: FilterSuggestion[] = [];
  const warnings: string[] = [];
  let helperText = '';
  
  // 1. Helper text based on result count
  if (results.length === 0) {
    helperText = 'No results found. Try a broader search or different area.';
    warnings.push('no_results');
  } else if (results.length < 5) {
    helperText = `Found ${results.length} result${results.length > 1 ? 's' : ''}. Try expanding your search area for more options.`;
    warnings.push('few_results');
  } else if (fallbackStrategies.some(s => s.applied)) {
    const expandedRadius = fallbackStrategies.find(s => s.type === 'radius');
    if (expandedRadius) {
      helperText = `Expanded search to ${expandedRadius.newValue} miles to find more options.`;
    } else {
      helperText = `Found ${results.length} ${intent.intentType}s near you.`;
    }
  } else {
    helperText = `Found ${results.length} great ${intent.intentType}s near you.`;
  }
  
  // 2. Generate refinement chips (if enough results)
  if (results.length > 10) {
    // Quick filter chips
    chips.push('Open now', 'Top rated', 'Budget-friendly');
    
    // Category-specific chips
    const topCategories = getTopCategories(results);
    chips.push(...topCategories.slice(0, 5));
  }
  
  // 3. Generate filter suggestions
  
  // Price filter
  const expensiveCount = results.filter(r => r.priceLevel && r.priceLevel >= 3).length;
  if (expensiveCount > results.length * 0.4) {
    suggestedFilters.push({
      type: 'price',
      label: 'Budget options ($-$$)',
      value: { maxPrice: 2 },
      count: results.filter(r => r.priceLevel && r.priceLevel <= 2).length,
    });
  }
  
  // Open now filter (for immediate searches)
  if (intent.subIntents.timeIntent?.urgency === 'immediate') {
    const openCount = results.filter(r => r.isOpenNow).length;
    if (openCount > 0) {
      suggestedFilters.push({
        type: 'time',
        label: 'Open now',
        value: { openNow: true },
        count: openCount,
      });
    }
  }
  
  // Rating filter
  const highRatedCount = results.filter(r => r.rating && r.rating >= 4.5).length;
  if (highRatedCount > 5) {
    suggestedFilters.push({
      type: 'rating',
      label: 'Highly rated (4.5+)',
      value: { minRating: 4.5 },
      count: highRatedCount,
    });
  }
  
  // Distance filter
  const nearbyCount = results.filter(r => r.distanceMeters && r.distanceMeters < 1000).length;
  if (nearbyCount > 3) {
    suggestedFilters.push({
      type: 'distance',
      label: 'Walking distance',
      value: { maxDistance: 1 },
      count: nearbyCount,
    });
  }
  
  return {
    chips,
    helperText,
    expandedQuery: fallbackStrategies.some(s => s.applied),
    suggestedFilters,
    warnings,
  };
}

/**
 * Get top categories from results
 */
function getTopCategories(results: SearchResult[]): string[] {
  const categoryCounts = new Map<string, number>();
  
  for (const result of results) {
    if (result.category) {
      const count = categoryCounts.get(result.category) || 0;
      categoryCounts.set(result.category, count + 1);
    }
  }
  
  return Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => formatCategoryChip(category));
}

/**
 * Format category for chip display
 */
function formatCategoryChip(category: string): string {
  // Convert snake_case to Title Case
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate search suggestions when no results
 */
export function generateSearchSuggestions(
  intent: EnhancedIntentClassification
): string[] {
  const suggestions: string[] = [];
  
  // Broaden category suggestions
  if (intent.categories.includes('food')) {
    suggestions.push('Try searching for "restaurants" or "cafes"');
  }
  
  if (intent.categories.includes('nightlife')) {
    suggestions.push('Try searching for "bars" or "lounges"');
  }
  
  if (intent.categories.includes('music')) {
    suggestions.push('Try searching for "concerts" or "live music"');
  }
  
  // General suggestions
  if (intent.locationHint.type === 'city') {
    suggestions.push('Try "near me" for results closer to you');
  }
  
  if (intent.timeContext.label) {
    suggestions.push('Try removing time filters for more results');
  }
  
  return suggestions;
}

/**
 * Analyze result diversity
 */
export function analyzeResultDiversity(results: SearchResult[]): {
  categoryCount: number;
  dominantCategory: string | null;
  dominantPercentage: number;
  isDiverse: boolean;
} {
  if (results.length === 0) {
    return {
      categoryCount: 0,
      dominantCategory: null,
      dominantPercentage: 0,
      isDiverse: false,
    };
  }
  
  const categoryCounts = new Map<string, number>();
  
  for (const result of results) {
    const cat = result.category || 'other';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }
  
  const categories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const dominantCategory = categories[0]?.[0] || null;
  const dominantCount = categories[0]?.[1] || 0;
  const dominantPercentage = dominantCount / results.length;
  
  return {
    categoryCount: categoryCounts.size,
    dominantCategory,
    dominantPercentage,
    isDiverse: dominantPercentage < 0.5 && categoryCounts.size >= 3,
  };
}

/**
 * Generate warning messages for edge cases
 */
export function generateWarnings(
  results: SearchResult[],
  intent: EnhancedIntentClassification
): string[] {
  const warnings: string[] = [];
  
  // No results
  if (results.length === 0) {
    warnings.push('No results found for your search');
  }
  
  // Low quality results
  if (results.length > 0) {
    const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
    if (avgScore < 0.3) {
      warnings.push('Results may not closely match your search');
    }
  }
  
  // No open venues for urgent queries
  if (intent.subIntents.timeIntent?.urgency === 'immediate') {
    const openCount = results.filter(r => r.isOpenNow).length;
    if (openCount === 0) {
      warnings.push('No venues currently open');
    }
  }
  
  // Poor category diversity
  const diversity = analyzeResultDiversity(results);
  if (!diversity.isDiverse && diversity.dominantPercentage > 0.7) {
    warnings.push(`Most results are ${diversity.dominantCategory}s`);
  }
  
  return warnings;
}
