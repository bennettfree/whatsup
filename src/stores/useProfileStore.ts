import { create } from 'zustand';

interface ProfileState {
  profileImageUri: string | null;
  setProfileImage: (uri: string | null) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profileImageUri: null,
  setProfileImage: (uri) => set({ profileImageUri: uri }),
}));



