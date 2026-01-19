/**
 * Optional UX helpers (Prompt 7).
 * Pure deterministic helpers for generating query chips and helper copy.
 * No API calls, no side effects.
 */

import type { ResolvedSearchPlan, SearchIntent } from './types';

export type UXFeedback = {
  chips: string[];
  helperText: string;
  emptyStateGuidance: string;
};

function uniq(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
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

function titleCase(s: string): string {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function buildUXFeedback(intent: SearchIntent, resolved: ResolvedSearchPlan): UXFeedback {
  const chips: string[] = [];

  if (intent.locationHint.type === 'near_me') chips.push('Near Me');
  if (intent.locationHint.type === 'city' && intent.locationHint.value) chips.push(titleCase(intent.locationHint.value));
  if (intent.locationHint.type === 'zip' && intent.locationHint.value) chips.push(intent.locationHint.value);

  const t = intent.timeContext?.label;
  if (t === 'tonight') chips.push('Tonight');
  else if (t === 'today') chips.push('Today');
  else if (t === 'weekend') chips.push('This Weekend');
  else if (t === 'now') chips.push('Now');
  else if (t === 'specific' && intent.timeContext?.dayOfWeek) chips.push(titleCase(intent.timeContext.dayOfWeek));

  // Category chips (small, controlled)
  const catPriority = ['food', 'nightlife', 'music', 'art', 'history', 'fitness', 'outdoor', 'social'];
  for (const c of catPriority) {
    if ((intent.categories || []).map((x) => String(x).toLowerCase()).includes(c)) {
      chips.push(titleCase(c));
    }
  }

  // Keyword chips (top 2)
  for (const k of (intent.keywords || []).slice(0, 2)) {
    const s = String(k).trim();
    if (s) chips.push(titleCase(s));
  }

  // Helper copy (subtle, factual)
  const vibe = (intent.vibe || [])[0];
  const vibePhrase = vibe ? `${vibe.toLowerCase()} ` : '';
  const timePhrase =
    t === 'tonight' ? 'tonight' : t === 'today' ? 'today' : t === 'weekend' ? 'this weekend' : '';
  const locPhrase =
    intent.locationHint.type === 'near_me'
      ? 'near you'
      : intent.locationHint.type === 'city' && intent.locationHint.value
        ? `in ${intent.locationHint.value}`
        : '';

  const helperText = `Showing ${vibePhrase}spots ${locPhrase}${timePhrase ? ` ${timePhrase}` : ''}`.replace(/\s+/g, ' ').trim();

  const emptyStateGuidance = 'Try searching for food, nightlife, or events.';

  return {
    chips: uniq(chips).slice(0, 8),
    helperText,
    emptyStateGuidance,
  };
}

