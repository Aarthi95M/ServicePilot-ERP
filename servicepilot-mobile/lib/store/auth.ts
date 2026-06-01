// lib/store/auth.ts
// Zustand auth store — mirrors the web app's shape.
// Token is also persisted in SecureStore (keychain-backed) so it survives app restarts.

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  userId:    string;
  companyId: string;
  email:     string;
  role:      string;
  token:     string;
}

interface AuthState {
  user:    AuthUser | null;
  token:   string | null;
  isReady: boolean;  // true once we've checked SecureStore on startup

  login:   (user: AuthUser) => Promise<void>;
  logout:  () => Promise<void>;
  hydrate: () => Promise<void>;  // call once on app start
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  token:   null,
  isReady: false,

  login: async (user) => {
    await SecureStore.setItemAsync('sp-token',   user.token);
    await SecureStore.setItemAsync('sp-user',    JSON.stringify(user));
    set({ user, token: user.token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('sp-token');
    await SecureStore.deleteItemAsync('sp-user');
    set({ user: null, token: null });
  },

  hydrate: async () => {
    try {
      const token    = await SecureStore.getItemAsync('sp-token');
      const userJson = await SecureStore.getItemAsync('sp-user');
      if (token && userJson) {
        const user = JSON.parse(userJson) as AuthUser;
        set({ user, token, isReady: true });
      } else {
        set({ isReady: true });
      }
    } catch {
      set({ isReady: true });
    }
  },
}));
