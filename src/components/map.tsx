"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapProps {
  center: [number, number];
  zoom?: number;
  className?: string;
  markers?: Array<{
    position: [number, number];
    label: string;
    type?: 'client' | 'collector' | 'destination';
    onClick?: () => void;
  }>;
  onMapReady?: (map: L.Map) => void;
}

export function Map({ center, zoom = 13, className = '', markers = [], onMapReady }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current).setView(center, zoom);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run once on mount, dependencies intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center and zoom
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach(({ position, label, type = 'client', onClick }) => {
      let icon: L.Icon | undefined;

      // Custom icons based on type
      if (type === 'collector') {
        icon = L.icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <path fill="#3b82f6" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              <text x="12" y="11" font-size="8" text-anchor="middle" fill="white">🚗</text>
            </svg>
          `),
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
      } else if (type === 'destination') {
        icon = L.icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <path fill="#ef4444" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              <text x="12" y="11" font-size="8" text-anchor="middle" fill="white">📍</text>
            </svg>
          `),
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
      }

      const marker = L.marker(position, { icon })
        .addTo(mapRef.current!)
        .bindPopup(label);

      if (onClick) {
        marker.on('click', onClick);
      }

      markersRef.current.push(marker);
    });
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '400px' }}
    />
  );
}
