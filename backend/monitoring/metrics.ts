/**
 * Search Metrics & Monitoring
 * 
 * Tracks search performance, cache hit rates, provider health, and query patterns.
 */

export interface SearchMetrics {
  totalSearches: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  cacheHitRate: number;
  providerErrors: Record<string, number>;
  topQueries: Array<{ query: string; count: number }>;
  intentDistribution: Record<string, number>;
}

interface SearchRecord {
  requestId: string;
  query: string;
  latency: number;
  cacheHit: boolean;
  intentType: string;
  resultCount: number;
  timestamp: Date;
  error?: string;
}

export class MetricsCollector {
  private searches: SearchRecord[] = [];
  private queryFrequency = new Map<string, number>();
  private providerErrors = new Map<string, number>();
  private maxRecords = 10000; // Keep last 10k searches
  
  /**
   * Record a search execution
   */
  recordSearch(record: Omit<SearchRecord, 'timestamp'>): void {
    const fullRecord: SearchRecord = {
      ...record,
      timestamp: new Date(),
    };
    
    this.searches.push(fullRecord);
    
    // Update query frequency
    const normalizedQuery = record.query.toLowerCase().trim();
    this.queryFrequency.set(
      normalizedQuery,
      (this.queryFrequency.get(normalizedQuery) || 0) + 1
    );
    
    // Update error counts
    if (record.error) {
      const provider = this.extractProviderFromError(record.error);
      if (provider) {
        this.providerErrors.set(
          provider,
          (this.providerErrors.get(provider) || 0) + 1
        );
      }
    }
    
    // Trim if exceeds max
    if (this.searches.length > this.maxRecords) {
      const removed = this.searches.shift();
      if (removed) {
        // Decrement frequency for removed query
        const removedQuery = removed.query.toLowerCase().trim();
        const count = this.queryFrequency.get(removedQuery) || 0;
        if (count <= 1) {
          this.queryFrequency.delete(removedQuery);
        } else {
          this.queryFrequency.set(removedQuery, count - 1);
        }
      }
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): SearchMetrics {
    if (this.searches.length === 0) {
      return {
        totalSearches: 0,
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        cacheHitRate: 0,
        providerErrors: {},
        topQueries: [],
        intentDistribution: {},
      };
    }
    
    // Calculate latency percentiles
    const latencies = this.searches.map(s => s.latency).sort((a, b) => a - b);
    const p50Index = Math.floor(latencies.length * 0.50);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    
    // Calculate cache hit rate
    const cacheHits = this.searches.filter(s => s.cacheHit).length;
    const cacheHitRate = cacheHits / this.searches.length;
    
    // Calculate intent distribution
    const intentDistribution: Record<string, number> = {};
    for (const search of this.searches) {
      intentDistribution[search.intentType] = (intentDistribution[search.intentType] || 0) + 1;
    }
    
    // Get top queries
    const topQueries = Array.from(this.queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }));
    
    // Get provider errors
    const providerErrors: Record<string, number> = {};
    for (const [provider, count] of this.providerErrors) {
      providerErrors[provider] = count;
    }
    
    return {
      totalSearches: this.searches.length,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50Latency: latencies[p50Index] || 0,
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      cacheHitRate,
      providerErrors,
      topQueries,
      intentDistribution,
    };
  }
  
  /**
   * Get metrics summary (human-readable)
   */
  getMetricsSummary(): string {
    const metrics = this.getMetrics();
    
    return `
Search Metrics (last ${this.searches.length} searches)
==========================================
Total Searches: ${metrics.totalSearches}
Avg Latency: ${metrics.avgLatency.toFixed(0)}ms
P95 Latency: ${metrics.p95Latency.toFixed(0)}ms
Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%

Intent Distribution:
${Object.entries(metrics.intentDistribution)
  .map(([intent, count]) => `  ${intent}: ${count}`)
  .join('\n')}

Top Queries:
${metrics.topQueries.slice(0, 5)
  .map((q, i) => `  ${i + 1}. "${q.query}" (${q.count}x)`)
  .join('\n')}
    `.trim();
  }
  
  /**
   * Extract provider from error message
   */
  private extractProviderFromError(error: string): string | null {
    if (error.includes('google') || error.includes('places')) return 'google_places';
    if (error.includes('ticketmaster')) return 'ticketmaster';
    return 'unknown';
  }
  
  /**
   * Get searches in time window
   */
  getSearchesInWindow(windowMs: number): SearchRecord[] {
    const cutoff = Date.now() - windowMs;
    return this.searches.filter(s => s.timestamp.getTime() > cutoff);
  }
  
  /**
   * Get query frequency
   */
  getQueryFrequency(query: string): number {
    const normalized = query.toLowerCase().trim();
    return this.queryFrequency.get(normalized) || 0;
  }
  
  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.searches = [];
    this.queryFrequency.clear();
    this.providerErrors.clear();
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
