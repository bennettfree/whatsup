/**
 * Health Check & Monitoring Endpoints
 * 
 * Provides health status, metrics, and diagnostics for operations.
 */

import { metricsCollector } from './metrics';
import { circuitBreaker } from '../search/orchestration/circuitBreaker';
import { costOptimizer } from '../search/orchestration/costOptimizer';
import { getFeatureFlagReport } from '../search/config/featureFlags';
import { getRedisCache } from '../search/cache/redisCache';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  components: {
    search: ComponentHealth;
    providers: ComponentHealth;
    cache: ComponentHealth;
    metrics: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  details?: any;
}

const startTime = Date.now();

/**
 * Get overall system health
 */
export async function getSystemHealth(): Promise<HealthStatus> {
  const components = {
    search: await checkSearchHealth(),
    providers: checkProviderHealth(),
    cache: await checkCacheHealth(),
    metrics: checkMetricsHealth(),
  };
  
  // Determine overall status
  const statuses = Object.values(components).map(c => c.status);
  let overallStatus: HealthStatus['status'] = 'healthy';
  
  if (statuses.some(s => s === 'down')) {
    overallStatus = 'down';
  } else if (statuses.some(s => s === 'degraded')) {
    overallStatus = 'degraded';
  }
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    components,
  };
}

/**
 * Check search system health
 */
async function checkSearchHealth(): Promise<ComponentHealth> {
  try {
    const metrics = metricsCollector.getMetrics();
    
    // Check if P95 latency is acceptable
    if (metrics.p95Latency > 2000) {
      return {
        status: 'degraded',
        details: {
          reason: 'High latency',
          p95: metrics.p95Latency,
        },
      };
    }
    
    // Check if cache hit rate is good
    if (metrics.cacheHitRate < 0.3 && metrics.totalSearches > 100) {
      return {
        status: 'degraded',
        details: {
          reason: 'Low cache hit rate',
          hitRate: metrics.cacheHitRate,
        },
      };
    }
    
    return {
      status: 'healthy',
      details: {
        totalSearches: metrics.totalSearches,
        avgLatency: metrics.avgLatency,
        p95Latency: metrics.p95Latency,
        cacheHitRate: metrics.cacheHitRate,
      },
    };
  } catch (error) {
    return {
      status: 'down',
      details: { error: String(error) },
    };
  }
}

/**
 * Check provider health (circuit breakers)
 */
function checkProviderHealth(): ComponentHealth {
  const states = circuitBreaker.getAllStates();
  
  const openCircuits = states.filter(s => s.state === 'open');
  if (openCircuits.length > 0) {
    return {
      status: 'degraded',
      details: {
        reason: 'Providers down',
        openCircuits: openCircuits.map(s => s.provider),
      },
    };
  }
  
  const halfOpenCircuits = states.filter(s => s.state === 'half_open');
  if (halfOpenCircuits.length > 0) {
    return {
      status: 'degraded',
      details: {
        reason: 'Providers recovering',
        halfOpenCircuits: halfOpenCircuits.map(s => s.provider),
      },
    };
  }
  
  return {
    status: 'healthy',
    details: {
      circuits: states.map(s => ({
        provider: s.provider,
        state: s.state,
        failures: s.failureCount,
      })),
    },
  };
}

/**
 * Check cache health
 */
async function checkCacheHealth(): Promise<ComponentHealth> {
  try {
    const cache = await getRedisCache();
    const stats = cache.getStats();
    
    return {
      status: stats.connected ? 'healthy' : 'degraded',
      details: {
        type: stats.type,
        connected: stats.connected,
        entries: stats.entries,
      },
    };
  } catch (error) {
    return {
      status: 'degraded',
      details: {
        type: 'memory',
        reason: 'Redis unavailable, using fallback',
      },
    };
  }
}

/**
 * Check metrics collection health
 */
function checkMetricsHealth(): ComponentHealth {
  try {
    const metrics = metricsCollector.getMetrics();
    
    return {
      status: 'healthy',
      details: {
        totalSearches: metrics.totalSearches,
        tracking: true,
      },
    };
  } catch (error) {
    return {
      status: 'down',
      details: { error: String(error) },
    };
  }
}

/**
 * Get comprehensive diagnostics
 */
export async function getDiagnostics(): Promise<any> {
  const health = await getSystemHealth();
  const metrics = metricsCollector.getMetrics();
  const costReport = costOptimizer.getCostReport();
  const featureFlags = getFeatureFlagReport();
  
  return {
    health,
    metrics,
    costs: costReport,
    features: featureFlags,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get metrics summary (for logging/monitoring)
 */
export function getMetricsSummary(): string {
  return metricsCollector.getMetricsSummary();
}
