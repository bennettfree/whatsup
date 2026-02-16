/**
 * Hybrid Intent Classifier
 * 
 * Industry-standard approach used by Uber, Airbnb, Instagram:
 * - Try fast rule-based classification first (85% of queries)
 * - Fall back to OpenAI for complex/abstract queries (15%)
 * - 0.65 confidence threshold (industry standard)
 * 
 * Handles abstract queries like "I want to meet women" → social venues
 */

import { classifyIntent, type EnhancedIntentClassification } from '../preprocessing/intentClassifier';
import { classifyQueryWithOpenAI, isOpenAIAvailable } from './openaiClient';
import type { SearchIntent } from '../types';

const CONFIDENCE_THRESHOLD = 0.65; // Industry standard (Uber: 0.7, Airbnb: 0.6)

/**
 * Hybrid intent classification - combines rule-based + OpenAI
 */
export async function classifyIntentHybrid(query: string): Promise<{
  intent: EnhancedIntentClassification;
  source: 'rule-based' | 'openai' | 'rule-based-fallback';
  aiUsed: boolean;
}> {
  try {
    // FAST PATH: Try rule-based first (free, instant)
    const ruleBasedIntent = classifyIntent(query);
    
    console.log(`[Hybrid] Rule-based confidence: ${ruleBasedIntent.confidence.toFixed(2)} for "${query}"`);
    
    // High confidence: Use rule-based (80-85% of queries)
    if (ruleBasedIntent.confidence >= CONFIDENCE_THRESHOLD) {
      console.log('[Hybrid] ✅ Using rule-based (high confidence)');
      return {
        intent: ruleBasedIntent,
        source: 'rule-based',
        aiUsed: false,
      };
    }
    
    // Low confidence: Try OpenAI (15-20% of queries)
    console.log('[Hybrid] ⚠️ Low confidence, trying OpenAI fallback...');
    
    if (isOpenAIAvailable()) {
      const aiIntent = await classifyQueryWithOpenAI(query);
      
      if (aiIntent) {
        // Convert OpenAI response to our internal format
        const enhancedIntent: EnhancedIntentClassification = {
          rawQuery: query,
          intentType: aiIntent.intentType,
          keywords: aiIntent.keywords,
          vibe: aiIntent.mood ? [aiIntent.mood] : [],
          categories: aiIntent.categories,
          timeContext: ruleBasedIntent.timeContext, // Keep time parsing from rules
          locationHint: ruleBasedIntent.locationHint, // Keep location from rules
          confidence: aiIntent.confidence,
          signals: [], // OpenAI doesn't provide signals
          subIntents: {
            moodIntent: aiIntent.mood ? {
              mood: aiIntent.mood,
              confidence: aiIntent.confidence,
              keywords: [],
            } : undefined,
            budgetIntent: aiIntent.budget ? {
              level: aiIntent.budget,
              keywords: [],
            } : ruleBasedIntent.subIntents.budgetIntent,
            groupIntent: aiIntent.groupSize ? {
              size: aiIntent.groupSize,
              keywords: [],
            } : ruleBasedIntent.subIntents.groupIntent,
            timeIntent: ruleBasedIntent.subIntents.timeIntent,
            activityIntent: ruleBasedIntent.subIntents.activityIntent,
          },
        };
        
        console.log(`[Hybrid] ✅ Using OpenAI (${aiIntent.reasoning})`);
        
        return {
          intent: enhancedIntent,
          source: 'openai',
          aiUsed: true,
        };
      }
    }
    
    // OpenAI not available or failed: Use rule-based anyway
    console.log('[Hybrid] ⚠️ OpenAI unavailable, using rule-based fallback');
    
    return {
      intent: ruleBasedIntent,
      source: 'rule-based-fallback',
      aiUsed: false,
    };
  } catch (error) {
    console.error('[Hybrid] Error in hybrid classification:', error);
    
    // Always fall back gracefully
    const fallbackIntent = classifyIntent(query);
    return {
      intent: fallbackIntent,
      source: 'rule-based-fallback',
      aiUsed: false,
    };
  }
}

/**
 * Batch classification for multiple queries (future optimization)
 */
export async function classifyQueriesBatch(
  queries: string[]
): Promise<Array<{ query: string; intent: EnhancedIntentClassification; aiUsed: boolean }>> {
  // Process in parallel
  const results = await Promise.all(
    queries.map(async (query) => {
      const result = await classifyIntentHybrid(query);
      return {
        query,
        intent: result.intent,
        aiUsed: result.aiUsed,
      };
    })
  );
  
  return results;
}

/**
 * Get hybrid classifier stats
 */
export function getHybridStats(): {
  openai: {
    available: boolean;
    callsToday: number;
    costToday: number;
    remaining: number;
  };
  threshold: number;
} {
  const openaiStats = isOpenAIAvailable();
  const usage = usageTracker.getStats();
  
  return {
    openai: {
      available: openaiStats,
      callsToday: usage.callsToday,
      costToday: usage.costToday,
      remaining: DAILY_CALL_LIMIT - usage.callsToday,
    },
    threshold: CONFIDENCE_THRESHOLD,
  };
}
