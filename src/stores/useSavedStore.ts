import { create } from 'zustand';

export type SavedEntityType = 'place' | 'event';

export type SavedEntity = {
  id: string;
  type: SavedEntityType;
  title: string;
  imageUrl?: string;
  category?: string;
  location: { latitude: number; longitude: number };
  startDate?: string;
  endDate?: string;
  venueName?: string;
  isFree?: boolean;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  address?: string;
  isOpenNow?: boolean;
  url?: string;
  distanceMeters?: number;
  score?: number;
  reason?: string;
};

type VoteState = 'up' | 'down' | 'none';

type SavedState = {
  savedById: Record<string, SavedEntity>;
  savedOrder: string[];

  thumbsUpCountById: Record<string, number>;
  myVoteById: Record<string, VoteState>;

  isSaved: (id: string) => boolean;
  getSavedList: () => SavedEntity[];
  toggleSave: (entity: SavedEntity) => void;

  thumbsUp: (id: string) => void;
  thumbsDown: (id: string) => void;
  clearVote: (id: string) => void;
};

export const useSavedStore = create<SavedState>((set, get) => ({
  savedById: {},
  savedOrder: [],

  thumbsUpCountById: {},
  myVoteById: {},

  isSaved: (id) => Boolean(get().savedById[id]),

  getSavedList: () => {
    const { savedById, savedOrder } = get();
    return savedOrder.map((id) => savedById[id]).filter(Boolean);
  },

  toggleSave: (entity) =>
    set((state) => {
      const exists = Boolean(state.savedById[entity.id]);
      if (exists) {
        const { [entity.id]: _removed, ...rest } = state.savedById;
        return {
          savedById: rest,
          savedOrder: state.savedOrder.filter((id) => id !== entity.id),
        };
      }

      return {
        savedById: { ...state.savedById, [entity.id]: entity },
        savedOrder: [entity.id, ...state.savedOrder.filter((id) => id !== entity.id)],
      };
    }),

  thumbsUp: (id) =>
    set((state) => {
      const current = state.myVoteById[id] ?? 'none';
      const currentCount = state.thumbsUpCountById[id] ?? 0;

      // Upvote toggles on/off. If previously down, remove down and add up.
      if (current === 'up') {
        return {
          myVoteById: { ...state.myVoteById, [id]: 'none' },
          thumbsUpCountById: { ...state.thumbsUpCountById, [id]: Math.max(0, currentCount - 1) },
        };
      }

      return {
        myVoteById: { ...state.myVoteById, [id]: 'up' },
        thumbsUpCountById: { ...state.thumbsUpCountById, [id]: currentCount + 1 },
      };
    }),

  thumbsDown: (id) =>
    set((state) => {
      const current = state.myVoteById[id] ?? 'none';
      const currentCount = state.thumbsUpCountById[id] ?? 0;

      // Downvote is private: no count. If previously up, decrement the up count.
      if (current === 'down') {
        return { myVoteById: { ...state.myVoteById, [id]: 'none' } };
      }

      const next: SavedState['myVoteById'] = { ...state.myVoteById, [id]: 'down' };
      const nextCounts =
        current === 'up'
          ? { ...state.thumbsUpCountById, [id]: Math.max(0, currentCount - 1) }
          : state.thumbsUpCountById;

      return { myVoteById: next, thumbsUpCountById: nextCounts };
    }),

  clearVote: (id) =>
    set((state) => {
      const current = state.myVoteById[id] ?? 'none';
      const currentCount = state.thumbsUpCountById[id] ?? 0;
      if (current === 'up') {
        return {
          myVoteById: { ...state.myVoteById, [id]: 'none' },
          thumbsUpCountById: { ...state.thumbsUpCountById, [id]: Math.max(0, currentCount - 1) },
        };
      }
      return { myVoteById: { ...state.myVoteById, [id]: 'none' } };
    }),
}));

