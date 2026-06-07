// lib/api/client.ts
// Axios instance shared by all API modules.
// Automatically injects the JWT from SecureStore into every request.
// On 401 → clears auth and redirects to login.

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// API URL resolution order:
//   1. EXPO_PUBLIC_API_URL env var (set in .env.local on your machine)
//   2. Android emulator default → 10.0.2.2 maps to the host's localhost
//
// ── How to set for a physical device ──────────────────────────────────────
//  a) Find your PC's LAN IP:  ipconfig  (look for IPv4, e.g. 192.168.1.172)
//  b) Create/edit .env.local in the project root:
//       EXPO_PUBLIC_API_URL=http://192.168.1.172:5113/api
//  c) Also set the .NET API to listen on all interfaces (see launchSettings.json)
//  d) Restart Metro:  npx expo start --clear
// ──────────────────────────────────────────────────────────────────────────
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:5113/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach JWT ──────────────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('sp-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('sp-token');
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
