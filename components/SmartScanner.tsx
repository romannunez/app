// ============================================================
// SmartScanner — AR-like camera scanner for nearby events
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useEvents } from "../lib/hooks/useEvents";
import type { EventWithOrganizer } from "../lib/types";
import { CATEGORIES } from "../lib/constants";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Haversine distance (meters) ─────────────────────────────
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Nearby event with distance ──────────────────────────────
interface NearbyEvent extends EventWithOrganizer {
  distance: number;
}

// ─── Constants ───────────────────────────────────────────────
const NEARBY_RADIUS_METERS = 150;
const LOCATION_UPDATE_INTERVAL = 3000; // ms

// ═════════════════════════════════════════════════════════════
// FLOATING EVENT CARD
// ═════════════════════════════════════════════════════════════
function FloatingEventCard({
  event,
  onPress,
  onDetailsPress,
}: {
  event: NearbyEvent;
  onPress: () => void;
  onDetailsPress: () => void;
}) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    // Animate in
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    translateY.value = withSpring(0, { damping: 14, stiffness: 100 });
  }, [event.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Format time
  const eventDate = new Date(event.date);
  const now = new Date();
  const isHappening =
    eventDate <= now && (!event.end_date || new Date(event.end_date) >= now);
  const timeLabel = isHappening
    ? "Ahora"
    : eventDate.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      });

  // Capacity info
  const spotsLeft = event.max_capacity
    ? Math.max(0, event.max_capacity - (event.attendee_count || 0))
    : null;

  // Category
  const categoryInfo = CATEGORIES.find((c) => c.id === event.category);

  return (
    <Animated.View style={[styles.cardOuter, animatedStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {/* Glassmorphism background */}
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={60}
            tint="dark"
            style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: "hidden" }]}
          />
        ) : null}
        <View style={styles.cardContent}>
          {/* Category badge + time */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardCategoryBadge}>
              <Text style={styles.cardCategoryEmoji}>
                {categoryInfo?.icon ?? "📅"}
              </Text>
              <Text style={styles.cardCategoryText}>
                {categoryInfo?.label ?? event.category}
              </Text>
            </View>
            <View
              style={[
                styles.cardTimeBadge,
                isHappening && styles.cardTimeBadgeLive,
              ]}
            >
              {isHappening && (
                <View style={styles.liveDot} />
              )}
              <Text
                style={[
                  styles.cardTimeText,
                  isHappening && styles.cardTimeTextLive,
                ]}
              >
                {timeLabel}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {event.title}
          </Text>

          {/* Location */}
          <View style={styles.cardLocationRow}>
            <Ionicons name="location" size={14} color="#ffd500" />
            <Text style={styles.cardLocationText} numberOfLines={1}>
              {event.location_name}
            </Text>
            <Text style={styles.cardDistanceText}>
              {event.distance < 1000
                ? `${Math.round(event.distance)}m`
                : `${(event.distance / 1000).toFixed(1)}km`}
            </Text>
          </View>

          {/* Capacity */}
          {spotsLeft !== null && (
            <View style={styles.cardCapacityRow}>
              <Ionicons name="people" size={14} color="#A78BFA" />
              <Text style={styles.cardCapacityText}>
                {spotsLeft > 0
                  ? `Faltan ${spotsLeft} personas`
                  : "¡Evento completo!"}
              </Text>
            </View>
          )}

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.cardCTA}
            onPress={onDetailsPress}
            activeOpacity={0.8}
          >
            <Text style={styles.cardCTAText}>Ver detalles</Text>
            <Ionicons name="arrow-forward" size={16} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════════
// SMART SCANNER MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export function SmartScanner() {
  const router = useRouter();
  const { data: events = [] } = useEvents();

  // Camera permission
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Location state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Nearby event
  const [nearbyEvent, setNearbyEvent] = useState<NearbyEvent | null>(null);
  const [scanning, setScanning] = useState(true);

  // ─── Request location permission & start tracking ──────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (mounted) setLocationError("Necesitamos acceso a tu ubicación para encontrar eventos cercanos.");
        return;
      }

      // Get initial position
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) {
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {
        // Will retry via subscription
      }

      // Subscribe to updates
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: 5,
        },
        (loc) => {
          if (mounted) {
            setUserLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      );
      locationSubscription.current = sub;
    })();

    return () => {
      mounted = false;
      locationSubscription.current?.remove();
    };
  }, []);

  // ─── Find nearby events whenever location or events change ─
  useEffect(() => {
    if (!userLocation || events.length === 0) {
      setNearbyEvent(null);
      return;
    }

    const now = new Date();
    const nearbyEvents: NearbyEvent[] = events
      .map((evt) => {
        const dist = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          Number(evt.latitude),
          Number(evt.longitude)
        );
        return { ...evt, distance: dist };
      })
      .filter((evt) => {
        // Within radius
        if (evt.distance > NEARBY_RADIUS_METERS) return false;
        // Either happening now or in the future (next 24h)
        const evtDate = new Date(evt.date);
        const hoursUntil = (evtDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isHappening =
          evtDate <= now && (!evt.end_date || new Date(evt.end_date) >= now);
        return isHappening || (hoursUntil > 0 && hoursUntil <= 24);
      })
      .sort((a, b) => {
        // Prioritize: currently happening > closest > soonest
        const aHappening =
          new Date(a.date) <= now &&
          (!a.end_date || new Date(a.end_date) >= now);
        const bHappening =
          new Date(b.date) <= now &&
          (!b.end_date || new Date(b.end_date) >= now);
        if (aHappening && !bHappening) return -1;
        if (!aHappening && bHappening) return 1;
        return a.distance - b.distance;
      });

    setNearbyEvent(nearbyEvents[0] ?? null);
  }, [userLocation, events]);

  // ─── Close scanner ─────────────────────────────────────────
  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // ─── Navigate to event detail ──────────────────────────────
  const handleEventPress = useCallback(
    (eventId: number) => {
      router.back();
      // Small delay to let modal close before pushing new screen
      setTimeout(() => {
        router.push(`/event/${eventId}`);
      }, 300);
    },
    [router]
  );

  // ─── Permission states ────────────────────────────────────
  if (!cameraPermission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#ffd500" />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera" size={56} color="#ffd500" />
          <Text style={styles.permissionTitle}>
            Acceso a la cámara
          </Text>
          <Text style={styles.permissionText}>
            Permití el acceso a la cámara para escanear y descubrir eventos y promos cerca tuyo.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.permissionButtonText}>Permitir cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={{ marginTop: 16 }}>
            <Text style={styles.permissionSkipText}>Volver al mapa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main scanner view ────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Top gradient overlay */}
      <View style={styles.topOverlay}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        {/* Header text */}
        <Animated.View
          entering={FadeIn.delay(300).duration(600)}
          style={styles.headerTextContainer}
        >
          <Text style={styles.headerTitle}>Smart Scanner</Text>
          <Text style={styles.headerSubtitle}>
            Apunta a un local o lugar para descubrir qué está pasando ahora
          </Text>
        </Animated.View>
      </View>

      {/* Scanning indicator */}
      {scanning && !nearbyEvent && userLocation && (
        <Animated.View
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(300)}
          style={styles.scanningIndicator}
        >
          <View style={styles.scanningDot} />
          <Text style={styles.scanningText}>Escaneando alrededores...</Text>
        </Animated.View>
      )}

      {/* Bottom overlay */}
      <View style={styles.bottomOverlay}>
        {/* Location loading */}
        {!userLocation && !locationError && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.statusCard}
          >
            <ActivityIndicator size="small" color="#ffd500" />
            <Text style={styles.statusText}>
              Obteniendo tu ubicación...
            </Text>
          </Animated.View>
        )}

        {/* Location error */}
        {locationError && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.statusCard}
          >
            <Ionicons name="location-outline" size={20} color="#EF4444" />
            <Text style={styles.statusText}>{locationError}</Text>
          </Animated.View>
        )}

        {/* No events nearby */}
        {userLocation && !nearbyEvent && !locationError && (
          <Animated.View
            entering={FadeIn.delay(2000).duration(600)}
            style={styles.emptyCard}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={50}
                tint="dark"
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: 20, overflow: "hidden" },
                ]}
              />
            ) : null}
            <View style={styles.emptyCardContent}>
              <Text style={styles.emptyEmoji}>🔭</Text>
              <Text style={styles.emptyTitle}>
                No hay eventos o promos activas cerca en este momento
              </Text>
              <Text style={styles.emptySubtitle}>
                Intenta moverte un poco o vuelve más tarde. ¡Siempre hay algo nuevo!
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Nearby event card */}
        {nearbyEvent && (
          <FloatingEventCard
            event={nearbyEvent}
            onPress={() => handleEventPress(nearbyEvent.id)}
            onDetailsPress={() => handleEventPress(nearbyEvent.id)}
          />
        )}
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // ─── Permission screens ───
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  permissionCard: {
    alignItems: "center",
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginTop: 20,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: "#ffd500",
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 28,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  permissionSkipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  // ─── Top overlay ───
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  headerTextContainer: {
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "white",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    lineHeight: 22,
    fontWeight: "500",
  },

  // ─── Scanning indicator ───
  scanningIndicator: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  scanningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },
  scanningText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },

  // ─── Bottom overlay ───
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 10,
  },

  // ─── Status card ───
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },

  // ─── Empty state ───
  emptyCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  emptyCardContent: {
    padding: 24,
    alignItems: "center",
    backgroundColor: Platform.OS === "ios" ? "transparent" : "rgba(30,30,30,0.9)",
    borderRadius: 20,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    lineHeight: 22,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },

  // ─── Floating event card ───
  cardOuter: {
    borderRadius: 24,
    overflow: "hidden",
  },
  cardContent: {
    padding: 20,
    backgroundColor: Platform.OS === "ios" ? "rgba(20,20,30,0.75)" : "rgba(20,20,30,0.92)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  cardCategoryEmoji: {
    fontSize: 13,
  },
  cardCategoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  cardTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  cardTimeBadgeLive: {
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  cardTimeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },
  cardTimeTextLive: {
    color: "#22C55E",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
    marginBottom: 10,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  cardLocationText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    flex: 1,
    fontWeight: "500",
  },
  cardDistanceText: {
    fontSize: 12,
    color: "#ffd500",
    fontWeight: "700",
  },
  cardCapacityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  cardCapacityText: {
    fontSize: 13,
    color: "#A78BFA",
    fontWeight: "600",
  },
  cardCTA: {
    backgroundColor: "#ffd500",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cardCTAText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
});
