/**
 * Deterministic result blending + ranking (no network, no AI).
 *
 * Merges Places and Events into a unified list with:
 * - consistent scoring (distance/time/rating/cost + intent alignment)
 * - stable ordering (tie-breaks)
 * - short factual reasons (optionally using SemanticRefinement templates)
 *
 * Pure function: no side effects. Never throws.
 */

import type { RankedResults, ResolvedSearchPlan, SearchIntent, SearchResult, SemanticRefinement } from './types';

// Minimal provider shapes (compatible with backend/api/* payloads).
export type Place = {
  id: string;
  type: 'place';
  name: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  imageUrl?: string;
  location: { latitude: number; longitude: number };
  isOpenNow?: boolean;
  address?: string;
  url?: string;
};

export type Event = {
  id: string;
  type: 'event';
  title: string;
  category: string;
  startDate: string;
  endDate?: string;
  isFree: boolean;
  priceMin?: number;
  priceMax?: number;
  imageUrl?: string;
  location: { latitude: number; longitude: number };
  venueName?: string;
  url?: string;
};

const MAX_RESULTS = 50;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeLower(s: unknown): string {
  return typeof s === 'string' ? s.toLowerCase() : '';
}

function safeNumber(n: unknown): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function parseISO(iso: string | undefined): Date | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isFinite(d.getTime()) ? d : null;
}

// Haversine distance in meters.
function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function normalizeDistanceScore(distM: number, maxDistM: number): number {
  // dist=0 => 1.0, dist>=max => 0.0
  if (!Number.isFinite(distM) || distM < 0) return 0;
  const denom = Number.isFinite(maxDistM) && maxDistM > 0 ? maxDistM : 5000;
  return clamp01(1 - distM / denom);
}

function normalizeRatingScore(rating: number | null): number {
  if (rating == null) return 0.5; // neutral if missing
  // soft influence: map [3.0..5.0] to [0..1], clamp
  return clamp01((rating - 3) / 2);
}

function normalizeSoonnessScore(eventStart: Date | null, windowStart: Date | null, windowEnd: Date | null): number {
  // Deterministic: use the resolved window if present; otherwise neutral.
  if (!eventStart || !windowStart || !windowEnd) return 0.5;
  const startMs = eventStart.getTime();
  const ws = windowStart.getTime();
  const we = windowEnd.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(ws) || !Number.isFinite(we) || we <= ws) return 0.5;

  // Events before the window start are deprioritized.
  if (startMs < ws) return 0.1;
  // Within window: earlier is better.
  if (startMs <= we) {
    const t = (startMs - ws) / (we - ws);
    return clamp01(1 - t);
  }
  // After window: still eligible but weaker.
  const after = (startMs - we) / (24 * 60 * 60 * 1000); // days after
  return clamp01(0.4 - after * 0.1);
}

function normalizeEventCostScore(e: Event): number {
  // Light boost: free > low-cost > unknown > expensive (very light).
  if (e.isFree) return 1;
  const min = safeNumber(e.priceMin);
  if (min == null) return 0.5;
  if (min <= 15) return 0.8;
  if (min <= 40) return 0.6;
  return 0.4;
}

function buildIntentMatcher(intent: SearchIntent, semantic?: SemanticRefinement | null): {
  keywords: string[];
  categories: string[];
  refinedPlaceTypes: string[];
} {
  const intentKeywords = (intent.keywords || []).map((k) => safeLower(k)).filter(Boolean);
  const semanticKeywords = (semantic?.refinedKeywords || []).map((k) => safeLower(k)).filter(Boolean);
  const keywords = uniqPreserveOrder([...semanticKeywords, ...intentKeywords]).slice(0, 12);

  const categories = (intent.categories || []).map((c) => safeLower(c)).filter(Boolean).slice(0, 8);
  const refinedPlaceTypes = (semantic?.refinedPlaceTypes || []).map((t) => safeLower(t)).filter(Boolean).slice(0, 6);
  return { keywords, categories, refinedPlaceTypes };
}

function uniqPreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    const v = i.trim();
    if (!v) continue;
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function alignmentScoreForPlace(p: Place, matcher: ReturnType<typeof buildIntentMatcher>): number {
  const title = safeLower(p.name);
  const cat = safeLower(p.category);
  let score = 0;
  let max = 0;

  // Keyword match in title/category (partial credit per hit).
  max += 1;
  const keywordHits = matcher.keywords.filter((k) => (title.includes(k) || cat.includes(k)) && k.length >= 3).length;
  score += clamp01(keywordHits / Math.max(1, matcher.keywords.length));

  // Category match (light).
  max += 1;
  const categoryHit = matcher.categories.some((c) => c && cat.includes(c));
  score += categoryHit ? 1 : 0;

  // Refined place types (if present) — best-effort: match against category string.
  if (matcher.refinedPlaceTypes.length > 0) {
    max += 1;
    const refinedHit = matcher.refinedPlaceTypes.some((t) => t && cat.includes(t));
    score += refinedHit ? 1 : 0;
  }

  return max > 0 ? clamp01(score / max) : 0.5;
}

function alignmentScoreForEvent(e: Event, matcher: ReturnType<typeof buildIntentMatcher>): number {
  const title = safeLower(e.title);
  const cat = safeLower(e.category);
  let score = 0;
  let max = 0;

  max += 1;
  const keywordHits = matcher.keywords.filter((k) => (title.includes(k) || cat.includes(k)) && k.length >= 3).length;
  score += clamp01(keywordHits / Math.max(1, matcher.keywords.length));

  max += 1;
  const categoryHit = matcher.categories.some((c) => c && cat.includes(c));
  score += categoryHit ? 1 : 0;

  return max > 0 ? clamp01(score / max) : 0.5;
}

function scorePlace(params: {
  place: Place;
  origin: { latitude: number; longitude: number };
  maxDistM: number;
  matcher: ReturnType<typeof buildIntentMatcher>;
  intentType: SearchIntent['intentType'];
}): { score01: number; distM: number; notes: string[] } {
  const { place, origin, maxDistM, matcher, intentType } = params;
  const notes: string[] = [];
  const distM = distanceMeters(origin, place.location);

  const dScore = normalizeDistanceScore(distM, maxDistM); // strong
  const rScore = normalizeRatingScore(safeNumber(place.rating)); // soft
  const aScore = alignmentScoreForPlace(place, matcher); // medium

  // Weights tuned to feel "smart" while staying predictable.
  let score01 = 0.55 * dScore + 0.15 * rScore + 0.30 * aScore;

  // If intent is event-only, hard deprioritize places.
  if (intentType === 'event') {
    score01 *= 0.6;
    notes.push('IntentType event → place score down-weighted.');
  }

  return { score01: clamp01(score01), distM, notes };
}

function scoreEvent(params: {
  event: Event;
  origin: { latitude: number; longitude: number };
  maxDistM: number;
  windowStart: Date | null;
  windowEnd: Date | null;
  matcher: ReturnType<typeof buildIntentMatcher>;
  intentType: SearchIntent['intentType'];
}): { score01: number; distM: number; notes: string[]; startDate?: string } {
  const { event, origin, maxDistM, windowStart, windowEnd, matcher, intentType } = params;
  const notes: string[] = [];
  const distM = distanceMeters(origin, event.location);

  const dScore = normalizeDistanceScore(distM, maxDistM);
  const tScore = normalizeSoonnessScore(parseISO(event.startDate), windowStart, windowEnd);
  const cScore = normalizeEventCostScore(event);
  const aScore = alignmentScoreForEvent(event, matcher);

  let score01 = 0.40 * dScore + 0.25 * tScore + 0.10 * cScore + 0.25 * aScore;

  // If intent is place-only, hard deprioritize events.
  if (intentType === 'place') {
    score01 *= 0.6;
    notes.push('IntentType place → event score down-weighted.');
  }

  return { score01: clamp01(score01), distM, notes, startDate: event.startDate };
}

function makeReasonFromTemplate(template: string, data: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(data)) {
    out = out.replaceAll(`{${k}}`, v);
  }
  // Keep single-line.
  return out.replace(/\s+/g, ' ').trim();
}

function formatDistance(distM: number | undefined): string {
  if (distM == null || !Number.isFinite(distM)) return '';
  if (distM < 1000) return `${Math.round(distM)}m`;
  const km = distM / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)}km`;
}

function defaultReasonForPlace(p: Place, distM: number, score01: number): string {
  const parts: string[] = [];
  if (Number.isFinite(p.rating) && (p.rating ?? 0) >= 4.5) parts.push('Highly rated');
  if (p.isOpenNow === true) parts.push('Open now');
  if (distM < 1200) parts.push('Close by');
  if (parts.length === 0) {
    // Avoid endorsement language; keep factual.
    if (score01 >= 0.75) return 'Relevant nearby place';
    return 'Nearby place';
  }
  return parts.join(' • ');
}

function defaultReasonForEvent(e: Event, distM: number, windowLabel: string | undefined): string {
  const parts: string[] = [];
  if (windowLabel === 'weekend') parts.push('This weekend');
  else if (windowLabel === 'tonight') parts.push('Tonight');
  else if (windowLabel === 'today') parts.push('Today');
  else if (windowLabel === 'now') parts.push('Starting soon');
  if (e.isFree) parts.push('Free');
  if (distM < 2000) parts.push('Nearby');
  if (parts.length === 0) return 'Upcoming event';
  return parts.join(' • ');
}

function stableSort<T>(items: T[], cmp: (a: T, b: T) => number): T[] {
  return items
    .map((v, i) => ({ v, i }))
    .sort((a, b) => {
      const d = cmp(a.v, b.v);
      return d !== 0 ? d : a.i - b.i;
    })
    .map((x) => x.v);
}

function blendInterleaving(places: SearchResult[], events: SearchResult[], limit: number): SearchResult[] {
  const out: SearchResult[] = [];
  let i = 0;
  let j = 0;

  // Start with whichever top result is stronger.
  let next: 'place' | 'event' =
    (places[0]?.score ?? -1) >= (events[0]?.score ?? -1) ? 'place' : 'event';

  while (out.length < limit && (i < places.length || j < events.length)) {
    if (next === 'place' && i < places.length) {
      out.push(places[i++]);
      next = 'event';
      continue;
    }
    if (next === 'event' && j < events.length) {
      out.push(events[j++]);
      next = 'place';
      continue;
    }
    // If one side is exhausted, drain the other.
    if (i < places.length) out.push(places[i++]);
    else if (j < events.length) out.push(events[j++]);
  }
  return out;
}

function tieBreak(a: SearchResult, b: SearchResult): number {
  // Higher score first
  if (b.score !== a.score) return b.score - a.score;
  // Closer first (if both have distance)
  const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
  const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  // Title alphabetical for stability
  const t = a.title.localeCompare(b.title);
  if (t !== 0) return t;
  // Final stable tie-break
  return a.id.localeCompare(b.id);
}

export function rankAndBlendResults(
  places: Place[],
  events: Event[],
  intent: SearchIntent,
  resolvedPlan: ResolvedSearchPlan,
  semantic?: SemanticRefinement | null,
): RankedResults {
  const rankingNotes: string[] = [];

  try {
    const origin = { latitude: resolvedPlan.latitude, longitude: resolvedPlan.longitude };

    const maxPlaceDistM = resolvedPlan.placesParams?.radiusMeters ?? 5000;
    const maxEventDistM = (resolvedPlan.eventsParams?.radiusMiles ?? 25) * 1609.34;

    const windowStart = parseISO(resolvedPlan.eventsParams?.dateRange?.start);
    const windowEnd = parseISO(resolvedPlan.eventsParams?.dateRange?.end);

    const matcher = buildIntentMatcher(intent, semantic);
    rankingNotes.push('Scoring: distance + intent alignment for all; rating for places; time/cost for events.');

    if (intent.intentType === 'both') rankingNotes.push('Blending: interleaving places/events to avoid clustering.');
    if (intent.intentType === 'place') rankingNotes.push('IntentType place: events are down-weighted (kept as fallback).');
    if (intent.intentType === 'event') rankingNotes.push('IntentType event: places are down-weighted (kept as fallback).');

    // Score + map places
    // De-duplicate within provider inputs (never merge duplicates).
    const placeSeen = new Set<string>();
    const eventSeen = new Set<string>();

    const scoredPlaces = (places || [])
      .filter((p): p is Place => Boolean(p && p.id && p.location))
      .filter((p) => {
        if (placeSeen.has(p.id)) return false;
        placeSeen.add(p.id);
        return true;
      })
      .map((p) => {
        const { score01, distM } = scorePlace({
          place: p,
          origin,
          maxDistM: maxPlaceDistM,
          matcher,
          intentType: intent.intentType,
        });

        const template = semantic?.reasonTemplates?.place?.[0];
        const reason = template
          ? makeReasonFromTemplate(template, {
              distance: formatDistance(distM),
              rating: typeof p.rating === 'number' ? p.rating.toFixed(1) : '',
              category: p.category || '',
            })
          : defaultReasonForPlace(p, distM, score01);

        return {
          id: p.id,
          type: 'place' as const,
          title: p.name,
          imageUrl: p.imageUrl,
          category: p.category,
          location: p.location,
          rating: p.rating,
          reviewCount: p.reviewCount,
          priceLevel: p.priceLevel,
          address: p.address,
          isOpenNow: p.isOpenNow,
          url: p.url,
          distanceMeters: distM,
          score: Math.round(score01 * 1000) / 10, // 0–100 with 0.1 resolution
          reason,
        } satisfies SearchResult;
      });

    // Score + map events
    const scoredEvents = (events || [])
      .filter((e): e is Event => Boolean(e && e.id && e.location && e.startDate))
      .filter((e) => {
        if (eventSeen.has(e.id)) return false;
        eventSeen.add(e.id);
        return true;
      })
      .map((e) => {
        const { score01, distM, startDate } = scoreEvent({
          event: e,
          origin,
          maxDistM: maxEventDistM,
          windowStart,
          windowEnd,
          matcher,
          intentType: intent.intentType,
        });

        const template = semantic?.reasonTemplates?.event?.[0];
        const reason = template
          ? makeReasonFromTemplate(template, {
              distance: formatDistance(distM),
              category: e.category || '',
            })
          : defaultReasonForEvent(e, distM, intent.timeContext?.label);

        return {
          id: e.id,
          type: 'event' as const,
          title: e.title,
          imageUrl: e.imageUrl,
          category: e.category,
          location: e.location,
          startDate,
          endDate: e.endDate,
          venueName: e.venueName,
          isFree: e.isFree,
          priceMin: e.priceMin,
          priceMax: e.priceMax,
          url: e.url,
          distanceMeters: distM,
          score: Math.round(score01 * 1000) / 10,
          reason,
        } satisfies SearchResult;
      });

    // Sort within type with stable tie-breaks.
    const sortedPlaces = stableSort(scoredPlaces, tieBreak);
    const sortedEvents = stableSort(scoredEvents, tieBreak);

    // Blend
    let blended: SearchResult[];
    if (intent.intentType === 'both') {
      blended = blendInterleaving(sortedPlaces, sortedEvents, MAX_RESULTS);
    } else if (intent.intentType === 'place') {
      blended = [...sortedPlaces, ...sortedEvents].slice(0, MAX_RESULTS);
    } else {
      blended = [...sortedEvents, ...sortedPlaces].slice(0, MAX_RESULTS);
    }

    // Final stable ordering across identical inputs:
    // For the interleaving case, we preserve the constructed order but still enforce stable tie-break
    // within same-score neighbors by re-sorting only if not "both". For "both", keep blend order.
    if (intent.intentType !== 'both') {
      blended = stableSort(blended, tieBreak).slice(0, MAX_RESULTS);
    }

    rankingNotes.push(`Output capped: max ${MAX_RESULTS} items.`);

    return { results: blended, rankingNotes };
  } catch (e) {
    return {
      results: [],
      rankingNotes: [
        'Ranking error: returned empty results safely.',
        `Error: ${e instanceof Error ? e.message : String(e)}`,
      ],
    };
  }
}

