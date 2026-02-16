import type { Request, Response } from 'express';

import type { SearchResult, UserContext } from '../search/types';
import { parseSearchIntent } from '../search/parseSearchIntent';
import { classifyIntentHybrid } from '../search/ai/hybridIntentClassifier';
import { buildProviderPlan } from '../search/buildProviderPlan';
import { resolveSearchPlan } from '../search/resolveSearchPlan';
import { maybeRefineSemantics } from '../search/semanticRefinement';
import { executeSearchWithMeta } from '../search/executeSearch';
import { enhanceResults } from '../search/qualityEnhancer';
import { executeNeverEmptyFallback, shouldAttemptFallback, getFallbackMessage } from '../search/fallbacks/neverEmptyFallback';

// Feature flag for hybrid OpenAI system (industry standard)
const ENABLE_HYBRID_OPENAI = process.env.ENABLE_HYBRID_OPENAI !== 'false'; // ON by default

type SearchRequest = {
  query: string;
  userContext: UserContext;
  radiusMiles?: number;
  limit?: number;
  offset?: number;
};

type SearchResponse = {
  results: SearchResult[];
  meta: {
    intentType: 'place' | 'event' | 'both';
    usedProviders: Array<'places' | 'events'>;
    usedAI: boolean;
    cacheHit: boolean;
  };
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function sanitizeUserContext(input: any): UserContext {
  const timezone = typeof input?.timezone === 'string' ? input.timezone : 'UTC';
  const nowISO = typeof input?.nowISO === 'string' ? input.nowISO : new Date().toISOString();

  const loc = input?.currentLocation;
  const currentLocation =
    loc && isFiniteNumber(loc.latitude) && isFiniteNumber(loc.longitude)
      ? { latitude: loc.latitude, longitude: loc.longitude }
      : undefined;

  return { timezone, nowISO, currentLocation };
}

function safeResults(results: any): SearchResult[] {
  return Array.isArray(results) ? (results as SearchResult[]) : [];
}

/**
 * POST /api/search
 *
 * Thin composition layer. No provider-specific logic. No OpenAI logic.
 * Always returns a valid response (possibly empty).
 */
export async function searchHandler(req: Request, res: Response): Promise<void> {
  // Deterministic-ish request id for logs only (not returned to client).
  const requestId = Date.now().toString(36);

  try {
    const body = (req.body ?? {}) as Partial<SearchRequest>;
    const query = typeof body.query === 'string' ? body.query : '';
    const userContext = sanitizeUserContext(body.userContext);
    
    // Pagination & filtering parameters
    const radiusMiles = isFiniteNumber(body.radiusMiles) ? body.radiusMiles : 10;
    const limit = isFiniteNumber(body.limit) && body.limit > 0 && body.limit <= 100 ? body.limit : 20;
    const offset = isFiniteNumber(body.offset) && body.offset >= 0 ? body.offset : 0;

    console.log(`\n[Search API] ==================== NEW SEARCH ====================`);
    console.log(`[Search API] Query: "${query}"`);
    console.log(`[Search API] Location: ${userContext.currentLocation?.latitude.toFixed(4)}, ${userContext.currentLocation?.longitude.toFixed(4)}`);
    console.log(`[Search API] Radius: ${radiusMiles} miles`);
    console.log(`[Search API] Hybrid OpenAI: ${ENABLE_HYBRID_OPENAI ? 'ENABLED' : 'DISABLED'}`);
    
    // Step 1: Hybrid intent parsing (rule-based + OpenAI fallback for complex queries)
    let intent;
    let usedAI = false;
    
    if (ENABLE_HYBRID_OPENAI && query.trim().length > 0) {
      console.log(`[Search API] Step 1: Attempting hybrid classification...`);
      // Industry-standard hybrid: fast rule-based → OpenAI fallback for low confidence
      const hybrid = await classifyIntentHybrid(query);
      intent = hybrid.intent;
      usedAI = hybrid.aiUsed;
      
      console.log(`[Search API] Intent: ${intent.intentType}, Confidence: ${intent.confidence.toFixed(2)}, AI Used: ${usedAI}`);
      console.log(`[Search API] Categories: [${intent.categories.join(', ')}]`);
      console.log(`[Search API] Keywords: [${intent.keywords.join(', ')}]`);
      
      if (usedAI) {
        console.log(`[Search API] 🤖 OpenAI classification successful`);
      } else {
        console.log(`[Search API] ⚡ Rule-based classification used (high confidence)`);
      }
    } else {
      // Fallback to pure rule-based
      console.log(`[Search API] Step 1: Using pure rule-based classification`);
      intent = parseSearchIntent(query);
      console.log(`[Search API] Intent: ${intent.intentType}, Confidence: ${intent.confidence.toFixed(2)}`);
    }

    // Step 2: routing plan (for observability + strict composition)
    const providerPlan = buildProviderPlan(intent);

    // Step 3: resolution (for observability + strict composition)
    const resolved = resolveSearchPlan(intent, providerPlan, userContext);

    // Step 4: optional refinement (does not run OpenAI by default; returns null)
    // Endpoint does not contain OpenAI logic; it delegates policy to the refinement module.
    await maybeRefineSemantics(intent, resolved, userContext);

    console.log(`[Search API] Step 2: Provider plan - Places: ${providerPlan.callPlaces}, Events: ${providerPlan.callEvents}`);
    console.log(`[Search API] Step 3: Resolution complete`);
    
    // Step 5: execution orchestrator (caching + provider calls + ranking)
    // Pass radius for distance-based filtering
    console.log(`[Search API] Step 5: Executing search with providers...`);
    const { ranked, meta } = await executeSearchWithMeta(intent, userContext, { radiusMiles });
    console.log(`[Search API] Execution complete: ${ranked.results.length} results from providers`);
    console.log(`[Search API] Used providers: [${meta.usedProviders.join(', ')}], Cache hit: ${meta.cacheHit}`);
    
    // Step 6: Quality enhancement
    // Ensures high-quality, diverse results that meet minimum thresholds
    console.log(`[Search API] Step 6: Enhancing ${ranked.results.length} results...`);
    let { enhanced, quality, applied } = enhanceResults(safeResults(ranked.results), {
      minResults: 15,
      minRating: 3.5,
      maxSameCategory: 0.3,
      preferOpenNow: true,
    });
    console.log(`[Search API] After enhancement: ${enhanced.length} results`);
    
    // Step 7: Never-Empty Fallback Chain (Industry Standard)
    // Progressive fallback ensures we ALWAYS return results (like Google Maps, Yelp)
    if (shouldAttemptFallback(enhanced, 5) && offset === 0) {
      console.log(`[NeverEmpty] Insufficient results (${enhanced.length}), attempting progressive fallback...`);
      
      // Create fallback search function that wraps our execution pipeline
      const fallbackSearch = async (fallbackQuery: string, fallbackRadius: number): Promise<SearchResult[]> => {
        const fallbackIntent = fallbackQuery 
          ? (ENABLE_HYBRID_OPENAI ? (await classifyIntentHybrid(fallbackQuery)).intent : parseSearchIntent(fallbackQuery))
          : intent; // Keep original intent for empty query
          
        const fallbackPlan = buildProviderPlan(fallbackIntent);
        const fallbackResolved = resolveSearchPlan(fallbackIntent, fallbackPlan, userContext);
        const fallbackExec = await executeSearchWithMeta(fallbackIntent, userContext, { radiusMiles: fallbackRadius });
        const fallbackEnhanced = enhanceResults(safeResults(fallbackExec.ranked.results), {
          minResults: 1, // More lenient for fallback
          minRating: 3.0, // Relaxed rating
          maxSameCategory: 0.5, // More diversity tolerance
          preferOpenNow: true,
        });
        
        return fallbackEnhanced.enhanced;
      };
      
      // Execute progressive fallback
      const { isOpenAIAvailable } = await import('../search/ai/openaiClient');
      const fallbackResult = await executeNeverEmptyFallback(
        fallbackSearch,
        query,
        radiusMiles,
        isOpenAIAvailable()
      );
      
      enhanced = fallbackResult.results;
      applied.push(`never_empty_fallback (${fallbackResult.finalStrategy})`);
      
      console.log(`[NeverEmpty] ✅ Fallback successful: ${enhanced.length} results via ${fallbackResult.finalStrategy}`);
    }
    
    // Log quality assessment for monitoring
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[qualityEnhancer] Quality: ${quality.quality}, Count: ${enhanced.length}, Applied: ${applied.join(', ')}`);
    }
    
    // Apply pagination to enhanced results
    const allResults = enhanced;
    const total = allResults.length;
    const paginatedResults = allResults.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    const response: SearchResponse = {
      results: paginatedResults,
      meta: {
        intentType: intent.intentType,
        usedProviders: meta.usedProviders,
        usedAI: usedAI || meta.usedAI, // Include hybrid AI usage
        cacheHit: meta.cacheHit,
      },
      pagination: {
        total,
        offset,
        limit,
        hasMore,
      },
    };

    console.log(`[Search API] ✅ Returning ${paginatedResults.length} results (total: ${total}, hasMore: ${hasMore})`);
    console.log(`[Search API] ========================================\n`);

    res.json(response);
    return;
  } catch (err) {
    // Never expose stack traces to clients.
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[searchHandler] error requestId=${requestId}`, err);
    } else {
      console.error(`[searchHandler] error requestId=${requestId}`);
    }

    const response: SearchResponse = {
      results: [],
      meta: {
        intentType: 'both',
        usedProviders: [],
        usedAI: false,
        cacheHit: false,
      },
      pagination: {
        total: 0,
        offset: 0,
        limit: 20,
        hasMore: false,
      },
    };

    res.json(response);
    return;
  }
}

