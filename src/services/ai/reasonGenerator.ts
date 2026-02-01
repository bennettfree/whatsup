// AI-powered reason generator for recommendations
// Generates contextual reasons why a place/event is recommended

import type { Place as MapPlace } from '../placesService';
import type { Event as MapEvent } from '../eventsService';
import type { UserContext } from './ranker';

/**
 * Generate a reason why this result is recommended
 * Phase 5: Will use OpenAI for personalized, contextual reasons
 */
export async function generateReason(
  result: MapPlace | MapEvent,
  context: UserContext
): Promise<string> {
  // Heuristic-based reasons for now
  const reasons: string[] = [];

  // Check if it's a place or event
  if ('rating' in result) {
    // It's a place
    const place = result as MapPlace;

    if (place.rating && place.rating >= 4.5) {
      reasons.push('Highly rated');
    }

    if (place.priceLevel === 1) {
      reasons.push('Budget-friendly');
    } else if (place.priceLevel === 4) {
      reasons.push('Premium experience');
    }

    if (place.isOpenNow) {
      reasons.push('Open now');
    }

    // Context-based reasons
    if (context.preferences?.includes('romantic')) {
      if (place.category === 'restaurant' && place.priceLevel && place.priceLevel >= 3) {
        reasons.push('Perfect for a date night');
      }
    }

    if (context.preferences?.includes('cheap')) {
      if (place.priceLevel && place.priceLevel <= 2) {
        reasons.push('Great value');
      }
    }
  } else {
    // It's an event
    const event = result as MapEvent;

    if (event.isFree) {
      reasons.push('Free event');
    }

    // Check if it's happening soon
    const eventDate = new Date(event.startDate);
    const now = new Date();
    const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil > 0 && hoursUntil < 24) {
      reasons.push('Happening soon');
    } else if (hoursUntil > 0 && hoursUntil < 72) {
      reasons.push('This weekend');
    }

    if (context.timeContext === 'tonight' && hoursUntil > 0 && hoursUntil < 12) {
      reasons.push('Perfect for tonight');
    }
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Recommended for you';
}

/**
 * Enhanced version with OpenAI (Phase 5 implementation)
 * Generates personalized, contextual reasons using AI
 */
/*
export async function generateReasonWithAI(
  result: MapPlace | MapEvent,
  context: UserContext,
  apiKey: string
): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a friendly local guide. Generate a short (5-10 words), compelling reason why this place/event matches the user's needs. Be specific and personal.`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              result: {
                name: 'name' in result ? result.name : result.title,
                category: result.category,
                rating: 'rating' in result ? result.rating : undefined,
                price: 'priceLevel' in result ? result.priceLevel : 'isFree' in result ? (result.isFree ? 0 : 2) : undefined,
              },
              context: {
                query: context.searchQuery,
                preferences: context.preferences,
                timeOfDay: context.timeOfDay,
              },
            }),
          },
        ],
        temperature: 0.8,
        max_tokens: 50,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI reason generation error:', error);
    // Fallback to heuristic reasons
    return generateReason(result, context);
  }
}
*/
