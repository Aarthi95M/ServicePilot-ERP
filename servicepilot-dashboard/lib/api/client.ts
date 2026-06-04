// ============================================================
// lib/api/client.ts
//
// WHAT THIS FILE IS:
// The single Axios instance that ALL API calls go through.
// Every endpoint function in lib/api/*.ts imports this client.
//
// .NET EQUIVALENT:
// Think of this like a configured HttpClient singleton.
// In .NET you'd do:
//   services.AddHttpClient("ServicePilot", c => {
//     c.BaseAddress = new Uri("https://api.servicepilot.ae");
//     c.DefaultRequestHeaders.Add("Authorization", "Bearer ...");
//   });
//
// HOW INTERCEPTORS WORK:
// An interceptor is middleware for HTTP requests.
// Request interceptor  → runs BEFORE every request is sent
//                     → we use it to attach the JWT token
// Response interceptor → runs AFTER every response arrives
//                     → we use it to handle 401 (token expired)
//
// .NET EQUIVALENT of interceptors:
// Like DelegatingHandler in HttpClient pipeline, or
// like ASP.NET middleware but on the CLIENT side.
// ============================================================

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/store/auth';

// ── Create the Axios instance ────────────────────────────────
// This is the equivalent of new HttpClient() with base config.
// All API calls will use this instance — never create axios
// directly in a component or hook.

const apiClient = axios.create({
  // Read base URL from environment variable.
  // In .NET: Configuration["ApiSettings:BaseUrl"]
  // The NEXT_PUBLIC_ prefix makes it available in the browser.
  // Without NEXT_PUBLIC_, the variable only exists on the server.
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5113/api',
  //'https://localhost:7001/api',

  // Timeout after 15 seconds — same as HttpClient.Timeout
  timeout: 15000,

  headers: {
    'Content-Type': 'application/json',
  },
});

// ── REQUEST INTERCEPTOR ──────────────────────────────────────
// Runs before EVERY request.
// We use it to attach the JWT token from localStorage.
//
// .NET equivalent:
// Like a DelegatingHandler that adds Authorization header:
//   protected override async Task<HttpResponseMessage> SendAsync(...)
//   {
//     request.Headers.Authorization =
//       new AuthenticationHeaderValue("Bearer", token);
//     return await base.SendAsync(request, cancellationToken);
//   }

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const storeState = useAuthStore.getState();
    // Check Zustand store first, then sessionStorage (no-remember sessions),
    // then localStorage (remembered sessions) as fallback.
    const token =
      storeState.token ??
      storeState.user?.token ??
      sessionStorage.getItem('sp-token') ??
      localStorage.getItem('sp-token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────
// Runs after EVERY response arrives.
// We use it to handle the 401 (Unauthorized) case globally.
//
// Without this, every single API hook would need to check:
//   if (error.status === 401) { router.push('/login') }
// With this, it happens automatically in ONE place.
//
// .NET equivalent:
// Like a global exception filter in ASP.NET:
//   [HandleError] or IExceptionFilter for 401 responses

apiClient.interceptors.response.use(
  // Success case — just pass the response through unchanged
  (response) => response,

  // Error case — handle specific HTTP status codes
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      localStorage.removeItem('sp-token');
      localStorage.removeItem('sp-auth');
      document.cookie = 'sp-token=; path=/; max-age=0';

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error.response?.data ?? error);
  }
);

export default apiClient;
