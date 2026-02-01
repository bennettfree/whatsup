// AI-powered result ranking service
// Ranks places and events based on user context and preferences

import type { Place as MapPlace } from '../placesService';
import type { Event as MapEvent } from '../eventsService';

export interface UserContext {
  location?: { latitude: number; longitude: number };
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  preferences?: string[]; // e.g., ["romantic", "cheap", "lively"]
  searchQuery: string;
}

export interface RankedResult {
  item: MapPlace | MapEvent;
  score: number;
  reason?: string;
}

/**
 * Rank search results using heuristic scoring
 * Phase 5: Will use OpenAI for personalized ranking
 */
export async function rankResults(
  results: Array<MapPlace | MapEvent>,
  context: UserContext
): Promise<RankedResult[]> {
  const ranked = results.map(item => {
    let score = 50; // Base score

    // Distance scoring (closer is better)
    if (context.location && 'location' in item) {
      const distance = calculateDistance(
        context.location.latitude,
        context.location.longitude,
        item.location.latitude,
        item.location.longitude
      );
      // Within 1 mile: +20, 2 miles: +15, 3 miles: +10, etc.
      if (distance < 1) score += 20;
      else if (distance < 2) score += 15;
      else if (distance < 3) score += 10;
      else if (distance < 5) score += 5;
    }

    // Rating scoring (for places)
    if ('rating' in item && item.rating) {
      score += item.rating * 5; // Max +25 for 5-star rating
    }

    // Price preference scoring
    if (context.preferences?.includes('cheap') && 'priceLevel' in item) {
      if (item.priceLevel === 1) score += 15;
      else if (item.priceLevel === 2) score += 5;
      else if (item.priceLevel && item.priceLevel >= 3) score -= 10;
    }

    // Free events bonus
    if ('isFree' in item && item.isFree) {
      score += 10;
    }

    // Time context for events
    if ('startDate' in item && context.timeOfDay) {
      const eventTime = new Date(item.startDate).getHours();
      if (context.timeOfDay === 'evening' && eventTime >= 18 && eventTime <= 22) {
        score += 10;
      }
    }

    return {
      item,
      score,
      reason: undefined, // Will be generated separately
    };
  });

  // Sort by score descending
  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Enhanced version with OpenAI ranking (Phase 5 implementation)
 * Uncomment when ready to use AI-powered ranking
 */
/*
export async function rankResultsWithAI(
  results: Array<MapPlace | MapEvent>,
  context: UserContext,
  apiKey: string
): Promise<RankedResult[]> {
  // Use OpenAI to analyze results and provide personalized ranking
  // Consider: user preferences, time of day, weather, trends, etc.
  // Return ranked results with AI-generated reasons
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a personalized recommendation engine. Rank places/events based on user context and preferences. Return JSON with scores and reasons.',
          },
          {
            role: 'user',
            content: JSON.stringify({ results: results.slice(0, 20), context }),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiRanking = JSON.parse(response.data.choices[0].message.content);
    return aiRanking.ranked;
  } catch (error) {
    console.error('OpenAI ranking error:', error);
    // Fallback to heuristic ranking
    return rankResults(results, context);
  }
}
*/
