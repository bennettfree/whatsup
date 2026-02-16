/**
 * OpenAI Client for Search Intelligence
 * 
 * Industry-standard configuration:
 * - GPT-4o-mini (100x cheaper than GPT-4)
 * - Budget management ($5/day cap)
 * - Result caching (24-hour TTL)
 * - Rate limiting (500 calls/day safety cap)
 * 
 * Used by: Instagram, Uber, Airbnb for search NLU
 */

import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Industry standard: GPT-4o-mini for cost efficiency
const MODEL = 'gpt-4o-mini'; // $0.00015/1K tokens (vs GPT-4 $0.03/query)
const DAILY_BUDGET_USD = 5.0; // $5/day cap
const DAILY_CALL_LIMIT = 500; // Safety limit

interface OpenAIIntent {
  intentType: 'place' | 'event' | 'both';
  categories: string[];
  mood?: 'romantic' | 'energetic' | 'relaxing' | 'adventurous' | 'social' | 'quiet';
  budget?: 'free' | 'budget' | 'moderate' | 'upscale';
  groupSize?: 'solo' | 'date' | 'small_group' | 'large_group';
  keywords: string[];
  confidence: number;
  reasoning: string;
}

interface UsageStats {
  callsToday: number;
  costToday: number;
  lastReset: Date;
}

class OpenAIUsageTracker {
  private stats: UsageStats = {
    callsToday: 0,
    costToday: 0,
    lastReset: new Date(),
  };
  
  canAfford(): boolean {
    this.resetIfNewDay();
    
    if (this.stats.callsToday >= DAILY_CALL_LIMIT) {
      console.warn(`[OpenAI] Daily call limit reached: ${DAILY_CALL_LIMIT}`);
      return false;
    }
    
    if (this.stats.costToday >= DAILY_BUDGET_USD) {
      console.warn(`[OpenAI] Daily budget exceeded: $${this.stats.costToday.toFixed(2)}`);
      return false;
    }
    
    return true;
  }
  
  recordCall(estimatedCost: number = 0.0003): void {
    this.resetIfNewDay();
    this.stats.callsToday++;
    this.stats.costToday += estimatedCost;
  }
  
  getStats(): UsageStats {
    this.resetIfNewDay();
    return { ...this.stats };
  }
  
  private resetIfNewDay(): void {
    const now = new Date();
    if (now.getDate() !== this.stats.lastReset.getDate() ||
        now.getMonth() !== this.stats.lastReset.getMonth()) {
      this.stats.callsToday = 0;
      this.stats.costToday = 0;
      this.stats.lastReset = now;
    }
  }
}

const usageTracker = new OpenAIUsageTracker();

// Simple in-memory cache (24-hour TTL)
const openAICache = new Map<string, { intent: OpenAIIntent; expiry: number }>();

function getCached(query: string): OpenAIIntent | null {
  const normalized = query.toLowerCase().trim();
  const cached = openAICache.get(normalized);
  
  if (cached && cached.expiry > Date.now()) {
    console.log(`[OpenAI] Cache hit for: "${query}"`);
    return cached.intent;
  }
  
  return null;
}

function setCache(query: string, intent: OpenAIIntent): void {
  const normalized = query.toLowerCase().trim();
  const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  openAICache.set(normalized, { intent, expiry });
  
  // Cleanup old entries (keep last 1000)
  if (openAICache.size > 1000) {
    const entries = Array.from(openAICache.entries());
    const sorted = entries.sort((a, b) => a[1].expiry - b[1].expiry);
    openAICache.delete(sorted[0][0]);
  }
}

/**
 * Classify query using OpenAI (GPT-4o-mini)
 * Industry standard for complex/abstract queries
 */
export async function classifyQueryWithOpenAI(query: string): Promise<OpenAIIntent | null> {
  try {
    // Check cache first (free, instant)
    const cached = getCached(query);
    if (cached) return cached;
    
    // Check budget
    if (!usageTracker.canAfford()) {
      console.warn('[OpenAI] Budget/limit exceeded, skipping AI classification');
      return null;
    }
    
    // Check API key
    if (!OPENAI_API_KEY) {
      console.warn('[OpenAI] API key not configured');
      return null;
    }
    
    console.log(`[OpenAI] 🤖 Classifying query: "${query}"`);
    
    const startTime = Date.now();
    
    // Call OpenAI API with optimized prompt
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are WhatsUp's search intelligence system. Parse queries and extract structured intent.

CRITICAL: Use ONLY these exact category names:
- "food" (for ALL food queries: sushi, pizza, restaurants, dining, etc.)
- "nightlife" (for bars, clubs, pubs, lounges, nightlife)
- "music" (for concerts, live music, shows, DJ events)
- "art" (for museums, galleries, art events)
- "history" (for historical sites, landmarks, tours)
- "fitness" (for gyms, yoga, sports, wellness)
- "outdoor" (for parks, hiking, nature, camping)
- "social" (for meetups, networking, dating, singles events)
- "other" (only if truly uncategorized)

Examples:
- "sushi near me" → {"intentType":"place","categories":["food"],"keywords":["sushi","japanese","restaurant"]}
- "I want to eat pizza" → {"intentType":"place","categories":["food"],"keywords":["pizza","italian","food"]}
- "I want to meet women" → {"intentType":"both","categories":["nightlife","social"],"keywords":["bar","club","singles","social"],"mood":"social","groupSize":"solo"}
- "romantic dinner" → {"intentType":"place","categories":["food"],"keywords":["romantic","restaurant","dinner"],"mood":"romantic","groupSize":"date"}
- "bars open tonight" → {"intentType":"place","categories":["nightlife"],"keywords":["bar","pub","open","tonight"]}

NEVER return: "restaurant", "bar", "cafe" as categories. Always use: "food" or "nightlife".

Return JSON:
{
  "intentType": "place" | "event" | "both",
  "categories": ["food"|"nightlife"|"music"|"art"|"history"|"fitness"|"outdoor"|"social"|"other"],
  "mood": "romantic"|"energetic"|"relaxing"|"adventurous"|"social"|"quiet"|null,
  "budget": "free"|"budget"|"moderate"|"upscale"|null,
  "groupSize": "solo"|"date"|"small_group"|"large_group"|null,
  "keywords": ["keyword1","keyword2"],
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.3, // Low temperature for consistency
        max_tokens: 150,  // Keep responses concise
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      }
    );
    
    const latency = Date.now() - startTime;
    console.log(`[OpenAI] ✅ Classified in ${latency}ms`);
    
    // Parse response
    const content = response.data.choices[0].message.content;
    const intent: OpenAIIntent = JSON.parse(content);
    
    // Cache result
    setCache(query, intent);
    
    // Track usage
    usageTracker.recordCall(0.0003);
    
    return intent;
  } catch (error: any) {
    console.error('[OpenAI] Classification failed:', error.message);
    
    // Return null on failure (will fall back to rule-based)
    return null;
  }
}

/**
 * Get usage statistics
 */
export function getOpenAIStats(): UsageStats {
  return usageTracker.getStats();
}

/**
 * Check if OpenAI is available
 */
export function isOpenAIAvailable(): boolean {
  return Boolean(OPENAI_API_KEY) && usageTracker.canAfford();
}

/**
 * Clear cache (for testing)
 */
export function clearOpenAICache(): void {
  openAICache.clear();
  console.log('[OpenAI] Cache cleared');
}
