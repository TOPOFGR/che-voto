"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export function Heatmap({
  points,
  center,
  zoom,
}: {
  points: MapPoint[];
  center: [number, number];
  zoom: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const leaflet = await import("leaflet");
      // The ESM namespace re-exports named helpers, but leaflet.heat patches
      // `heatLayer` onto the default export object — so use that instance.
      const L = leaflet.default ?? leaflet;
      // leaflet.heat has no type declarations; it patches L.heatLayer at runtime.
      // @ts-expect-error -- side-effect import of an untyped module
      await import("leaflet.heat");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      if (points.length > 0) {
        const heat = L.heatLayer(
          points.map((p) => [p.lat, p.lng, p.weight] as [number, number, number]),
          {
            radius: 28,
            blur: 20,
            maxZoom: 17,
            gradient: { 0.2: "#a4e5c9", 0.4: "#6ed3ab", 0.65: "#35bc8b", 1: "#0a7050" },
          },
        );
        heat.addTo(map);

        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points, center, zoom]);

  return <div ref={containerRef} className="w-full h-full" />;
}
