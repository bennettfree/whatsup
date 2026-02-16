/**
 * Comprehensive Ticketmaster Classification Mapping
 * 
 * Maps our intent categories to all 6 Ticketmaster classifications:
 * - Music
 * - Sports
 * - Arts & Theatre
 * - Family
 * - Film
 * - Miscellaneous (meetups, social events, classes)
 */

export type TicketmasterClassification =
  | 'Music'
  | 'Sports'
  | 'Arts & Theatre'
  | 'Family'
  | 'Film'
  | 'Miscellaneous';

/**
 * Map our categories to Ticketmaster classifications
 * Returns multiple classifications for comprehensive coverage
 */
export function mapCategoryToTicketmasterClassifications(
  category: string
): TicketmasterClassification[] {
  const cat = category.toLowerCase();
  
  // Music & Concerts
  if (cat.includes('music') || cat.includes('concert') || cat.includes('jazz') || 
      cat.includes('dj') || cat.includes('band') || cat.includes('live music')) {
    return ['Music'];
  }
  
  // Sports & Athletics
  if (cat.includes('sport') || cat.includes('game') || cat.includes('match') ||
      cat.includes('race') || cat.includes('tournament')) {
    return ['Sports'];
  }
  
  // Arts, Theatre, Comedy
  if (cat.includes('art') || cat.includes('theater') || cat.includes('theatre') ||
      cat.includes('comedy') || cat.includes('drama') || cat.includes('play') ||
      cat.includes('opera') || cat.includes('ballet') || cat.includes('drag')) {
    return ['Arts & Theatre'];
  }
  
  // Film & Cinema
  if (cat.includes('film') || cat.includes('movie') || cat.includes('cinema') ||
      cat.includes('screening')) {
    return ['Film'];
  }
  
  // Family Events
  if (cat.includes('family') || cat.includes('kid') || cat.includes('child') ||
      cat.includes('children')) {
    return ['Family'];
  }
  
  // Social Events (Meetups, Classes, Networking)
  if (cat.includes('social') || cat.includes('meetup') || cat.includes('networking') ||
      cat.includes('class') || cat.includes('workshop') || cat.includes('trivia') ||
      cat.includes('singles') || cat.includes('speed dating')) {
    return ['Miscellaneous'];
  }
  
  // Nightlife (can be Music or Miscellaneous)
  if (cat.includes('nightlife') || cat.includes('club') || cat.includes('party')) {
    return ['Music', 'Miscellaneous'];
  }
  
  // Festivals (multiple categories)
  if (cat.includes('festival') || cat.includes('fair')) {
    return ['Music', 'Arts & Theatre', 'Miscellaneous'];
  }
  
  // Default: Search all categories for broad coverage
  return ['Music', 'Arts & Theatre', 'Miscellaneous'];
}

/**
 * Get primary classification (for single-classification queries)
 */
export function getPrimaryClassification(
  category: string
): TicketmasterClassification {
  const classifications = mapCategoryToTicketmasterClassifications(category);
  return classifications[0];
}

/**
 * Map abstract social queries to event classifications
 */
export function mapAbstractQueryToClassifications(
  query: string
): TicketmasterClassification[] {
  const q = query.toLowerCase();
  
  // Social/dating queries
  if (q.includes('meet') || q.includes('date') || q.includes('singles')) {
    return ['Miscellaneous', 'Music']; // Social events + nightlife
  }
  
  // Celebration queries
  if (q.includes('celebrate') || q.includes('birthday') || q.includes('party')) {
    return ['Music', 'Arts & Theatre', 'Miscellaneous'];
  }
  
  // Entertainment/boredom
  if (q.includes('bored') || q.includes('fun') || q.includes('entertain')) {
    return ['Music', 'Arts & Theatre', 'Sports', 'Miscellaneous'];
  }
  
  // Learning/growth
  if (q.includes('learn') || q.includes('class') || q.includes('workshop')) {
    return ['Miscellaneous', 'Arts & Theatre'];
  }
  
  // Family/kids
  if (q.includes('family') || q.includes('kid')) {
    return ['Family', 'Miscellaneous'];
  }
  
  // Default: broad search
  return ['Music', 'Arts & Theatre', 'Miscellaneous'];
}

/**
 * Get all Ticketmaster classifications (for comprehensive search)
 */
export function getAllClassifications(): TicketmasterClassification[] {
  return ['Music', 'Sports', 'Arts & Theatre', 'Family', 'Film', 'Miscellaneous'];
}

/**
 * Check if classification is valid
 */
export function isValidClassification(
  classification: string
): classification is TicketmasterClassification {
  const valid: TicketmasterClassification[] = [
    'Music',
    'Sports',
    'Arts & Theatre',
    'Family',
    'Film',
    'Miscellaneous',
  ];
  
  return valid.includes(classification as TicketmasterClassification);
}
