import { useEffect } from "react";
import { useMapStore } from "../store";
import type { LightPreset } from "../constants";

/**
 * Determines the Mapbox Standard Style light preset based on local hour.
 *
 * dawn  → 5:00 – 7:59
 * day   → 8:00 – 17:59
 * dusk  → 18:00 – 19:59
 * night → 20:00 – 4:59
 */
function getLightPreset(hour: number): LightPreset {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 18) return "day";
  if (hour >= 18 && hour < 20) return "dusk";
  return "night";
}

export function useMapLighting() {
  const setLightPreset = useMapStore((s) => s.setLightPreset);
  const lightPreset = useMapStore((s) => s.lightPreset);

  useEffect(() => {
    // Set initial preset
    const now = new Date();
    const preset = getLightPreset(now.getHours());
    setLightPreset(preset);

    // Update every 5 minutes
    const interval = setInterval(() => {
      const current = new Date();
      const newPreset = getLightPreset(current.getHours());
      setLightPreset(newPreset);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [setLightPreset]);

  return lightPreset;
}
