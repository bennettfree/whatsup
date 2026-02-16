/**
 * Progressive Never-Empty Fallback System
 * 
 * Industry standard: Always return results (like Google Maps, Yelp)
 * 
 * Fallback chain:
 * 1. Exact query, current radius
 * 2. Exact query, 2x radius
 * 3. Exact query, 4x radius (max 50mi)
 * 4. Broadened query (remove modifiers), current radius
 * 5. Related categories, current radius
 * 6. OpenAI query rephrase (if available), current radius
 * 7. Ultimate: "What's Happening" (no query), guarantees 15+ results
 */

import type { SearchResult } from '../types';
import { classifyQueryWithOpenAI } from '../ai/openaiClient';

export interface FallbackAttempt {
  strategy: string;
  query: string;
  radiusMiles: number;
  resultCount: number;
  success: boolean;
}

export interface FallbackResult {
  results: SearchResult[];
  attempts: FallbackAttempt[];
  finalStrategy: string;
}

/**
 * Broaden query by removing modifiers
 * "romantic wine bars" → "wine bars" → "bars"
 */
export function broadenQuery(query: string): string[] {
  const variations: string[] = [];
  const q = query.toLowerCase().trim();
  
  // Remove mood modifiers
  const moodWords = ['romantic', 'fun', 'cool', 'nice', 'good', 'best', 'top', 'popular', 'lively', 'chill', 'quiet'];
  let broadened = q;
  
  for (const mood of moodWords) {
    broadened = broadened.replace(new RegExp(`\\b${mood}\\b`, 'gi'), '').trim();
  }
  
  if (broadened !== q && broadened.length > 0) {
    variations.push(broadened);
  }
  
  // Remove budget modifiers
  const budgetWords = ['cheap', 'expensive', 'budget', 'affordable', 'fancy', 'upscale', 'free'];
  broadened = q;
  
  for (const budget of budgetWords) {
    broadened = broadened.replace(new RegExp(`\\b${budget}\\b`, 'gi'), '').trim();
  }
  
  if (broadened !== q && broadened.length > 0) {
    variations.push(broadened);
  }
  
  // Extract just the main category
  // "romantic wine bars near me" → "wine bars" → "bars"
  const tokens = q.split(' ').filter(t => 
    !moodWords.includes(t) &&
    !budgetWords.includes(t) &&
    t !== 'near' &&
    t !== 'me' &&
    t.length > 2
  );
  
  if (tokens.length > 1) {
    variations.push(tokens.slice(-1).join(' ')); // Last word (usually the category)
  }
  
  if (tokens.length > 0) {
    variations.push(tokens[tokens.length - 1]); // Very last token
  }
  
  return [...new Set(variations)].filter(v => v.length > 0);
}

/**
 * Get related categories for fallback
 */
export function getRelatedCategories(query: string): string[] {
  const q = query.toLowerCase();
  
  const relationshipMap: Record<string, string[]> = {
    'sushi': ['japanese', 'asian', 'seafood', 'restaurant'],
    'pizza': ['italian', 'restaurant', 'food'],
    'coffee': ['cafe', 'breakfast', 'bakery'],
    'wine': ['bar', 'restaurant', 'lounge'],
    'beer': ['bar', 'brewery', 'pub'],
    'jazz': ['music', 'live music', 'lounge', 'bar'],
    'comedy': ['entertainment', 'show', 'nightlife'],
    'yoga': ['fitness', 'wellness', 'gym', 'meditation'],
    'romantic': ['date', 'dinner', 'wine', 'restaurant'],
  };
  
  for (const [key, related] of Object.entries(relationshipMap)) {
    if (q.includes(key)) {
      return related;
    }
  }
  
  return [];
}

/**
 * Execute progressive fallback strategy
 * GUARANTEES: Always returns results (minimum 1, target 15+)
 */
export async function executeNeverEmptyFallback(
  searchFunction: (query: string, radiusMiles: number) => Promise<SearchResult[]>,
  originalQuery: string,
  originalRadius: number,
  openAIAvailable: boolean
): Promise<FallbackResult> {
  const attempts: FallbackAttempt[] = [];
  let results: SearchResult[] = [];
  
  // STRATEGY 1: Exact query, current radius
  console.log('[Fallback] Strategy 1: Exact query, current radius');
  results = await searchFunction(originalQuery, originalRadius);
  attempts.push({
    strategy: 'exact_query_current_radius',
    query: originalQuery,
    radiusMiles: originalRadius,
    resultCount: results.length,
    success: results.length >= 5,
  });
  
  if (results.length >= 5) {
    return { results, attempts, finalStrategy: 'exact_query_current_radius' };
  }
  
  // STRATEGY 2: Exact query, 2x radius
  const radius2x = Math.min(originalRadius * 2, 50);
  console.log(`[Fallback] Strategy 2: Exact query, 2x radius (${radius2x}mi)`);
  results = await searchFunction(originalQuery, radius2x);
  attempts.push({
    strategy: 'exact_query_2x_radius',
    query: originalQuery,
    radiusMiles: radius2x,
    resultCount: results.length,
    success: results.length >= 5,
  });
  
  if (results.length >= 5) {
    return { results, attempts, finalStrategy: 'exact_query_2x_radius' };
  }
  
  // STRATEGY 3: Exact query, 4x radius (max 50mi)
  const radius4x = Math.min(originalRadius * 4, 50);
  if (radius4x > radius2x) {
    console.log(`[Fallback] Strategy 3: Exact query, 4x radius (${radius4x}mi)`);
    results = await searchFunction(originalQuery, radius4x);
    attempts.push({
      strategy: 'exact_query_4x_radius',
      query: originalQuery,
      radiusMiles: radius4x,
      resultCount: results.length,
      success: results.length >= 5,
    });
    
    if (results.length >= 5) {
      return { results, attempts, finalStrategy: 'exact_query_4x_radius' };
    }
  }
  
  // STRATEGY 4: Broadened query (remove modifiers)
  const broadened = broadenQuery(originalQuery);
  for (const broaderQuery of broadened) {
    console.log(`[Fallback] Strategy 4: Broadened query: "${broaderQuery}"`);
    results = await searchFunction(broaderQuery, originalRadius);
    attempts.push({
      strategy: 'broadened_query',
      query: broaderQuery,
      radiusMiles: originalRadius,
      resultCount: results.length,
      success: results.length >= 5,
    });
    
    if (results.length >= 5) {
      return { results, attempts, finalStrategy: 'broadened_query' };
    }
  }
  
  // STRATEGY 5: Related categories
  const related = getRelatedCategories(originalQuery);
  for (const relatedQuery of related) {
    console.log(`[Fallback] Strategy 5: Related category: "${relatedQuery}"`);
    results = await searchFunction(relatedQuery, originalRadius);
    attempts.push({
      strategy: 'related_category',
      query: relatedQuery,
      radiusMiles: originalRadius,
      resultCount: results.length,
      success: results.length >= 5,
    });
    
    if (results.length >= 5) {
      return { results, attempts, finalStrategy: 'related_category' };
    }
  }
  
  // STRATEGY 6: OpenAI query rephrase (if available)
  if (openAIAvailable && originalQuery.length > 0) {
    try {
      console.log('[Fallback] Strategy 6: OpenAI query rephrase');
      const aiIntent = await classifyQueryWithOpenAI(originalQuery);
      
      if (aiIntent && aiIntent.keywords.length > 0) {
        const rephrasedQuery = aiIntent.keywords.join(' ');
        results = await searchFunction(rephrasedQuery, originalRadius);
        attempts.push({
          strategy: 'openai_rephrase',
          query: rephrasedQuery,
          radiusMiles: originalRadius,
          resultCount: results.length,
          success: results.length >= 5,
        });
        
        if (results.length >= 5) {
          return { results, attempts, finalStrategy: 'openai_rephrase' };
        }
      }
    } catch (error) {
      console.error('[Fallback] OpenAI rephrase failed:', error);
    }
  }
  
  // STRATEGY 7: Ultimate fallback - "What's Happening" (always returns 15+ results)
  console.log('[Fallback] Strategy 7: Ultimate fallback - "What\'s Happening"');
  results = await searchFunction('', radius4x);
  attempts.push({
    strategy: 'whats_happening',
    query: '',
    radiusMiles: radius4x,
    resultCount: results.length,
    success: results.length > 0,
  });
  
  return { results, attempts, finalStrategy: 'whats_happening' };
}

/**
 * Quick check if we should attempt fallback
 */
export function shouldAttemptFallback(
  results: SearchResult[],
  minResults: number = 5
): boolean {
  return results.length < minResults;
}

/**
 * Get user-friendly message about fallback used
 */
export function getFallbackMessage(strategy: string, originalQuery: string): string {
  const messages: Record<string, string> = {
    'exact_query_current_radius': '', // No message, normal results
    'exact_query_2x_radius': `Expanded search area to find more results for "${originalQuery}"`,
    'exact_query_4x_radius': `Searching wider area for "${originalQuery}"`,
    'broadened_query': `Showing similar results (broadened search)`,
    'related_category': `Showing related options`,
    'openai_rephrase': `Found alternative suggestions`,
    'whats_happening': `Showing popular options in your area`,
  };
  
  return messages[strategy] || '';
}
