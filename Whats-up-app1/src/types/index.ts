// ============================================
// Core Entity Types for What's Up App
// ============================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  savedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  category: PlaceCategory;
  subcategory?: string;
  location: Location;
  imageUrls: string[];
  rating: number;
  reviewCount: number;
  priceLevel: 1 | 2 | 3 | 4; // $ to $$$$
  aiScore?: number; // AI-curated relevance score
  tags: string[];
  hours?: BusinessHours;
  contact?: ContactInfo;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  location: Location;
  placeId?: string;
  place?: Place;
  imageUrls: string[];
  startDate: string;
  endDate?: string;
  isAllDay: boolean;
  price?: number;
  isFree: boolean;
  attendeeCount: number;
  maxAttendees?: number;
  aiScore?: number;
  tags: string[];
  isSaved?: boolean;
  isAttending?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  user: User;
  placeId?: string;
  eventId?: string;
  rating: number;
  title?: string;
  content: string;
  imageUrls?: string[];
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  isClosed?: boolean;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
}

// ============================================
// Categories
// ============================================

export type PlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'club'
  | 'hotel'
  | 'museum'
  | 'gallery'
  | 'park'
  | 'beach'
  | 'shopping'
  | 'spa'
  | 'gym'
  | 'entertainment'
  | 'other';

export type EventCategory =
  | 'music'
  | 'art'
  | 'food'
  | 'sports'
  | 'nightlife'
  | 'culture'
  | 'wellness'
  | 'networking'
  | 'workshop'
  | 'festival'
  | 'market'
  | 'other';

// ============================================
// Feed & Discovery
// ============================================

export type FeedItemType = 'place' | 'event';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  data: Place | Event;
  reason?: string; // AI-generated reason for recommendation
  score: number;
}

export interface SearchResult {
  id: string;
  type: FeedItemType;
  data: Place | Event;
  matchScore: number;
  highlightedFields?: string[];
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}



