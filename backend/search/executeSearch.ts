/**
 * Search execution orchestrator (Prompt 6).
 *
 * Responsibilities:
 * - Build provider plan (routing)
 * - Resolve location + time windows
 * - (Optional) semantic refinement (Prompt 4; disabled by default)
 * - Execute providers in parallel with TTL cache + in-flight de-dup
 * - Rank + blend results
 * - Log observability signals (cache hits / provider calls / fallbacks)
 *
 * Determinism note:
 * - With OpenAI refinement disabled (default), outputs are deterministic for identical inputs.
 */

import type { RankedResults, SearchIntent, UserContext } from './types';
import type { Place as RankedPlace, Event as RankedEvent } from './rankAndBlendResults';
import { buildProviderPlan } from './buildProviderPlan';
import { resolveSearchPlan } from './resolveSearchPlan';
import { maybeRefineSemantics } from './semanticRefinement';
import { rankAndBlendResults } from './rankAndBlendResults';
import { TTLCache, InFlightDeduper, bucket, roundCoord, stableArrayKey } from './cache';
import { fetchGooglePlacesNearby } from './providers/googlePlacesProvider';
import { fetchTicketmasterEventsNearby } from './providers/ticketmasterProvider';

type CachedProviderResult<T> = { items: T[] };

const providerCache = new TTLCache<CachedProviderResult<any>>();
const rankedCache = new TTLCache<RankedResults>();
const inFlight = new InFlightDeduper<any>();

export type SearchExecutionMeta = {
  usedProviders: Array<'places' | 'events'>;
  usedAI: boolean;
  cacheHit: boolean;
};

function shouldLog(): boolean {
  return process.env.SEARCH_LOGS === 'true' || process.env.NODE_ENV !== 'production';
}

function log(event: string, data: Record<string, unknown>): void {
  if (!shouldLog()) return;
  // Keep logs structured and grep-friendly.
  console.log(`[search] ${event}`, data);
}

function ttlMsForProvider(intent: SearchIntent): number {
  // TTL target: 30–120 seconds, deterministic.
  // Lower TTL for "near_me" because user may be moving; higher for city/zip.
  if (intent.locationHint.type === 'near_me') return 45_000;
  if (intent.locationHint.type === 'city' || intent.locationHint.type === 'zip') return 90_000;
  return 60_000;
}

function ttlMsForRanked(intent: SearchIntent): number {
  // Keep ranked list cached similarly; slightly shorter to reflect provider cache churn.
  if (intent.locationHint.type === 'near_me') return 30_000;
  return 60_000;
}

function safeTopKeyword(intent: SearchIntent): string | undefined {
  const k = intent.keywords?.[0];
  if (!k) return undefined;
  const s = String(k).trim();
  if (s.length < 3 || s.length > 40) return undefined;
  // Avoid extremely generic keywords as cache busters.
  const lower = s.toLowerCase();
  if (lower === 'food' || lower === 'events' || lower === 'places' || lower === 'things') return undefined;
  return s;
}

function cacheKeyBase(params: { lat: number; lng: number }): string {
  // Debounce/pan-threshold: rounding reduces refetch storms on small pans.
  const lat = roundCoord(params.lat, 3); // ~110m
  const lng = roundCoord(params.lng, 3);
  return `lat=${lat};lng=${lng}`;
}

function placesCacheKey(input: {
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults: number;
  types?: string[];
  keyword?: string;
}): string {
  const base = cacheKeyBase({ lat: input.lat, lng: input.lng });
  const radius = bucket(input.radiusMeters, 250); // bucket to reduce churn
  const max = Math.min(input.maxResults, 40);
  const types = stableArrayKey(input.types);
  const kw = (input.keyword || '').toLowerCase();
  return `provider=places;${base};r=${radius};max=${max};types=${types};kw=${kw}`;
}

function eventsCacheKey(input: {
  lat: number;
  lng: number;
  radiusMiles: number;
  maxResults: number;
  dateStart?: string;
  dateEnd?: string;
  keyword?: string;
  category?: string;
}): string {
  const base = cacheKeyBase({ lat: input.lat, lng: input.lng });
  const radius = bucket(input.radiusMiles, 5); // miles bucket
  const max = Math.min(input.maxResults, 50);
  const start = input.dateStart || '';
  const end = input.dateEnd || '';
  const kw = (input.keyword || '').toLowerCase();
  const cat = (input.category || '').toLowerCase();
  return `provider=events;${base};r=${radius};max=${max};start=${start};end=${end};kw=${kw};cat=${cat}`;
}

function rankedCacheKey(input: {
  intent: SearchIntent;
  lat: number;
  lng: number;
  placesKey?: string;
  eventsKey?: string;
}): string {
  const base = cacheKeyBase({ lat: input.lat, lng: input.lng });
  const time = `${input.intent.timeContext?.label ?? ''}:${input.intent.timeContext?.dayOfWeek ?? ''}`;
  const cats = stableArrayKey(input.intent.categories || []);
  const intentType = input.intent.intentType;
  // Tie the ranked cache to provider keys for correctness.
  return `ranked;${base};intentType=${intentType};time=${time};cats=${cats};p=${input.placesKey ?? ''};e=${input.eventsKey ?? ''}`;
}

async function cachedCall<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  nowMs: number,
): Promise<{ value: T; cacheHit: boolean }> {
  const cached = providerCache.get(key, nowMs) as any as CachedProviderResult<T> | null;
  if (cached) return { value: cached.items as any as T, cacheHit: true };

  const inF = inFlight.get(key) as Promise<T> | null;
  if (inF) return { value: await inF, cacheHit: true }; // de-dupe treated as cacheHit for observability

  const p = (async () => {
    const v = await fn();
    providerCache.set(key, { items: v } as any, ttlMs, nowMs);
    return v;
  })();
  inFlight.set(key, p);

  return { value: await p, cacheHit: false };
}

export async function executeSearch(intent: SearchIntent, context: UserContext): Promise<RankedResults> {
  const { ranked } = await executeSearchWithMeta(intent, context);
  return ranked;
}

export async function executeSearchWithMeta(
  intent: SearchIntent,
  context: UserContext,
): Promise<{ ranked: RankedResults; meta: SearchExecutionMeta }> {
  const nowMs = Date.now();
  const providerPlan = buildProviderPlan(intent);
  const resolved = resolveSearchPlan(intent, providerPlan, context);

  // If resolution failed, return empty safely with notes.
  if (!resolved.placesParams && !resolved.eventsParams) {
    log('resolution_abort', { notes: resolved.resolutionNotes });
    return {
      ranked: { results: [], rankingNotes: ['No location resolved; provider calls aborted.'] },
      meta: { usedProviders: [], usedAI: false, cacheHit: false },
    };
  }

  // Optional semantic refinement (Prompt 4) — currently stubbed/disabled.
  const refinement = await maybeRefineSemantics(intent, resolved, context);
  refinement.notes.forEach((n) => log('refinement', { note: n }));

  // Final ranked cache short-circuit
  const pKey = resolved.placesParams
    ? placesCacheKey({
        lat: resolved.latitude,
        lng: resolved.longitude,
        radiusMeters: resolved.placesParams.radiusMeters,
        maxResults: resolved.placesParams.maxResults,
        types: resolved.placesParams.types,
        keyword: safeTopKeyword(intent),
      })
    : undefined;
  const eKey = resolved.eventsParams
    ? eventsCacheKey({
        lat: resolved.latitude,
        lng: resolved.longitude,
        radiusMiles: resolved.eventsParams.radiusMiles,
        maxResults: resolved.eventsParams.maxResults,
        dateStart: resolved.eventsParams.dateRange?.start,
        dateEnd: resolved.eventsParams.dateRange?.end,
        keyword: safeTopKeyword(intent),
      })
    : undefined;

  const rKey = rankedCacheKey({ intent, lat: resolved.latitude, lng: resolved.longitude, placesKey: pKey, eventsKey: eKey });
  const rankedCached = rankedCache.get(rKey, nowMs);
  if (rankedCached) {
    log('ranked_cache_hit', { key: rKey });
    return {
      ranked: rankedCached,
      meta: {
        usedProviders: [
          ...(resolved.placesParams ? (['places'] as const) : []),
          ...(resolved.eventsParams ? (['events'] as const) : []),
        ],
        usedAI: Boolean(refinement.semantic),
        cacheHit: true,
      },
    };
  }

  const ttlProvider = ttlMsForProvider(intent);

  // Execute providers in parallel as allowed by ResolvedSearchPlan.
  const placesPromise = resolved.placesParams
    ? cachedCall<RankedPlace[]>(
        pKey!,
        ttlProvider,
        async () => {
          log('provider_call', { provider: 'places', radiusMeters: resolved.placesParams!.radiusMeters, maxResults: resolved.placesParams!.maxResults });
          // Provider supports only one type; we pass the first.
          return (await fetchGooglePlacesNearby({
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            radiusMeters: resolved.placesParams!.radiusMeters,
            maxResults: resolved.placesParams!.maxResults,
            types: resolved.placesParams!.types,
            keyword: safeTopKeyword(intent),
          })) as unknown as RankedPlace[];
        },
        nowMs,
      )
    : Promise.resolve({ value: [] as RankedPlace[], cacheHit: false });

  const eventsPromise = resolved.eventsParams
    ? cachedCall<RankedEvent[]>(
        eKey!,
        ttlProvider,
        async () => {
          log('provider_call', {
            provider: 'events',
            radiusMiles: resolved.eventsParams!.radiusMiles,
            maxResults: resolved.eventsParams!.maxResults,
            dateRange: resolved.eventsParams!.dateRange,
          });
          return (await fetchTicketmasterEventsNearby({
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            radiusMiles: resolved.eventsParams!.radiusMiles,
            maxResults: resolved.eventsParams!.maxResults,
            dateRange: resolved.eventsParams!.dateRange,
            keyword: safeTopKeyword(intent),
          })) as unknown as RankedEvent[];
        },
        nowMs,
      )
    : Promise.resolve({ value: [] as RankedEvent[], cacheHit: false });

  const [placesRes, eventsRes] = await Promise.allSettled([placesPromise, eventsPromise]);

  const places: RankedPlace[] =
    placesRes.status === 'fulfilled' ? placesRes.value.value : [];
  const events: RankedEvent[] =
    eventsRes.status === 'fulfilled' ? eventsRes.value.value : [];

  if (placesRes.status === 'fulfilled') log('provider_cache', { provider: 'places', hit: placesRes.value.cacheHit, key: pKey });
  if (eventsRes.status === 'fulfilled') log('provider_cache', { provider: 'events', hit: eventsRes.value.cacheHit, key: eKey });

  if (placesRes.status === 'rejected') log('provider_error', { provider: 'places', error: String(placesRes.reason) });
  if (eventsRes.status === 'rejected') log('provider_error', { provider: 'events', error: String(eventsRes.reason) });

  // Rank + blend; always succeeds (returns empty safely on internal error).
  const ranked = rankAndBlendResults(places, events, intent, resolved, refinement.semantic);

  // Observability: include upstream notes
  ranked.rankingNotes = [
    ...providerPlan.reasoning.map((r) => `router: ${r}`),
    ...resolved.resolutionNotes.map((n) => `resolver: ${n}`),
    ...refinement.notes.map((n) => `refine: ${n}`),
    ...ranked.rankingNotes.map((n) => `rank: ${n}`),
  ];

  // Cache final ranked results
  rankedCache.set(rKey, ranked, ttlMsForRanked(intent), nowMs);
  log('ranked_cache_set', { key: rKey, ttlMs: ttlMsForRanked(intent), resultCount: ranked.results.length });

  const placesHit = placesRes.status === 'fulfilled' ? placesRes.value.cacheHit : false;
  const eventsHit = eventsRes.status === 'fulfilled' ? eventsRes.value.cacheHit : false;
  const providerCacheHit =
    (resolved.placesParams ? placesHit : true) && (resolved.eventsParams ? eventsHit : true);

  return {
    ranked,
    meta: {
      usedProviders: [
        ...(resolved.placesParams ? (['places'] as const) : []),
        ...(resolved.eventsParams ? (['events'] as const) : []),
      ],
      usedAI: Boolean(refinement.semantic),
      // cacheHit means we avoided outbound provider calls entirely.
      cacheHit: providerCacheHit,
    },
  };
}

