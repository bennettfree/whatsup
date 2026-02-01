/**
 * Optional semantic refinement stage (Prompt 4).
 *
 * By default this is DISABLED to prevent OpenAI abuse and preserve determinism.
 * If you later enable it, keep temperature=0 and aggressively cache/limit usage.
 */

import type { ResolvedSearchPlan, SearchIntent, SemanticRefinement, UserContext } from './types';

export type RefinementDecision = {
  allowed: boolean;
  reason: string;
};

function decideRefinement(intent: SearchIntent): RefinementDecision {
  // Explicit allow gate (environment-controlled). Keeps costs predictable.
  const enabled = process.env.ALLOW_OPENAI_REFINEMENT === 'true';
  if (!enabled) return { allowed: false, reason: 'OpenAI refinement disabled (ALLOW_OPENAI_REFINEMENT !== "true").' };

  // Additional deterministic safeguards
  if (intent.confidence < 0.85) return { allowed: false, reason: 'Intent confidence < 0.85; skipping OpenAI refinement.' };
  const q = (intent.rawQuery || '').trim();
  if (q.length < 4) return { allowed: false, reason: 'Query too short; skipping OpenAI refinement.' };

  return { allowed: true, reason: 'Refinement allowed by policy.' };
}

/**
 * Deterministic-by-default: returns null unless explicitly enabled.
 * No network calls in current implementation.
 */
export async function maybeRefineSemantics(
  intent: SearchIntent,
  _resolvedPlan: ResolvedSearchPlan,
  _context: UserContext,
): Promise<{ semantic: SemanticRefinement | null; notes: string[] }> {
  const notes: string[] = [];
  const decision = decideRefinement(intent);
  notes.push(decision.reason);

  if (!decision.allowed) return { semantic: null, notes };

  // Placeholder: implement actual OpenAI call here if you choose to enable it.
  // Must be cached + rate-limited and use temperature=0 to reduce variance.
  notes.push('OpenAI refinement is enabled by policy, but not implemented (stub returning null).');
  return { semantic: null, notes };
}

