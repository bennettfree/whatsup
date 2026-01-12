---
name: Map Search Enhancement
overview: Transform the map screen with intelligent combined search (location + venue/event types), visual differentiation between Ticketmaster events and Google Places venues, enhanced filtering, and preparation for comprehensive OpenAI integration.
todos:
  - id: visual-differentiation
    content: Add event markers to map with distinct icons vs venue markers
    status: pending
  - id: combined-search
    content: Build intelligent search bar handling location and type queries
    status: pending
    dependencies:
      - visual-differentiation
  - id: filter-modal
    content: Create functional filter modal for categories, price, date, distance
    status: pending
    dependencies:
      - combined-search
  - id: api-enhancement
    content: Add type/category filtering to backend API endpoints
    status: pending
  - id: ai-architecture
    content: Implement full AI service layer with OpenAI integration
    status: pending
    dependencies:
      - combined-search
      - api-enhancement
  - id: ui-polish
    content: Polish UI, add loading states, test all search and filter scenarios
    status: pending
    dependencies:
      - visual-differentiation
      - combined-search
      - filter-modal
      - api-enhancement
---

# Map Search & Filter Enhancement

## Current State

The app already has:

- [`src/features/places/screens/MapScreen.tsx`](src/features/places/screens/MapScreen.tsx) - functional map with markers
- [`src/services/eventsService.ts`](src/services/eventsService.ts) - Ticketmaster API integration
- [`src/services/placesService.ts`](src/services/placesService.ts) - Google Places API integration  
- [`backend/api/events.ts`](backend/api/events.ts) & [`backend/api/places.ts`](backend/api/places.ts) - working backend endpoints
- Basic location-based search via geocoding

## Implementation Phases

### Phase 1: Visual Differentiation - Events vs Venues

**Goal:** Users can instantly distinguish between events (Ticketmaster) and venues (Google Places) on the map.

**Changes:**

- Update `CustomMarker` component in [`MapScreen.tsx`](src/features/places/screens/MapScreen.tsx) to accept event vs venue type
- Add event-specific marker icon (calendar, ticket, or star icon) distinct from venue markers
- Currently events are rendered in the bottom sheet but NOT on the map - add event markers to the MapView
- Update marker rendering logic to handle both `remotePlaces` and `remoteEvents` arrays
- Ensure events have proper coordinate data from Ticketmaster API

**Key Files:**

- `src/features/places/screens/MapScreen.tsx` - marker components and map rendering

---

### Phase 2: Combined Search Bar

**Goal:** Single search bar intelligently handles both location searches ("San Francisco") and venue/event type searches ("coffee shops", "concerts", "bars").

**Changes:**

- Enhance search input UI with smart placeholder text (e.g., "Search location or venue type...")
- Add query classification logic:
  - Location pattern: City names, addresses, zip codes → use geocoding
  - Type pattern: Venue/event categories → filter API results by category/keyword
  - Hybrid: "bars in brooklyn" → extract both location and type
- Update `handleSearch` function to detect query type and route accordingly
- Add loading states and better error handling for search
- Store active search filters in component state

**Implementation approach:**

```typescript
// Detect if query is location vs type vs hybrid
const classifyQuery = (query: string) => {
  // Location indicators: zip codes, "in [city]", addresses
  // Type indicators: category keywords (bar, restaurant, concert, event)
  // Return: { type: 'location' | 'venue_type' | 'event_type' | 'hybrid', ... }
}
```

**Key Files:**

- `src/features/places/screens/MapScreen.tsx` - search logic
- Consider creating `src/utils/searchHelpers.ts` for query classification

---

### Phase 3: Enhanced Filtering System

**Goal:** Wire up the existing "Filters" button with functional category filtering.

**Changes:**

- Create filter modal/bottom sheet component
- Add category checkboxes for:
  - **Venues**: Bars, Restaurants, Cafes, Hotels, Shopping, Gyms, Spas, Museums, Parks
  - **Events**: Music, Sports, Arts, Nightlife, Festivals, Food & Drink, Workshops
- Add date range filter for events (today, this weekend, this month, custom)
- Add price level filter (free, $, $$, $$$, $$$$)
- Add distance/radius slider
- Apply filters to API queries and local filtering
- Show active filter count badge on Filters button
- Update category legend buttons to be interactive filters (toggle on/off)

**Key Files:**

- `src/features/places/screens/MapScreen.tsx` - add FilterModal component
- Consider extracting to `src/features/places/components/FilterModal.tsx`

---

### Phase 4: API Enhancement - Type-Based Queries

**Goal:** Pass venue/event type queries to the APIs for better, more relevant results.

**Backend Changes:**

- Update [`backend/api/places.ts`](backend/api/places.ts) to accept `type` parameter and map to Google Places types
- Update [`backend/api/events.ts`](backend/api/events.ts) to accept `category` or `keyword` parameter for Ticketmaster classification filters
- Add type-to-API-category mapping functions

**Frontend Changes:**

- Update [`src/services/placesService.ts`](src/services/placesService.ts) PlaceQuery interface to include `type` or `categories` array
- Update [`src/services/eventsService.ts`](src/services/eventsService.ts) EventQuery interface to include `keyword` or `classifications`
- Pass active filters from MapScreen to service layer

**Key Files:**

- `backend/api/places.ts` - add type filtering
- `backend/api/events.ts` - add category/keyword filtering  
- `src/services/placesService.ts` & `src/services/eventsService.ts` - update interfaces

---

### Phase 5: OpenAI Integration Preparation

**Goal:** Architect the system for OpenAI integration and implement comprehensive AI features.

**API Key Available:**
- OpenAI API Key: `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`
- **IMPORTANT:** Store this in `.env` file as `OPENAI_API_KEY` (never commit to git)
- Backend should read from `process.env.OPENAI_API_KEY`

**Architecture Design:**

```mermaid
graph TD
    UserQuery[User Search Query] --> QueryAnalyzer[Query Analyzer]
    QueryAnalyzer --> LocationExtractor[Extract Location]
    QueryAnalyzer --> IntentExtractor[Extract Intent with AI]
    
    IntentExtractor --> OpenAI[OpenAI API]
    OpenAI --> ParsedIntent[Parsed Intent: venue types, preferences, context]
    
    ParsedIntent --> APILayer[Ticketmaster + Google Places APIs]
    LocationExtractor --> APILayer
    
    APILayer --> RawResults[Raw Results 50-100 items]
    RawResults --> AIRanker[AI Ranking Engine]
    AIRanker --> OpenAI
    
    OpenAI --> RankedResults[Ranked Results with Reasons]
    RankedResults --> MapDisplay[Display on Map]
```

**Components to Create (stubs for now):**

1. **Query Parser Service** (`src/services/ai/queryParser.ts`)

   - Function: `parseSearchQuery(query: string): Promise<ParsedQuery>`
   - Extracts: location, venue types, event types, preferences (romantic, cheap, lively, etc.)
   - For now: Use simple keyword matching
   - Future: Call OpenAI to parse natural language

2. **AI Ranking Service** (`src/services/ai/ranker.ts`)

   - Function: `rankResults(results: Array, userContext: UserContext): Promise<RankedResult[]>`
   - Considers: distance, rating, price, user preferences, time of day, weather
   - For now: Use simple heuristic scoring
   - Future: Call OpenAI for personalized ranking

3. **Reason Generator Service** (`src/services/ai/reasonGenerator.ts`)

   - Function: `generateReasons(result: Place | Event, userContext: UserContext): Promise<string>`
   - Returns: "Perfect for a cozy date night" or "Great rooftop views for sunset"
   - For now: Return generic reasons based on category
   - Future: Call OpenAI to generate personalized reasons

4. **Backend AI Endpoint** (`backend/api/ai-search.ts`)

   - Endpoint: `POST /api/ai-search`
   - Orchestrates: Parse query → Fetch from APIs → Rank → Generate reasons → Return
   - Keeps OpenAI calls server-side for security

**Full Implementation (API Key Available):**

- Create service files with full OpenAI integration
- Implement natural language query parsing using GPT-4
- Implement AI-powered result ranking
- Implement contextual reason generation
- Add `isAIEnabled` flag to toggle between basic and AI-powered search
- Design the request/response formats
- Add error handling and fallback to basic search if AI fails

**Key Files:**

- `src/services/ai/queryParser.ts` (new)
- `src/services/ai/ranker.ts` (new)  
- `src/services/ai/reasonGenerator.ts` (new)
- `backend/api/ai-search.ts` (new)
- `src/features/places/screens/MapScreen.tsx` - integrate AI toggle

---

### Phase 6: UI Polish & Testing

**Goal:** Ensure smooth, intuitive user experience.

**Tasks:**

- Add smooth animations for marker selection
- Improve loading states (skeleton loaders for map markers)
- Add empty states ("No results found" with helpful suggestions)
- Add result count indicator ("12 bars nearby")
- Improve business detail modal to show event-specific fields (start time, ticket price, venue info)
- Test various search queries (location, types, hybrid)
- Test filter combinations
- Test API failures and fallback to mock data
- Ensure map performs well with 50+ markers

**Key Files:**

- `src/features/places/screens/MapScreen.tsx` - polish and testing

---

## Data Flow Diagram

```mermaid
graph LR
    User[User Types Query] --> SearchBar[Combined Search Bar]
    SearchBar --> Classifier{Query Classifier}
    
    Classifier -->|Location| Geocode[Geocode Address]
    Classifier -->|Type| TypeFilter[Extract Type Filters]
    Classifier -->|Hybrid| Both[Extract Both]
    
    Geocode --> MapRegion[Update Map Region]
    TypeFilter --> APIParams[API Parameters]
    Both --> MapRegion
    Both --> APIParams
    
    MapRegion --> APIs{Fetch Data}
    APIParams --> APIs
    
    APIs --> Ticketmaster[Ticketmaster API Events]
    APIs --> GooglePlaces[Google Places API Venues]
    
    Ticketmaster --> Merge[Merge Results]
    GooglePlaces --> Merge
    
    Merge --> Filter[Apply Filters]
    Filter --> MapMarkers[Render Markers with Different Icons]
```

---

## Environment Setup

**Required:** Add OpenAI API key to backend environment:

1. Create/update `.env` file in project root:
```bash
OPENAI_API_KEY=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
```

2. Ensure `.env` is in `.gitignore` (security)
3. Backend should load with `dotenv` package
4. Verify key is accessible via `process.env.OPENAI_API_KEY`

## Deliverables

After completing all phases:

- Combined search bar handling location + venue/event types
- Events and venues visually distinct on map (different icons)
- Functional filter system (categories, price, date, distance)
- Backend endpoints enhanced for type-based filtering
- **Full OpenAI integration with natural language search and AI-powered recommendations**
- Polished, responsive UI

## OpenAI Integration Details

With `OPENAI_API_KEY` now available, Phase 5 will include:

**Immediate Implementation:**
- OpenAI-powered natural language query understanding (GPT-4)
- AI-powered result ranking with personalization
- Contextual reason generation for recommendations
- Smart category detection and extraction

**Future Enhancements:**
- User preference learning over time
- Caching AI responses for performance optimization
- A/B testing AI vs non-AI search results
- Fine-tuning based on user feedback