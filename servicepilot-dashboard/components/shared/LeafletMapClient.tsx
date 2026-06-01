'use client';
// components/shared/LeafletMapClient.tsx
//
// The actual Leaflet implementation.  This file is ONLY ever loaded
// on the client via next/dynamic — never server-side.
//
// We import leaflet/dist/leaflet.css here.  Next.js correctly
// handles CSS module imports inside Client Components.

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { LeafletMapProps } from './LeafletMap';

const COLOR_MAP: Record<string, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
  blue:  '#3b82f6',
  gray:  '#9ca3af',
};

export default function LeafletMapClient({
  center  = [25.2048, 55.2708],  // Dubai default
  zoom    = 11,
  markers = [],
  height  = '320px',
}: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      scrollWheelZoom={false}
    >
      {/* OpenStreetMap tiles — free, no API key needed */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markers.map((m, i) => (
        <CircleMarker
          key={i}
          center={[m.lat, m.lng]}
          radius={10}
          pathOptions={{
            color:       '#fff',
            weight:      2,
            fillColor:   COLOR_MAP[m.color ?? 'blue'],
            fillOpacity: 0.9,
          }}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{m.popup ?? m.label}</span>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
