/**
 * Query Normalization Layer
 * 
 * Handles lowercasing, emoji mapping, slang expansion, punctuation normalization,
 * tokenization, stop word removal, and spelling correction.
 * 
 * Pure functions, no AI, deterministic.
 */

export interface NormalizedQuery {
  original: string;
  normalized: string;
  tokens: string[];
  removedStopWords: string[];
  detectedEmojis: Map<string, string>;
  appliedSlangMappings: Map<string, string>;
}

// Emoji to keyword mapping
const EMOJI_MAP: Record<string, string> = {
  '🍕': 'pizza',
  '🍺': 'beer',
  '🍻': 'drinks',
  '🍷': 'wine',
  '🍸': 'cocktails',
  '☕': 'coffee',
  '🎵': 'music',
  '🎶': 'music',
  '🎤': 'live music',
  '🎸': 'live music',
  '🎨': 'art',
  '🖼️': 'art',
  '🍔': 'burger',
  '🍜': 'ramen',
  '🍣': 'sushi',
  '🌮': 'tacos',
  '🍰': 'dessert',
  '🍦': 'ice cream',
  '🏋️': 'gym',
  '🧘': 'yoga',
  '⚽': 'sports',
  '🏀': 'basketball',
  '🎭': 'theater',
  '🎪': 'festival',
  '🎉': 'party',
  '💃': 'dance',
  '🌃': 'nightlife',
  '🌆': 'downtown',
  '🏖️': 'beach',
  '🏞️': 'park',
  '🍿': 'movies',
  '🎬': 'cinema',
};

// Youth slang to standard term mapping
const YOUTH_SLANG: Record<string, string> = {
  'lit': 'lively',
  'fire': 'amazing',
  'sick': 'cool',
  'dope': 'cool',
  'hype': 'exciting',
  'vibes': 'atmosphere',
  'lowkey': 'subtle',
  'highkey': 'very',
  'slaps': 'excellent',
  'hits different': 'unique',
  'no cap': 'seriously',
  'bet': 'yes',
  'based': 'authentic',
  'mid': 'mediocre',
  'goated': 'best',
  'bussin': 'delicious',
  'smacks': 'delicious',
  'bangs': 'excellent',
  'slept on': 'underrated',
  'gas': 'great',
  'finna': 'going to',
  'tryna': 'trying to',
};

// Abbreviations and text speak
const ABBREVIATIONS: Record<string, string> = {
  'rn': 'right now',
  'tn': 'tonight',
  'tmrw': 'tomorrow',
  'wknd': 'weekend',
  'asap': 'right now',
  'tho': 'though',
  'tix': 'tickets',
  'w/': 'with',
  'w/o': 'without',
  'btw': 'by the way',
  'ngl': 'not gonna lie',
  'tbh': 'to be honest',
  'imo': 'in my opinion',
  'idk': 'i dont know',
  'bc': 'because',
};

// Common misspellings to correct forms
const COMMON_TYPOS: Record<string, string> = {
  'coffe': 'coffee',
  'caffee': 'coffee',
  'resturant': 'restaurant',
  'restaraunt': 'restaurant',
  'resterant': 'restaurant',
  'restraunt': 'restaurant',
  'restraunt': 'restaurant',
  'museam': 'museum',
  'musem': 'museum',
  'teatre': 'theater',
  'theator': 'theater',
  'concrt': 'concert',
  'consert': 'concert',
  'festivel': 'festival',
  'festval': 'festival',
};

// Stop words to remove (but preserve location/time markers)
const STOP_WORDS = new Set<string>([
  'a', 'an', 'the',
  'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had',
  'do', 'does', 'did',
  'will', 'would', 'should', 'could',
  'can', 'may', 'might',
  'of', 'to', 'from',
  'and', 'or', 'but',
  'if', 'then',
  'this', 'that', 'these', 'those',
  'it', 'its',
  'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'our', 'their',
  'some', 'any',
  'what', 'which', 'who',
  'show', 'find', 'get',
  'want', 'need',
  'please',
  'stuff', 'things', 'something',
]);

// Preserve these time/location markers
const PRESERVE_WORDS = new Set<string>([
  'near', 'in', 'at', 'by', 'on',
  'tonight', 'today', 'tomorrow', 'weekend',
  'now', 'later',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'open', 'close', 'closed',
  'after', 'before',
  'around', 'nearby',
]);

/**
 * Detect and map emojis to their keyword equivalents
 */
function detectAndMapEmojis(text: string): Map<string, string> {
  const emojiMap = new Map<string, string>();
  
  for (const [emoji, keyword] of Object.entries(EMOJI_MAP)) {
    if (text.includes(emoji)) {
      emojiMap.set(emoji, keyword);
    }
  }
  
  return emojiMap;
}

/**
 * Replace emojis with their keyword equivalents
 */
function replaceEmojisWithKeywords(text: string, emojiMap: Map<string, string>): string {
  let result = text;
  
  for (const [emoji, keyword] of emojiMap) {
    result = result.split(emoji).join(` ${keyword} `);
  }
  
  return result;
}

/**
 * Expand slang terms to standard terms
 */
function expandSlang(text: string): string {
  let result = text;
  
  // Apply abbreviations first (whole word)
  for (const [abbrev, expansion] of Object.entries(ABBREVIATIONS)) {
    const pattern = new RegExp(`\\b${escapeRegExp(abbrev)}\\b`, 'gi');
    result = result.replace(pattern, expansion);
  }
  
  // Apply youth slang
  for (const [slang, standard] of Object.entries(YOUTH_SLANG)) {
    const pattern = new RegExp(`\\b${escapeRegExp(slang)}\\b`, 'gi');
    result = result.replace(pattern, standard);
  }
  
  return result;
}

/**
 * Apply spelling corrections for common typos
 */
function correctCommonTypos(text: string): string {
  let result = text;
  
  for (const [typo, correct] of Object.entries(COMMON_TYPOS)) {
    const pattern = new RegExp(`\\b${escapeRegExp(typo)}\\b`, 'gi');
    result = result.replace(pattern, correct);
  }
  
  return result;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Apply fuzzy spelling correction against known categories
 */
function applyCorrectionHeuristics(tokens: string[]): string[] {
  const KNOWN_CATEGORIES = [
    'restaurant', 'cafe', 'coffee', 'bar', 'club', 'museum', 'park',
    'concert', 'festival', 'theater', 'music', 'art', 'sports',
    'nightlife', 'food', 'drinks', 'dinner', 'lunch', 'brunch',
  ];
  
  return tokens.map(token => {
    // Skip very short tokens
    if (token.length < 3) return token;
    
    // Find closest match if distance ≤ 2
    let bestMatch = token;
    let bestDistance = 3; // threshold
    
    for (const category of KNOWN_CATEGORIES) {
      const distance = levenshteinDistance(token, category);
      if (distance < bestDistance && distance <= 2) {
        bestMatch = category;
        bestDistance = distance;
      }
    }
    
    return bestMatch;
  });
}

/**
 * Filter out stop words while preserving important location/time markers
 */
function filterStopWords(tokens: string[]): { filteredTokens: string[]; removedStops: string[] } {
  const removedStops: string[] = [];
  const filteredTokens: string[] = [];
  
  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    
    // Preserve important markers
    if (PRESERVE_WORDS.has(lowerToken)) {
      filteredTokens.push(token);
      continue;
    }
    
    // Remove stop words
    if (STOP_WORDS.has(lowerToken)) {
      removedStops.push(token);
      continue;
    }
    
    // Keep everything else
    filteredTokens.push(token);
  }
  
  return { filteredTokens, removedStops };
}

/**
 * Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Main normalization function
 * 
 * Takes a raw user query and returns a normalized, cleaned version
 * with metadata about what transformations were applied.
 */
export function normalizeQuery(raw: string): NormalizedQuery {
  try {
    if (!raw || typeof raw !== 'string') {
      return {
        original: '',
        normalized: '',
        tokens: [],
        removedStopWords: [],
        detectedEmojis: new Map(),
        appliedSlangMappings: new Map(),
      };
    }
    
    // 1. Detect emojis before we remove them
    const detectedEmojis = detectAndMapEmojis(raw);
    
    // 2. Replace emojis with keywords
    let normalized = replaceEmojisWithKeywords(raw, detectedEmojis);
    
    // 3. Lowercasing
    normalized = normalized.toLowerCase().trim();
    
    // 4. Normalize unicode apostrophes
    normalized = normalized.replace(/[\u2019']/g, "'");
    
    // 5. Punctuation normalization (keep hyphens and apostrophes)
    normalized = normalized.replace(/[^\w\s'\-]/g, ' ');
    normalized = normalized.replace(/\s+/g, ' ');
    
    // 6. Track slang before expansion
    const appliedSlangMappings = new Map<string, string>();
    const beforeSlang = normalized;
    
    // 7. Expand slang
    normalized = expandSlang(normalized);
    
    // Track what slang was applied
    for (const [slang, expansion] of Object.entries(YOUTH_SLANG)) {
      if (beforeSlang.includes(slang) && !normalized.includes(slang)) {
        appliedSlangMappings.set(slang, expansion);
      }
    }
    for (const [abbrev, expansion] of Object.entries(ABBREVIATIONS)) {
      if (beforeSlang.includes(abbrev) && !normalized.includes(abbrev)) {
        appliedSlangMappings.set(abbrev, expansion);
      }
    }
    
    // 8. Correct common typos
    normalized = correctCommonTypos(normalized);
    
    // 9. Tokenization
    const allTokens = normalized.split(' ').filter(t => t.length > 0);
    
    // 10. Stop word removal
    const { filteredTokens, removedStops } = filterStopWords(allTokens);
    
    // 11. Spelling correction (fuzzy match against known categories)
    const correctedTokens = applyCorrectionHeuristics(filteredTokens);
    
    // 12. Rebuild normalized query
    const finalNormalized = correctedTokens.join(' ');
    
    return {
      original: raw,
      normalized: finalNormalized,
      tokens: correctedTokens,
      removedStopWords: removedStops,
      detectedEmojis,
      appliedSlangMappings,
    };
  } catch (error) {
    // Fail gracefully
    console.error('[QueryNormalizer] Error:', error);
    return {
      original: raw,
      normalized: raw.toLowerCase().trim(),
      tokens: raw.toLowerCase().trim().split(' ').filter(Boolean),
      removedStopWords: [],
      detectedEmojis: new Map(),
      appliedSlangMappings: new Map(),
    };
  }
}

/**
 * Detect language (basic implementation - can be enhanced)
 */
export function detectLanguage(text: string): string {
  // Basic detection - can be enhanced with proper i18n library
  // For MVP, assume English
  
  // Spanish markers
  if (/\b(restaurantes|cerca|de|mi|comer|comida)\b/i.test(text)) {
    return 'es';
  }
  
  // French markers
  if (/\b(restaurant|cafe|pres|de|moi)\b/i.test(text)) {
    return 'fr';
  }
  
  return 'en'; // Default to English
}

/**
 * Helper: Get all slang mappings for documentation/debugging
 */
export function getAllSlangMappings(): Record<string, string> {
  return { ...YOUTH_SLANG, ...ABBREVIATIONS };
}

/**
 * Helper: Get all emoji mappings for documentation/debugging
 */
export function getAllEmojiMappings(): Record<string, string> {
  return EMOJI_MAP;
}
