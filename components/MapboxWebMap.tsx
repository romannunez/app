import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { Platform } from "react-native";

// Only import on web
let mapboxgl: typeof import("mapbox-gl") | null = null;
if (Platform.OS === "web") {
  mapboxgl = require("mapbox-gl");
}

// ─── Types ───
export type MapMarker = {
  id: string;
  longitude: number;
  latitude: number;
  color?: string;
  emoji?: string;
  title?: string;
  imageUrl?: string | null;
  category?: string;
  locationName?: string;
  isComplex?: boolean;
};

type MapboxWebMapProps = {
  accessToken: string;
  center: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
  markers?: MapMarker[];
  interactive?: boolean;
  style?: React.CSSProperties;
  onMarkerPress?: (markerId: string) => void;
  lightPreset?: "dawn" | "day" | "dusk" | "night";
  showBuildings3D?: boolean;
  mapStyle?: string;
  skipClustering?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
};

export type MapboxWebMapHandle = {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
};

// ─── Category emoji mapping (matching 398 reference) ───
const CATEGORY_EMOJIS: Record<string, string> = {
  social: "🥂",
  music: "🎶",
  spiritual: "🧘",
  education: "🎓",
  sports: "⛹️‍♂️",
  food: "🍷",
  art: "🗿",
  technology: "🤖",
  games: "🕹️",
  outdoor: "🌳",
  networking: "💼",
  workshop: "🛠️",
  conference: "🎤",
  party: "🎉",
  fair: "🎡",
  exhibition: "🏛️",
};

// ─── CSS injection (run once) ───
let cssInjected = false;
function injectMapboxCSS() {
  if (cssInjected || Platform.OS !== "web") return;
  cssInjected = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
  document.head.appendChild(link);

  // Add custom marker hover styles
  const style = document.createElement("style");
  style.textContent = `
    .pipol-map-marker:hover .pipol-pin-circle {
      transform: scale(1.1) !important;
    }
    .pipol-marker-label {
      opacity: 0;
      transform: translateX(-50%) translateY(4px) scale(0.9);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    .pipol-map-marker:hover .pipol-marker-label,
    .pipol-marker-label.pipol-label-always {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    .mapboxgl-popup-content {
      padding: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
    }
    .mapboxgl-popup-close-button { display: none !important; }
    .mapboxgl-popup-tip {
      border-top-color: rgba(255,255,255,0.95) !important;
    }
    .pipol-complex-marker {
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .pipol-complex-marker:hover {
      transform: scale(1.08);
    }
    .pipol-complex-label {
      transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .pipol-complex-label-hidden {
      opacity: 0;
      transform: translateY(6px) scale(0.85);
      pointer-events: none;
    }
    .pipol-complex-label-visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  `;
  document.head.appendChild(style);
}

// ─── Time-based light preset (matches 398 reference) ───
function getLightPresetByTime(): "dawn" | "dusk" | "night" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) return "dawn";
  if (hour >= 18 && hour < 20) return "dusk";
  return "night";
}

/**
 * Mapbox GL JS 3D Map component — web only.
 * Now with GeoJSON clustering, flyTo animations, and DOM markers
 * matching the 398 reference app exactly.
 */
export const MapboxWebMap = forwardRef<MapboxWebMapHandle, MapboxWebMapProps>(function MapboxWebMap({
  accessToken,
  center,
  zoom = 13,
  pitch = 45,
  bearing = 0,
  markers = [],
  interactive = true,
  style,
  onMarkerPress,
  lightPreset,
  showBuildings3D = true,
  mapStyle = "mapbox://styles/mapbox/standard",
  skipClustering = false,
  userLocation = null,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const domMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const isLoadedRef = useRef(false);
  const markersDataRef = useRef(markers);
  const onMarkerPressRef = useRef(onMarkerPress);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Keep refs up to date
  markersDataRef.current = markers;
  onMarkerPressRef.current = onMarkerPress;

  // Expose flyTo via ref
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, zoom?: number) => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: zoom ?? 15,
          pitch: 45,
          duration: 1500,
          essential: true,
        });
      }
    },
  }));

  // Inject CSS on mount
  useEffect(() => {
    injectMapboxCSS();
  }, []);

  // ─── Create pin DOM element matching 398 SnapMarker style ───
  const createPinElement = useCallback(
    (marker: MapMarker, alwaysShowLabel = false): HTMLDivElement => {
      const el = document.createElement("div");
      el.className = "pipol-map-marker";
      el.style.cssText =
        "cursor: pointer; position: relative; width: 52px; height: 62px;";

      const emoji = CATEGORY_EMOJIS[marker.category || ""] || "📅";
      const labelExtraClass = alwaysShowLabel ? " pipol-label-always" : "";

      el.innerHTML = `
        <div class="pipol-pin-circle" style="
          width: 48px; height: 48px; border-radius: 50%;
          background: white; border: 1.5px solid white;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; position: relative; z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          ${
            marker.imageUrl
              ? `<img src="${marker.imageUrl}" alt="Event" style="
                  width: 40px; height: 40px; border-radius: 50%;
                  object-fit: cover;
                " onerror="this.parentElement.innerHTML='<span style=\\'font-size:20px\\'>📷</span>'" />`
              : `<span style="font-size: 20px; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6;">${marker.emoji || "📷"}</span>`
          }
        </div>

        <!-- Category emoji badge (bottom-right, small) -->
        <div style="
          position: absolute; bottom: -2px; right: -2px;
          width: 24px; height: 24px; border-radius: 50%;
          background: white;
          display: flex; align-items: center; justify-content: center;
          z-index: 20; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          font-size: 12px;
        ">${emoji}</div>

        <!-- Pointed tail spike pointing to exact location -->
        <div style="
          width: 0; height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 10px solid white;
          margin: -1px auto 0 auto;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.12));
          position: relative; z-index: 5;
        "></div>

        <!-- Event title label (white bg, dark text — shown on hover or always on mini-maps) -->
        ${
          marker.title
            ? `<div class="pipol-marker-label${labelExtraClass}" style="
              position: absolute; left: 50%; top: -38px;
              max-width: 140px; min-width: 60px; z-index: 50;
            ">
              <div style="
                background: rgba(255,255,255,0.95);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                padding: 5px 10px; border-radius: 8px;
                border: 1px solid rgba(0,0,0,0.08);
                font-size: 12px; font-weight: 600; color: #374151;
                white-space: nowrap; text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              ">${marker.title}</div>
              <div style="
                position: absolute; left: 50%; bottom: -5px;
                transform: translateX(-50%);
                width: 0; height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid rgba(255,255,255,0.95);
              "></div>
            </div>`
            : ""
        }
      `;

      // Click handler with flyTo animation
      el.addEventListener("click", (e) => {
        e.stopPropagation();

        // FlyTo animation matching 398's startAnimation
        if (mapRef.current && interactive) {
          mapRef.current.flyTo({
            center: [marker.longitude, marker.latitude],
            zoom: 18,
            pitch: 60,
            duration: 1200,
            essential: true,
          });
        }

        if (onMarkerPressRef.current) {
          onMarkerPressRef.current(marker.id);
        }
      });

      return el;
    },
    [interactive]
  );

  // ─── Create complex marker DOM element (soccer field + name bubble) ───
  const createComplexPinElement = useCallback(
    (marker: MapMarker): HTMLDivElement => {
      const el = document.createElement("div");
      el.className = "pipol-complex-marker";
      el.style.cssText = "position: relative; display: flex; flex-direction: column; align-items: center; width: 130px;";

      // Use imported asset path for the cancha image
      const canchaImgUrl = require("../assets/markers/markercancha2.png");
      // Resolve the URL: in web/metro bundled context it may be a number (require) or string
      const imgSrc = typeof canchaImgUrl === "string" ? canchaImgUrl : (canchaImgUrl?.uri || canchaImgUrl?.default || canchaImgUrl);

      el.innerHTML = `
        <!-- Speech bubble with complex name -->
        <div class="pipol-complex-label pipol-complex-label-visible" style="
          display: flex; flex-direction: column; align-items: center;
          margin-bottom: 2px;
        ">
          <div style="
            background: #16A34A;
            padding: 5px 14px;
            border-radius: 10px;
            border: 1.5px solid rgba(255,255,255,0.3);
            box-shadow: 0 3px 12px rgba(0,0,0,0.25);
            max-width: 180px; min-width: 60px;
          ">
            <span style="
              font-size: 12px; font-weight: 700; color: #FFFFFF;
              letter-spacing: 0.3px; white-space: nowrap;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">${marker.title || ""}</span>
          </div>
          <!-- Triangle pointer -->
          <div style="
            width: 0; height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 7px solid #16A34A;
          "></div>
        </div>

        <!-- Soccer field image -->
        <div style="
          width: 85px; height: 55px;
          display: flex; align-items: center; justify-content: center;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.30));
        ">
          <img src="${imgSrc}" alt="Cancha" style="
            width: 85px; height: 55px; object-fit: contain;
          " />
        </div>
      `;

      // Click handler: flyTo + onMarkerPress
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (mapRef.current && interactive) {
          mapRef.current.flyTo({
            center: [marker.longitude, marker.latitude],
            zoom: 17,
            pitch: 55,
            duration: 1400,
            essential: true,
          });
        }
        if (onMarkerPressRef.current) {
          onMarkerPressRef.current(marker.id);
        }
      });

      return el;
    },
    [interactive]
  );

  // ─── Clear all DOM markers ───
  const clearDomMarkers = useCallback(() => {
    domMarkersRef.current.forEach((m) => m.remove());
    domMarkersRef.current = [];
  }, []);

  // ─── Add DOM markers for visible events at high zoom (or always on non-interactive maps) ───
  const addDomMarkers = useCallback(() => {
    if (!mapRef.current || !mapboxgl) return;

    clearDomMarkers();

    const map = mapRef.current;
    const bounds = map.getBounds();
    if (!bounds) return;

    const visibleMarkers = markersDataRef.current.filter(
      (m) =>
        bounds.contains([m.longitude, m.latitude])
    );

    const alwaysLabel = !interactive; // mini-maps: always show label

    visibleMarkers.forEach((marker) => {
      // Use complex pin for associated complexes
      const el = marker.isComplex
        ? createComplexPinElement(marker)
        : createPinElement(marker, alwaysLabel);

      const mapboxMarker = new (mapboxgl as any).Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);

      domMarkersRef.current.push(mapboxMarker);
    });
  }, [clearDomMarkers, createPinElement, createComplexPinElement, interactive]);

  // ─── Create map ───
  useEffect(() => {
    if (Platform.OS !== "web" || !mapboxgl || !containerRef.current) return;

    (mapboxgl as any).accessToken = accessToken;

    const map = new (mapboxgl as any).Map({
      container: containerRef.current,
      style: mapStyle,
      center,
      zoom,
      pitch,
      bearing,
      antialias: true,
      interactive,
      attributionControl: false,
      logoPosition: "bottom-right",
    });

    // ─── Standard style: configure lighting & 3D objects (matching 398) ───
    const isStandardStyle = mapStyle.includes("standard");

    map.on("style.load", () => {
      if (isStandardStyle) {
        try {
          const preset = lightPreset || getLightPresetByTime();
          map.setConfigProperty("basemap", "lightPreset", preset);
          if (showBuildings3D) {
            map.setConfigProperty("basemap", "show3dObjects", true);
          }
          map.setConfigProperty("basemap", "showPlaceLabels", true);
          map.setConfigProperty("basemap", "showRoadLabels", true);
          map.setConfigProperty("basemap", "showPointOfInterestLabels", true);
          map.setConfigProperty("basemap", "showTransitLabels", true);
        } catch (e) {
          console.warn("[MapboxWebMap] Error applying Standard style config:", e);
        }
      } else if (showBuildings3D) {
        // Non-Standard style: manually add 3D building extrusions (matching 398 PipolMap)
        try {
          const layers = map.getStyle()?.layers;
          const sources = map.getStyle()?.sources;
          if (!layers || !sources?.["composite"]) return;

          const hasBuildings = layers.some(
            (l: any) => l.id === "building" || l.id === "add-3d-buildings"
          );
          if (hasBuildings) return;

          const labelLayerId = layers.find(
            (layer: any) =>
              layer.type === "symbol" && layer.layout?.["text-field"]
          )?.id;

          map.addLayer(
            {
              id: "add-3d-buildings",
              source: "composite",
              "source-layer": "building",
              filter: ["==", "extrude", "true"],
              type: "fill-extrusion",
              minzoom: 15,
              paint: {
                "fill-extrusion-color": "#e6e6e6",
                "fill-extrusion-height": ["coalesce", ["get", "height"], 12],
                "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
                "fill-extrusion-opacity": 0.9,
              },
            },
            labelLayerId
          );
        } catch (e) {
          // Ignore errors for non-standard styles
        }
      }
    });

    map.on("load", () => {
      isLoadedRef.current = true;
      if (!interactive || skipClustering) {
        // Non-interactive or skipClustering: always show DOM markers immediately
        addDomMarkers();
        if (interactive && !skipClustering) return;
      } else {
        setupGeoJSONSource(map);
      }
      // Always render complex markers as persistent DOM markers
      addComplexDomMarkers();
    });

    // Zoom change: toggle between cluster layers and DOM markers (interactive maps only)
    if (interactive) {
      map.on("zoomend", () => {
        const currentZoom = map.getZoom();
        if (currentZoom >= 15) {
          // High zoom: show DOM markers, hide circle layer
          addDomMarkers();
          try {
            if (map.getLayer("unclustered-point")) {
              map.setLayoutProperty("unclustered-point", "visibility", "none");
            }
          } catch (e) {}
        } else {
          // Low zoom: show circle layer, remove DOM markers
          clearDomMarkers();
          try {
            if (map.getLayer("unclustered-point")) {
              map.setLayoutProperty("unclustered-point", "visibility", "visible");
            }
          } catch (e) {}
        }
      });

      map.on("moveend", () => {
        if (map.getZoom() >= 15) {
          addDomMarkers();
        }
      });
    }

    mapRef.current = map;

    return () => {
      clearDomMarkers();
      isLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, interactive, showBuildings3D, mapStyle, skipClustering]);

  // ─── Setup GeoJSON source with clustering (matching 398 PipolMap) ───
  const setupGeoJSONSource = useCallback(
    (map: mapboxgl.Map) => {
      const geojson = markersToGeoJSON(markersDataRef.current);

      if (map.getSource("events")) return;

      map.addSource("events", {
        type: "geojson",
        data: geojson as any,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circle layer (white bubbles matching 398)
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#ffffff",
          "circle-stroke-color": "rgba(0,0,0,0.13)",
          "circle-stroke-width": 2,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            10,
            20,
            25,
            28,
          ],
        },
      });

      // Cluster count text layer
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["to-string", ["get", "point_count_abbreviated"]],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#444" },
      });

      // Unclustered points (simple circles for low-zoom, below 15)
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#ffffff",
          "circle-radius": 10,
          "circle-stroke-color": "rgba(0,0,0,0.13)",
          "circle-stroke-width": 2,
        },
      });

      // Click on cluster → expand
      map.on("click", "clusters", (e: any) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0]?.properties?.cluster_id;
        (map.getSource("events") as any).getClusterExpansionZoom(
          clusterId,
          (err: any, expandZoom: number) => {
            if (err) return;
            map.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: expandZoom,
            });
          }
        );
      });

      // Click on unclustered point → flyTo + onMarkerPress
      map.on("click", "unclustered-point", (e: any) => {
        const feature = e.features?.[0];
        if (feature) {
          const coords = (feature.geometry as any).coordinates as [
            number,
            number,
          ];

          // FlyTo animation matching 398
          map.flyTo({
            center: coords,
            zoom: 18,
            pitch: 60,
            duration: 1200,
            essential: true,
          });

          if (onMarkerPressRef.current) {
            onMarkerPressRef.current(feature.properties?.id);
          }
        }
      });

      // Cursor pointer on clusters and unclustered points
      ["clusters", "unclustered-point"].forEach((layerId) => {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });

      // If already at high zoom, show DOM markers immediately
      if (map.getZoom() >= 15) {
        addDomMarkers();
      }
    },
    [addDomMarkers]
  );

  // ─── Persistent complex markers (always visible, never clustered) ───
  const complexMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const clearComplexMarkers = useCallback(() => {
    complexMarkersRef.current.forEach((m) => m.remove());
    complexMarkersRef.current = [];
  }, []);

  const addComplexDomMarkers = useCallback(() => {
    if (!mapRef.current || !mapboxgl) return;
    clearComplexMarkers();

    const complexMarkers = markersDataRef.current.filter((m) => m.isComplex);
    complexMarkers.forEach((marker) => {
      const el = createComplexPinElement(marker);
      const mapboxMarker = new (mapboxgl as any).Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(mapRef.current!);
      complexMarkersRef.current.push(mapboxMarker);
    });
  }, [clearComplexMarkers, createComplexPinElement]);

  // ─── Update GeoJSON data when markers change ───
  useEffect(() => {
    if (!mapRef.current || !isLoadedRef.current) return;

    const map = mapRef.current;
    const source = map.getSource("events") as any;
    if (source) {
      source.setData(markersToGeoJSON(markers));

      // Refresh DOM markers if at high zoom
      if (map.getZoom() >= 15) {
        addDomMarkers();
      }
    }
  }, [markers, addDomMarkers]);

  // ─── Update light preset when prop changes ───
  useEffect(() => {
    if (!mapRef.current || !mapStyle.includes("standard")) return;
    const preset = lightPreset || getLightPresetByTime();
    try {
      mapRef.current.setConfigProperty("basemap", "lightPreset", preset);
    } catch (e) {
      // Map may not be fully loaded yet
    }
  }, [lightPreset]);

  // ─── Update center/zoom/pitch/bearing ───
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center,
      zoom,
      pitch,
      bearing,
      duration: 1000,
    });
  }, [center[0], center[1], zoom, pitch, bearing]);

  // ─── User location blue dot ───
  useEffect(() => {
    if (!mapRef.current || !mapboxgl || Platform.OS !== "web") return;

    // Remove old marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }

    if (!userLocation) return;

    // Create pulsing blue dot element
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="
        width: 18px; height: 18px; border-radius: 50%;
        background: #4285F4;
        border: 3px solid white;
        box-shadow: 0 0 0 0 rgba(66,133,244,0.4), 0 2px 8px rgba(0,0,0,0.2);
        animation: userLocPulse 2s ease-in-out infinite;
      "></div>
      <style>
        @keyframes userLocPulse {
          0% { box-shadow: 0 0 0 0 rgba(66,133,244,0.4), 0 2px 8px rgba(0,0,0,0.2); }
          70% { box-shadow: 0 0 0 12px rgba(66,133,244,0), 0 2px 8px rgba(0,0,0,0.2); }
          100% { box-shadow: 0 0 0 0 rgba(66,133,244,0), 0 2px 8px rgba(0,0,0,0.2); }
        }
      </style>
    `;

    const marker = new (mapboxgl as any).Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(mapRef.current);

    userLocationMarkerRef.current = marker;

    return () => {
      marker.remove();
    };
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Render nothing on native
  if (Platform.OS !== "web") return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "inherit",
        overflow: "hidden",
        ...style,
      }}
    />
  );
});

// ─── Helper: Convert markers to GeoJSON FeatureCollection ───
function markersToGeoJSON(markers: MapMarker[]) {
  return {
    type: "FeatureCollection" as const,
    features: markers.map((m) => ({
      type: "Feature" as const,
      properties: {
        id: m.id,
        title: m.title || "",
        category: m.category || "",
        emoji: m.emoji || "",
        imageUrl: m.imageUrl || "",
      },
      geometry: {
        type: "Point" as const,
        coordinates: [m.longitude, m.latitude],
      },
    })),
  };
}

/**
 * Small static-like Mapbox mini-map with a single pin.
 * Non-interactive, no controls.
 */
export function MapboxMiniMap({
  accessToken,
  latitude,
  longitude,
  title,
  pinColor = "#10B981",
  imageUrl,
  category,
  style,
  interactive = false,
}: {
  accessToken: string;
  latitude: number;
  longitude: number;
  title?: string;
  pinColor?: string;
  imageUrl?: string | null;
  category?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
}) {
  return (
    <MapboxWebMap
      accessToken={accessToken}
      center={[longitude, latitude]}
      zoom={14}
      pitch={45}
      bearing={0}
      interactive={interactive}
      skipClustering={true}
      showBuildings3D={true}
      style={style}
      markers={[
        {
          id: "pin",
          longitude,
          latitude,
          color: pinColor,
          title,
          imageUrl: imageUrl || null,
          category: category || "",
          emoji: "📍",
        },
      ]}
    />
  );
}
