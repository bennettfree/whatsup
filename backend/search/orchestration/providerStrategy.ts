/**
 * Intelligent Provider Selection
 * 
 * Determines which APIs to call based on intent confidence, temporal context,
 * and cost optimization.
 */

import type { EnhancedIntentClassification } from '../preprocessing/intentClassifier';

export interface ProviderStrategy {
  providers: ('google_places' | 'ticketmaster')[];
  primaryProvider: 'google_places' | 'ticketmaster';
  fallbackProviders: ('google_places' | 'ticketmaster')[];
  confidenceThreshold: number;
  costOptimized: boolean;
  reasoning: string[];
}

/**
 * Select optimal provider strategy based on intent and context
 */
export function selectProviderStrategy(
  intent: EnhancedIntentClassification,
  urgency: 'immediate' | 'near_future' | 'planning'
): ProviderStrategy {
  const reasoning: string[] = [];
  
  // High-confidence event intent
  if (intent.intentType === 'event' && intent.confidence > 0.75) {
    reasoning.push('High-confidence event intent');
    reasoning.push('Using Ticketmaster as primary, Google Places as fallback');
    
    return {
      providers: ['ticketmaster', 'google_places'],
      primaryProvider: 'ticketmaster',
      fallbackProviders: ['google_places'],
      confidenceThreshold: 0.75,
      costOptimized: false, // Call both for completeness
    };
  }
  
  // High-confidence place intent
  if (intent.intentType === 'place' && intent.confidence > 0.75) {
    reasoning.push('High-confidence place intent');
    reasoning.push('Using Google Places only (cost optimized)');
    
    return {
      providers: ['google_places'],
      primaryProvider: 'google_places',
      fallbackProviders: [],
      confidenceThreshold: 0.75,
      costOptimized: true,
    };
  }
  
  // Time-sensitive queries favor events
  if (urgency === 'immediate' && (intent.intentType === 'both' || intent.intentType === 'event')) {
    reasoning.push('Time-sensitive query');
    reasoning.push('Prioritizing events (Ticketmaster primary)');
    
    return {
      providers: ['ticketmaster', 'google_places'],
      primaryProvider: 'ticketmaster',
      fallbackProviders: ['google_places'],
      confidenceThreshold: 0.5,
      costOptimized: false,
    };
  }
  
  // Ambiguous or hybrid intent
  if (intent.intentType === 'both' || intent.confidence < 0.6) {
    reasoning.push('Ambiguous or hybrid intent');
    reasoning.push('Calling both providers');
    
    return {
      providers: ['google_places', 'ticketmaster'],
      primaryProvider: 'google_places',
      fallbackProviders: ['ticketmaster'],
      confidenceThreshold: 0.5,
      costOptimized: false,
    };
  }
  
  // Default: comprehensive search
  reasoning.push('Standard search');
  reasoning.push('Using both providers');
  
  return {
    providers: ['google_places', 'ticketmaster'],
    primaryProvider: 'google_places',
    fallbackProviders: [],
    confidenceThreshold: 0.5,
    costOptimized: false,
  };
}

/**
 * Determine if provider should be called based on strategy
 */
export function shouldCallProvider(
  provider: 'google_places' | 'ticketmaster',
  strategy: ProviderStrategy
): boolean {
  return strategy.providers.includes(provider);
}

/**
 * Get provider priority order
 */
export function getProviderPriorityOrder(strategy: ProviderStrategy): ('google_places' | 'ticketmaster')[] {
  const order: ('google_places' | 'ticketmaster')[] = [strategy.primaryProvider];
  
  for (const fallback of strategy.fallbackProviders) {
    if (!order.includes(fallback)) {
      order.push(fallback);
    }
  }
  
  // Add any remaining providers
  for (const provider of strategy.providers) {
    if (!order.includes(provider)) {
      order.push(provider);
    }
  }
  
  return order;
}
