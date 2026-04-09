// ============================================================
// useGeocoding — Mapbox Geocoding autocomplete hook
// Uses Mapbox Search API v6 (forward geocoding)
// ============================================================
import { useState, useEffect, useRef } from "react";
import { MAPBOX_TOKEN } from "../constants";

export interface GeocodingResult {
  id: string;
  name: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  type: string; // "place" | "address" | "poi" | etc.
}

interface UseGeocodingResult {
  results: GeocodingResult[];
  loading: boolean;
}

const DEBOUNCE_MS = 350;

// Mapbox Geocoding V5 — stable, well-tested
const MAPBOX_GEOCODING_URL =
  "https://api.mapbox.com/geocoding/v5/mapbox.places";

// Córdoba, Argentina bounding box for biasing results [minLng,minLat,maxLng,maxLat]
const CORDOBA_BBOX = "-64.55,-31.70,-64.00,-31.20";

export function useGeocoding(query: string): UseGeocodingResult {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    // Not enough input
    if (!query || query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      // Abort previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // V5 endpoint: /mapbox.places/{query}.json
        const encodedQuery = encodeURIComponent(query);
        const params = new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          language: "es",
          country: "ar",
          bbox: CORDOBA_BBOX,
          limit: "5",
          types: "place,locality,neighborhood,address,poi",
        });

        const res = await fetch(
          `${MAPBOX_GEOCODING_URL}/${encodedQuery}.json?${params}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          setResults([]);
          setLoading(false);
          return;
        }

        const data = await res.json();
        const features: GeocodingResult[] = (data.features || []).map(
          (f: any) => ({
            id: f.id || Math.random().toString(),
            name: f.text || f.place_name || "",
            fullAddress: f.place_name || f.text || "",
            latitude: f.center?.[1] ?? 0,
            longitude: f.center?.[0] ?? 0,
            type: f.place_type?.[0] || "place",
          })
        );

        setResults(features);
        setLoading(false);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setResults([]);
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { results, loading };
}
