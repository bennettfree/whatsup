// AI-powered query parser using OpenAI
// Parses natural language search queries into structured data

export interface ParsedSearchQuery {
  location?: string;
  venueTypes?: string[];
  eventTypes?: string[];
  preferences?: string[]; // e.g., "romantic", "cheap", "lively"
  timeContext?: string; // e.g., "tonight", "this weekend"
  intent: string; // Overall user intent
}

/**
 * Parse a natural language search query using AI (stub for Phase 5)
 * 
 * Examples:
 * - "romantic dinner spots in downtown" → { location: "downtown", venueTypes: ["restaurant"], preferences: ["romantic"] }
 * - "cheap bars near me" → { venueTypes: ["bar"], preferences: ["cheap"] }
 * - "live music tonight" → { eventTypes: ["music"], timeContext: "tonight" }
 */
export async function parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
  // Phase 5: This will call OpenAI to parse natural language
  // For now, return basic parsing
  
  const lowerQuery = query.toLowerCase();
  const result: ParsedSearchQuery = {
    intent: query,
  };

  // Basic keyword detection (Phase 5 will use OpenAI for better understanding)
  if (lowerQuery.includes('romantic') || lowerQuery.includes('date night')) {
    result.preferences = ['romantic'];
  }
  if (lowerQuery.includes('cheap') || lowerQuery.includes('affordable')) {
    result.preferences = [...(result.preferences || []), 'cheap'];
  }
  if (lowerQuery.includes('lively') || lowerQuery.includes('fun') || lowerQuery.includes('energetic')) {
    result.preferences = [...(result.preferences || []), 'lively'];
  }

  // Time context
  if (lowerQuery.includes('tonight') || lowerQuery.includes('today')) {
    result.timeContext = 'tonight';
  } else if (lowerQuery.includes('weekend') || lowerQuery.includes('saturday') || lowerQuery.includes('sunday')) {
    result.timeContext = 'weekend';
  }

  return result;
}

/**
 * Enhanced version with OpenAI (Phase 5 implementation)
 * Uncomment and use when OPENAI_API_KEY is configured in backend
 */
/*
import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function parseSearchQueryWithAI(
  query: string,
  apiKey: string
): Promise<ParsedSearchQuery> {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a search query parser for a location-based discovery app. Parse user queries into structured data.
            Extract: location, venue types (bar, restaurant, cafe, etc.), event types (music, sports, etc.), preferences (romantic, cheap, etc.), and time context.
            Return JSON only.`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    return JSON.parse(aiResponse);
  } catch (error) {
    console.error('OpenAI query parsing error:', error);
    // Fallback to basic parsing
    return parseSearchQuery(query);
  }
}
*/
