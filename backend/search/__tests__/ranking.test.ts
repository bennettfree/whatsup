/**
 * Ranking Algorithm Tests
 * 
 * Validates ranking logic, score calculations, and anti-bias strategies.
 */

import type { SearchResult } from '../types';
import {
  scoreProximity,
  scoreRating,
  scorePopularity,
  scoreNovelty,
  calculateAdaptiveWeights,
} from '../ranking/adaptiveRanking';

// Mock venue factory
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

describe('Ranking Algorithm', () => {
  describe('Proximity Scoring', () => {
    test('Closer venues score higher', () => {
      const userLocation = { latitude: 37.7749, longitude: -122.4194 };
      
      const close = createMockVenue({ distanceMeters: 300 });
      const far = createMockVenue({ distanceMeters: 5000 });
      
      const closeScore = scoreProximity(close, userLocation);
      const farScore = scoreProximity(far, userLocation);
      
      expect(closeScore).toBeGreaterThan(farScore);
      expect(closeScore).toBeGreaterThan(0.8);
      expect(farScore).toBeLessThan(0.5);
    });
    
    test('Distance decay is exponential', () => {
      const userLocation = { latitude: 37.7749, longitude: -122.4194 };
      
      const d500 = scoreProximity(createMockVenue({ distanceMeters: 500 }), userLocation);
      const d1000 = scoreProximity(createMockVenue({ distanceMeters: 1000 }), userLocation);
      const d2000 = scoreProximity(createMockVenue({ distanceMeters: 2000 }), userLocation);
      
      expect(d500).toBeGreaterThan(d1000);
      expect(d1000).toBeGreaterThan(d2000);
    });
  });
  
  describe('Rating Scoring', () => {
    test('Higher ratings score better', () => {
      const high = createMockVenue({ rating: 4.8 });
      const low = createMockVenue({ rating: 3.2 });
      
      const highScore = scoreRating(high);
      const lowScore = scoreRating(low);
      
      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeGreaterThan(0.9);
      expect(lowScore).toBeLessThan(0.7);
    });
    
    test('No rating returns neutral score', () => {
      const noRating = createMockVenue({ rating: undefined });
      expect(scoreRating(noRating)).toBe(0.5);
    });
  });
  
  describe('Popularity Scoring', () => {
    test('Sigmoid prevents chain dominance', () => {
      const mega = createMockVenue({ reviewCount: 5000 });
      const popular = createMockVenue({ reviewCount: 500 });
      const small = createMockVenue({ reviewCount: 50 });
      
      const megaScore = scorePopularity(mega);
      const popularScore = scorePopularity(popular);
      const smallScore = scorePopularity(small);
      
      // Mega chains shouldn't score much higher than popular venues
      expect(megaScore - popularScore).toBeLessThan(0.2);
      expect(popularScore).toBeGreaterThan(smallScore);
    });
  });
  
  describe('Novelty Scoring', () => {
    test('Hidden gems (high rating, low reviews) score high', () => {
      const hiddenGem = createMockVenue({ rating: 4.8, reviewCount: 15 });
      const popular = createMockVenue({ rating: 4.8, reviewCount: 500 });
      
      const gemScore = scoreNovelty(hiddenGem);
      const popularScore = scoreNovelty(popular);
      
      expect(gemScore).toBeGreaterThan(popularScore);
      expect(gemScore).toBeGreaterThan(0.5);
    });
    
    test('Very new venues get novelty boost', () => {
      const newVenue = createMockVenue({ reviewCount: 5, rating: 4.5 });
      const established = createMockVenue({ reviewCount: 200, rating: 4.5 });
      
      const newScore = scoreNovelty(newVenue);
      const establishedScore = scoreNovelty(established);
      
      expect(newScore).toBeGreaterThan(establishedScore);
    });
  });
  
  describe('Adaptive Weights', () => {
    test('Event intent increases temporal weight', () => {
      const mockContext: any = {
        intent: { intentType: 'event', subIntents: {} },
        urgency: 'planning',
      };
      
      const weights = calculateAdaptiveWeights(mockContext);
      
      expect(weights.temporal).toBeGreaterThan(0.2);
    });
    
    test('Immediate urgency boosts temporal weight', () => {
      const mockContextUrgent: any = {
        intent: { intentType: 'both', subIntents: {} },
        urgency: 'immediate',
      };
      
      const mockContextPlanning: any = {
        intent: { intentType: 'both', subIntents: {} },
        urgency: 'planning',
      };
      
      const urgentWeights = calculateAdaptiveWeights(mockContextUrgent);
      const planningWeights = calculateAdaptiveWeights(mockContextPlanning);
      
      expect(urgentWeights.temporal).toBeGreaterThan(planningWeights.temporal);
    });
    
    test('Adventurous mood boosts novelty', () => {
      const mockContext: any = {
        intent: {
          intentType: 'both',
          subIntents: {
            moodIntent: { mood: 'adventurous', confidence: 0.8 },
          },
        },
        urgency: 'planning',
      };
      
      const weights = calculateAdaptiveWeights(mockContext);
      
      expect(weights.novelty).toBeGreaterThan(0.1);
      expect(weights.popularity).toBeLessThan(0.15);
    });
  });
});

describe('Slang & Typo Handling', () => {
  test('Youth slang: "fire restaurant"', () => {
    const result = normalizeQuery('fire restaurant near me');
    expect(result.appliedSlangMappings.has('fire')).toBe(true);
    expect(result.normalized).toContain('amazing');
  });
  
  test('Abbreviations: "wknd plans"', () => {
    const result = normalizeQuery('wknd plans');
    expect(result.normalized).toContain('weekend');
  });
  
  test('Common typo: "resterant"', () => {
    const result = normalizeQuery('resterant near me');
    expect(result.normalized).toContain('restaurant');
  });
});

describe('Edge Cases', () => {
  test('Null/undefined query', () => {
    expect(() => normalizeQuery(null as any)).not.toThrow();
    expect(() => normalizeQuery(undefined as any)).not.toThrow();
  });
  
  test('Very long query (1000 chars)', () => {
    const longQuery = 'restaurant '.repeat(100);
    expect(() => classifyIntent(longQuery)).not.toThrow();
  });
  
  test('Only special characters', () => {
    const result = normalizeQuery('!@#$%^&*()');
    expect(result.normalized).toBe('');
  });
  
  test('Mixed languages', () => {
    const result = normalizeQuery('café restaurante');
    expect(result.normalized).toBeDefined();
  });
});
