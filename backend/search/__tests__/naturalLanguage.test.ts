/**
 * Natural Language Query Processing Tests
 * 
 * Tests query normalization, intent classification, and entity extraction.
 */

import { normalizeQuery } from '../preprocessing/queryNormalizer';
import { classifyIntent } from '../preprocessing/intentClassifier';
import { extractEntities } from '../preprocessing/entityExtractor';

describe('Natural Language Query Processing', () => {
  describe('Query Normalization', () => {
    test('Emoji to keywords: "🍕 🍺 tonight"', () => {
      const result = normalizeQuery('🍕 🍺 tonight');
      expect(result.normalized).toContain('pizza');
      expect(result.normalized).toContain('beer');
      expect(result.normalized).toContain('tonight');
      expect(result.detectedEmojis.size).toBe(2);
    });
    
    test('Slang expansion: "lit bars near me"', () => {
      const result = normalizeQuery('lit bars near me');
      expect(result.normalized).toContain('lively');
      expect(result.appliedSlangMappings.has('lit')).toBe(true);
    });
    
    test('Abbreviations: "bars tn"', () => {
      const result = normalizeQuery('bars tn');
      expect(result.normalized).toContain('tonight');
    });
    
    test('Typo correction: "coffe near me"', () => {
      const result = normalizeQuery('coffe near me');
      expect(result.normalized).toContain('coffee');
    });
    
    test('Stop word removal preserves location markers', () => {
      const result = normalizeQuery('show me the best bars near me');
      expect(result.normalized).toContain('near');
      expect(result.removedStopWords).toContain('the');
    });
  });
  
  describe('Intent Classification', () => {
    test('"coffee near me" → place intent', () => {
      const result = classifyIntent('coffee near me');
      expect(result.intentType).toBe('place');
      expect(result.categories).toContain('food');
      expect(result.locationHint.type).toBe('near_me');
    });
    
    test('"bars open tonight" → place + time context', () => {
      const result = classifyIntent('bars open tonight');
      expect(result.intentType).toBe('place');
      expect(result.categories).toContain('nightlife');
      expect(result.timeContext.label).toBe('tonight');
      expect(result.subIntents.timeIntent?.urgency).toBe('immediate');
    });
    
    test('"live music this weekend" → event intent', () => {
      const result = classifyIntent('live music this weekend');
      expect(result.intentType).toBe('event');
      expect(result.categories).toContain('music');
      expect(result.timeContext.label).toBe('weekend');
    });
    
    test('"romantic date spots" → mood intent', () => {
      const result = classifyIntent('romantic date spots');
      expect(result.intentType).toBe('place');
      expect(result.subIntents.moodIntent?.mood).toBe('romantic');
      expect(result.subIntents.groupIntent?.size).toBe('date');
    });
    
    test('"fun things to do with friends tonight" → hybrid intent', () => {
      const result = classifyIntent('fun things to do with friends tonight');
      expect(result.intentType).toBe('both');
      expect(result.subIntents.groupIntent?.size).toBe('small_group');
      expect(result.timeContext.label).toBe('tonight');
    });
    
    test('"cheap eats" → budget intent', () => {
      const result = classifyIntent('cheap eats near me');
      expect(result.intentType).toBe('place');
      expect(result.subIntents.budgetIntent?.level).toBe('budget');
    });
  });
  
  describe('Entity Extraction', () => {
    test('Extract dates: "tonight"', () => {
      const entities = extractEntities('bars tonight');
      expect(entities.dates.length).toBeGreaterThan(0);
      expect(entities.dates[0].label).toBe('tonight');
    });
    
    test('Extract times: "happy hour"', () => {
      const entities = extractEntities('happy hour specials');
      expect(entities.times.length).toBeGreaterThan(0);
      expect(entities.times[0].label).toBe('happy_hour');
    });
    
    test('Extract locations: "near me"', () => {
      const entities = extractEntities('coffee near me');
      expect(entities.locations.length).toBeGreaterThan(0);
      expect(entities.locations[0].type).toBe('proximity');
    });
    
    test('Extract prices: "under $20"', () => {
      const entities = extractEntities('dinner under $20');
      expect(entities.priceRanges.length).toBeGreaterThan(0);
      expect(entities.priceRanges[0].max).toBe(20);
    });
    
    test('Extract distances: "within 5 miles"', () => {
      const entities = extractEntities('bars within 5 miles');
      expect(entities.distances.length).toBeGreaterThan(0);
      expect(entities.distances[0].value).toBe(5);
    });
    
    test('Extract social context: "with friends"', () => {
      const entities = extractEntities('things to do with friends');
      expect(entities.socialContext.length).toBeGreaterThan(0);
      expect(entities.socialContext[0].groupSize).toBe('small_group');
    });
  });
  
  describe('Slang Handling', () => {
    test('Youth slang: "sick bars"', () => {
      const result = normalizeQuery('sick bars near me');
      expect(result.normalized).toContain('cool');
    });
    
    test('Text speak: "bars rn"', () => {
      const result = normalizeQuery('bars rn');
      expect(result.normalized).toContain('right now');
    });
    
    test('Regional slang (NYC): "slice near me"', () => {
      const result = normalizeQuery('slice near me');
      // Note: Regional expansion happens in semanticExpansion.ts
      expect(result.normalized).toContain('slice');
    });
  });
  
  describe('Edge Cases', () => {
    test('Empty query', () => {
      const result = classifyIntent('');
      expect(result.intentType).toBe('both');
      expect(result.confidence).toBeLessThan(0.3);
    });
    
    test('Very long query (500+ chars)', () => {
      const longQuery = 'a'.repeat(500);
      expect(() => classifyIntent(longQuery)).not.toThrow();
    });
    
    test('Special characters: "café #food"', () => {
      const result = normalizeQuery('café #food @downtown');
      expect(result.normalized).toBeDefined();
    });
    
    test('Multiple emojis: "🍕🍺🎵"', () => {
      const result = normalizeQuery('🍕🍺🎵');
      expect(result.detectedEmojis.size).toBe(3);
    });
  });
});
