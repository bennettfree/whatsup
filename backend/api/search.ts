import type { Request, Response } from 'express';

import type { SearchResult, UserContext } from '../search/types';
import { parseSearchIntent } from '../search/parseSearchIntent';
import { buildProviderPlan } from '../search/buildProviderPlan';
import { resolveSearchPlan } from '../search/resolveSearchPlan';
import { maybeRefineSemantics } from '../search/semanticRefinement';
import { executeSearchWithMeta } from '../search/executeSearch';

type SearchRequest = {
  query: string;
  userContext: UserContext;
};

type SearchResponse = {
  results: SearchResult[];
  meta: {
    intentType: 'place' | 'event' | 'both';
    usedProviders: Array<'places' | 'events'>;
    usedAI: boolean;
    cacheHit: boolean;
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

    // Step 1: intent parsing (deterministic, never throws)
    const intent = parseSearchIntent(query);

    // Step 2: routing plan (for observability + strict composition)
    const providerPlan = buildProviderPlan(intent);

    // Step 3: resolution (for observability + strict composition)
    const resolved = resolveSearchPlan(intent, providerPlan, userContext);

    // Step 4: optional refinement (does not run OpenAI by default; returns null)
    // Endpoint does not contain OpenAI logic; it delegates policy to the refinement module.
    await maybeRefineSemantics(intent, resolved, userContext);

    // Step 5: execution orchestrator (caching + provider calls + ranking)
    const { ranked, meta } = await executeSearchWithMeta(intent, userContext);

    const response: SearchResponse = {
      results: safeResults(ranked.results),
      meta: {
        intentType: intent.intentType,
        usedProviders: meta.usedProviders,
        usedAI: meta.usedAI,
        cacheHit: meta.cacheHit,
      },
    };

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
    };

    res.json(response);
    return;
  }
}

