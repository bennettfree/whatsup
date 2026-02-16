/**
 * Category System - Hierarchical Taxonomy
 * 
 * Defines macro → meso → micro category hierarchy for hyperlocal discovery.
 * Supports multi-label classification and extensible taxonomy.
 */

export interface CategoryDefinition {
  id: string;
  displayName: string;
  parentCategory?: string;
  level: 'macro' | 'meso' | 'micro';
  searchKeywords: string[];
  googlePlacesTypes?: string[];
  ticketmasterClassifications?: string[];
  tags: string[];
  exclusive: boolean; // Can a venue belong to multiple categories?
}

export interface VenueCategoryAssignment {
  venueId: string;
  categories: {
    primary: string;
    secondary: string[];
    tags: string[];
  };
  confidence: number;
}

/**
 * All category definitions (100+ categories)
 */
export const ALL_CATEGORIES: CategoryDefinition[] = [
  // ============================================
  // NIGHTLIFE (Macro)
  // ============================================
  
  // Bars (Meso)
  {
    id: 'bars',
    displayName: 'Bars',
    level: 'meso',
    parentCategory: 'nightlife',
    searchKeywords: ['bar', 'bars'],
    googlePlacesTypes: ['bar'],
    tags: ['nightlife', 'drinks'],
    exclusive: false,
  },
  {
    id: 'rooftop_bar',
    displayName: 'Rooftop Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['rooftop', 'skybar', 'terrace bar', 'outdoor bar', 'rooftop bar'],
    googlePlacesTypes: ['bar'],
    tags: ['outdoor', 'views', 'premium', 'nightlife'],
    exclusive: false,
  },
  {
    id: 'dive_bar',
    displayName: 'Dive Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['dive', 'dive bar', 'cheap drinks', 'local bar'],
    googlePlacesTypes: ['bar'],
    tags: ['casual', 'budget', 'authentic', 'local'],
    exclusive: false,
  },
  {
    id: 'wine_bar',
    displayName: 'Wine Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['wine', 'wine bar', 'vino', 'wine tasting'],
    googlePlacesTypes: ['bar'],
    tags: ['upscale', 'date_spot', 'wine'],
    exclusive: false,
  },
  {
    id: 'craft_beer_bar',
    displayName: 'Craft Beer Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['craft beer', 'brewery', 'taproom', 'beer bar', 'craft'],
    googlePlacesTypes: ['bar'],
    tags: ['casual', 'beer', 'local'],
    exclusive: false,
  },
  {
    id: 'speakeasy',
    displayName: 'Speakeasy',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['speakeasy', 'hidden bar', 'secret bar', 'prohibition'],
    googlePlacesTypes: ['bar'],
    tags: ['unique', 'upscale', 'hidden', 'cocktails'],
    exclusive: false,
  },
  {
    id: 'sports_bar',
    displayName: 'Sports Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['sports bar', 'watch sports', 'game', 'sports'],
    googlePlacesTypes: ['bar'],
    tags: ['casual', 'sports', 'tvs'],
    exclusive: false,
  },
  {
    id: 'karaoke_bar',
    displayName: 'Karaoke Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['karaoke', 'karaoke bar', 'singing'],
    googlePlacesTypes: ['bar'],
    tags: ['entertainment', 'social', 'nightlife'],
    exclusive: false,
  },
  {
    id: 'gay_bar',
    displayName: 'LGBTQ+ Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['gay bar', 'lgbtq', 'queer bar', 'lesbian bar'],
    googlePlacesTypes: ['bar', 'night_club'],
    tags: ['lgbtq', 'nightlife', 'inclusive'],
    exclusive: false,
  },
  {
    id: 'tiki_bar',
    displayName: 'Tiki Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['tiki', 'tiki bar', 'tropical'],
    googlePlacesTypes: ['bar'],
    tags: ['themed', 'cocktails', 'fun'],
    exclusive: false,
  },
  {
    id: 'whiskey_bar',
    displayName: 'Whiskey Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['whiskey', 'whisky', 'bourbon', 'scotch'],
    googlePlacesTypes: ['bar'],
    tags: ['upscale', 'spirits'],
    exclusive: false,
  },
  
  // Clubs (Meso)
  {
    id: 'clubs',
    displayName: 'Clubs',
    level: 'meso',
    parentCategory: 'nightlife',
    searchKeywords: ['club', 'clubs', 'nightclub'],
    googlePlacesTypes: ['night_club'],
    tags: ['nightlife', 'dance'],
    exclusive: false,
  },
  {
    id: 'edm_club',
    displayName: 'EDM Club',
    parentCategory: 'clubs',
    level: 'micro',
    searchKeywords: ['edm', 'electronic', 'techno', 'house music', 'rave'],
    googlePlacesTypes: ['night_club'],
    tags: ['dance', 'electronic', 'nightlife'],
    exclusive: false,
  },
  {
    id: 'latin_club',
    displayName: 'Latin Dance Club',
    parentCategory: 'clubs',
    level: 'micro',
    searchKeywords: ['latin', 'salsa', 'bachata', 'reggaeton', 'latin night'],
    googlePlacesTypes: ['night_club'],
    tags: ['dance', 'latin', 'nightlife'],
    exclusive: false,
  },
  {
    id: 'hiphop_club',
    displayName: 'Hip Hop Club',
    parentCategory: 'clubs',
    level: 'micro',
    searchKeywords: ['hip hop', 'rap', 'r&b'],
    googlePlacesTypes: ['night_club'],
    tags: ['dance', 'hiphop', 'nightlife'],
    exclusive: false,
  },
  
  // Lounges (Meso)
  {
    id: 'lounges',
    displayName: 'Lounges',
    level: 'meso',
    parentCategory: 'nightlife',
    searchKeywords: ['lounge', 'lounges'],
    googlePlacesTypes: ['bar', 'night_club'],
    tags: ['upscale', 'relaxed'],
    exclusive: false,
  },
  {
    id: 'jazz_lounge',
    displayName: 'Jazz Lounge',
    parentCategory: 'lounges',
    level: 'micro',
    searchKeywords: ['jazz', 'jazz club', 'live jazz', 'jazz lounge'],
    googlePlacesTypes: ['bar', 'night_club'],
    tags: ['live_music', 'upscale', 'jazz'],
    exclusive: false,
  },
  {
    id: 'hookah_lounge',
    displayName: 'Hookah Lounge',
    parentCategory: 'lounges',
    level: 'micro',
    searchKeywords: ['hookah', 'shisha', 'hookah lounge'],
    googlePlacesTypes: ['bar', 'cafe'],
    tags: ['social', 'relaxed'],
    exclusive: false,
  },
  
  // ============================================
  // FOOD & DINING (Macro)
  // ============================================
  
  {
    id: 'food_hall',
    displayName: 'Food Hall',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['food hall', 'food court', 'market', 'food market'],
    googlePlacesTypes: ['meal_takeaway', 'restaurant'],
    tags: ['variety', 'casual', 'food'],
    exclusive: false,
  },
  {
    id: 'pop_up_kitchen',
    displayName: 'Pop-Up Kitchen',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['pop-up', 'pop up', 'temporary', 'pop up restaurant'],
    googlePlacesTypes: ['restaurant'],
    tags: ['unique', 'limited_time', 'food'],
    exclusive: false,
  },
  {
    id: 'late_night_eats',
    displayName: 'Late Night Eats',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['late night', 'open late', '24 hour', 'after midnight', '24/7'],
    googlePlacesTypes: ['restaurant', 'meal_takeaway'],
    tags: ['late_night', 'casual', 'food'],
    exclusive: false,
  },
  {
    id: 'byob',
    displayName: 'BYOB Restaurant',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['byob', 'bring your own', 'bring wine', 'bring beer'],
    googlePlacesTypes: ['restaurant'],
    tags: ['budget', 'casual', 'unique'],
    exclusive: false,
  },
  {
    id: 'omakase',
    displayName: 'Omakase',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['omakase', 'sushi bar', 'chef\'s choice', 'chef choice'],
    googlePlacesTypes: ['restaurant'],
    tags: ['upscale', 'japanese', 'sushi'],
    exclusive: false,
  },
  {
    id: 'food_truck',
    displayName: 'Food Truck',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['food truck', 'mobile food', 'truck', 'street food'],
    googlePlacesTypes: ['meal_takeaway'],
    tags: ['casual', 'budget', 'outdoor', 'food'],
    exclusive: false,
  },
  {
    id: 'brunch_spot',
    displayName: 'Brunch Spot',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['brunch', 'brunch spot', 'weekend brunch'],
    googlePlacesTypes: ['restaurant', 'cafe'],
    tags: ['brunch', 'weekend', 'food'],
    exclusive: false,
  },
  {
    id: 'ramen_shop',
    displayName: 'Ramen Shop',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['ramen', 'ramen shop', 'noodles'],
    googlePlacesTypes: ['restaurant'],
    tags: ['japanese', 'casual', 'food'],
    exclusive: false,
  },
  {
    id: 'taco_spot',
    displayName: 'Taco Spot',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['taco', 'tacos', 'taqueria'],
    googlePlacesTypes: ['restaurant'],
    tags: ['mexican', 'casual', 'food'],
    exclusive: false,
  },
  {
    id: 'pizza_place',
    displayName: 'Pizza Place',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['pizza', 'pizzeria', 'slice'],
    googlePlacesTypes: ['restaurant', 'meal_takeaway'],
    tags: ['italian', 'casual', 'food'],
    exclusive: false,
  },
  {
    id: 'steakhouse',
    displayName: 'Steakhouse',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['steak', 'steakhouse', 'steaks'],
    googlePlacesTypes: ['restaurant'],
    tags: ['upscale', 'american', 'food'],
    exclusive: false,
  },
  {
    id: 'seafood_restaurant',
    displayName: 'Seafood Restaurant',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['seafood', 'fish', 'oyster', 'oysters'],
    googlePlacesTypes: ['restaurant'],
    tags: ['seafood', 'food'],
    exclusive: false,
  },
  {
    id: 'vegan_restaurant',
    displayName: 'Vegan Restaurant',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['vegan', 'plant-based', 'plant based'],
    googlePlacesTypes: ['restaurant'],
    tags: ['vegan', 'healthy', 'food'],
    exclusive: false,
  },
  {
    id: 'farm_to_table',
    displayName: 'Farm-to-Table',
    parentCategory: 'dining',
    level: 'micro',
    searchKeywords: ['farm to table', 'farm-to-table', 'local ingredients', 'seasonal'],
    googlePlacesTypes: ['restaurant'],
    tags: ['upscale', 'local', 'organic'],
    exclusive: false,
  },
  
  // ============================================
  // COFFEE & CAFES (Macro)
  // ============================================
  
  {
    id: 'study_cafe',
    displayName: 'Study Cafe',
    parentCategory: 'cafe',
    level: 'micro',
    searchKeywords: ['study', 'quiet cafe', 'work cafe', 'student cafe', 'study spot'],
    googlePlacesTypes: ['cafe'],
    tags: ['quiet', 'wifi', 'work-friendly'],
    exclusive: false,
  },
  {
    id: 'coworking_cafe',
    displayName: 'Co-Working Cafe',
    parentCategory: 'cafe',
    level: 'micro',
    searchKeywords: ['coworking', 'work cafe', 'laptop friendly', 'remote work'],
    googlePlacesTypes: ['cafe'],
    tags: ['work-friendly', 'wifi', 'outlets'],
    exclusive: false,
  },
  {
    id: 'specialty_coffee',
    displayName: 'Specialty Coffee',
    parentCategory: 'cafe',
    level: 'micro',
    searchKeywords: ['specialty coffee', 'third wave', 'pour over', 'single origin'],
    googlePlacesTypes: ['cafe'],
    tags: ['premium', 'coffee', 'artisan'],
    exclusive: false,
  },
  {
    id: 'cat_cafe',
    displayName: 'Cat Cafe',
    parentCategory: 'cafe',
    level: 'micro',
    searchKeywords: ['cat cafe', 'cats', 'kitten cafe'],
    googlePlacesTypes: ['cafe'],
    tags: ['unique', 'pets', 'social'],
    exclusive: false,
  },
  {
    id: 'book_cafe',
    displayName: 'Book Cafe',
    parentCategory: 'cafe',
    level: 'micro',
    searchKeywords: ['book cafe', 'bookstore cafe', 'reading cafe', 'books'],
    googlePlacesTypes: ['cafe', 'book_store'],
    tags: ['quiet', 'books', 'cozy'],
    exclusive: false,
  },
  {
    id: 'dessert_cafe',
    displayName: 'Dessert Cafe',
    parentCategory: 'cafe',
    level: 'micro',
    searchKeywords: ['dessert', 'pastry', 'bakery', 'sweets', 'cake'],
    googlePlacesTypes: ['cafe', 'bakery'],
    tags: ['dessert', 'sweet', 'casual'],
    exclusive: false,
  },
  
  // ============================================
  // EVENTS - MUSIC (Macro)
  // ============================================
  
  {
    id: 'underground_show',
    displayName: 'Underground Show',
    parentCategory: 'music',
    level: 'micro',
    searchKeywords: ['underground', 'basement show', 'house show', 'diy'],
    ticketmasterClassifications: ['Music'],
    tags: ['alternative', 'indie', 'local', 'event'],
    exclusive: false,
  },
  {
    id: 'open_mic',
    displayName: 'Open Mic Night',
    parentCategory: 'music',
    level: 'micro',
    searchKeywords: ['open mic', 'open mic night', 'mic night', 'open mike'],
    ticketmasterClassifications: ['Music'],
    tags: ['recurring', 'free', 'community', 'event'],
    exclusive: false,
  },
  {
    id: 'jazz_night',
    displayName: 'Jazz Night',
    parentCategory: 'music',
    level: 'micro',
    searchKeywords: ['jazz', 'jazz night', 'live jazz'],
    ticketmasterClassifications: ['Music'],
    tags: ['live_music', 'jazz', 'event'],
    exclusive: false,
  },
  {
    id: 'dj_night',
    displayName: 'DJ Night',
    parentCategory: 'music',
    level: 'micro',
    searchKeywords: ['dj', 'dj night', 'djs', 'disc jockey'],
    ticketmasterClassifications: ['Music'],
    tags: ['dance', 'electronic', 'nightlife', 'event'],
    exclusive: false,
  },
  {
    id: 'acoustic_show',
    displayName: 'Acoustic Show',
    parentCategory: 'music',
    level: 'micro',
    searchKeywords: ['acoustic', 'unplugged', 'acoustic show'],
    ticketmasterClassifications: ['Music'],
    tags: ['live_music', 'intimate', 'event'],
    exclusive: false,
  },
  {
    id: 'battle_of_bands',
    displayName: 'Battle of the Bands',
    parentCategory: 'music',
    level: 'micro',
    searchKeywords: ['battle of the bands', 'band competition'],
    ticketmasterClassifications: ['Music'],
    tags: ['competition', 'local', 'event'],
    exclusive: false,
  },
  
  // ============================================
  // EVENTS - ENTERTAINMENT (Macro)
  // ============================================
  
  {
    id: 'comedy_show',
    displayName: 'Comedy Show',
    parentCategory: 'entertainment',
    level: 'micro',
    searchKeywords: ['comedy', 'stand-up', 'standup', 'improv', 'sketch'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['entertainment', 'nightlife', 'event'],
    exclusive: false,
  },
  {
    id: 'drag_show',
    displayName: 'Drag Show',
    parentCategory: 'entertainment',
    level: 'micro',
    searchKeywords: ['drag', 'drag show', 'drag brunch', 'drag queen'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['lgbtq', 'entertainment', 'event'],
    exclusive: false,
  },
  {
    id: 'magic_show',
    displayName: 'Magic Show',
    parentCategory: 'entertainment',
    level: 'micro',
    searchKeywords: ['magic', 'magician', 'magic show', 'illusion'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['entertainment', 'family', 'event'],
    exclusive: false,
  },
  {
    id: 'burlesque',
    displayName: 'Burlesque Show',
    parentCategory: 'entertainment',
    level: 'micro',
    searchKeywords: ['burlesque', 'burlesque show', 'cabaret'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['entertainment', 'nightlife', 'event'],
    exclusive: false,
  },
  
  // ============================================
  // EVENTS - ART & CULTURE (Macro)
  // ============================================
  
  {
    id: 'art_walk',
    displayName: 'Art Walk',
    parentCategory: 'art',
    level: 'micro',
    searchKeywords: ['art walk', 'gallery walk', 'first friday', 'gallery night'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['free', 'art', 'community', 'event'],
    exclusive: false,
  },
  {
    id: 'gallery_opening',
    displayName: 'Gallery Opening',
    parentCategory: 'art',
    level: 'micro',
    searchKeywords: ['gallery opening', 'art opening', 'exhibition opening'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['art', 'free', 'social', 'event'],
    exclusive: false,
  },
  {
    id: 'film_screening',
    displayName: 'Film Screening',
    parentCategory: 'entertainment',
    level: 'micro',
    searchKeywords: ['film screening', 'movie screening', 'indie film'],
    ticketmasterClassifications: ['Film'],
    tags: ['film', 'cultural', 'event'],
    exclusive: false,
  },
  {
    id: 'poetry_reading',
    displayName: 'Poetry Reading',
    parentCategory: 'art',
    level: 'micro',
    searchKeywords: ['poetry', 'poetry reading', 'spoken word', 'slam poetry'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['literary', 'cultural', 'event'],
    exclusive: false,
  },
  
  // ============================================
  // EVENTS - SOCIAL & COMMUNITY (Macro)
  // ============================================
  
  {
    id: 'trivia_night',
    displayName: 'Trivia Night',
    parentCategory: 'social',
    level: 'micro',
    searchKeywords: ['trivia', 'quiz night', 'pub quiz', 'trivia night'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['recurring', 'social', 'bar', 'event'],
    exclusive: false,
  },
  {
    id: 'watch_party',
    displayName: 'Watch Party',
    parentCategory: 'social',
    level: 'micro',
    searchKeywords: ['watch party', 'viewing party', 'game watch', 'watch together'],
    ticketmasterClassifications: ['Sports', 'Miscellaneous'],
    tags: ['social', 'sports', 'event'],
    exclusive: false,
  },
  {
    id: 'meetup',
    displayName: 'Meetup',
    parentCategory: 'social',
    level: 'micro',
    searchKeywords: ['meetup', 'meet-up', 'social gathering', 'get together'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['social', 'networking', 'event'],
    exclusive: false,
  },
  {
    id: 'networking_event',
    displayName: 'Networking Event',
    parentCategory: 'social',
    level: 'micro',
    searchKeywords: ['networking', 'business networking', 'professional'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['networking', 'professional', 'event'],
    exclusive: false,
  },
  {
    id: 'startup_event',
    displayName: 'Startup Event',
    parentCategory: 'networking',
    level: 'micro',
    searchKeywords: ['startup', 'tech meetup', 'entrepreneur', 'pitch night'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['networking', 'tech', 'event'],
    exclusive: false,
  },
  {
    id: 'speed_dating',
    displayName: 'Speed Dating',
    parentCategory: 'social',
    level: 'micro',
    searchKeywords: ['speed dating', 'singles event', 'dating event'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['dating', 'social', 'event'],
    exclusive: false,
  },
  {
    id: 'game_night',
    displayName: 'Game Night',
    parentCategory: 'social',
    level: 'micro',
    searchKeywords: ['game night', 'board games', 'board game night', 'tabletop'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['social', 'games', 'casual', 'event'],
    exclusive: false,
  },
  
  // ============================================
  // EVENTS - FESTIVALS & OUTDOOR (Macro)
  // ============================================
  
  {
    id: 'street_festival',
    displayName: 'Street Festival',
    parentCategory: 'festival',
    level: 'micro',
    searchKeywords: ['street fair', 'block party', 'street festival'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['outdoor', 'community', 'free', 'event'],
    exclusive: false,
  },
  {
    id: 'farmers_market',
    displayName: 'Farmers Market',
    parentCategory: 'market',
    level: 'micro',
    searchKeywords: ['farmers market', 'farmer\'s market', 'farm market'],
    googlePlacesTypes: ['tourist_attraction'],
    tags: ['outdoor', 'food', 'local', 'event'],
    exclusive: false,
  },
  {
    id: 'flea_market',
    displayName: 'Flea Market',
    parentCategory: 'market',
    level: 'micro',
    searchKeywords: ['flea market', 'vintage market', 'antique market'],
    googlePlacesTypes: ['shopping_mall', 'tourist_attraction'],
    tags: ['outdoor', 'shopping', 'vintage', 'event'],
    exclusive: false,
  },
  {
    id: 'craft_fair',
    displayName: 'Craft Fair',
    parentCategory: 'market',
    level: 'micro',
    searchKeywords: ['craft fair', 'artisan market', 'handmade market'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['art', 'shopping', 'local', 'event'],
    exclusive: false,
  },
  {
    id: 'food_festival',
    displayName: 'Food Festival',
    parentCategory: 'festival',
    level: 'micro',
    searchKeywords: ['food festival', 'food fest', 'taste of'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['food', 'outdoor', 'festival', 'event'],
    exclusive: false,
  },
  {
    id: 'music_festival',
    displayName: 'Music Festival',
    parentCategory: 'festival',
    level: 'micro',
    searchKeywords: ['music festival', 'music fest', 'concert series'],
    ticketmasterClassifications: ['Music'],
    tags: ['music', 'outdoor', 'festival', 'event'],
    exclusive: false,
  },
  
  // ============================================
  // EVENTS - WELLNESS & FITNESS (Macro)
  // ============================================
  
  {
    id: 'community_yoga',
    displayName: 'Community Yoga',
    parentCategory: 'wellness',
    level: 'micro',
    searchKeywords: ['yoga', 'free yoga', 'park yoga', 'community yoga', 'outdoor yoga'],
    ticketmasterClassifications: ['Sports'],
    tags: ['free', 'outdoor', 'wellness', 'event'],
    exclusive: false,
  },
  {
    id: 'group_run',
    displayName: 'Group Run',
    parentCategory: 'fitness',
    level: 'micro',
    searchKeywords: ['group run', 'running club', 'run club'],
    ticketmasterClassifications: ['Sports'],
    tags: ['free', 'outdoor', 'fitness', 'event'],
    exclusive: false,
  },
  {
    id: 'fitness_class',
    displayName: 'Fitness Class',
    parentCategory: 'fitness',
    level: 'micro',
    searchKeywords: ['fitness class', 'workout class', 'group fitness'],
    googlePlacesTypes: ['gym'],
    tags: ['fitness', 'wellness', 'event'],
    exclusive: false,
  },
  {
    id: 'meditation',
    displayName: 'Meditation Session',
    parentCategory: 'wellness',
    level: 'micro',
    searchKeywords: ['meditation', 'mindfulness', 'breathwork'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['wellness', 'relaxing', 'event'],
    exclusive: false,
  },
  
  // ============================================
  // EVENTS - LEARNING & WORKSHOPS (Macro)
  // ============================================
  
  {
    id: 'cooking_class',
    displayName: 'Cooking Class',
    parentCategory: 'workshop',
    level: 'micro',
    searchKeywords: ['cooking class', 'culinary class', 'cooking workshop'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['learning', 'food', 'event'],
    exclusive: false,
  },
  {
    id: 'art_workshop',
    displayName: 'Art Workshop',
    parentCategory: 'workshop',
    level: 'micro',
    searchKeywords: ['art workshop', 'painting class', 'drawing class', 'art class'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['art', 'learning', 'creative', 'event'],
    exclusive: false,
  },
  {
    id: 'dance_class',
    displayName: 'Dance Class',
    parentCategory: 'workshop',
    level: 'micro',
    searchKeywords: ['dance class', 'dance lesson', 'salsa class', 'ballet class'],
    ticketmasterClassifications: ['Arts & Theatre'],
    tags: ['dance', 'learning', 'fitness', 'event'],
    exclusive: false,
  },
  {
    id: 'tech_workshop',
    displayName: 'Tech Workshop',
    parentCategory: 'workshop',
    level: 'micro',
    searchKeywords: ['tech workshop', 'coding', 'programming', 'hackathon'],
    ticketmasterClassifications: ['Miscellaneous'],
    tags: ['tech', 'learning', 'event'],
    exclusive: false,
  },
  
  // ============================================
  // PLACES - UNIQUE VENUES (Macro)
  // ============================================
  
  {
    id: 'arcade_bar',
    displayName: 'Arcade Bar',
    parentCategory: 'bars',
    level: 'micro',
    searchKeywords: ['arcade', 'arcade bar', 'retro games', 'pinball'],
    googlePlacesTypes: ['bar', 'amusement_center'],
    tags: ['entertainment', 'casual', 'unique'],
    exclusive: false,
  },
  {
    id: 'board_game_cafe',
    displayName: 'Board Game Cafe',
    parentCategory: 'cafe',
    level: 'micro',
    searchKeywords: ['board game', 'board game cafe', 'tabletop', 'game cafe'],
    googlePlacesTypes: ['cafe'],
    tags: ['games', 'social', 'unique'],
    exclusive: false,
  },
  {
    id: 'escape_room',
    displayName: 'Escape Room',
    parentCategory: 'entertainment',
    level: 'micro',
    searchKeywords: ['escape room', 'escape game', 'puzzle room'],
    googlePlacesTypes: ['tourist_attraction', 'amusement_center'],
    tags: ['entertainment', 'group', 'unique'],
    exclusive: false,
  },
  {
    id: 'bowling_alley',
    displayName: 'Bowling Alley',
    parentCategory: 'entertainment',
    level: 'micro',
    searchKeywords: ['bowling', 'bowling alley', 'bowl'],
    googlePlacesTypes: ['bowling_alley'],
    tags: ['entertainment', 'social', 'casual'],
    exclusive: false,
  },
  {
    id: 'mini_golf',
    displayName: 'Mini Golf',
    parentCategory: 'entertainment',
    level: 'micro',
    searchKeywords: ['mini golf', 'miniature golf', 'putt putt'],
    googlePlacesTypes: ['tourist_attraction'],
    tags: ['entertainment', 'outdoor', 'family'],
    exclusive: false,
  },
  
  // ============================================
  // PLACES - OUTDOOR & RECREATION (Macro)
  // ============================================
  
  {
    id: 'hiking_trail',
    displayName: 'Hiking Trail',
    parentCategory: 'outdoor',
    level: 'micro',
    searchKeywords: ['hike', 'hiking', 'trail', 'hiking trail'],
    googlePlacesTypes: ['park', 'tourist_attraction'],
    tags: ['outdoor', 'nature', 'exercise'],
    exclusive: false,
  },
  {
    id: 'dog_park',
    displayName: 'Dog Park',
    parentCategory: 'outdoor',
    level: 'micro',
    searchKeywords: ['dog park', 'dog run', 'pet park'],
    googlePlacesTypes: ['park'],
    tags: ['outdoor', 'pets', 'free'],
    exclusive: false,
  },
  {
    id: 'botanical_garden',
    displayName: 'Botanical Garden',
    parentCategory: 'outdoor',
    level: 'micro',
    searchKeywords: ['botanical garden', 'garden', 'arboretum'],
    googlePlacesTypes: ['park', 'tourist_attraction'],
    tags: ['outdoor', 'nature', 'peaceful'],
    exclusive: false,
  },
  {
    id: 'bike_trail',
    displayName: 'Bike Trail',
    parentCategory: 'outdoor',
    level: 'micro',
    searchKeywords: ['bike trail', 'cycling', 'bike path'],
    googlePlacesTypes: ['park', 'tourist_attraction'],
    tags: ['outdoor', 'exercise', 'nature'],
    exclusive: false,
  },
  
  // ============================================
  // PLACES - SHOPPING & RETAIL (Macro)
  // ============================================
  
  {
    id: 'vintage_shop',
    displayName: 'Vintage Shop',
    parentCategory: 'shopping',
    level: 'micro',
    searchKeywords: ['vintage', 'thrift', 'second hand', 'consignment'],
    googlePlacesTypes: ['clothing_store', 'store'],
    tags: ['shopping', 'vintage', 'budget'],
    exclusive: false,
  },
  {
    id: 'record_store',
    displayName: 'Record Store',
    parentCategory: 'shopping',
    level: 'micro',
    searchKeywords: ['record store', 'vinyl', 'records', 'music store'],
    googlePlacesTypes: ['store'],
    tags: ['music', 'shopping', 'unique'],
    exclusive: false,
  },
  {
    id: 'bookstore',
    displayName: 'Bookstore',
    parentCategory: 'shopping',
    level: 'micro',
    searchKeywords: ['bookstore', 'book store', 'books'],
    googlePlacesTypes: ['book_store'],
    tags: ['books', 'shopping', 'quiet'],
    exclusive: false,
  },
  {
    id: 'comic_shop',
    displayName: 'Comic Shop',
    parentCategory: 'shopping',
    level: 'micro',
    searchKeywords: ['comic', 'comic shop', 'comic book store', 'comics'],
    googlePlacesTypes: ['book_store', 'store'],
    tags: ['comics', 'shopping', 'unique'],
    exclusive: false,
  },
  
  // ============================================
  // PLACES - WELLNESS & SPA (Macro)
  // ============================================
  
  {
    id: 'day_spa',
    displayName: 'Day Spa',
    parentCategory: 'wellness',
    level: 'micro',
    searchKeywords: ['spa', 'day spa', 'massage'],
    googlePlacesTypes: ['spa'],
    tags: ['wellness', 'relaxing', 'upscale'],
    exclusive: false,
  },
  {
    id: 'nail_salon',
    displayName: 'Nail Salon',
    parentCategory: 'wellness',
    level: 'micro',
    searchKeywords: ['nails', 'nail salon', 'manicure', 'pedicure'],
    googlePlacesTypes: ['beauty_salon'],
    tags: ['wellness', 'beauty'],
    exclusive: false,
  },
  {
    id: 'hair_salon',
    displayName: 'Hair Salon',
    parentCategory: 'wellness',
    level: 'micro',
    searchKeywords: ['hair', 'hair salon', 'haircut', 'barber'],
    googlePlacesTypes: ['hair_care', 'beauty_salon'],
    tags: ['wellness', 'beauty'],
    exclusive: false,
  },
  {
    id: 'yoga_studio',
    displayName: 'Yoga Studio',
    parentCategory: 'fitness',
    level: 'micro',
    searchKeywords: ['yoga studio', 'yoga', 'pilates'],
    googlePlacesTypes: ['gym'],
    tags: ['fitness', 'wellness', 'exercise'],
    exclusive: false,
  },
  
  // ============================================
  // PLACES - CULTURE & EDUCATION (Macro)
  // ============================================
  
  {
    id: 'art_museum',
    displayName: 'Art Museum',
    parentCategory: 'museum',
    level: 'micro',
    searchKeywords: ['art museum', 'art gallery', 'gallery'],
    googlePlacesTypes: ['museum', 'art_gallery'],
    tags: ['art', 'cultural', 'educational'],
    exclusive: false,
  },
  {
    id: 'science_museum',
    displayName: 'Science Museum',
    parentCategory: 'museum',
    level: 'micro',
    searchKeywords: ['science museum', 'science center', 'planetarium'],
    googlePlacesTypes: ['museum'],
    tags: ['science', 'educational', 'family'],
    exclusive: false,
  },
  {
    id: 'history_museum',
    displayName: 'History Museum',
    parentCategory: 'museum',
    level: 'micro',
    searchKeywords: ['history museum', 'historical', 'heritage'],
    googlePlacesTypes: ['museum'],
    tags: ['history', 'cultural', 'educational'],
    exclusive: false,
  },
  {
    id: 'aquarium',
    displayName: 'Aquarium',
    parentCategory: 'attraction',
    level: 'micro',
    searchKeywords: ['aquarium', 'sea life', 'marine'],
    googlePlacesTypes: ['aquarium', 'tourist_attraction'],
    tags: ['family', 'educational', 'indoor'],
    exclusive: false,
  },
  {
    id: 'zoo',
    displayName: 'Zoo',
    parentCategory: 'attraction',
    level: 'micro',
    searchKeywords: ['zoo', 'wildlife', 'animals'],
    googlePlacesTypes: ['zoo', 'tourist_attraction'],
    tags: ['family', 'outdoor', 'animals'],
    exclusive: false,
  },
];

/**
 * Get category by ID
 */
export function getCategoryById(id: string): CategoryDefinition | undefined {
  return ALL_CATEGORIES.find(c => c.id === id);
}

/**
 * Get all micro-categories for a parent
 */
export function getMicroCategoriesFor(parentId: string): CategoryDefinition[] {
  return ALL_CATEGORIES.filter(c => 
    c.level === 'micro' && c.parentCategory === parentId
  );
}

/**
 * Get all categories by level
 */
export function getCategoriesByLevel(level: CategoryDefinition['level']): CategoryDefinition[] {
  return ALL_CATEGORIES.filter(c => c.level === level);
}

/**
 * Get category tags
 */
export function getCategoryTags(categoryId: string): string[] {
  const category = getCategoryById(categoryId);
  return category?.tags || [];
}

/**
 * Check if category is a micro-category
 */
export function isMicroCategory(categoryId: string): boolean {
  const category = getCategoryById(categoryId);
  return category?.level === 'micro';
}

/**
 * Get parent category chain
 */
export function getCategoryChain(categoryId: string): CategoryDefinition[] {
  const chain: CategoryDefinition[] = [];
  let current = getCategoryById(categoryId);
  
  while (current) {
    chain.unshift(current);
    current = current.parentCategory ? getCategoryById(current.parentCategory) : undefined;
  }
  
  return chain;
}

/**
 * Find categories matching keywords
 */
export function findCategoriesByKeywords(keywords: string[]): CategoryDefinition[] {
  const matches: CategoryDefinition[] = [];
  
  for (const category of ALL_CATEGORIES) {
    for (const keyword of keywords) {
      if (category.searchKeywords.some(k => k.includes(keyword.toLowerCase()))) {
        matches.push(category);
        break;
      }
    }
  }
  
  return matches;
}
