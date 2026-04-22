import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserData {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: UserData | null;
  token: string | null;
  setAuth: (user: UserData, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'pharmazen-auth-storage',
    }
  )
);
