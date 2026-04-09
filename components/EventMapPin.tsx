import React, { useEffect, useRef } from "react";
import { View, Image, Text, StyleSheet, Platform, Animated } from "react-native";
import { CATEGORIES } from "../lib/constants";

// Category emoji mapping (matching 398 reference)
const CATEGORY_EMOJIS: Record<string, string> = {
  social: "🥂",
  music: "🎶",
  spiritual: "🧘",
  education: "🎓",
  sports: "⛹️",
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

type EventMapPinProps = {
  imageUrl?: string | null;
  category: string;
  title?: string;
  /** Show the title label — pass true only when the map is zoomed in enough */
  showLabel?: boolean;
};

/**
 * Circular map marker matching the 398 SnapMarker exactly:
 * - White label with title floating above (with triangle pointer) — smoothly animated
 * - 48px white circle with event image (or emoji fallback)
 * - Small emoji badge at bottom-right
 * - NO triangle tail — clean circle, anchor center
 */
export function EventMapPin({ imageUrl, category, title, showLabel = false }: EventMapPinProps) {
  const emoji = CATEGORY_EMOJIS[category] ?? "📅";
  const fallbackIcon =
    CATEGORIES.find((c) => c.id === category)?.icon ?? "📷";

  const labelAnim = useRef(new Animated.Value(showLabel ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: showLabel ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [showLabel]);

  return (
    <View style={pinStyles.outerWrapper}>
      {/* ── White label floating above marker — always mounted, animated ── */}
      {title ? (
        <Animated.View
          style={[
            pinStyles.labelContainer,
            {
              opacity: labelAnim,
              transform: [
                {
                  translateY: labelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
                {
                  scale: labelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View style={pinStyles.labelBubble}>
            <Text style={pinStyles.labelText} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {/* Small triangle pointer pointing down */}
          <View style={pinStyles.labelPointer} />
        </Animated.View>
      ) : null}

      {/* ── Marker circle + badge ── */}
      <View style={pinStyles.wrapper}>
        {/* Main circle */}
        <View style={pinStyles.circle}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={pinStyles.image} />
          ) : (
            <View style={pinStyles.fallback}>
              <Text style={pinStyles.fallbackText}>{fallbackIcon}</Text>
            </View>
          )}
        </View>

        {/* Category emoji badge — bottom-right */}
        <View style={pinStyles.badge}>
          <Text style={pinStyles.badgeText}>{emoji}</Text>
        </View>
      </View>

      {/* ── Pointed tail spike — pointing to exact location ── */}
      <View style={pinStyles.tail} />
    </View>
  );
}

const SZ = 48; // main circle size (matching 398 w-12 h-12)
const IMG = 40; // inner image size (matching 398 w-10 h-10)
const BD = 24; // badge size

const pinStyles = StyleSheet.create({
  outerWrapper: {
    alignItems: "center",
  },
  // ── Label styles ──
  labelContainer: {
    alignItems: "center",
    marginBottom: 4,
  },
  labelBubble: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 140,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      }
      : { elevation: 3 }),
  },
  labelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  labelPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(255,255,255,0.95)",
  },
  // ── Marker styles ──
  wrapper: {
    width: SZ + 4,
    height: SZ + 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -4,
  },
  circle: {
    width: SZ,
    height: SZ,
    borderRadius: SZ / 2,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "white",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    // Drop shadow matching 398's shadow-xl
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      }
      : { elevation: 6 }),
  },
  image: {
    width: IMG,
    height: IMG,
    borderRadius: IMG / 2,
  },
  fallback: {
    width: IMG,
    height: IMG,
    borderRadius: IMG / 2,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    fontSize: 20,
  },
  badge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: BD,
    height: BD,
    borderRadius: BD / 2,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      }
      : { elevation: 4 }),
  },
  badgeText: {
    fontSize: 12,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "white",
    alignSelf: "center",
    marginTop: -1,
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      }
      : { elevation: 4 }),
  },
});
