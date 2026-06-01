'use client';
// components/shared/LeafletMap.tsx
//
// SSR-safe Leaflet map using next/dynamic with { ssr: false }.
//
// Leaflet accesses `window` / `document` on import, which crashes during
// Next.js server-side rendering.  We wrap the actual map in a dynamic
// import so the browser only loads it after hydration.
//
// USAGE:
//   import { LeafletMap } from '@/components/shared/LeafletMap'
//
//   <LeafletMap
//     center={[25.2048, 55.2708]}
//     zoom={12}
//     markers={[{ lat: 25.2048, lng: 55.2708, label: 'Ahmed', color: 'green' }]}
//     height="320px"
//   />

import dynamic from 'next/dynamic';

export interface MapMarker {
  lat:    number;
  lng:    number;
  label:  string;
  color?: 'green' | 'amber' | 'red' | 'blue' | 'gray';
  popup?: string;
}

export interface LeafletMapProps {
  center?:  [number, number];
  zoom?:    number;
  markers?: MapMarker[];
  height?:  string;
}

// Lazy-loaded component — only runs in the browser
const LeafletMapClient = dynamic(
  () => import('./LeafletMapClient'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: '320px', width: '100%' }}
        className="flex items-center justify-center bg-[#e8f0f7]"
      >
        <div className="flex items-center gap-2 text-[13px] text-gray-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#94a3b8" strokeWidth="4"/>
            <path className="opacity-75" fill="#94a3b8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading map...
        </div>
      </div>
    ),
  }
);

export function LeafletMap(props: LeafletMapProps) {
  return <LeafletMapClient {...props} />;
}
