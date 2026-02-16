/**
 * Hyperlocal Scoring Tests
 * 
 * Tests venue size detection, independence scoring, and neighborhood context.
 */

import type { SearchResult } from '../types';
import {
  detectVenueSize,
  scoreIndependence,
  calculateMomentum,
  getNeighborhood,
} from '../hyperlocal/hyperlocalScoring';

function createMockVenue(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: `venue_${Math.random()}`,
    type: 'place',
    title: 'Test Venue',
    location: { latitude: 37.7749, longitude: -122.4194 },
    category: 'restaurant',
    score: 0,
    reason: 'Test',
    ...overrides,
  };
}

describe('Venue Size Detection', () => {
  test('Detects chains by name', () => {
    const starbucks = createMockVenue({ title: 'Starbucks' });
    const size = detectVenueSize(starbucks);
    
    expect(size.size).toBe('chain');
    expect(size.confidence).toBeGreaterThan(0.7);
  });
  
  test('Detects small venues by low review count', () => {
    const small = createMockVenue({
      title: 'Local Coffee Shop',
      reviewCount: 25,
      rating: 4.5,
    });
    
    const size = detectVenueSize(small);
    
    expect(size.size).toMatch(/small|micro/);
  });
  
  test('Detects local keywords', () => {
    const indie = createMockVenue({
      title: 'Independent Bookstore',
      reviewCount: 80,
    });
    
    const size = detectVenueSize(indie);
    
    expect(size.size).not.toBe('chain');
  });
});

describe('Independence Scoring', () => {
  test('Local venues score higher', () => {
    const local = createMockVenue({
      title: 'Family-Owned Pizzeria',
      reviewCount: 100,
    });
    
    const chain = createMockVenue({
      title: 'Domino\'s Pizza',
      reviewCount: 2000,
    });
    
    const localScore = scoreIndependence(local);
    const chainScore = scoreIndependence(chain);
    
    expect(localScore).toBeGreaterThan(chainScore);
    expect(localScore).toBeGreaterThan(0.4);
    expect(chainScore).toBeLessThan(0.3);
  });
});

describe('Venue Momentum', () => {
  test('New venues with few reviews get momentum boost', () => {
    const newVenue = createMockVenue({
      title: 'Just Opened Cafe',
      reviewCount: 8,
      rating: 4.7,
    });
    
    const momentum = calculateMomentum(newVenue);
    
    expect(momentum.isNew).toBe(true);
    expect(momentum.momentumScore).toBeGreaterThan(0.3);
  });
  
  test('Trending venues (medium reviews, high rating) get boost', () => {
    const trending = createMockVenue({
      title: 'Popular New Spot',
      reviewCount: 65,
      rating: 4.5,
    });
    
    const momentum = calculateMomentum(trending);
    
    expect(momentum.isTrending).toBe(true);
    expect(momentum.momentumScore).toBeGreaterThan(0);
  });
});

describe('Neighborhood Context', () => {
  test('Mission District (SF) identified', () => {
    const location = { latitude: 37.7600, longitude: -122.4200 };
    const neighborhood = getNeighborhood(location);
    
    expect(neighborhood).not.toBeNull();
    expect(neighborhood?.name).toBe('Mission District');
  });
  
  test('Williamsburg (NYC) identified', () => {
    const location = { latitude: 40.7100, longitude: -73.9600 };
    const neighborhood = getNeighborhood(location);
    
    expect(neighborhood).not.toBeNull();
    expect(neighborhood?.name).toBe('Williamsburg');
  });
  
  test('Unknown location returns null', () => {
    const location = { latitude: 0, longitude: 0 };
    const neighborhood = getNeighborhood(location);
    
    expect(neighborhood).toBeNull();
  });
});
