/**
 * Deterministic provider routing & query planning (backend).
 *
 * Pure function. No network calls. No AI.
 */

import type { ProviderPlan, SearchIntent } from './types';

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

const NIGHTLIFE_RADIUS_M = 2500;
const SOCIAL_RADIUS_M = 3000;

const MAJOR_CITY_EVENTS_RADIUS_MI = 35;

// Controlled mapping to keep Google Places calls bounded.
const CATEGORY_TO_PLACES_TYPES: Record<Category, string[] | undefined> = {
  food: ['restaurant', 'cafe'],
  nightlife: ['bar', 'night_club'],
  music: undefined, // usually events
  art: ['museum', 'art_gallery'],
  history: ['museum', 'tourist_attraction'],
  fitness: ['gym'],
  outdoor: ['park', 'tourist_attraction'],
  social: undefined, // too broad
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
  return (intent.keywords || []).some((k) => EVENT_SIGNAL_KEYWORDS.has(String(k).toLowerCase()));
}

function hasExplicitPlaceSignal(intent: SearchIntent, cat: Set<Category>): boolean {
  if (intent.intentType === 'place') return true;
  if (cat.has('food') || cat.has('art') || cat.has('history') || cat.has('fitness') || cat.has('outdoor')) return true;
  if (cat.has('nightlife')) return true;
  return false;
}

function isAbstractMixedQuery(intent: SearchIntent, cat: Set<Category>): boolean {
  const q = (intent.rawQuery || '').toLowerCase();
  return (
    cat.has('social') ||
    cat.has('nightlife') ||
    /\b(things to do|something to do|activities|activity)\b/.test(q)
  );
}

function isMajorCityHint(intent: SearchIntent): boolean {
  if (intent.locationHint.type !== 'city') return false;
  const v = (intent.locationHint.value || '').toLowerCase();
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
  const priority: Category[] = ['food', 'nightlife', 'art', 'history', 'fitness', 'outdoor', 'social', 'other', 'music'];
  for (const c of priority) {
    if (!cat.has(c)) continue;
    const types = CATEGORY_TO_PLACES_TYPES[c];
    if (types && types.length > 0) return types.slice(0, 3);
  }
  return undefined;
}

export function buildProviderPlan(intent: SearchIntent): ProviderPlan {
  const reasoning: string[] = [];

  try {
    const rawTrimmed = (intent.rawQuery || '').trim();
    const cat = toCategorySet(intent.categories || []);
    const timePresent = Boolean(intent.timeContext?.label);

    const eventSignal = hasExplicitEventSignal(intent, cat);
    const placeSignal = hasExplicitPlaceSignal(intent, cat);
    const mixedAbstract = isAbstractMixedQuery(intent, cat);

    let callPlaces = false;
    let callEvents = false;

    // Browse-mode safeguard: empty query should return a useful mixed set, but conservatively.
    if (!rawTrimmed) {
      callPlaces = true;
      callEvents = true;
      reasoning.push('Empty query → browse mode: calling both providers conservatively.');
    }

    // Time awareness: if timeContext exists, events become eligible.
    if (timePresent) {
      callEvents = true;
      reasoning.push('Time context detected → enabling events query.');
    }

    // Provider selection rules (cost-aware).
    if (!rawTrimmed) {
      // Keep existing selection from browse mode, no further overrides.
    } else if (intent.confidence < 0.4) {
      if ((eventSignal || timePresent) && !placeSignal) {
        callEvents = true;
        reasoning.push('Low confidence but clear event signal → events only.');
      } else {
        callPlaces = true;
        reasoning.push('Low confidence → defaulting to places unless event intent is clear.');
      }
    } else if (intent.confidence >= 0.7) {
      if (intent.intentType === 'place' && !eventSignal) {
        callPlaces = true;
        reasoning.push(timePresent ? 'High confidence place intent; time present → places + limited events.' : 'High confidence place intent → places only.');
      } else if (intent.intentType === 'event' && eventSignal) {
        callEvents = true;
        reasoning.push('High confidence event intent → events only.');
      } else if (mixedAbstract || (placeSignal && eventSignal)) {
        callPlaces = true;
        callEvents = true;
        reasoning.push('High confidence mixed/abstract intent → calling both providers.');
      } else if (eventSignal) {
        callEvents = true;
        reasoning.push('High confidence + event signal → events only.');
      } else {
        callPlaces = true;
        reasoning.push(timePresent ? 'High confidence fallback; time present → places + limited events.' : 'High confidence fallback → places only.');
      }
    } else {
      if (intent.intentType === 'event' || ((eventSignal || timePresent) && !placeSignal)) {
        callEvents = true;
        reasoning.push('Medium confidence event-leaning signals → events only.');
      } else if (intent.intentType === 'place' || (placeSignal && !eventSignal)) {
        callPlaces = true;
        reasoning.push('Medium confidence place-leaning signals → places only.');
      } else if (mixedAbstract || (placeSignal && eventSignal)) {
        callPlaces = true;
        callEvents = true;
        reasoning.push('Medium confidence mixed/abstract intent → calling both providers.');
      } else {
        callPlaces = true;
        reasoning.push('Medium confidence fallback → places only.');
      }
    }

    if (!callPlaces && !callEvents) {
      callPlaces = true;
      reasoning.push('Fail-safe: no provider selected → defaulting to places.');
    }

    const plan: ProviderPlan = { callPlaces, callEvents, reasoning };

    if (callPlaces) {
      const radiusMeters = !rawTrimmed ? Math.min(choosePlacesRadius(cat, intent.confidence), 3000) : choosePlacesRadius(cat, intent.confidence);
      const maxResults = clampInt(!rawTrimmed ? 25 : choosePlacesMax(intent.confidence), 1, PLACE_MAX);
      const types = choosePlacesTypes(cat);
      plan.placesQuery = {
        radiusMeters,
        maxResults,
        ...(types ? { types } : {}),
      };
      reasoning.push(`Places query: radius=${radiusMeters}m, maxResults=${maxResults}${types ? `, types=[${types.join(', ')}]` : ''}.`);
    }

    if (callEvents) {
      const baseRadiusMiles = clampInt(chooseEventsRadius(intent, intent.confidence), 1, 100);
      const baseMax = clampInt(chooseEventsMax(intent.confidence), 1, EVENT_MAX);

      // If events are enabled only due to time context (no explicit event language), keep extra conservative.
      const eventsWeak = timePresent && intent.intentType !== 'event' && !eventSignal && !cat.has('music');
      const radiusMiles = !rawTrimmed ? 15 : (eventsWeak ? Math.min(baseRadiusMiles, 15) : baseRadiusMiles);
      const maxResults = !rawTrimmed ? 25 : (eventsWeak ? Math.min(baseMax, 25) : baseMax);

      plan.eventsQuery = { radiusMiles, maxResults };
      reasoning.push(`Events query: radius=${radiusMiles}mi, maxResults=${maxResults}${eventsWeak ? ' (conservative time-only enable)' : ''}.`);
    }

    return plan;
  } catch (e) {
    return {
      callPlaces: true,
      callEvents: false,
      placesQuery: { radiusMeters: DEFAULT_PLACES_RADIUS_M, maxResults: 20 },
      reasoning: ['Router error: returned safe fallback (places only).', `Error: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

