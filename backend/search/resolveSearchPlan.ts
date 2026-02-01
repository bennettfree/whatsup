/**
 * Location + time resolution (deterministic, backend-ready).
 *
 * Converts human hints (near me / zip / city, and time windows like tonight/weekend)
 * into concrete parameters that are safe to pass into providers.
 *
 * No network calls: zip/city resolvers are explicit placeholders.
 * Time math is timezone-aware using Intl APIs (no external deps).
 *
 * Never throws. Always returns a valid ResolvedSearchPlan.
 */

import type { ProviderPlan, ResolvedSearchPlan, SearchIntent, UserContext } from './types';

type LatLng = { latitude: number; longitude: number };

/**
 * Placeholder for zip → lat/lng resolution.
 * Replace with an internal lookup table, database query, or in-memory cache.
 *
 * Deterministic requirement: this function must remain deterministic for the same input.
 */
export function resolveZipToLatLng(_zip: string): LatLng | null {
  return null;
}

/**
 * Placeholder for city → lat/lng resolution.
 * Replace with a curated in-memory list of supported cities or a deterministic lookup.
 *
 * Deterministic requirement: this function must remain deterministic for the same input.
 */
export function resolveCityToLatLng(_city: string): LatLng | null {
  return null;
}

const PLACE_MAX = 40;
const EVENT_MAX = 50;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function safeParseDate(iso: string): Date | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isFinite(d.getTime()) ? d : null;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get timezone-local calendar parts for a UTC instant.
 * Uses Intl.DateTimeFormat.formatToParts (available in Node).
 */
function getZonedParts(date: Date, timeZone: string): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  weekdayShort: string; // "Mon", "Tue", ...
} {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);

  const pick = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';

  const year = Number(pick('year'));
  const month = Number(pick('month'));
  const day = Number(pick('day'));
  const hour = Number(pick('hour'));
  const minute = Number(pick('minute'));
  const second = Number(pick('second'));
  const weekdayShort = pick('weekday');

  return {
    year: Number.isFinite(year) ? year : 1970,
    month: Number.isFinite(month) ? month : 1,
    day: Number.isFinite(day) ? day : 1,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    second: Number.isFinite(second) ? second : 0,
    weekdayShort: weekdayShort || 'Thu',
  };
}

/**
 * Compute timezone offset (ms) for a given UTC instant in a target IANA timezone.
 *
 * offsetMs = (local wall clock interpreted as UTC) - (actual UTC instant)
 *
 * This avoids parsing timezone abbreviations and handles DST.
 */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, 0);
  return asUTC - date.getTime();
}

/**
 * Convert a timezone-local wall-clock timestamp into a UTC Date.
 *
 * Deterministic conversion using iterative refinement to account for DST transitions.
 */
function zonedTimeToUtc(
  timeZone: string,
  components: {
    year: number;
    month: number; // 1-12
    day: number; // 1-31
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
  },
): Date {
  // Initial guess: interpret local components as UTC.
  const baseUtc = Date.UTC(
    components.year,
    components.month - 1,
    components.day,
    components.hour,
    components.minute,
    components.second,
    components.millisecond,
  );

  let utc = baseUtc;
  // Iterate a few times to stabilize offset (DST boundaries).
  for (let i = 0; i < 3; i++) {
    const offsetMs = getTimeZoneOffsetMs(new Date(utc), timeZone);
    utc = baseUtc - offsetMs;
  }
  return new Date(utc);
}

function weekdayIndexFromShort(weekdayShort: string): number {
  const w = weekdayShort.toLowerCase();
  // en-US short weekdays are typically: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  if (w.startsWith('sun')) return 0;
  if (w.startsWith('mon')) return 1;
  if (w.startsWith('tue')) return 2;
  if (w.startsWith('wed')) return 3;
  if (w.startsWith('thu')) return 4;
  if (w.startsWith('fri')) return 5;
  if (w.startsWith('sat')) return 6;
  return 0;
}

function weekdayIndexFromName(dayOfWeek: string): number | null {
  const d = dayOfWeek.toLowerCase();
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return typeof map[d] === 'number' ? map[d] : null;
}

function addDaysToYmdUTC(ymd: { year: number; month: number; day: number }, days: number): {
  year: number;
  month: number;
  day: number;
} {
  // Use UTC date arithmetic to avoid DST affecting the calendar math.
  const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days, 12, 0, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function computeEventsDateRange(intent: SearchIntent, context: UserContext, notes: string[]): { start?: string; end?: string } | undefined {
  const label = intent.timeContext?.label;
  if (!label) return undefined;

  const tz = context.timezone;
  if (!isValidTimeZone(tz)) {
    notes.push(`Invalid timezone "${tz}"; omitting dateRange.`);
    return undefined;
  }
  const now = safeParseDate(context.nowISO);
  if (!now) {
    notes.push('Invalid nowISO; cannot normalize time windows deterministically.');
    return undefined;
  }

  // Determine "today" in the provided timezone.
  const nowParts = getZonedParts(now, tz);
  const todayYmd = { year: nowParts.year, month: nowParts.month, day: nowParts.day };
  const nowInstantISO = now.toISOString();

  const endOfDay = (ymd: { year: number; month: number; day: number }): Date =>
    zonedTimeToUtc(tz, { ...ymd, hour: 23, minute: 59, second: 59, millisecond: 999 });

  const startOfDay = (ymd: { year: number; month: number; day: number }): Date =>
    zonedTimeToUtc(tz, { ...ymd, hour: 0, minute: 0, second: 0, millisecond: 0 });

  if (label === 'tonight') {
    // Rule: tonight → now → end of local day
    const end = endOfDay(todayYmd);
    notes.push('Time normalized: tonight → now → end of local day.');
    return { start: nowInstantISO, end: end.toISOString() };
  }

  if (label === 'now') {
    // Keep deterministic and conservative: now → now+6h
    const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    notes.push('Time normalized: now → +6h window.');
    return { start: nowInstantISO, end: end.toISOString() };
  }

  if (label === 'today') {
    // Rule: today → start of day → end of day
    const start = startOfDay(todayYmd);
    const end = endOfDay(todayYmd);
    notes.push('Time normalized: today → start of day → end of day (timezone-aware).');
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (label === 'weekend') {
    // Rule: this weekend → next Saturday 00:00 → Sunday 23:59 (timezone-aware)
    const dowNow = weekdayIndexFromShort(nowParts.weekdayShort);
    const daysToSaturday = (6 - dowNow + 7) % 7;
    const saturdayYmd = addDaysToYmdUTC(todayYmd, daysToSaturday);
    const sundayYmd = addDaysToYmdUTC(saturdayYmd, 1);
    const start = startOfDay(saturdayYmd);
    const end = endOfDay(sundayYmd);
    notes.push('Time normalized: weekend → next Saturday 00:00 → Sunday 23:59 (timezone-aware).');
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (label === 'specific') {
    const targetName = intent.timeContext?.dayOfWeek;
    const targetDow = targetName ? weekdayIndexFromName(targetName) : null;
    if (targetDow == null) {
      notes.push('TimeContext specific provided but dayOfWeek was missing/invalid; omitting dateRange.');
      return undefined;
    }

    const dowNow = weekdayIndexFromShort(nowParts.weekdayShort);
    const delta = (targetDow - dowNow + 7) % 7;
    const targetYmd = addDaysToYmdUTC(todayYmd, delta);

    // Special handling: "<day> night" window if query contains "night".
    const q = intent.rawQuery.toLowerCase();
    if (/\bnight\b/.test(q)) {
      const start = zonedTimeToUtc(tz, { ...targetYmd, hour: 18, minute: 0, second: 0, millisecond: 0 });
      const end = zonedTimeToUtc(tz, { ...targetYmd, hour: 23, minute: 59, second: 59, millisecond: 999 });
      notes.push(`Time normalized: ${targetName} night → 18:00 → 23:59 (timezone-aware).`);
      return { start: start.toISOString(), end: end.toISOString() };
    }

    const start = startOfDay(targetYmd);
    const end = endOfDay(targetYmd);
    notes.push(`Time normalized: specific day (${targetName}) → start of day → end of day (timezone-aware).`);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // Unknown label: do not fabricate.
  notes.push('Unrecognized timeContext label; omitting dateRange.');
  return undefined;
}

function resolveLatLng(intent: SearchIntent, context: UserContext, notes: string[]): LatLng | null {
  const hint = intent.locationHint;

  const current = context.currentLocation;
  const hasCurrent =
    current &&
    isFiniteNumber(current.latitude) &&
    isFiniteNumber(current.longitude);

  if (hint.type === 'near_me') {
    if (hasCurrent) {
      notes.push('Location resolved: near_me → using currentLocation.');
      return { latitude: current!.latitude, longitude: current!.longitude };
    }
    notes.push('Location resolution failed: near_me but currentLocation unavailable.');
    return null;
  }

  if (hint.type === 'zip') {
    const zip = (hint.value || '').trim();
    if (zip) {
      const resolved = resolveZipToLatLng(zip);
      if (resolved) {
        notes.push(`Location resolved: zip=${zip} → resolved lat/lng.`);
        return resolved;
      }
      notes.push(`Location resolution failed: zip=${zip} could not be resolved (stub returned null).`);
    } else {
      notes.push('Location hint type zip, but value missing.');
    }
  }

  if (hint.type === 'city') {
    const city = (hint.value || '').trim();
    if (city) {
      const resolved = resolveCityToLatLng(city);
      if (resolved) {
        notes.push(`Location resolved: city="${city}" → resolved lat/lng.`);
        return resolved;
      }
      notes.push(`Location resolution failed: city="${city}" could not be resolved (stub returned null).`);
    } else {
      notes.push('Location hint type city, but value missing.');
    }
  }

  // Fallback: default to current location when no usable hint exists.
  if (hasCurrent) {
    notes.push('Location resolved: fallback → using currentLocation.');
    return { latitude: current!.latitude, longitude: current!.longitude };
  }

  notes.push('Location resolution failed: no hint resolved and currentLocation unavailable.');
  return null;
}

/**
 * Resolve SearchIntent + ProviderPlan + UserContext into concrete provider parameters.
 *
 * - If location cannot be resolved, provider calls are safely aborted (params omitted).
 * - If no timeContext exists, no event date ranges are fabricated.
 * - Date math uses context.timezone + context.nowISO (timezone-aware).
 */
export function resolveSearchPlan(
  intent: SearchIntent,
  providerPlan: ProviderPlan,
  context: UserContext,
): ResolvedSearchPlan {
  const resolutionNotes: string[] = [];

  // Default return must always be valid; use 0/0 when location resolution fails.
  let latitude = 0;
  let longitude = 0;

  try {
    // Validate timezone early.
    if (!isValidTimeZone(context.timezone)) {
      resolutionNotes.push(`Invalid timezone "${context.timezone}". Time normalization will be skipped.`);
    }

    const latLng = resolveLatLng(intent, context, resolutionNotes);
    if (latLng) {
      latitude = latLng.latitude;
      longitude = latLng.longitude;
    } else {
      // Abort provider calls safely by returning undefined params.
      resolutionNotes.push('Provider calls aborted: could not resolve latitude/longitude.');
      return {
        latitude,
        longitude,
        placesParams: undefined,
        eventsParams: undefined,
        resolutionNotes,
      };
    }

    const resolved: ResolvedSearchPlan = {
      latitude,
      longitude,
      resolutionNotes,
    };

    if (providerPlan.callPlaces && providerPlan.placesQuery) {
      resolved.placesParams = {
        radiusMeters: clampInt(providerPlan.placesQuery.radiusMeters, 100, 50000),
        maxResults: clampInt(providerPlan.placesQuery.maxResults, 1, PLACE_MAX),
        ...(providerPlan.placesQuery.types?.length ? { types: providerPlan.placesQuery.types.slice(0, 5) } : {}),
      };
      resolutionNotes.push('Places params resolved from ProviderPlan (capped + validated).');
    } else if (providerPlan.callPlaces) {
      // Fail-safe: if router selected places but omitted details, apply safe defaults.
      resolved.placesParams = {
        radiusMeters: 5000,
        maxResults: 20,
      };
      resolutionNotes.push('Places params missing in ProviderPlan; applied safe defaults.');
    }

    if (providerPlan.callEvents && providerPlan.eventsQuery) {
      const dateRange = intent.timeContext?.label
        ? computeEventsDateRange(intent, context, resolutionNotes)
        : undefined;

      resolved.eventsParams = {
        radiusMiles: clampInt(providerPlan.eventsQuery.radiusMiles, 1, 100),
        maxResults: clampInt(providerPlan.eventsQuery.maxResults, 1, EVENT_MAX),
        ...(dateRange ? { dateRange } : {}),
      };
      resolutionNotes.push(
        dateRange ? 'Events params resolved with timezone-aware dateRange.' : 'Events params resolved (no dateRange).',
      );
    } else if (providerPlan.callEvents) {
      // Fail-safe: if router selected events but omitted details, apply safe defaults.
      const dateRange = intent.timeContext?.label
        ? computeEventsDateRange(intent, context, resolutionNotes)
        : undefined;
      resolved.eventsParams = {
        radiusMiles: 25,
        maxResults: 25,
        ...(dateRange ? { dateRange } : {}),
      };
      resolutionNotes.push('Events params missing in ProviderPlan; applied safe defaults.');
    }

    return resolved;
  } catch (e) {
    resolutionNotes.push('Resolver error: returning safe empty params.');
    resolutionNotes.push(`Error: ${e instanceof Error ? e.message : String(e)}`);
    return {
      latitude,
      longitude,
      placesParams: undefined,
      eventsParams: undefined,
      resolutionNotes,
    };
  }
}

