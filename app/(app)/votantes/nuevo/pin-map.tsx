"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface LatLng {
  lat: number;
  lng: number;
}

// Teardrop pin drawn as a DivIcon so we don't depend on Leaflet's default
// marker image assets (which break under bundlers). Anchored at the tip.
const PIN_HTML = `
<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z"
        fill="#e11d48" stroke="#fff" stroke-width="2"/>
  <circle cx="15" cy="15" r="5.5" fill="#fff"/>
</svg>`;

/**
 * Interactive location picker. Tap the map (or drag the pin) to set a point;
 * `value` is the controlled position and `onChange` fires on click/dragend.
 * The map initialises once; the marker syncs whenever `value` changes so the
 * GPS button and manual pin stay in agreement.
 */
export function PinMap({
  value,
  onChange,
  center,
  zoom = 15,
}: {
  value: LatLng | null;
  onChange: (c: LatLng) => void;
  center: [number, number];
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  // Keep the latest onChange without re-running the init effect.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Initialise the map exactly once.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: value ? [value.lat, value.lng] : center,
        zoom: value ? zoom : 12,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e) => {
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // Init once; `value`/`center` are only read for the initial view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync with the controlled value.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const map = mapRef.current;
      if (!map) return;
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;
      if (cancelled) return;

      if (!value) {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        return;
      }

      const pos: [number, number] = [value.lat, value.lng];
      if (!markerRef.current) {
        const icon = L.divIcon({
          className: "",
          html: PIN_HTML,
          iconSize: [30, 40],
          iconAnchor: [15, 40],
        });
        const marker = L.marker(pos, { draggable: true, icon });
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          onChangeRef.current({ lat: ll.lat, lng: ll.lng });
        });
        marker.addTo(map);
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng(pos);
      }
      map.setView(pos, Math.max(map.getZoom() ?? zoom, 15));
    })();

    return () => {
      cancelled = true;
    };
  }, [value, zoom]);

  return <div ref={containerRef} className="w-full h-full" />;
}
