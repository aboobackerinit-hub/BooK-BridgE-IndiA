import { create } from 'zustand';
import { User } from '@/types';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));

interface UIStore {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  isDarkMode: boolean;
  setMobileMenu: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setDarkMode: (dark: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  isDarkMode: false,
  setMobileMenu: (open) => set({ isMobileMenuOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setDarkMode: (dark) => set({ isDarkMode: dark }),
}));
