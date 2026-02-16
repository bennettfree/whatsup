/**
 * Multi-Label Venue Classifier
 * 
 * Classifies venues into primary + secondary categories with confidence scoring.
 * Supports micro-category detection and tag-based classification.
 */

import type { SearchResult } from '../types';
import {
  ALL_CATEGORIES,
  getCategoryById,
  getCategoryTags,
  type CategoryDefinition,
  type VenueCategoryAssignment,
} from './categorySystem';

interface ScoredCategory {
  category: string;
  score: number;
  matchedKeywords: string[];
}

/**
 * Score a venue for a specific category
 */
function scoreVenueForCategory(
  venue: SearchResult,
  categoryDef: CategoryDefinition
): number {
  let score = 0;
  const matchedKeywords: string[] = [];
  
  // 1. Name matching (strongest signal)
  const nameLower = venue.title.toLowerCase();
  for (const keyword of categoryDef.searchKeywords) {
    if (nameLower.includes(keyword.toLowerCase())) {
      score += 0.5;
      matchedKeywords.push(keyword);
    }
  }
  
  // 2. Google Places type matching
  if (categoryDef.googlePlacesTypes && venue.category) {
    const venueCategory = venue.category.toLowerCase();
    for (const placeType of categoryDef.googlePlacesTypes) {
      if (venueCategory.includes(placeType.toLowerCase())) {
        score += 0.3;
        break;
      }
    }
  }
  
  // 3. Address/venue name matching (for chains vs local)
  if (venue.address) {
    const addressLower = venue.address.toLowerCase();
    for (const keyword of categoryDef.searchKeywords) {
      if (addressLower.includes(keyword.toLowerCase())) {
        score += 0.1;
        break;
      }
    }
  }
  
  // 4. Tag inference from existing category
  if (venue.category) {
    const venueCatLower = venue.category.toLowerCase();
    if (categoryDef.tags.some(tag => venueCatLower.includes(tag))) {
      score += 0.2;
    }
  }
  
  return Math.min(score, 1.0);
}

/**
 * Classify a venue into primary + secondary categories
 */
export function classifyVenue(venue: SearchResult): VenueCategoryAssignment {
  try {
    const candidates: ScoredCategory[] = [];
    
    // 1. Score against all categories
    for (const categoryDef of ALL_CATEGORIES) {
      const score = scoreVenueForCategory(venue, categoryDef);
      
      if (score > 0.25) { // Threshold for consideration
        candidates.push({
          category: categoryDef.id,
          score,
          matchedKeywords: categoryDef.searchKeywords.filter(k =>
            venue.title.toLowerCase().includes(k.toLowerCase())
          ),
        });
      }
    }
    
    // 2. Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);
    
    // 3. Assign primary category
    const primary = candidates[0]?.category || venue.category || 'other';
    
    // 4. Assign secondary categories (top 2-3 excluding primary)
    const secondary = candidates
      .slice(1, 4)
      .filter(c => c.score > 0.4) // Only include high-confidence secondaries
      .map(c => c.category);
    
    // 5. Collect all tags from primary + secondary
    const allTags = new Set<string>();
    for (const cat of [primary, ...secondary]) {
      const tags = getCategoryTags(cat);
      tags.forEach(tag => allTags.add(tag));
    }
    
    // 6. Add inferred tags from venue properties
    const inferredTags = inferTagsFromVenue(venue);
    inferredTags.forEach(tag => allTags.add(tag));
    
    return {
      venueId: venue.id,
      categories: {
        primary,
        secondary,
        tags: Array.from(allTags),
      },
      confidence: candidates[0]?.score || 0.3,
    };
  } catch (error) {
    console.error('[MultiLabelClassifier] Error classifying venue:', error);
    
    // Return minimal classification
    return {
      venueId: venue.id,
      categories: {
        primary: venue.category || 'other',
        secondary: [],
        tags: [],
      },
      confidence: 0.2,
    };
  }
}

/**
 * Infer tags from venue properties
 */
function inferTagsFromVenue(venue: SearchResult): string[] {
  const tags: string[] = [];
  
  // Price level tags
  if (venue.priceLevel !== undefined) {
    if (venue.priceLevel === 0 || venue.isFree) tags.push('free');
    else if (venue.priceLevel === 1) tags.push('budget');
    else if (venue.priceLevel === 2) tags.push('moderate');
    else if (venue.priceLevel >= 3) tags.push('upscale');
  }
  
  // Rating tags
  if (venue.rating !== undefined) {
    if (venue.rating >= 4.5) tags.push('top_rated');
    else if (venue.rating >= 4.0) tags.push('highly_rated');
  }
  
  // Review count tags (popularity vs hidden gem)
  if (venue.reviewCount !== undefined) {
    if (venue.reviewCount < 50) tags.push('hidden_gem');
    else if (venue.reviewCount > 1000) tags.push('popular');
  }
  
  // Open now tag
  if (venue.isOpenNow) tags.push('open_now');
  
  // Event tags
  if (venue.type === 'event') {
    tags.push('event');
    if (venue.isFree) tags.push('free');
    if (venue.startDate) {
      const start = new Date(venue.startDate);
      const now = new Date();
      const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntil < 6) tags.push('happening_soon');
      if (hoursUntil < 24) tags.push('today');
    }
  }
  
  // Outdoor inference from venue name
  const nameLower = venue.title.toLowerCase();
  if (nameLower.includes('outdoor') || nameLower.includes('rooftop') || nameLower.includes('patio')) {
    tags.push('outdoor');
  }
  
  // Family-friendly inference
  if (nameLower.includes('family') || nameLower.includes('kids')) {
    tags.push('family');
  }
  
  return tags;
}

/**
 * Batch classify multiple venues
 */
export function classifyVenues(venues: SearchResult[]): Map<string, VenueCategoryAssignment> {
  const assignments = new Map<string, VenueCategoryAssignment>();
  
  for (const venue of venues) {
    const assignment = classifyVenue(venue);
    assignments.set(venue.id, assignment);
  }
  
  return assignments;
}

/**
 * Get all venues matching a specific tag
 */
export function filterVenuesByTag(
  venues: SearchResult[],
  tag: string
): SearchResult[] {
  const assignments = classifyVenues(venues);
  
  return venues.filter(venue => {
    const assignment = assignments.get(venue.id);
    return assignment?.categories.tags.includes(tag);
  });
}

/**
 * Get all venues in a specific category (primary or secondary)
 */
export function filterVenuesByCategory(
  venues: SearchResult[],
  categoryId: string
): SearchResult[] {
  const assignments = classifyVenues(venues);
  
  return venues.filter(venue => {
    const assignment = assignments.get(venue.id);
    return (
      assignment?.categories.primary === categoryId ||
      assignment?.categories.secondary.includes(categoryId)
    );
  });
}

/**
 * Calculate category distribution in results
 */
export function analyzeCategoryDistribution(
  venues: SearchResult[]
): Map<string, number> {
  const assignments = classifyVenues(venues);
  const distribution = new Map<string, number>();
  
  for (const assignment of assignments.values()) {
    const count = distribution.get(assignment.categories.primary) || 0;
    distribution.set(assignment.categories.primary, count + 1);
  }
  
  return distribution;
}

/**
 * Find similar categories based on shared tags
 */
export function findSimilarCategories(categoryId: string): CategoryDefinition[] {
  const category = getCategoryById(categoryId);
  if (!category) return [];
  
  const categoryTags = new Set(category.tags);
  
  return ALL_CATEGORIES
    .filter(c => c.id !== categoryId)
    .map(c => ({
      category: c,
      sharedTags: c.tags.filter(tag => categoryTags.has(tag)).length,
    }))
    .filter(({ sharedTags }) => sharedTags > 0)
    .sort((a, b) => b.sharedTags - a.sharedTags)
    .slice(0, 5)
    .map(({ category }) => category);
}
