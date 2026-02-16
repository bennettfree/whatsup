/**
 * Deduplication Tests
 * 
 * Tests duplicate detection, fuzzy matching, and result merging.
 */

import type { SearchResult } from '../types';
import {
  isDuplicate,
  stringSimilarity,
  deduplicateResults,
  mergeResults,
} from '../orchestration/resultDeduplicator';

function createMockVenue(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: `venue_${Math.random()}`,
    type: 'place',
    title: 'Test Venue',
    location: { latitude: 37.7749, longitude: -122.4194 },
    category: 'restaurant',
    score: 0.5,
    reason: 'Test',
    ...overrides,
  };
}

describe('Duplicate Detection', () => {
  test('Exact same name and close location = duplicate', () => {
    const venue1 = createMockVenue({
      title: 'Blue Bottle Coffee',
      location: { latitude: 37.7749, longitude: -122.4194 },
    });
    
    const venue2 = createMockVenue({
      title: 'Blue Bottle Coffee',
      location: { latitude: 37.7750, longitude: -122.4195 },
    });
    
    expect(isDuplicate(venue1, venue2)).toBe(true);
  });
  
  test('Very similar names and same location = duplicate', () => {
    const venue1 = createMockVenue({
      title: 'Joe\'s Pizza',
      location: { latitude: 37.7749, longitude: -122.4194 },
    });
    
    const venue2 = createMockVenue({
      title: 'Joes Pizza',
      location: { latitude: 37.7749, longitude: -122.4194 },
    });
    
    expect(isDuplicate(venue1, venue2)).toBe(true);
  });
  
  test('Same address = duplicate', () => {
    const venue1 = createMockVenue({
      title: 'Restaurant A',
      address: '123 Main St, San Francisco, CA',
    });
    
    const venue2 = createMockVenue({
      title: 'Restaurant B',
      address: '123 Main Street, San Francisco, CA',
    });
    
    const result = isDuplicate(venue1, venue2);
    expect(result).toBe(true);
  });
  
  test('Different venues are not duplicates', () => {
    const venue1 = createMockVenue({
      title: 'Blue Bottle Coffee',
      location: { latitude: 37.7749, longitude: -122.4194 },
    });
    
    const venue2 = createMockVenue({
      title: 'Philz Coffee',
      location: { latitude: 37.7850, longitude: -122.4094 },
    });
    
    expect(isDuplicate(venue1, venue2)).toBe(false);
  });
});

describe('String Similarity', () => {
  test('Identical strings = 1.0', () => {
    expect(stringSimilarity('coffee', 'coffee')).toBe(1.0);
  });
  
  test('Very similar strings score high', () => {
    const sim = stringSimilarity('Blue Bottle Coffee', 'Blue Bottle Cafe');
    expect(sim).toBeGreaterThan(0.8);
  });
  
  test('Different strings score low', () => {
    const sim = stringSimilarity('Pizza', 'Sushi');
    expect(sim).toBeLessThan(0.3);
  });
});

describe('Deduplication', () => {
  test('Removes duplicates and keeps best', () => {
    const venue1 = createMockVenue({
      id: 'gp_123',
      title: 'Best Cafe',
      rating: 4.5,
      imageUrl: undefined,
      location: { latitude: 37.7749, longitude: -122.4194 },
    });
    
    const venue2 = createMockVenue({
      id: 'tm_456',
      title: 'Best Cafe',
      rating: undefined,
      imageUrl: 'http://example.com/image.jpg',
      location: { latitude: 37.7749, longitude: -122.4194 },
    });
    
    const results = deduplicateResults([venue1, venue2]);
    
    expect(results.length).toBe(1);
    expect(results[0].rating).toBe(4.5); // Kept rating from venue1
    expect(results[0].imageUrl).toBe('http://example.com/image.jpg'); // Merged image from venue2
  });
});

describe('Result Merging', () => {
  test('Merges missing fields from secondary', () => {
    const primary = createMockVenue({
      title: 'Venue',
      rating: 4.5,
      imageUrl: undefined,
    });
    
    const secondary = createMockVenue({
      title: 'Venue',
      rating: undefined,
      imageUrl: 'http://example.com/img.jpg',
    });
    
    const merged = mergeResults(primary, secondary);
    
    expect(merged.rating).toBe(4.5);
    expect(merged.imageUrl).toBe('http://example.com/img.jpg');
  });
});
