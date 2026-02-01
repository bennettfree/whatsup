/**
 * Simple in-memory TTL cache + in-flight de-duplication for provider calls.
 *
 * Deterministic keys: based on rounded lat/lng, radius buckets, provider, date window, and filters.
 *
 * Note: This is process-local. In production with multiple instances, replace with
 * Redis/memcached while preserving the same keying and TTL semantics.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number; // epoch ms
};

export class TTLCache<T> {
  private map = new Map<string, CacheEntry<T>>();

  get(key: string, nowMs: number): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= nowMs) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, nowMs: number): void {
    const expiresAt = nowMs + Math.max(1, ttlMs);
    this.map.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  // Best-effort cleanup (optional).
  sweep(nowMs: number): void {
    for (const [k, v] of this.map.entries()) {
      if (v.expiresAt <= nowMs) this.map.delete(k);
    }
  }
}

export class InFlightDeduper<T> {
  private map = new Map<string, Promise<T>>();

  get(key: string): Promise<T> | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, promise: Promise<T>): void {
    this.map.set(key, promise);
    // Ensure cleanup even on rejection.
    promise.finally(() => {
      if (this.map.get(key) === promise) this.map.delete(key);
    });
  }
}

export function roundCoord(value: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(value * p) / p;
}

export function bucket(value: number, step: number): number {
  if (!Number.isFinite(value) || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function stableArrayKey(values: string[] | undefined): string {
  if (!values || values.length === 0) return '';
  // Sort for stable keying.
  return values.map((v) => String(v).trim().toLowerCase()).filter(Boolean).sort().join(',');
}

