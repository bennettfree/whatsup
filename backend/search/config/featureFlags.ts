/**
 * Feature Flags
 * 
 * Gradual rollout control for new search intelligence features.
 * Allows instant disable if issues arise.
 */

export interface FeatureFlags {
  ENABLE_QUERY_NORMALIZATION: boolean;
  ENABLE_EMOJI_EXPANSION: boolean;
  ENABLE_SLANG_EXPANSION: boolean;
  ENABLE_SEMANTIC_EXPANSION: boolean;
  ENABLE_ENTITY_EXTRACTION: boolean;
  ENABLE_SUB_INTENT_DETECTION: boolean;
  ENABLE_MICRO_CATEGORIES: boolean;
  ENABLE_MULTI_LABEL_CLASSIFICATION: boolean;
  ENABLE_HYPERLOCAL_BOOST: boolean;
  ENABLE_SMALL_VENUE_BOOST: boolean;
  ENABLE_INDEPENDENCE_BOOST: boolean;
  ENABLE_MOMENTUM_BOOST: boolean;
  ENABLE_CLUSTER_VIBRANCY: boolean;
  ENABLE_NEIGHBORHOOD_CONTEXT: boolean;
  ENABLE_ADAPTIVE_RANKING: boolean;
  ENABLE_INTELLIGENT_DEDUPLICATION: boolean;
  ENABLE_CIRCUIT_BREAKER: boolean;
  ENABLE_COST_OPTIMIZATION: boolean;
  USE_REDIS_CACHE: boolean;
  ENABLE_REQUEST_CANCELLATION: boolean;
  ENABLE_SMART_FALLBACKS: boolean;
  ENABLE_UX_FEEDBACK: boolean;
  ENABLE_METRICS_COLLECTION: boolean;
}

// Default feature flags
const DEFAULT_FLAGS: FeatureFlags = {
  // Phase 1: Query Processing
  ENABLE_QUERY_NORMALIZATION: true,
  ENABLE_EMOJI_EXPANSION: true,
  ENABLE_SLANG_EXPANSION: true,
  ENABLE_SEMANTIC_EXPANSION: true,
  ENABLE_ENTITY_EXTRACTION: true,
  ENABLE_SUB_INTENT_DETECTION: true,
  
  // Phase 2: Categories
  ENABLE_MICRO_CATEGORIES: true,
  ENABLE_MULTI_LABEL_CLASSIFICATION: true,
  
  // Phase 4: Hyperlocal
  ENABLE_HYPERLOCAL_BOOST: true,
  ENABLE_SMALL_VENUE_BOOST: true,
  ENABLE_INDEPENDENCE_BOOST: true,
  ENABLE_MOMENTUM_BOOST: true,
  ENABLE_CLUSTER_VIBRANCY: true,
  ENABLE_NEIGHBORHOOD_CONTEXT: true,
  
  // Phase 5: Ranking
  ENABLE_ADAPTIVE_RANKING: true,
  
  // Phase 6: Orchestration
  ENABLE_INTELLIGENT_DEDUPLICATION: true,
  ENABLE_CIRCUIT_BREAKER: true,
  ENABLE_COST_OPTIMIZATION: true,
  
  // Phase 7: Performance
  USE_REDIS_CACHE: false, // Set to true when Redis is available
  ENABLE_REQUEST_CANCELLATION: true,
  
  // Phase 8: Precision
  ENABLE_SMART_FALLBACKS: true,
  ENABLE_UX_FEEDBACK: true,
  
  // Monitoring
  ENABLE_METRICS_COLLECTION: true,
};

/**
 * Load feature flags from environment or config
 */
export function loadFeatureFlags(): FeatureFlags {
  const flags = { ...DEFAULT_FLAGS };
  
  // Override from environment variables
  for (const key of Object.keys(flags) as (keyof FeatureFlags)[]) {
    const envKey = `FEATURE_${key}`;
    const envValue = process.env[envKey];
    
    if (envValue !== undefined) {
      flags[key] = envValue === 'true';
    }
  }
  
  return flags;
}

// Global feature flags
export const FEATURE_FLAGS = loadFeatureFlags();

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[feature];
}

/**
 * Enable feature (for testing/debugging)
 */
export function enableFeature(feature: keyof FeatureFlags): void {
  FEATURE_FLAGS[feature] = true;
  console.log(`[FeatureFlags] Enabled ${feature}`);
}

/**
 * Disable feature (for rollback)
 */
export function disableFeature(feature: keyof FeatureFlags): void {
  FEATURE_FLAGS[feature] = false;
  console.log(`[FeatureFlags] Disabled ${feature}`);
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
}

/**
 * Get feature flag status report
 */
export function getFeatureFlagReport(): {
  total: number;
  enabled: number;
  disabled: number;
  flags: Record<string, boolean>;
} {
  const enabled = getEnabledFeatures().length;
  const total = Object.keys(FEATURE_FLAGS).length;
  
  return {
    total,
    enabled,
    disabled: total - enabled,
    flags: { ...FEATURE_FLAGS },
  };
}
