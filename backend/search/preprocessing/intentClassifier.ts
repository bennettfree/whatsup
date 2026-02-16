/**
 * Advanced Intent Classification Engine
 * 
 * Multi-signal intent detection with confidence scoring and sub-intent extraction.
 * Detects mood, budget, group size, and activity intents in addition to place/event classification.
 * 
 * Pure functions, deterministic.
 */

import type { SearchIntent } from '../types';
import { normalizeQuery } from './queryNormalizer';
import { extractEntities, getBudgetLevel, getGroupSize, type ExtractedEntities } from './entityExtractor';

export interface IntentSignal {
  type: 'keyword' | 'structure' | 'temporal' | 'semantic';
  value: string;
  weight: number;
  contributes_to: 'place' | 'event' | 'both';
}

export interface MoodIntent {
  mood: 'romantic' | 'energetic' | 'relaxing' | 'adventurous' | 'social' | 'quiet';
  confidence: number;
  keywords: string[];
}

export interface TimeIntent {
  timeframe: 'now' | 'tonight' | 'weekend' | 'this_week' | 'specific_date';
  urgency: 'immediate' | 'near_future' | 'planning';
  specific_date?: string;
}

export interface BudgetIntent {
  level: 'free' | 'budget' | 'moderate' | 'upscale';
  max_price?: number;
  keywords: string[];
}

export interface GroupIntent {
  size: 'solo' | 'date' | 'small_group' | 'large_group';
  keywords: string[];
}

export interface ActivityIntent {
  activity: 'dining' | 'drinking' | 'entertainment' | 'exercise' | 'learning' | 'shopping' | 'exploring';
  keywords: string[];
  confidence: number;
}

export interface EnhancedIntentClassification extends SearchIntent {
  signals: IntentSignal[];
  subIntents: {
    moodIntent?: MoodIntent;
    timeIntent?: TimeIntent;
    budgetIntent?: BudgetIntent;
    groupIntent?: GroupIntent;
    activityIntent?: ActivityIntent;
  };
}

// Mood detection keywords
const MOOD_KEYWORDS: Record<MoodIntent['mood'], string[]> = {
  romantic: ['romantic', 'date', 'date night', 'cozy', 'intimate', 'couples'],
  energetic: ['fun', 'lively', 'exciting', 'energetic', 'buzzing', 'vibrant', 'hype'],
  relaxing: ['relaxing', 'chill', 'calm', 'peaceful', 'laid-back', 'quiet', 'lowkey'],
  adventurous: ['adventure', 'adventurous', 'unique', 'different', 'explore', 'discover'],
  social: ['social', 'meet', 'meetup', 'friends', 'group', 'networking'],
  quiet: ['quiet', 'peaceful', 'tranquil', 'serene', 'calm'],
};

// Activity detection keywords
const ACTIVITY_KEYWORDS: Record<ActivityIntent['activity'], string[]> = {
  dining: ['eat', 'food', 'dinner', 'lunch', 'breakfast', 'brunch', 'meal', 'restaurant'],
  drinking: ['drink', 'drinks', 'bar', 'pub', 'brewery', 'cocktail', 'beer', 'wine'],
  entertainment: ['show', 'concert', 'movie', 'theater', 'comedy', 'performance', 'watch'],
  exercise: ['workout', 'gym', 'fitness', 'yoga', 'run', 'hike', 'exercise', 'sports'],
  learning: ['learn', 'workshop', 'class', 'seminar', 'lecture', 'course', 'lesson'],
  shopping: ['shop', 'shopping', 'buy', 'store', 'market', 'mall'],
  exploring: ['explore', 'discover', 'see', 'visit', 'tour', 'sightseeing'],
};

/**
 * Extract keyword signals from tokens
 */
function extractKeywordSignals(tokens: string[]): IntentSignal[] {
  const signals: IntentSignal[] = [];
  
  // Place keywords
  const placeWords = ['restaurant', 'cafe', 'coffee', 'bar', 'pub', 'club', 'museum', 'park', 'gym', 'hotel'];
  for (const token of tokens) {
    if (placeWords.includes(token)) {
      signals.push({
        type: 'keyword',
        value: token,
        weight: 0.5,
        contributes_to: 'place',
      });
    }
  }
  
  // Event keywords
  const eventWords = ['concert', 'show', 'festival', 'event', 'game', 'match', 'performance'];
  for (const token of tokens) {
    if (eventWords.includes(token)) {
      signals.push({
        type: 'keyword',
        value: token,
        weight: 0.5,
        contributes_to: 'event',
      });
    }
  }
  
  return signals;
}

/**
 * Extract structural signals (questions, patterns)
 */
function extractStructuralSignals(tokens: string[]): IntentSignal[] {
  const signals: IntentSignal[] = [];
  const query = tokens.join(' ');
  
  // Question patterns suggest exploration (both)
  if (/\b(what|where|when|how)\b/i.test(query)) {
    signals.push({
      type: 'structure',
      value: 'question_word',
      weight: 0.2,
      contributes_to: 'both',
    });
  }
  
  // "Things to do" pattern
  if (/things to do|something to do|activities/i.test(query)) {
    signals.push({
      type: 'structure',
      value: 'things_to_do',
      weight: 0.4,
      contributes_to: 'both',
    });
  }
  
  return signals;
}

/**
 * Extract temporal signals from entities
 */
function extractTemporalSignals(entities: ExtractedEntities): IntentSignal[] {
  const signals: IntentSignal[] = [];
  
  // Time-sensitive queries suggest events
  if (entities.dates.length > 0) {
    signals.push({
      type: 'temporal',
      value: entities.dates[0].raw,
      weight: 0.3,
      contributes_to: 'event',
    });
  }
  
  if (entities.times.length > 0) {
    signals.push({
      type: 'temporal',
      value: entities.times[0].raw,
      weight: 0.25,
      contributes_to: 'event',
    });
  }
  
  return signals;
}

/**
 * Extract semantic signals (context from surrounding words)
 */
function extractSemanticSignals(tokens: string[]): IntentSignal[] {
  const signals: IntentSignal[] = [];
  const query = tokens.join(' ');
  
  // Dining context suggests places
  if (/\b(eat|food|meal|hungry)\b/i.test(query)) {
    signals.push({
      type: 'semantic',
      value: 'dining_context',
      weight: 0.35,
      contributes_to: 'place',
    });
  }
  
  // Entertainment context suggests events
  if (/\b(watch|see|attend|going to)\b/i.test(query)) {
    signals.push({
      type: 'semantic',
      value: 'entertainment_context',
      weight: 0.3,
      contributes_to: 'event',
    });
  }
  
  return signals;
}

/**
 * Extract mood intent from query
 */
export function extractMoodIntent(tokens: string[]): MoodIntent | undefined {
  const query = tokens.join(' ');
  
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    const matchedKeywords: string[] = [];
    
    for (const keyword of keywords) {
      if (query.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
    
    if (matchedKeywords.length > 0) {
      return {
        mood: mood as MoodIntent['mood'],
        confidence: Math.min(matchedKeywords.length * 0.4, 1.0),
        keywords: matchedKeywords,
      };
    }
  }
  
  return undefined;
}

/**
 * Extract time intent from entities
 */
export function extractTimeIntent(entities: ExtractedEntities): TimeIntent | undefined {
  if (entities.dates.length === 0) return undefined;
  
  const primaryDate = entities.dates[0];
  
  let timeframe: TimeIntent['timeframe'] = 'specific_date';
  let urgency: TimeIntent['urgency'] = 'planning';
  
  if (primaryDate.label === 'tonight' || primaryDate.label === 'today') {
    timeframe = primaryDate.label;
    urgency = 'immediate';
  } else if (primaryDate.label === 'tomorrow') {
    timeframe = 'tonight'; // Close enough for near-future
    urgency = 'near_future';
  } else if (primaryDate.label === 'weekend') {
    timeframe = 'weekend';
    urgency = 'near_future';
  } else if (primaryDate.label === 'week') {
    timeframe = 'this_week';
    urgency = 'planning';
  }
  
  return {
    timeframe,
    urgency,
    specific_date: primaryDate.specificDate,
  };
}

/**
 * Extract budget intent from entities
 */
export function extractBudgetIntent(entities: ExtractedEntities): BudgetIntent | undefined {
  const budgetLevel = getBudgetLevel(entities);
  if (!budgetLevel) return undefined;
  
  const keywords = entities.priceRanges.map(p => p.raw);
  const maxPrice = entities.priceRanges[0]?.max;
  
  return {
    level: budgetLevel,
    max_price: maxPrice,
    keywords,
  };
}

/**
 * Extract group intent from entities
 */
export function extractGroupIntent(entities: ExtractedEntities): GroupIntent | undefined {
  const groupSize = getGroupSize(entities);
  if (!groupSize) return undefined;
  
  const keywords = entities.socialContext
    .filter(s => s.groupSize)
    .map(s => s.raw);
  
  return {
    size: groupSize,
    keywords,
  };
}

/**
 * Extract activity intent from query
 */
export function extractActivityIntent(tokens: string[]): ActivityIntent | undefined {
  const query = tokens.join(' ');
  
  for (const [activity, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
    const matchedKeywords: string[] = [];
    
    for (const keyword of keywords) {
      const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
      if (pattern.test(query)) {
        matchedKeywords.push(keyword);
      }
    }
    
    if (matchedKeywords.length > 0) {
      return {
        activity: activity as ActivityIntent['activity'],
        keywords: matchedKeywords,
        confidence: Math.min(matchedKeywords.length * 0.35, 1.0),
      };
    }
  }
  
  return undefined;
}

/**
 * Determine intent type from signal scores
 */
function determineIntentType(
  placeScore: number,
  eventScore: number,
  signals: IntentSignal[]
): SearchIntent['intentType'] {
  const diff = Math.abs(placeScore - eventScore);
  
  // Clear winner (difference > 0.5)
  if (diff > 0.5) {
    return placeScore > eventScore ? 'place' : 'event';
  }
  
  // Close scores or no strong signals
  if (placeScore > 0 && eventScore > 0) return 'both';
  if (placeScore > 0) return 'place';
  if (eventScore > 0) return 'event';
  
  return 'both'; // Default to both
}

/**
 * Calculate confidence score
 */
function calculateConfidence(
  placeScore: number,
  eventScore: number,
  signalCount: number
): number {
  const maxScore = Math.max(placeScore, eventScore);
  const diff = Math.abs(placeScore - eventScore);
  
  let confidence = 0;
  
  // Signal strength
  confidence += Math.min(maxScore / 2, 0.4);
  
  // Signal clarity (bigger difference = more confident)
  confidence += Math.min(diff, 0.3);
  
  // Signal quantity
  confidence += Math.min(signalCount * 0.05, 0.3);
  
  return Math.min(confidence, 1.0);
}

/**
 * Classify intent with sub-intents and signals
 */
export function classifyIntent(query: string): EnhancedIntentClassification {
  try {
    // 1. Normalize query
    const normalized = normalizeQuery(query);
    
    // 2. Extract entities
    const entities = extractEntities(normalized.normalized);
    
    // 3. Extract signals
    const signals: IntentSignal[] = [
      ...extractKeywordSignals(normalized.tokens),
      ...extractStructuralSignals(normalized.tokens),
      ...extractTemporalSignals(entities),
      ...extractSemanticSignals(normalized.tokens),
    ];
    
    // 4. Aggregate signal scores
    const placeScore = signals
      .filter(s => s.contributes_to === 'place' || s.contributes_to === 'both')
      .reduce((sum, s) => sum + s.weight, 0);
    
    const eventScore = signals
      .filter(s => s.contributes_to === 'event' || s.contributes_to === 'both')
      .reduce((sum, s) => sum + s.weight, 0);
    
    // 5. Determine primary intent
    const intentType = determineIntentType(placeScore, eventScore, signals);
    const confidence = calculateConfidence(placeScore, eventScore, signals.length);
    
    // 6. Extract sub-intents
    const moodIntent = extractMoodIntent(normalized.tokens);
    const timeIntent = extractTimeIntent(entities);
    const budgetIntent = extractBudgetIntent(entities);
    const groupIntent = extractGroupIntent(entities);
    const activityIntent = extractActivityIntent(normalized.tokens);
    
    // 7. Build base SearchIntent (backward compatible)
    const baseIntent: SearchIntent = {
      rawQuery: query,
      intentType,
      keywords: normalized.tokens.slice(0, 4), // Top keywords
      vibe: moodIntent ? [moodIntent.mood] : [],
      categories: inferCategoriesFromActivity(activityIntent, intentType),
      timeContext: buildTimeContext(entities),
      locationHint: buildLocationHint(entities),
      confidence,
    };
    
    // 8. Return enhanced classification
    return {
      ...baseIntent,
      signals,
      subIntents: {
        moodIntent,
        timeIntent,
        budgetIntent,
        groupIntent,
        activityIntent,
      },
    };
  } catch (error) {
    console.error('[IntentClassifier] Error:', error);
    
    // Return minimal valid intent
    return {
      rawQuery: query,
      intentType: 'both',
      keywords: [],
      vibe: [],
      categories: ['other'],
      timeContext: {},
      locationHint: { type: 'unknown' },
      confidence: 0,
      signals: [],
      subIntents: {},
    };
  }
}

/**
 * Infer categories from activity intent
 */
function inferCategoriesFromActivity(
  activityIntent: ActivityIntent | undefined,
  intentType: SearchIntent['intentType']
): string[] {
  if (!activityIntent) return ['other'];
  
  const categoryMap: Record<ActivityIntent['activity'], string[]> = {
    dining: ['food'],
    drinking: ['nightlife'],
    entertainment: ['music', 'art'],
    exercise: ['fitness'],
    learning: ['social'],
    shopping: ['other'],
    exploring: ['outdoor', 'history'],
  };
  
  return categoryMap[activityIntent.activity] || ['other'];
}

/**
 * Build time context from entities
 */
function buildTimeContext(entities: ExtractedEntities): SearchIntent['timeContext'] {
  if (entities.dates.length === 0) return {};
  
  const primaryDate = entities.dates[0];
  
  if (primaryDate.label) {
    return {
      label: primaryDate.label,
      dayOfWeek: primaryDate.dayOfWeek,
    };
  }
  
  if (primaryDate.dayOfWeek) {
    return {
      label: 'specific',
      dayOfWeek: primaryDate.dayOfWeek,
    };
  }
  
  return {};
}

/**
 * Build location hint from entities
 */
function buildLocationHint(entities: ExtractedEntities): SearchIntent['locationHint'] {
  if (entities.locations.length === 0) return { type: 'unknown' };
  
  const primaryLocation = entities.locations[0];
  
  return {
    type: primaryLocation.type,
    value: primaryLocation.value,
  };
}

/**
 * Helper: Escape regex special characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate urgency level based on time intent
 */
export function calculateUrgency(timeIntent?: TimeIntent): TimeIntent['urgency'] {
  if (!timeIntent) return 'planning';
  return timeIntent.urgency;
}

/**
 * Check if query is mood-based vs specific
 */
export function isMoodBasedQuery(enhanced: EnhancedIntentClassification): boolean {
  return enhanced.subIntents.moodIntent !== undefined &&
         enhanced.keywords.length < 2;
}

/**
 * Get dominant signal type
 */
export function getDominantSignalType(enhanced: EnhancedIntentClassification): IntentSignal['type'] | null {
  if (enhanced.signals.length === 0) return null;
  
  const typeCounts: Record<IntentSignal['type'], number> = {
    keyword: 0,
    structure: 0,
    temporal: 0,
    semantic: 0,
  };
  
  for (const signal of enhanced.signals) {
    typeCounts[signal.type]++;
  }
  
  let maxCount = 0;
  let maxType: IntentSignal['type'] = 'keyword';
  
  for (const [type, count] of Object.entries(typeCounts) as [IntentSignal['type'], number][]) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }
  
  return maxType;
}
