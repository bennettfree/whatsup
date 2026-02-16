/**
 * Intelligent Result Deduplication
 * 
 * Fuzzy matching to detect duplicates across providers (Google Places + Ticketmaster).
 * Merges duplicate results and selects best source.
 */

import type { SearchResult } from '../types';

interface DuplicateCluster {
  results: SearchResult[];
  best: SearchResult;
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity (0-1)
 */
export function stringSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  
  if (maxLen === 0) return 1.0;
  
  return 1 - distance / maxLen;
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
 * Check if two results are duplicates
 */
export function isDuplicate(a: SearchResult, b: SearchResult): boolean {
  // 1. Exact ID match (same source)
  if (a.id === b.id) return true;
  
  // 2. Different types can't be duplicates
  if (a.type !== b.type) return false;
  
  // 3. Fuzzy name match + close location
  const nameSimilarity = stringSimilarity(a.title, b.title);
  const distanceMeters = haversineDistance(a.location, b.location);
  
  // Same venue if similar name and very close location
  if (nameSimilarity > 0.85 && distanceMeters < 50) {
    return true;
  }
  
  // Very similar name and same coordinates (rounded)
  if (nameSimilarity > 0.95 && distanceMeters < 10) {
    return true;
  }
  
  // 4. Address matching (if both have addresses)
  if (a.address && b.address) {
    const addressSimilarity = stringSimilarity(a.address, b.address);
    if (addressSimilarity > 0.9) {
      return true;
    }
  }
  
  // 5. Event-specific: same venue name and start date
  if (a.type === 'event' && b.type === 'event' && a.venueName && b.venueName && a.startDate && b.startDate) {
    const venueSimilarity = stringSimilarity(a.venueName, b.venueName);
    const sameDate = a.startDate.substring(0, 10) === b.startDate.substring(0, 10);
    
    if (venueSimilarity > 0.85 && sameDate) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate source quality score
 */
function calculateSourceQuality(result: SearchResult): number {
  let quality = 0;
  const totalFields = 10;
  
  // Count present fields
  if (result.title) quality += 1 / totalFields;
  if (result.location) quality += 1 / totalFields;
  if (result.category) quality += 1 / totalFields;
  if (result.imageUrl || result.photoName) quality += 1 / totalFields;
  if (result.rating !== undefined) quality += 1 / totalFields;
  if (result.reviewCount !== undefined) quality += 1 / totalFields;
  if (result.address) quality += 1 / totalFields;
  if (result.isOpenNow !== undefined) quality += 1 / totalFields;
  
  // Event-specific fields
  if (result.type === 'event') {
    if (result.startDate) quality += 1 / totalFields;
    if (result.venueName) quality += 1 / totalFields;
  }
  
  return quality;
}

/**
 * Select best result from duplicate cluster
 */
function selectBestFromCluster(cluster: SearchResult[]): SearchResult {
  // 1. Sort by source quality
  const sorted = [...cluster].sort((a, b) => {
    const qualityA = calculateSourceQuality(a);
    const qualityB = calculateSourceQuality(b);
    return qualityB - qualityA;
  });
  
  const best = { ...sorted[0] };
  
  // 2. Merge missing fields from other sources
  for (const other of sorted.slice(1)) {
    if (!best.imageUrl && other.imageUrl) best.imageUrl = other.imageUrl;
    if (!best.photoName && other.photoName) best.photoName = other.photoName;
    if (!best.rating && other.rating !== undefined) best.rating = other.rating;
    if (!best.reviewCount && other.reviewCount !== undefined) best.reviewCount = other.reviewCount;
    if (!best.priceLevel && other.priceLevel !== undefined) best.priceLevel = other.priceLevel;
    if (!best.address && other.address) best.address = other.address;
    if (best.isOpenNow === undefined && other.isOpenNow !== undefined) best.isOpenNow = other.isOpenNow;
    if (!best.url && other.url) best.url = other.url;
    
    // Event-specific
    if (!best.venueName && other.venueName) best.venueName = other.venueName;
    if (!best.startDate && other.startDate) best.startDate = other.startDate;
    if (!best.endDate && other.endDate) best.endDate = other.endDate;
    if (best.isFree === undefined && other.isFree !== undefined) best.isFree = other.isFree;
    if (!best.priceMin && other.priceMin !== undefined) best.priceMin = other.priceMin;
    if (!best.priceMax && other.priceMax !== undefined) best.priceMax = other.priceMax;
  }
  
  // 3. Use best score among duplicates
  best.score = Math.max(...cluster.map(r => r.score || 0));
  
  return best;
}

/**
 * Deduplicate results using clustering
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  if (results.length === 0) return results;
  
  const clusters: SearchResult[][] = [];
  const processed = new Set<string>();
  
  // 1. Group duplicates into clusters
  for (const result of results) {
    if (processed.has(result.id)) continue;
    
    const cluster: SearchResult[] = [result];
    processed.add(result.id);
    
    // Find all duplicates
    for (const other of results) {
      if (processed.has(other.id)) continue;
      
      if (isDuplicate(result, other)) {
        cluster.push(other);
        processed.add(other.id);
      }
    }
    
    clusters.push(cluster);
  }
  
  // 2. Select best from each cluster
  const deduplicated = clusters.map(cluster => selectBestFromCluster(cluster));
  
  console.log(`[Deduplicator] Reduced ${results.length} results to ${deduplicated.length} (removed ${results.length - deduplicated.length} duplicates)`);
  
  return deduplicated;
}

/**
 * Find potential duplicates for a single result
 */
export function findDuplicates(
  target: SearchResult,
  candidates: SearchResult[]
): SearchResult[] {
  return candidates.filter(candidate => 
    candidate.id !== target.id && isDuplicate(target, candidate)
  );
}

/**
 * Merge two results (combine data from both)
 */
export function mergeResults(primary: SearchResult, secondary: SearchResult): SearchResult {
  const merged = { ...primary };
  
  // Fill in missing fields from secondary
  if (!merged.imageUrl && secondary.imageUrl) merged.imageUrl = secondary.imageUrl;
  if (!merged.photoName && secondary.photoName) merged.photoName = secondary.photoName;
  if (!merged.rating && secondary.rating) merged.rating = secondary.rating;
  if (!merged.reviewCount && secondary.reviewCount) merged.reviewCount = secondary.reviewCount;
  if (!merged.address && secondary.address) merged.address = secondary.address;
  if (merged.isOpenNow === undefined && secondary.isOpenNow !== undefined) merged.isOpenNow = secondary.isOpenNow;
  
  // Use higher score
  merged.score = Math.max(primary.score || 0, secondary.score || 0);
  
  return merged;
}

/**
 * Calculate deduplication stats
 */
export function calculateDeduplicationStats(
  originalCount: number,
  deduplicatedCount: number
): {
  removed: number;
  removalRate: number;
  efficiency: number;
} {
  const removed = originalCount - deduplicatedCount;
  const removalRate = removed / originalCount;
  const efficiency = deduplicatedCount / originalCount;
  
  return {
    removed,
    removalRate,
    efficiency,
  };
}
