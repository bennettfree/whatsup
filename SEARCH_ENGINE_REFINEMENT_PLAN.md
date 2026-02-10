# Search Engine Refinement & Production Readiness Plan

## 🎯 Vision

**Goal**: Create a search experience that ALWAYS provides quality results - "Our app has something for everyone, no matter what they want to do."

**Principles**:
1. **Quality over Quantity**: 10 great options > 100 mediocre ones
2. **Smart Fallbacks**: If narrow search fails, intelligently broaden
3. **Preserve Context**: Never lose user's search results on navigation
4. **Progressive Enhancement**: Fast results first, AI refinement second
5. **Graceful Degradation**: Always show something useful

---

## 🚨 Critical Issues Identified

### 1. Results Loss on Navigation (SEVERE)
**Problem**: `setResults([])` on `handleBackFromSearch` - user loses their search
**Impact**: Frustrating UX, forces re-search
**Fix**: Preserve results, add search history state

### 2. Insufficient Results
**Problem**: No minimum results guarantee
**Impact**: User searches "things to do" → gets 3 results → feels limited
**Fix**: Progressive radius expansion until minimum met (e.g., 15+ results)

### 3. No Quality Thresholds
**Problem**: Returns low-rated, far, closed places
**Impact**: User gets poor recommendations
**Fix**: Filter by rating >3.5, distance <radius, open now (time-aware)

### 4. No Diversity Enforcement
**Problem**: Search "food" → gets 20 pizza places (if that's closest)
**Impact**: Boring, not helpful
**Fix**: Ensure category diversity (max 30% from same subcategory)

### 5. Unnecessary Re-searches
**Problem**: Switching views, scrolling map triggers new searches
**Impact**: Wastes API calls, loses user's place in results
**Fix**: Smart caching, preserve results across view changes

### 6. No Fallback Strategy
**Problem**: Specific query returns 0 results → dead end
**Impact**: User gives up
**Fix**: Auto-suggest broader search ("sushi in Antarctica" → "restaurants nearby")

### 7. No Progressive Enhancement
**Problem**: Waits for AI refinement → slow
**Impact**: Feels laggy (even if just 2s)
**Fix**: Show provider results instantly, refine in background

### 8. No Search Context Preservation
**Problem**: User searches "coffee" → taps result → backs out → search gone
**Impact**: Has to search again
**Fix**: Maintain search state until explicitly cleared

---

## ✅ Implementation Plan

### Phase 1: Prevent Results Loss (Critical)
- [ ] Remove `setResults([])` from back handlers
- [ ] Add search history state
- [ ] Preserve last search query and results
- [ ] Only clear on explicit "X" button or new search

### Phase 2: Quality Guarantees
- [ ] Implement minimum results threshold (15+)
- [ ] Progressive radius expansion (5mi → 10mi → 25mi)
- [ ] Quality filters (rating >3.5, open now if time-sensitive)
- [ ] Diversity enforcement (category mixing)

### Phase 3: Smart Caching
- [ ] Cache results by query + location + radius
- [ ] TTL-based expiration (5 minutes)
- [ ] Prevent duplicate searches
- [ ] Invalidate only on explicit refresh

### Phase 4: Fallback Strategies
- [ ] Detect empty/poor results
- [ ] Auto-suggest broader search
- [ ] Show "Searching wider area..." with animation
- [ ] Present fallback results with clear labeling

### Phase 5: Progressive Enhancement
- [ ] Render provider results immediately
- [ ] Show "Refining with AI..." indicator
- [ ] Merge AI improvements when ready
- [ ] Never block UI on AI

### Phase 6: Search Context
- [ ] Add searchHistory state (last 10 queries)
- [ ] Quick re-search buttons
- [ ] Clear vs Back distinction
- [ ] Preserve results across view changes

---

## 🏗️ Architecture

### State Management
```typescript
// Search context (never cleared on navigation)
const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
const [searchCache, setSearchCache] = useState<Map<string, CachedSearch>>();

type SearchHistoryItem = {
  id: string;
  query: string;
  timestamp: number;
  results: SearchResult[];
  location: { lat: number; lng: number };
  radius: number;
};

type CachedSearch = {
  results: SearchResult[];
  timestamp: number;
  expiresAt: number;
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
};
```

### Quality Pipeline
```
User Query
  ↓
Intent Parsing (deterministic, <5ms)
  ↓
Provider Routing (which APIs to call)
  ↓
Execute Search (parallel API calls)
  ↓
Quality Check: Count results, check ratings
  ↓
IF insufficient → Progressive Expansion:
  - Radius: 5mi → 10mi → 25mi → 50mi
  - Categories: Specific → General
  - Filters: Relax (e.g., include rating 3.0+)
  ↓
Diversity Enforcement (max 30% same subcategory)
  ↓
AI Refinement (background, optional)
  ↓
Final Ranking by:
  1. Relevance score (keyword match)
  2. Distance (closer = better)
  3. Rating (higher = better)
  4. Open now (time-aware bonus)
  5. AI re-ranking (if available)
  ↓
Return 15-50 high-quality results
```

---

## 🎨 UX Improvements

### Search States
1. **Idle**: Show "What's Happening" with smart suggestions
2. **Typing**: Show recent searches, autocomplete suggestions
3. **Searching**: Loading animation + count ("Found 3, searching more...")
4. **Results**: Clean list with clear categories
5. **Empty**: Smart fallback ("Try searching wider area?")
6. **Refined**: Subtle "AI refined" badge on enhanced results

### Navigation Preservation
```
User Flow (BEFORE - BAD):
Search "coffee" → 20 results → Tap result → View detail → Back → ❌ Results gone

User Flow (AFTER - GOOD):
Search "coffee" → 20 results → Tap result → View detail → Back → ✅ Results preserved
```

### Map Sync
- Results pinned to map markers
- Scrolling map doesn't trigger new searches
- Only re-search on:
  - New query submitted
  - Distance filter changed
  - User explicitly taps "Refresh"

---

## 📊 Quality Metrics

### Minimum Thresholds
- **Results count**: 15+ (if <15, expand radius)
- **Average rating**: 3.8+ (filter out <3.5)
- **Distance**: <user_radius (respect filter)
- **Diversity**: Max 30% from same subcategory
- **Freshness**: Events must be upcoming, places recently updated

### Success Criteria
| Query Type | Min Results | Avg Rating | Max Distance | Response Time |
|------------|-------------|------------|--------------|---------------|
| Specific (e.g., "sushi") | 20+ | 4.0+ | User radius | <2s |
| General (e.g., "food") | 30+ | 3.8+ | User radius | <3s |
| Abstract (e.g., "fun") | 25+ (mixed) | 3.8+ | User radius | <3s |
| Browse (empty query) | 40+ (mixed) | 4.0+ | 10mi | <2s |

---

## 🔒 Safety & Performance

### Caching Strategy
- **Key**: `${query}_${lat}_${lng}_${radius}_${timeContext}`
- **TTL**: 5 minutes (300s)
- **Max size**: 50 cached searches
- **LRU eviction**: Remove oldest when full
- **Invalidation**: Manual refresh, location change >1mi

### Rate Limiting
- **Max searches/min**: 10 (prevent spam)
- **Debounce**: 500ms on query input
- **Throttle**: Don't search on every map pan
- **Progressive**: Show cached immediately while fetching fresh

### Error Handling
- **Provider failure**: Fall back to other provider
- **Network timeout**: Show cached results
- **Zero results**: Suggest broader search
- **Invalid query**: Guide user with examples

---

## 🎓 Industry Patterns Applied

### Google Search Quality
- ✅ Minimum results (they show 10+ per page)
- ✅ Diverse sources (not all from same domain)
- ✅ Quality ranking (PageRank equivalent)
- ✅ "Did you mean?" suggestions

### Yelp/Google Maps
- ✅ Rating filters (show quality places)
- ✅ Distance-aware ranking
- ✅ Open now filtering
- ✅ Category diversity

### Instagram/TikTok Discovery
- ✅ Progressive loading (fast results → refined)
- ✅ Infinite scroll (load more seamlessly)
- ✅ Visual-first (hero images)
- ✅ Engagement signals (saves, likes)

### Airbnb Search
- ✅ Smart defaults (show great options even for vague query)
- ✅ Map interaction (results sync with visible area)
- ✅ Preserved filters (don't reset on navigation)
- ✅ Search context (can edit search, not start over)

---

**Next**: Implement these improvements systematically, starting with critical fixes.
