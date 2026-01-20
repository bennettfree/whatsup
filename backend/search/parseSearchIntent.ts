/**
 * Deterministic intent parsing (backend).
 *
 * Rule-based only; no AI, no network calls.
 * Pure function, safe, and never throws.
 */

import type { SearchIntent } from './types';

type QueryType = SearchIntent['intentType'];

type NormalizedCategory =
  | 'food'
  | 'nightlife'
  | 'music'
  | 'art'
  | 'history'
  | 'fitness'
  | 'outdoor'
  | 'social'
  | 'other';

const STOPWORDS = new Set<string>([
  'a',
  'an',
  'and',
  'are',
  'at',
  'be',
  'by',
  'do',
  'for',
  'from',
  'going',
  'happening',
  'here',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'near',
  'of',
  'on',
  'or',
  'places',
  'please',
  'show',
  'some',
  'stuff',
  'that',
  'the',
  'this',
  'things',
  'to',
  'up',
  'what',
  'with',
  'you',
  'your',
]);

const DAYS_OF_WEEK: Array<{ key: string; aliases: string[] }> = [
  { key: 'monday', aliases: ['monday', 'mon'] },
  { key: 'tuesday', aliases: ['tuesday', 'tue', 'tues'] },
  { key: 'wednesday', aliases: ['wednesday', 'wed'] },
  { key: 'thursday', aliases: ['thursday', 'thu', 'thurs'] },
  { key: 'friday', aliases: ['friday', 'fri'] },
  { key: 'saturday', aliases: ['saturday', 'sat'] },
  { key: 'sunday', aliases: ['sunday', 'sun'] },
];

const VIBE_TERMS: Record<string, string[]> = {
  lively: ['lively', 'energetic', 'upbeat', 'buzzing'],
  relaxing: ['relaxing', 'relaxed', 'calm', 'peaceful', 'chill', 'laid-back'],
  creative: ['creative', 'artsy', 'hands-on', 'maker'],
  social: ['social', 'friendly', 'meet', 'meetup', 'networking'],
  fun: ['fun', 'exciting', 'awesome'],
  romantic: ['romantic', 'date', 'date-night', 'cozy'],
  family: ['family', 'kid-friendly', 'family-friendly'],
  adventurous: ['adventurous', 'adventure'],
  quiet: ['quiet', 'lowkey', 'low-key'],
};

const PLACE_KEYWORDS: Record<string, string[]> = {
  pizza: ['pizza', 'pizzeria'],
  sushi: ['sushi'],
  burgers: ['burger', 'burgers'],
  restaurant: ['restaurant', 'restaurants', 'dinner', 'lunch', 'brunch', 'breakfast', 'food', 'eat'],
  cafe: ['cafe', 'cafes', 'coffee', 'coffee shop', 'coffee shops'],
  dessert: ['ice cream', 'dessert', 'bakery', 'boba'],
  bars: ['bar', 'bars', 'pub', 'pubs', 'brewery', 'breweries', 'cocktails'],
  club: ['club', 'clubs', 'nightlife', 'dance'],
  museum: ['museum', 'museums', 'gallery', 'galleries'],
  exhibits: ['exhibit', 'exhibits', 'exhibition', 'exhibitions'],
  park: ['park', 'parks', 'trail', 'trails', 'hike', 'hiking', 'beach', 'outdoors', 'outdoor'],
  gym: ['gym', 'gyms', 'fitness', 'workout', 'yoga', 'pilates'],
};

const EVENT_KEYWORDS: Record<string, string[]> = {
  concerts: ['concert', 'concerts', 'live music', 'gig', 'gigs'],
  shows: ['show', 'shows', 'performance', 'performances'],
  festivals: ['festival', 'festivals', 'fair', 'fairs'],
  sports: ['game', 'games', 'match', 'matches', 'sports'],
  comedy: ['comedy', 'standup', 'stand-up'],
  theater: ['theater', 'theatre', 'play', 'plays', 'musical', 'musicals'],
  events: ['event', 'events', 'happening', 'going on', "what's on"],
};

const CITY_ALIASES: Array<{ normalized: string; variants: string[] }> = [
  { normalized: 'san francisco', variants: ['san francisco', 'sf', 's.f.', 'bay area'] },
  { normalized: 'new york', variants: ['new york', 'nyc', 'new york city'] },
  { normalized: 'los angeles', variants: ['los angeles', 'la', 'l.a.'] },
  { normalized: 'chicago', variants: ['chicago'] },
  { normalized: 'miami', variants: ['miami'] },
  { normalized: 'austin', variants: ['austin'] },
  { normalized: 'seattle', variants: ['seattle'] },
  { normalized: 'boston', variants: ['boston'] },
];

const NEAR_ME_PATTERNS: RegExp[] = [
  /\bnear me\b/i,
  /\bnearby\b/i,
  /\baround here\b/i,
  /\bclose to me\b/i,
  /\bin my area\b/i,
];

const ZIP_PATTERN = /\b\d{5}\b/;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-z0-9\s'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqPreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

function extractMatches(normalizedQuery: string, dictionary: Record<string, string[]>): string[] {
  const matches: string[] = [];
  for (const [canonical, variants] of Object.entries(dictionary)) {
    for (const variant of variants) {
      const v = variant.toLowerCase().trim();
      if (!v) continue;
      const isPhrase = v.includes(' ');
      const pattern = isPhrase
        ? new RegExp(`(^|\\s)${escapeRegExp(v)}(\\s|$)`, 'i')
        : new RegExp(`\\b${escapeRegExp(v)}\\b`, 'i');
      if (pattern.test(normalizedQuery)) {
        matches.push(canonical);
        break;
      }
    }
  }
  return uniqPreserveOrder(matches);
}

function detectDayOfWeek(normalizedQuery: string): string | undefined {
  for (const day of DAYS_OF_WEEK) {
    for (const alias of day.aliases) {
      const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');
      if (pattern.test(normalizedQuery)) return day.key;
    }
  }
  return undefined;
}

function parseTimeContext(normalizedQuery: string): SearchIntent['timeContext'] {
  const dayOfWeek = detectDayOfWeek(normalizedQuery);
  if (dayOfWeek) return { label: 'specific', dayOfWeek };

  if (/\b(right now|now)\b/i.test(normalizedQuery)) return { label: 'now' };
  if (/\btonight\b/i.test(normalizedQuery)) return { label: 'tonight' };
  if (/\btoday\b/i.test(normalizedQuery)) return { label: 'today' };
  if (/\b(this weekend|weekend)\b/i.test(normalizedQuery)) return { label: 'weekend' };

  return {};
}

function looksLikeNonLocation(phrase: string): boolean {
  const q = ` ${phrase.toLowerCase()} `;
  const placeHit = Object.values(PLACE_KEYWORDS).some((variants) =>
    variants.some((v) => new RegExp(`(^|\\s)${escapeRegExp(v)}(\\s|$)`, 'i').test(q)),
  );
  const eventHit = Object.values(EVENT_KEYWORDS).some((variants) =>
    variants.some((v) => new RegExp(`(^|\\s)${escapeRegExp(v)}(\\s|$)`, 'i').test(q)),
  );
  return placeHit || eventHit;
}

function parseLocationHint(normalizedQuery: string): SearchIntent['locationHint'] {
  const zipMatch = normalizedQuery.match(ZIP_PATTERN);
  if (zipMatch?.[0]) return { type: 'zip', value: zipMatch[0] };

  if (NEAR_ME_PATTERNS.some((re) => re.test(normalizedQuery))) return { type: 'near_me', value: 'near me' };

  for (const city of CITY_ALIASES) {
    for (const v of city.variants) {
      const pattern = new RegExp(`\\b${escapeRegExp(v.toLowerCase())}\\b`, 'i');
      if (pattern.test(normalizedQuery)) return { type: 'city', value: city.normalized };
    }
  }

  const inMatch = normalizedQuery.match(/\b(?:in|at)\s+([a-z][a-z\s\-]{1,40})$/i);
  if (inMatch?.[1]) {
    const candidate = inMatch[1].trim();
    if (candidate && candidate.length >= 2 && !looksLikeNonLocation(candidate)) {
      return { type: 'city', value: candidate };
    }
  }

  return { type: 'unknown' };
}

function inferCategories(params: {
  placeKeywords: string[];
  eventKeywords: string[];
  vibes: string[];
  normalizedQuery: string;
}): NormalizedCategory[] {
  const { placeKeywords, eventKeywords, vibes, normalizedQuery } = params;
  const cats = new Set<NormalizedCategory>();

  if (placeKeywords.some((k) => ['pizza', 'sushi', 'burgers', 'restaurant', 'cafe', 'dessert'].includes(k))) cats.add('food');
  if (placeKeywords.some((k) => ['bars', 'club'].includes(k))) cats.add('nightlife');
  if (eventKeywords.some((k) => ['concerts', 'shows', 'festivals'].includes(k))) cats.add('music');

  if (placeKeywords.some((k) => ['museum', 'exhibits'].includes(k))) cats.add('art');
  if (/\bhistory\b|\bhistorical\b/i.test(normalizedQuery) || placeKeywords.includes('exhibits')) cats.add('history');

  if (placeKeywords.includes('park')) cats.add('outdoor');
  if (placeKeywords.includes('gym')) cats.add('fitness');
  if (eventKeywords.includes('sports')) cats.add('fitness');
  if (vibes.includes('social')) cats.add('social');

  if (/\bnight\s*life\b|\bnightlife\b/i.test(normalizedQuery)) cats.add('nightlife');

  if (cats.size === 0) cats.add('other');
  return Array.from(cats);
}

function determineIntentType(placeHits: number, eventHits: number, normalizedQuery: string): QueryType {
  const abstractMixedSignal = /\b(things to do|something to do|activities|activity|social|fun)\b/i.test(normalizedQuery);
  if (placeHits > 0 && eventHits > 0) return 'both';
  if (placeHits > 0 && eventHits === 0) return 'place';
  if (eventHits > 0 && placeHits === 0) return 'event';
  return abstractMixedSignal ? 'both' : 'both';
}

function tokenize(normalizedQuery: string): string[] {
  return normalizedQuery.split(' ').map((t) => t.trim()).filter(Boolean);
}

function fallbackKeywords(params: {
  tokens: string[];
  vibes: string[];
  time: SearchIntent['timeContext'];
  location: SearchIntent['locationHint'];
  alreadyFound: string[];
}): string[] {
  const { tokens, vibes, time, location, alreadyFound } = params;
  if (alreadyFound.length > 0) return alreadyFound;

  const banned = new Set<string>([
    ...Array.from(STOPWORDS),
    ...vibes,
    ...(time.dayOfWeek ? [time.dayOfWeek] : []),
  ]);
  if (time.label) banned.add(time.label);
  if (location.type === 'near_me') {
    banned.add('near');
    banned.add('me');
    banned.add('nearby');
  }
  if (location.type === 'zip' && location.value) banned.add(location.value);

  const candidates = tokens
    .filter((t) => /^[a-z0-9][a-z0-9'\-]*$/.test(t))
    .filter((t) => t.length >= 3)
    .filter((t) => !banned.has(t));

  return uniqPreserveOrder(candidates).slice(0, 4);
}

function scoreConfidence(params: {
  normalizedQuery: string;
  keywords: string[];
  vibes: string[];
  intentType: QueryType;
  time: SearchIntent['timeContext'];
  location: SearchIntent['locationHint'];
  categories: NormalizedCategory[];
}): number {
  const { normalizedQuery, keywords, vibes, intentType, time, location, categories } = params;

  let score = 0.2;
  if (keywords.length > 0) score += 0.25;
  if (intentType !== 'both') score += 0.15;
  if (time.label) score += 0.15;
  if (location.type !== 'unknown') score += 0.15;
  if (vibes.length > 0) score += 0.08;
  if (categories.some((c) => c !== 'other')) score += 0.07;

  const tokenCount = tokenize(normalizedQuery).length;
  if (tokenCount <= 1) score -= 0.25;
  else if (tokenCount <= 2) score -= 0.1;

  const abstractOnly =
    keywords.length === 0 &&
    (/\b(things to do|something to do|activities|activity)\b/i.test(normalizedQuery) || vibes.length > 0);
  if (abstractOnly) score -= 0.08;

  return clamp01(score);
}

export function parseSearchIntent(query: string): SearchIntent {
  try {
    const rawQuery = typeof query === 'string' ? query : '';
    const normalizedQuery = normalizeQuery(rawQuery);

    if (!normalizedQuery) {
      return {
        rawQuery,
        intentType: 'both',
        keywords: [],
        vibe: [],
        categories: ['other'],
        timeContext: {},
        locationHint: { type: 'unknown' },
        confidence: 0,
      };
    }

    const timeContext = parseTimeContext(normalizedQuery);
    const locationHint = parseLocationHint(normalizedQuery);

    const vibes = extractMatches(normalizedQuery, VIBE_TERMS);
    const placeKeywords = extractMatches(normalizedQuery, PLACE_KEYWORDS);
    const eventKeywords = extractMatches(normalizedQuery, EVENT_KEYWORDS);

    const intentType = determineIntentType(placeKeywords.length, eventKeywords.length, normalizedQuery);
    const primaryKeywords = uniqPreserveOrder([...placeKeywords, ...eventKeywords]);
    const tokens = tokenize(normalizedQuery);
    const keywords = fallbackKeywords({
      tokens,
      vibes,
      time: timeContext,
      location: locationHint,
      alreadyFound: primaryKeywords,
    });

    const categories = inferCategories({ placeKeywords, eventKeywords, vibes, normalizedQuery });
    const confidence = scoreConfidence({ normalizedQuery, keywords, vibes, intentType, time: timeContext, location: locationHint, categories });

    return {
      rawQuery,
      intentType,
      keywords,
      vibe: vibes,
      categories,
      timeContext,
      locationHint,
      confidence,
    };
  } catch {
    return {
      rawQuery: typeof query === 'string' ? query : '',
      intentType: 'both',
      keywords: [],
      vibe: [],
      categories: ['other'],
      timeContext: {},
      locationHint: { type: 'unknown' },
      confidence: 0,
    };
  }
}

