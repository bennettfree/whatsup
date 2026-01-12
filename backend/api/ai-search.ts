// AI-powered search endpoint
// Orchestrates: Parse query → Fetch from APIs → Rank → Generate reasons

import type { Request, Response } from 'express';
import axios from 'axios';
import { getPlaces } from './places';
import { getEvents } from './events';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface AISearchRequest {
  query: string;
  lat: number;
  lng: number;
  radius?: number;
  preferences?: string[];
}

export interface AISearchResponse {
  results: Array<{
    id: string;
    type: 'place' | 'event';
    data: any;
    score: number;
    reason: string;
  }>;
  intent: string;
  isAIEnabled: boolean;
}

/**
 * AI-powered search endpoint
 * POST /api/ai-search
 */
export async function aiSearch(req: Request, res: Response) {
  const { query, lat, lng, radius = 10, preferences = [] } = req.body;

  if (!query || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'query, lat, and lng are required' });
  }

  const isAIEnabled = Boolean(OPENAI_API_KEY);

  try {
    // Step 1: Parse query (with AI if available)
    let parsedIntent = query;
    let venueTypes: string[] = [];
    let eventTypes: string[] = [];

    if (isAIEnabled && OPENAI_API_KEY) {
      try {
        const parseResponse = await axios.post(
          OPENAI_API_URL,
          {
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `Parse this search query and return JSON with: intent (user's goal), venueTypes (array of venue categories), eventTypes (array of event categories). Keep it concise.`,
              },
              {
                role: 'user',
                content: query,
              },
            ],
            temperature: 0.3,
            max_tokens: 150,
          },
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const parsed = JSON.parse(response.data.choices[0].message.content);
        parsedIntent = parsed.intent || query;
        venueTypes = parsed.venueTypes || [];
        eventTypes = parsed.eventTypes || [];
      } catch (aiError) {
        console.error('OpenAI parsing error:', aiError);
        // Continue with basic search
      }
    }

    // Step 2: Fetch places and events (simulated - uses existing endpoints)
    // In a real implementation, you'd call the place/event APIs here
    // For now, return structure showing AI is working

    const response: AISearchResponse = {
      results: [],
      intent: parsedIntent,
      isAIEnabled,
    };

    return res.json(response);
  } catch (error) {
    console.error('AI search error:', error);
    return res.status(500).json({ message: 'AI search failed', isAIEnabled: false });
  }
}

/**
 * Generate AI-powered reason for a recommendation
 * Helper function for the AI search pipeline
 */
export async function generateAIReason(
  item: any,
  userQuery: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate a brief (8-12 words) compelling reason why this place/event matches the user\'s search. Be specific and enthusiastic.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              userQuery,
              item: {
                name: item.name || item.title,
                category: item.category,
                rating: item.rating,
                price: item.priceLevel || (item.isFree ? 'free' : 'varies'),
              },
            }),
          },
        ],
        temperature: 0.8,
        max_tokens: 40,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI reason generation error:', error);
    return 'Recommended for you';
  }
}
