/**
 * API Cost Optimizer
 * 
 * Tracks API usage and costs to stay within daily budgets.
 * Prevents runaway costs from Google Places API.
 */

export interface APIUsageStats {
  provider: string;
  callsToday: number;
  estimatedCost: number; // USD
  lastReset: Date;
  callHistory: Array<{ timestamp: Date; cost: number }>;
}

// API costs (approximate)
const COST_PER_CALL = {
  google_places: 0.017, // $17 per 1000 calls (Nearby Search)
  ticketmaster: 0.0,     // Free tier
};

// Daily budgets
const DAILY_BUDGET = {
  google_places: 10.0, // $10/day = ~588 calls
  ticketmaster: Infinity,
};

export class CostOptimizer {
  private stats = new Map<string, APIUsageStats>();
  
  /**
   * Check if we can afford to call a provider
   */
  canAffordCall(provider: 'google_places' | 'ticketmaster'): boolean {
    const stats = this.getStats(provider);
    const projectedCost = stats.estimatedCost + COST_PER_CALL[provider];
    
    if (projectedCost > DAILY_BUDGET[provider]) {
      console.warn(
        `[CostOptimizer] ${provider} budget exceeded: $${projectedCost.toFixed(2)} > $${DAILY_BUDGET[provider]}`
      );
      return false;
    }
    
    return true;
  }
  
  /**
   * Record an API call
   */
  recordCall(provider: 'google_places' | 'ticketmaster'): void {
    const stats = this.getStats(provider);
    const cost = COST_PER_CALL[provider];
    
    stats.callsToday++;
    stats.estimatedCost += cost;
    stats.callHistory.push({
      timestamp: new Date(),
      cost,
    });
    
    // Keep only last 1000 calls in history
    if (stats.callHistory.length > 1000) {
      stats.callHistory.shift();
    }
  }
  
  /**
   * Get stats for a provider
   */
  getStats(provider: string): APIUsageStats {
    if (!this.stats.has(provider)) {
      this.stats.set(provider, {
        provider,
        callsToday: 0,
        estimatedCost: 0,
        lastReset: new Date(),
        callHistory: [],
      });
    }
    
    const stats = this.stats.get(provider)!;
    
    // Reset if new day
    if (this.isNewDay(stats.lastReset)) {
      console.log(`[CostOptimizer] Resetting daily stats for ${provider}`);
      stats.callsToday = 0;
      stats.estimatedCost = 0;
      stats.lastReset = new Date();
      stats.callHistory = [];
    }
    
    return stats;
  }
  
  /**
   * Get all stats
   */
  getAllStats(): APIUsageStats[] {
    return Array.from(this.stats.values());
  }
  
  /**
   * Get remaining budget
   */
  getRemainingBudget(provider: 'google_places' | 'ticketmaster'): number {
    const stats = this.getStats(provider);
    return Math.max(0, DAILY_BUDGET[provider] - stats.estimatedCost);
  }
  
  /**
   * Get calls remaining within budget
   */
  getCallsRemaining(provider: 'google_places' | 'ticketmaster'): number {
    const remaining = this.getRemainingBudget(provider);
    const cost = COST_PER_CALL[provider];
    
    if (cost === 0) return Infinity;
    
    return Math.floor(remaining / cost);
  }
  
  /**
   * Check if it's a new day
   */
  private isNewDay(lastReset: Date): boolean {
    const now = new Date();
    return (
      now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()
    );
  }
  
  /**
   * Get cost report
   */
  getCostReport(): {
    totalCostToday: number;
    callsToday: number;
    remainingBudget: number;
    providers: Record<string, { calls: number; cost: number }>;
  } {
    const allStats = this.getAllStats();
    const totalCost = allStats.reduce((sum, s) => sum + s.estimatedCost, 0);
    const totalCalls = allStats.reduce((sum, s) => sum + s.callsToday, 0);
    
    const providers: Record<string, { calls: number; cost: number }> = {};
    for (const stat of allStats) {
      providers[stat.provider] = {
        calls: stat.callsToday,
        cost: stat.estimatedCost,
      };
    }
    
    return {
      totalCostToday: totalCost,
      callsToday: totalCalls,
      remainingBudget: Object.entries(DAILY_BUDGET).reduce((sum, [p, budget]) => {
        return sum + this.getRemainingBudget(p as any);
      }, 0),
      providers,
    };
  }
}

// Singleton instance
export const costOptimizer = new CostOptimizer();

/**
 * Check if provider should be skipped due to budget
 */
export function shouldSkipProvider(
  provider: 'google_places' | 'ticketmaster',
  costOptimized: boolean
): boolean {
  if (!costOptimized) return false;
  
  return !costOptimizer.canAffordCall(provider);
}
