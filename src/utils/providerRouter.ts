/**
 * Deterministic provider routing & query planning (cost-aware).
 *
 * Input: SearchIntent (from parseSearchIntent)
 * Output: ProviderPlan that is safe, repeatable, and explains decisions.
 *
 * No network calls. No AI. Pure function. Never throws.
 */

import type { SearchIntent } from './intentParser';

export type ProviderPlan = {
  callPlaces: boolean;
  callEvents: boolean;

  placesQuery?: {
    types?: string[]; // Google Places includedTypes (controlled list)
    radiusMeters: number;
    maxResults: number; // capped at 40
  };

  eventsQuery?: {
    radiusMiles: number;
    dateRange?: {
      start?: string; // ISO
      end?: string; // ISO
    };
    maxResults: number; // capped at 50
  };

  reasoning: string[];
};

type Category =
  | 'food'
  | 'nightlife'
  | 'music'
  | 'art'
  | 'history'
  | 'fitness'
  | 'outdoor'
  | 'social'
  | 'other';

const PLACE_MAX = 40;
const EVENT_MAX = 50;

const DEFAULT_PLACES_RADIUS_M = 5000;
const DEFAULT_EVENTS_RADIUS_MI = 25;

// Smaller radius for dense categories to reduce cost + keep results relevant.
const NIGHTLIFE_RADIUS_M = 2500;
const SOCIAL_RADIUS_M = 3000;

// If we believe the user is searching a major city, we can broaden events slightly.
const MAJOR_CITY_EVENTS_RADIUS_MI = 35;

// Keep Google Places includedTypes short and controlled.
const CATEGORY_TO_PLACES_TYPES: Record<Category, string[] | undefined> = {
  food: ['restaurant', 'cafe'],
  nightlife: ['bar', 'night_club'],
  music: undefined, // music is usually events; avoid broad place calls
  art: ['museum', 'art_gallery'],
  history: ['museum', 'tourist_attraction'],
  fitness: ['gym'],
  outdoor: ['park', 'tourist_attraction'],
  social: undefined, // too broad; we gate via intent rules + smaller radius
  other: undefined,
};

const EVENT_SIGNAL_KEYWORDS = new Set<string>([
  'concerts',
  'shows',
  'festivals',
  'sports',
  'comedy',
  'theater',
  'events',
]);

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function toCategorySet(categories: string[]): Set<Category> {
  const set = new Set<Category>();
  for (const raw of categories) {
    const c = String(raw || '').toLowerCase().trim() as Category;
    if (
      c === 'food' ||
      c === 'nightlife' ||
      c === 'music' ||
      c === 'art' ||
      c === 'history' ||
      c === 'fitness' ||
      c === 'outdoor' ||
      c === 'social' ||
      c === 'other'
    ) {
      set.add(c);
    }
  }
  if (set.size === 0) set.add('other');
  return set;
}

function hasExplicitEventSignal(intent: SearchIntent, cat: Set<Category>): boolean {
  if (intent.intentType === 'event') return true;
  if (cat.has('music')) return true;
  return intent.keywords.some((k) => EVENT_SIGNAL_KEYWORDS.has(String(k).toLowerCase()));
}

function hasExplicitPlaceSignal(intent: SearchIntent, cat: Set<Category>): boolean {
  if (intent.intentType === 'place') return true;
  if (cat.has('food') || cat.has('art') || cat.has('history') || cat.has('fitness') || cat.has('outdoor')) return true;
  // nightlife often maps to places (bars/clubs), but can still be mixed.
  if (cat.has('nightlife')) return true;
  return false;
}

function isAbstractMixedQuery(intent: SearchIntent, cat: Set<Category>): boolean {
  const q = intent.rawQuery.toLowerCase();
  return (
    cat.has('social') ||
    cat.has('nightlife') ||
    /\b(things to do|something to do|activities|activity)\b/.test(q)
  );
}

function isMajorCityHint(intent: SearchIntent): boolean {
  if (intent.locationHint.type !== 'city') return false;
  const v = (intent.locationHint.value || '').toLowerCase();
  // Keep list small and deterministic.
  return (
    v === 'san francisco' ||
    v === 'new york' ||
    v === 'los angeles' ||
    v === 'chicago' ||
    v === 'miami' ||
    v === 'austin' ||
    v === 'seattle' ||
    v === 'boston'
  );
}

function choosePlacesRadius(cat: Set<Category>, confidence: number): number {
  // Tighten radius for dense intent categories and low-confidence queries.
  if (cat.has('nightlife')) return NIGHTLIFE_RADIUS_M;
  if (cat.has('social')) return SOCIAL_RADIUS_M;
  if (confidence < 0.4) return 4000;
  return DEFAULT_PLACES_RADIUS_M;
}

function chooseEventsRadius(intent: SearchIntent, confidence: number): number {
  if (isMajorCityHint(intent)) return MAJOR_CITY_EVENTS_RADIUS_MI;
  if (confidence < 0.4) return 15;
  return DEFAULT_EVENTS_RADIUS_MI;
}

function computeDateRange(intent: SearchIntent, now: Date): ProviderPlan['eventsQuery'] extends { dateRange?: infer R } ? R : never {
  const label = intent.timeContext?.label;
  if (!label) return undefined as any;

  // Deterministic time windows:
  // - today: now → end of local day
  // - tonight: max(now, 5pm local) → end of local day (simple, predictable)
  // - weekend: upcoming Sat 00:00 → Sun 23:59:59
  // - specific (dayOfWeek): next occurrence 00:00 → 23:59:59
  // - now: now → now+6h
  const start = new Date(now.getTime());

  const endOfDayLocal = (d: Date): Date => {
    const x = new Date(d.getTime());
    x.setHours(23, 59, 59, 999);
    return x;
  };

  const startOfDayLocal = (d: Date): Date => {
    const x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const nextDow = (targetDow: number): Date => {
    const d = startOfDayLocal(now);
    const current = d.getDay(); // 0=Sun..6=Sat
    const delta = (targetDow - current + 7) % 7;
    // If it's today and the query says "specific", we consider *today* acceptable.
    d.setDate(d.getDate() + delta);
    return d;
  };

  if (label === 'now') {
    const sixHours = 6 * 60 * 60 * 1000;
    return { start: start.toISOString(), end: new Date(now.getTime() + sixHours).toISOString() };
  }

  if (label === 'today') {
    return { start: start.toISOString(), end: endOfDayLocal(now).toISOString() };
  }

  if (label === 'tonight') {
    const tonightStart = new Date(now.getTime());
    tonightStart.setHours(17, 0, 0, 0); // 5pm local
    const effectiveStart = now > tonightStart ? now : tonightStart;
    return { start: effectiveStart.toISOString(), end: endOfDayLocal(now).toISOString() };
  }

  if (label === 'weekend') {
    // Upcoming Saturday and Sunday in local time.
    const saturday = nextDow(6);
    const sunday = nextDow(0);
    // Ensure sunday is >= saturday; if today is Sunday, saturday would be next Saturday and sunday today -> adjust.
    if (sunday < saturday) {
      sunday.setDate(sunday.getDate() + 7);
    }
    return { start: startOfDayLocal(saturday).toISOString(), end: endOfDayLocal(sunday).toISOString() };
  }

  if (label === 'specific' && intent.timeContext?.dayOfWeek) {
    const dow = intent.timeContext.dayOfWeek.toLowerCase();
    const map: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const target = map[dow];
    if (typeof target === 'number') {
      const day = nextDow(target);
      return { start: startOfDayLocal(day).toISOString(), end: endOfDayLocal(day).toISOString() };
    }
  }

  // If label was present but we couldn't compute (should be rare), omit dateRange rather than fabricate.
  return undefined as any;
}

function choosePlacesMax(confidence: number): number {
  if (confidence < 0.4) return 20;
  if (confidence >= 0.75) return PLACE_MAX;
  return 30;
}

function chooseEventsMax(confidence: number): number {
  if (confidence < 0.4) return 25;
  if (confidence >= 0.75) return EVENT_MAX;
  return 40;
}

function choosePlacesTypes(cat: Set<Category>): string[] | undefined {
  // Prefer the highest-signal category mapping; keep arrays short.
  const priority: Category[] = ['food', 'nightlife', 'art', 'history', 'fitness', 'outdoor', 'social', 'other', 'music'];
  for (const c of priority) {
    if (!cat.has(c)) continue;
    const types = CATEGORY_TO_PLACES_TYPES[c];
    if (types && types.length > 0) return types.slice(0, 3);
  }
  return undefined;
}

/**
 * Build a deterministic, cost-aware plan for which providers to call and how.
 *
 * Never returns an empty plan: at least one provider is always selected.
 */
export function buildProviderPlan(intent: SearchIntent): ProviderPlan {
  const reasoning: string[] = [];

  try {
    const cat = toCategorySet(intent.categories || []);

    const timePresent = Boolean(intent.timeContext?.label);
    const eventSignal = hasExplicitEventSignal(intent, cat);
    const placeSignal = hasExplicitPlaceSignal(intent, cat);
    const mixedAbstract = isAbstractMixedQuery(intent, cat);

    // Provider selection (minimize calls):
    // - If confidence high, prefer a single provider unless the query is clearly mixed.
    // - If timeContext is present, events become eligible, but we still avoid calling both unless mixed.
    // - If confidence low (<0.4), prefer places unless event language is clear.
    let callPlaces = false;
    let callEvents = false;

    // Non-negotiable time awareness rule:
    // If timeContext is present, we enable events querying (but we still avoid calling places unless justified).
    if (timePresent) {
      callEvents = true;
      reasoning.push('Time context detected → enabling events query with deterministic dateRange.');
    }

    if (intent.confidence < 0.4) {
      if ((eventSignal || timePresent) && !placeSignal) {
        callEvents = true; // may already be true
        reasoning.push('Low confidence, but clear event signal present → events only.');
      } else {
        callPlaces = true;
        reasoning.push('Low confidence → defaulting to places unless event intent is clear.');
        if ((eventSignal || timePresent) && mixedAbstract) {
          // Still keep costs low: do not call both at low confidence.
          reasoning.push('Event signal present, but keeping single-provider routing to minimize cost.');
        }
      }
    } else if (intent.confidence >= 0.7) {
      if (intent.intentType === 'place' && !eventSignal) {
        callPlaces = true;
        reasoning.push(
          timePresent
            ? 'High confidence + place intent; time context still enabled → places + limited events.'
            : 'High confidence + place intent → places only.',
        );
      } else if (intent.intentType === 'event' && eventSignal) {
        callEvents = true;
        reasoning.push('High confidence + event intent → events only.');
      } else if (mixedAbstract || (placeSignal && eventSignal)) {
        callPlaces = true;
        callEvents = true; // may already be true due to timePresent
        reasoning.push('High confidence + mixed/abstract intent → calling both providers.');
      } else if (eventSignal) {
        callEvents = true;
        reasoning.push('High confidence + event signal → events only.');
      } else {
        callPlaces = true;
        reasoning.push(
          timePresent
            ? 'High confidence fallback; time context enabled → places + limited events.'
            : 'High confidence + no clear event signal → places only.',
        );
      }
    } else {
      // Medium confidence (0.4–0.7): allow both only when intent is truly mixed.
      if (intent.intentType === 'event' || ((eventSignal || timePresent) && !placeSignal)) {
        callEvents = true; // may already be true
        reasoning.push('Medium confidence + event-leaning signals → events only.');
      } else if (intent.intentType === 'place' || (placeSignal && !eventSignal)) {
        callPlaces = true;
        reasoning.push('Medium confidence + place-leaning signals → places only.');
      } else if (mixedAbstract || (placeSignal && eventSignal)) {
        callPlaces = true;
        callEvents = true; // may already be true due to timePresent
        reasoning.push('Medium confidence + mixed/abstract intent → calling both providers.');
      } else {
        callPlaces = true;
        reasoning.push('Medium confidence fallback → places only.');
      }
    }

    // Fail-safe: never return empty.
    if (!callPlaces && !callEvents) {
      callPlaces = true;
      reasoning.push('Fail-safe: no provider selected by heuristics → defaulting to places.');
    }

    // Query planning.
    const plan: ProviderPlan = {
      callPlaces,
      callEvents,
      reasoning,
    };

    if (callPlaces) {
      const radiusMeters = choosePlacesRadius(cat, intent.confidence);
      const maxResults = clampInt(choosePlacesMax(intent.confidence), 1, PLACE_MAX);
      const types = choosePlacesTypes(cat);

      plan.placesQuery = {
        radiusMeters,
        maxResults,
        ...(types ? { types } : {}),
      };

      reasoning.push(`Places: radius=${radiusMeters}m, maxResults=${maxResults}${types ? `, types=[${types.join(', ')}]` : ''}.`);
    }

    if (callEvents) {
      // If events are enabled *only* because time context exists (no explicit event language),
      // keep the events query extra conservative to minimize cost.
      const eventsWeak =
        callEvents &&
        timePresent &&
        intent.intentType !== 'event' &&
        !eventSignal &&
        !cat.has('music');

      const baseRadiusMiles = clampInt(chooseEventsRadius(intent, intent.confidence), 1, 100);
      const baseMaxResults = clampInt(chooseEventsMax(intent.confidence), 1, EVENT_MAX);

      const radiusMiles = eventsWeak ? Math.min(baseRadiusMiles, 15) : baseRadiusMiles;
      const maxResults = eventsWeak ? Math.min(baseMaxResults, 25) : baseMaxResults;

      // Time awareness: only populate dateRange if timeContext exists (never fabricate).
      const now = new Date();
      const dateRange = intent.timeContext?.label ? computeDateRange(intent, now) : undefined;

      plan.eventsQuery = {
        radiusMiles,
        maxResults,
        ...(dateRange ? { dateRange } : {}),
      };

      if (dateRange?.start || dateRange?.end) {
        reasoning.push(`Events: radius=${radiusMiles}mi, maxResults=${maxResults}, dateRange=${JSON.stringify(dateRange)}.`);
      } else {
        reasoning.push(`Events: radius=${radiusMiles}mi, maxResults=${maxResults} (no dateRange).`);
      }

      if (eventsWeak) {
        reasoning.push('Cost safeguard: time-based events query is conservative (no explicit event language).');
      }
    }

    // Additional guardrails explanation
    if (callPlaces && callEvents) {
      reasoning.push('Cost safeguard: capped results (places<=40, events<=50) and tightened radius for dense intents.');
    } else {
      reasoning.push('Cost safeguard: single-provider routing to reduce external API spend.');
    }

    return plan;
  } catch (e) {
    // Hard safety: never throw. Return a safe minimal plan.
    return {
      callPlaces: true,
      callEvents: false,
      placesQuery: {
        radiusMeters: DEFAULT_PLACES_RADIUS_M,
        maxResults: 20,
      },
      reasoning: [
        'Router error: returning safe fallback plan (places only).',
        `Error: ${e instanceof Error ? e.message : String(e)}`,
      ],
    };
  }
}

