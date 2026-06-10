// ============================================================
// proxy.ts  ← ROOT of project, same level as app/
// (Renamed from middleware.ts — Next.js 16 deprecated the
//  "middleware" file convention in favor of "proxy". Same
//  NextRequest/NextResponse API, same behavior.)
//
// WHAT THIS FILE IS:
// Route protection. Runs on EVERY request before the page loads.
// Redirects unauthenticated users to /login.
// Redirects already-logged-in users away from /login.
//
// .NET EQUIVALENT:
// Like [Authorize] attribute on controllers, or ASP.NET
// middleware that checks authentication before the request
// reaches your controller action:
//
//   app.Use(async (context, next) => {
//     if (!context.User.Identity.IsAuthenticated)
//       context.Response.Redirect("/login");
//     else
//       await next();
//   });
//
// HOW NEXT.JS PROXY WORKS:
// Next.js runs this file before React renders the page.
// It checks the request URL and cookies, then either:
//   - Lets the request through (NextResponse.next())
//   - Redirects to another URL (NextResponse.redirect())
//
// NOTE ON RUNTIME:
// As of Next.js 16, files named "proxy.ts" default to the
// Node.js runtime (the old "middleware.ts" convention defaulted
// to the Edge runtime, which had a bundling bug causing
// "ReferenceError: __dirname is not defined" on Vercel). This
// rename fixes that crash without changing any behavior below.
//
// WHY COOKIE INSTEAD OF LOCALSTORAGE:
// Proxy runs on the server before the page loads.
// Server code cannot access localStorage (that's browser-only).
// So we store a copy of the token in a cookie as well.
// The Zustand store (localStorage) is used by client components.
// The cookie is used by proxy for server-side route protection.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

// Routes that authenticated users shouldn't see (redirect to dashboard)
const AUTH_ROUTES = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the auth cookie — set during login
  // Cookie name 'sp-token' matches what we set in the login page
  const token = request.cookies.get('sp-token')?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Case 1: Not logged in + trying to access a protected page
  // → Redirect to /login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    // Save where they were trying to go so we can redirect back after login
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Case 2: Already logged in + trying to access /login
  // → Redirect to /dashboard (no need to see login if already in)
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Case 3: Everything is fine — let the request through
  return NextResponse.next();
}

// ── Matcher config ───────────────────────────────────────────
// Tells Next.js WHICH routes to run this proxy on.
// We skip: API routes, static files, Next.js internals, images
// This is important for performance — we only check auth on
// actual pages, not on every image or CSS file download.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
