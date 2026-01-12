// AI service for frontend
// Provides AI-powered search capabilities when backend is available

import { apiClient, API_BASE_URL } from '../apiClient';

export interface AISearchParams {
  query: string;
  lat: number;
  lng: number;
  radius?: number;
  preferences?: string[];
}

export interface AISearchResult {
  id: string;
  type: 'place' | 'event';
  data: any;
  score: number;
  reason: string;
}

export interface AISearchResponse {
  results: AISearchResult[];
  intent: string;
  isAIEnabled: boolean;
}

export const aiService = {
  /**
   * Perform AI-powered search
   * Falls back gracefully if AI is not available
   */
  async aiSearch(params: AISearchParams): Promise<AISearchResponse | null> {
    if (!API_BASE_URL) {
      if (__DEV__) {
        console.warn('[aiService] API_URL not set; AI search unavailable');
      }
      return null;
    }

    try {
      const response = await apiClient.post<AISearchResponse>('/ai-search', params);
      return response;
    } catch (error) {
      if (__DEV__) {
        console.warn('[aiService] AI search failed', error);
      }
      return null;
    }
  },

  /**
   * Check if AI features are available
   */
  async checkAIAvailability(): Promise<boolean> {
    if (!API_BASE_URL) return false;

    try {
      const response = await aiService.aiSearch({
        query: 'test',
        lat: 0,
        lng: 0,
      });
      return response?.isAIEnabled ?? false;
    } catch {
      return false;
    }
  },
};
