import { create } from "zustand";
import { User } from "firebase/auth";

interface AuthState {
  user: User | null;
  dbUser: any | null; // Backend user data
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setDbUser: (dbUser: any | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  dbUser: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setDbUser: (dbUser) => set({ dbUser }),
  setLoading: (isLoading) => set({ isLoading }),
}));
