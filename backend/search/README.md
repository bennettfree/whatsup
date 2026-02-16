# WhatsUp Search Intelligence System

## Enterprise-Grade Hyperlocal Discovery Platform

This directory contains WhatsUp's complete search intelligence architecture - a state-of-the-art query processing, classification, and ranking system designed to outperform Google Maps, Yelp, and Eventbrite.

---

## Quick Start

### Run Tests

```bash
npm test backend/search/__tests__/
```

### Check System Health

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/metrics
```

### Enable Features

Edit `.env`:
```env
FEATURE_ENABLE_ADAPTIVE_RANKING=true
FEATURE_USE_REDIS_CACHE=false  # true when Redis available
```

---

## Architecture

```
preprocessing/          Query normalization, intent classification, entity extraction
taxonomy/              Category system (60+ micro-categories)
hyperlocal/            Small venue boost, clustering, neighborhood context
ranking/               Adaptive 8-factor ranking engine
orchestration/         Provider strategy, circuit breaker, deduplication
cache/                 Redis distributed cache
precision/             Smart fallbacks, UX feedback
config/                Feature flags
__tests__/             Comprehensive test suite
```

---

## Module Descriptions

### Preprocessing (`preprocessing/`)

**queryNormalizer.ts** - Query normalization pipeline
- Emoji → keywords (🍕→pizza)
- Slang → standard (lit→lively)
- Typo correction (coffe→coffee)
- Stop word removal

**intentClassifier.ts** - Multi-signal intent detection
- Place vs event vs both
- Sub-intents: mood, budget, group, activity
- Confidence scoring

**entityExtractor.ts** - Structured entity extraction
- Dates (tonight, tomorrow, 12/25)
- Times (happy hour, 7pm)
- Locations (near me, downtown, 10001)
- Prices (free, under $20, $$)

**semanticExpansion.ts** - Synonym & slang database
- 500+ synonym mappings
- Regional slang (NYC, SF, LA)
- Query expansion (max 5)

---

### Taxonomy (`taxonomy/`)

**categorySystem.ts** - Hierarchical category definitions
- 60+ micro-categories
- Macro → Meso → Micro structure
- Multi-label support

Examples:
- Nightlife: rooftop bars, dive bars, wine bars, speakeasies
- Food: food halls, pop-ups, late-night eats, BYOB
- Events: underground shows, open mics, trivia nights

**multiLabelClassifier.ts** - Venue classification
- Primary + secondary categories
- Tag inference
- Confidence scoring

---

### Hyperlocal (`hyperlocal/`)

**hyperlocalScoring.ts** - Differentiation mechanisms
- Small venue boost (25-35%)
- Chain penalty (35%)
- Independence scoring
- Momentum detection (new/trending)
- Event density clustering (DBSCAN)
- Neighborhood context (10+ profiles)

---

### Ranking (`ranking/`)

**adaptiveRanking.ts** - Multi-factor scoring
- 8 scoring components
- Context-adaptive weights
- Anti-bias strategies

Scoring Factors:
1. Proximity (30% base)
2. Rating (15% base)
3. Popularity (10% base)
4. Novelty (5% base)
5. Temporal (15% base)
6. Intent Match (20% base)
7. Vibrancy (3% base)
8. Independence (2% base)

---

### Orchestration (`orchestration/`)

**providerStrategy.ts** - Intelligent provider selection
- Confidence-based routing
- Cost optimization

**circuitBreaker.ts** - Fault tolerance
- 5-failure threshold
- 60s reset timeout
- Auto-recovery

**resultDeduplicator.ts** - Fuzzy deduplication
- String similarity (85% threshold)
- Location clustering (<50m)
- Best-source selection

**costOptimizer.ts** - Budget management
- $10/day Google Places budget
- Real-time cost tracking
- Automatic throttling

---

### Cache (`cache/`)

**redisCache.ts** - Distributed caching
- Redis primary, in-memory fallback
- Semantic cache keys
- TTL management

---

### Precision (`precision/`)

**smartFallbacks.ts** - Auto-expansion
- Radius expansion (2x, max 50mi)
- Date expansion (tonight → tomorrow)
- Rating relaxation (3.5 → 3.0)

**uxFeedbackGenerator.ts** - User guidance
- Refinement chips
- Helper text
- Filter suggestions

---

### Config (`config/`)

**featureFlags.ts** - Gradual rollout control
- 22 feature flags
- Environment override
- Instant disable capability

---

## Usage Examples

### Basic Search with Enhanced Intelligence

```typescript
import { orchestrateEnhancedSearch } from './search/orchestrator';

const response = await orchestrateEnhancedSearch({
  query: "🍕 lit bars tn",  // Emoji + slang + abbreviation
  userContext: {
    currentLocation: { latitude: 37.7749, longitude: -122.4194 },
    timezone: "America/Los_Angeles",
    nowISO: new Date().toISOString(),
  },
  radiusMiles: 5,
  limit: 20,
});

// Results:
// - Emoji expanded: pizza + beer
// - Slang expanded: lit → lively
// - Abbreviation: tn → tonight
// - Intent: place (bars) + nightlife
// - Temporal: immediate urgency
// - Hyperlocal: local bars boosted, chains penalized
```

### Query with Mood Intent

```typescript
const response = await orchestrateEnhancedSearch({
  query: "romantic date spots with good wine",
  // ...
});

// Results:
// - Mood: romantic
// - Group: date
// - Activity: dining + drinking
// - Ranking adjusted: +8% rating, -5% popularity
// - Wine bars boosted
```

### Budget-Conscious Search

```typescript
const response = await orchestrateEnhancedSearch({
  query: "cheap eats under $15 near me",
  // ...
});

// Results:
// - Budget: budget level
// - Price max: $15
// - Filters applied to results
// - Budget venues boosted
```

---

## Feature Flags Reference

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_QUERY_NORMALIZATION` | Emoji, slang, typo handling | ON |
| `ENABLE_SUB_INTENT_DETECTION` | Mood, budget, group detection | ON |
| `ENABLE_MICRO_CATEGORIES` | 60+ category system | ON |
| `ENABLE_HYPERLOCAL_BOOST` | Small venue + chain detection | ON |
| `ENABLE_ADAPTIVE_RANKING` | Context-aware weights | ON |
| `USE_REDIS_CACHE` | Distributed caching | OFF |
| `ENABLE_SMART_FALLBACKS` | Auto-expansion | ON |

See `config/featureFlags.ts` for complete list.

---

## Testing

### Run All Tests

```bash
npm test backend/search/__tests__/
```

### Specific Test Suites

```bash
# Natural language processing
npm test backend/search/__tests__/naturalLanguage.test.ts

# Ranking algorithm
npm test backend/search/__tests__/ranking.test.ts

# Hyperlocal scoring
npm test backend/search/__tests__/hyperlocal.test.ts

# Deduplication
npm test backend/search/__tests__/deduplication.test.ts
```

---

## Performance Benchmarks

### Target Performance

- **Latency:** < 500ms P95 (with Redis)
- **Throughput:** 1000+ QPS
- **Cache Hit Rate:** > 70%
- **Availability:** 99.9%

### Load Testing

```bash
npm run loadtest:search
```

---

## Troubleshooting

### High Latency

1. Check Redis connection: `await getRedisCache()`
2. Check circuit breaker states: `circuitBreaker.getAllStates()`
3. Check provider latency in metrics

### Low Cache Hit Rate

1. Verify semantic cache key generation
2. Check TTL settings
3. Ensure query normalization is enabled

### Provider Errors

1. Check circuit breaker: `/api/health`
2. Verify API keys in `.env`
3. Check cost optimizer: not over budget

### Missing Results

1. Check if fallbacks are enabled
2. Verify minimum rating threshold
3. Check radius constraints

---

## Contributing

### Adding New Categories

Edit `taxonomy/categorySystem.ts`:

```typescript
{
  id: 'new_category',
  displayName: 'New Category',
  parentCategory: 'parent',
  level: 'micro',
  searchKeywords: ['keyword1', 'keyword2'],
  tags: ['tag1', 'tag2'],
  exclusive: false,
}
```

### Adding Slang/Synonyms

Edit `preprocessing/semanticExpansion.ts`:

```typescript
const SEMANTIC_EXPANSIONS = {
  'new_term': ['synonym1', 'synonym2'],
  // ...
};
```

### Tuning Ranking Weights

Edit `ranking/adaptiveRanking.ts`:

```typescript
const base: RankingWeights = {
  proximity: 0.30,  // Adjust as needed
  // ...
};
```

---

## Monitoring

### Metrics Dashboard

Access `/api/metrics` for:
- Total searches
- Latency percentiles (P50, P95, P99)
- Cache hit rate
- Top 20 queries
- Intent distribution

### Health Dashboard

Access `/api/health` for:
- Overall status
- Component health (search, providers, cache)
- Circuit breaker states

### Diagnostics

Access `/api/diagnostics` for:
- Comprehensive system state
- Feature flag status
- Cost report
- Full metrics

---

## Production Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Redis configured and tested
- [ ] API keys validated
- [ ] Cost budgets set
- [ ] Monitoring alerts configured
- [ ] Feature flags reviewed
- [ ] Load testing completed (1000 QPS)
- [ ] Staging deployment successful
- [ ] Rollback plan documented

---

## Support

For issues or questions:
1. Check `/api/diagnostics` for system state
2. Review metrics in `/api/metrics`
3. Check feature flags in `config/featureFlags.ts`
4. Consult `SEARCH_INTELLIGENCE_IMPLEMENTATION_COMPLETE.md`

---

**Built with:** TypeScript, Redis, Express
**Architecture:** Microservices-ready, horizontally scalable
**Quality:** Enterprise-grade, production-ready
