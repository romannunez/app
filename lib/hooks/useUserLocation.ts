// ============================================================
// useUserLocation — Cross-platform user geolocation hook
// Uses Browser Geolocation API on web, expo-location on native
// ============================================================
import { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";

export interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (Platform.OS === "web") {
        // Browser Geolocation API
        if (!navigator.geolocation) {
          setError("Tu navegador no soporta geolocalización.");
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLoading(false);
          },
          (err) => {
            switch (err.code) {
              case err.PERMISSION_DENIED:
                setError("Permiso de ubicación denegado.");
                break;
              case err.POSITION_UNAVAILABLE:
                setError("Ubicación no disponible.");
                break;
              case err.TIMEOUT:
                setError("Tiempo de espera agotado.");
                break;
              default:
                setError("No se pudo obtener tu ubicación.");
            }
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        // Native — use expo-location
        const Location = require("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Permiso de ubicación denegado.");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message || "Error al obtener ubicación.");
      setLoading(false);
    }
  }, []);

  return { location, loading, error, refresh: fetchLocation };
}
