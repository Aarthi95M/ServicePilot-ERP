// ============================================================
// app/layout.tsx
//
// WHAT THIS FILE IS:
// The root layout — wraps EVERY page in the entire application.
// This is where you set up global providers, fonts, and metadata.
//
// .NET EQUIVALENT:
// Like _Layout.cshtml in MVC — the outer shell every page uses.
// Or like Program.cs where you configure services.
//
// WHAT IT DOES:
// 1. Sets the Inter font for the entire app
// 2. Wraps everything in QueryClientProvider (React Query)
//    → Like registering services in Program.cs
// 3. Sets page metadata (title, favicon)
//
// PROVIDERS IN REACT:
// A Provider is a component that makes something available to
// ALL its child components without passing it as props.
// React Query needs QueryClientProvider at the top level so
// every page can use useQuery() and useMutation().
//
// .NET EQUIVALENT of Providers:
// Like services.AddSingleton() — register once, use everywhere.
// ============================================================

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastProvider } from '@/components/shared/ToastProvider';

// ── Font setup ───────────────────────────────────────────────
// Inter — professional, clean font used by Stripe, Linear, Vercel
// Next.js downloads and self-hosts this — no Google Fonts request
// at runtime (faster, more private, works offline)
const inter = Inter({
  subsets: ['latin'],
  // Only load the weights we actually use (performance)
  weight: ['400', '500', '600', '700'],
  // CSS variable so Tailwind can use it: font-sans
  variable: '--font-inter',
  display: 'swap', // show fallback font while Inter loads
});

// ── Page metadata ────────────────────────────────────────────
// Sets <title> and <meta> tags for all pages
// Individual pages can override this with their own metadata
export const metadata: Metadata = {
  title: {
    default: 'ServicePilot',
    // Page-specific title format: "Dashboard | ServicePilot"
    template: '%s | ServicePilot',
  },
  description: 'Workforce & Field Service Management Platform',
};

// ── Root layout component ────────────────────────────────────
// children = whatever page the user is currently on
// This component wraps that page with fonts, providers etc.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`}>
        {/*
          QueryProvider wraps everything so React Query works.
          See: components/providers/QueryProvider.tsx

          .NET equivalent: services.AddMemoryCache() in Program.cs
          — register the cache service so controllers can use it.
        */}
        <QueryProvider>
 {/*
            ToastProvider wraps everything — this is what makes
            useToast() work in ANY component in the app.
            The toast renders at top-center, above all content.
            .NET equivalent: like a global middleware that can
            inject a notification into any response
          */}
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
