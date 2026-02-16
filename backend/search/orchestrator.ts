/**
 * Search Intelligence Orchestrator
 * 
 * Master coordinator that ties all search intelligence modules together.
 * This is the new entry point for the enhanced search pipeline.
 */

import type { SearchResult, UserContext } from './types';
import { parseSearchIntent } from './parseSearchIntent';
import { normalizeQuery } from './preprocessing/queryNormalizer';
import { classifyIntent } from './preprocessing/intentClassifier';
import { extractEntities } from './preprocessing/entityExtractor';
import { expandQuery } from './preprocessing/semanticExpansion';
import { classifyVenue } from './taxonomy/multiLabelClassifier';
import {
  calculateHyperlocalScore,
  identifyEventDensityClusters,
  boostClusterResults,
  adjustForNeighborhoodContext,
} from './hyperlocal/hyperlocalScoring';
import {
  rankResults,
  calculateAdaptiveWeights,
  applyAntiBiasStrategies,
  type RankingContext,
  type ScoredResult,
} from './ranking/adaptiveRanking';
import { selectProviderStrategy } from './orchestration/providerStrategy';
import { deduplicateResults } from './orchestration/resultDeduplicator';
import { circuitBreaker } from './orchestration/circuitBreaker';
import { costOptimizer } from './orchestration/costOptimizer';
import { determineFallbackStrategy, calculateResultQuality } from './precision/smartFallbacks';
import { generateUXFeedback } from './precision/uxFeedbackGenerator';
import { metricsCollector } from '../monitoring/metrics';
import { FEATURE_FLAGS } from './config/featureFlags';

export interface EnhancedSearchRequest {
  query: string;
  userContext: UserContext;
  radiusMiles?: number;
  limit?: number;
  offset?: number;
}

export interface EnhancedSearchResponse {
  results: ScoredResult[];
  meta: {
    intentType: string;
    confidence: number;
    usedProviders: string[];
    cacheHit: boolean;
    appliedFallbacks: string[];
    hyperlocal: {
      smallVenueBoost: boolean;
      clusterDetection: boolean;
      neighborhoodContext: string | null;
    };
  };
  ux: {
    chips: string[];
    helperText: string;
    suggestedFilters: any[];
  };
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Enhanced search orchestration with all intelligence layers
 */
export async function orchestrateEnhancedSearch(
  request: EnhancedSearchRequest
): Promise<EnhancedSearchResponse> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  try {
    // PHASE 1: Query Processing
    let processedQuery = request.query;
    let enhancedIntent: any;
    
    if (FEATURE_FLAGS.ENABLE_QUERY_NORMALIZATION) {
      const normalized = normalizeQuery(request.query);
      processedQuery = normalized.normalized;
    }
    
    if (FEATURE_FLAGS.ENABLE_SUB_INTENT_DETECTION) {
      enhancedIntent = classifyIntent(request.query);
    } else {
      enhancedIntent = parseSearchIntent(request.query);
    }
    
    // PHASE 2: Semantic Expansion
    let expandedQueries = [processedQuery];
    if (FEATURE_FLAGS.ENABLE_SEMANTIC_EXPANSION) {
      const expansion = expandQuery(processedQuery);
      expandedQueries = expansion.expansions;
    }
    
    // PHASE 3: Provider Selection
    const urgency = enhancedIntent.subIntents?.timeIntent?.urgency || 'planning';
    const providerStrategy = selectProviderStrategy(enhancedIntent, urgency);
    
    // TODO: Integrate with existing executeSearch pipeline
    // For now, return structure showing where it would integrate
    
    // Placeholder: In real implementation, this would call providers through circuit breaker
    let rawResults: SearchResult[] = [];
    
    // PHASE 4: Deduplication
    if (FEATURE_FLAGS.ENABLE_INTELLIGENT_DEDUPLICATION) {
      rawResults = deduplicateResults(rawResults);
    }
    
    // PHASE 5: Multi-Label Classification
    if (FEATURE_FLAGS.ENABLE_MULTI_LABEL_CLASSIFICATION) {
      for (const result of rawResults) {
        classifyVenue(result);
      }
    }
    
    // PHASE 6: Adaptive Ranking
    const currentHour = new Date(request.userContext.nowISO).getHours();
    const isWeekend = [0, 6].includes(new Date(request.userContext.nowISO).getDay());
    
    const rankingContext: RankingContext = {
      intent: enhancedIntent,
      userLocation: request.userContext.currentLocation!,
      currentHour,
      isWeekend,
      urgency,
    };
    
    let scoredResults: ScoredResult[] = rawResults;
    
    if (FEATURE_FLAGS.ENABLE_ADAPTIVE_RANKING) {
      scoredResults = rankResults(rawResults, rankingContext);
    }
    
    // PHASE 7: Hyperlocal Boosts
    if (FEATURE_FLAGS.ENABLE_CLUSTER_VIBRANCY) {
      const clusters = identifyEventDensityClusters(scoredResults);
      scoredResults = boostClusterResults(scoredResults, clusters);
    }
    
    if (FEATURE_FLAGS.ENABLE_NEIGHBORHOOD_CONTEXT && request.userContext.currentLocation) {
      scoredResults = adjustForNeighborhoodContext(
        scoredResults,
        request.userContext.currentLocation,
        currentHour,
        isWeekend
      );
    }
    
    // PHASE 8: Anti-Bias Strategies
    scoredResults = applyAntiBiasStrategies(scoredResults);
    
    // PHASE 9: Smart Fallbacks
    let fallbackStrategies: any[] = [];
    if (FEATURE_FLAGS.ENABLE_SMART_FALLBACKS) {
      const fallback = determineFallbackStrategy(
        scoredResults,
        request.radiusMiles || 10,
        3.5,
        enhancedIntent.timeContext.label
      );
      fallbackStrategies = fallback.strategies;
    }
    
    // PHASE 10: UX Feedback
    let uxFeedback: any = { chips: [], helperText: '', suggestedFilters: [] };
    if (FEATURE_FLAGS.ENABLE_UX_FEEDBACK) {
      uxFeedback = generateUXFeedback(scoredResults, enhancedIntent, fallbackStrategies);
    }
    
    // PHASE 11: Pagination
    const offset = request.offset || 0;
    const limit = request.limit || 20;
    const paginatedResults = scoredResults.slice(offset, offset + limit);
    
    // PHASE 12: Metrics
    if (FEATURE_FLAGS.ENABLE_METRICS_COLLECTION) {
      const latency = Date.now() - startTime;
      metricsCollector.recordSearch({
        requestId,
        query: request.query,
        latency,
        cacheHit: false,
        intentType: enhancedIntent.intentType,
        resultCount: scoredResults.length,
      });
    }
    
    return {
      results: paginatedResults,
      meta: {
        intentType: enhancedIntent.intentType,
        confidence: enhancedIntent.confidence,
        usedProviders: providerStrategy.providers,
        cacheHit: false,
        appliedFallbacks: fallbackStrategies.map((s: any) => s.type),
        hyperlocal: {
          smallVenueBoost: FEATURE_FLAGS.ENABLE_SMALL_VENUE_BOOST,
          clusterDetection: FEATURE_FLAGS.ENABLE_CLUSTER_VIBRANCY,
          neighborhoodContext: null, // Would be set if neighborhood detected
        },
      },
      ux: {
        chips: uxFeedback.chips,
        helperText: uxFeedback.helperText,
        suggestedFilters: uxFeedback.suggestedFilters,
      },
      pagination: {
        total: scoredResults.length,
        offset,
        limit,
        hasMore: offset + limit < scoredResults.length,
      },
    };
  } catch (error) {
    console.error('[SearchOrchestrator] Error:', error);
    
    // Return empty results on error
    return {
      results: [],
      meta: {
        intentType: 'both',
        confidence: 0,
        usedProviders: [],
        cacheHit: false,
        appliedFallbacks: [],
        hyperlocal: {
          smallVenueBoost: false,
          clusterDetection: false,
          neighborhoodContext: null,
        },
      },
      ux: {
        chips: [],
        helperText: 'An error occurred. Please try again.',
        suggestedFilters: [],
      },
      pagination: {
        total: 0,
        offset: 0,
        limit: 20,
        hasMore: false,
      },
    };
  }
}

/**
 * Get orchestrator status
 */
export function getOrchestratorStatus(): {
  featureFlags: Record<string, boolean>;
  metrics: any;
  health: 'healthy' | 'degraded' | 'down';
} {
  const enabledCount = Object.values(FEATURE_FLAGS).filter(Boolean).length;
  const totalCount = Object.keys(FEATURE_FLAGS).length;
  
  let health: 'healthy' | 'degraded' | 'down' = 'healthy';
  if (enabledCount < totalCount * 0.5) health = 'degraded';
  if (enabledCount === 0) health = 'down';
  
  return {
    featureFlags: FEATURE_FLAGS,
    metrics: metricsCollector.getMetrics(),
    health,
  };
}
