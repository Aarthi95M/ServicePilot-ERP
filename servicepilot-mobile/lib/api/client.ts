// lib/api/client.ts
// Axios instance shared by all API modules.
// Automatically injects the JWT from SecureStore into every request.
// On 401 → clears auth and redirects to login.

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Change this to your .NET API URL
// In development: your machine's local IP (not localhost — emulator can't reach it)
// In production: https://api.servicepilot.ae/api
export const API_BASE_URL = 'http://192.168.1.172:7223/api';
// ↑ UPDATE THIS to your dev machine's IP when testing on a physical device

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
