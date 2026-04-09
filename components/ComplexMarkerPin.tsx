import React, { useEffect, useRef } from "react";
import { View, Image, Text, StyleSheet, Platform, Animated } from "react-native";

const CANCHA_IMG = require("../assets/markers/markercancha2.png");

type ComplexMarkerPinProps = {
  name: string;
  /** Show the name label — pass true only when the map is zoomed in enough */
  showLabel?: boolean;
};

/**
 * Custom marker for associated sports complexes.
 *
 * Layout (mirrors EventMapPin):
 *   [name label bubble]        ← smoothly fades in/out based on showLabel
 *        ▼
 *   [field image]
 *             └─ [⚽ badge]   ← absolute, bottom-right (same as EventMapPin badge)
 */
export function ComplexMarkerPin({ name, showLabel = false }: ComplexMarkerPinProps) {
  const labelAnim = useRef(new Animated.Value(showLabel ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: showLabel ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [showLabel]);

  return (
    <View style={cx.outerWrapper}>
      {/* ── Name label — always mounted, animated opacity + translateY ── */}
      <Animated.View
        style={[
          cx.labelContainer,
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
        <View style={cx.labelBubble}>
          <Text style={cx.labelText} numberOfLines={1}>
            {name.toUpperCase()}
          </Text>
        </View>
        <View style={cx.labelPointer} />
      </Animated.View>

      {/* ── Marker: field image + ⚽ badge at bottom-right ── */}
      <View style={cx.markerWrapper}>
        <Image source={CANCHA_IMG} style={cx.fieldImage} resizeMode="contain" />

        {/* ⚽ badge — mirrors EventMapPin badge position exactly */}
        <View style={cx.badge}>
          <Text style={cx.badgeEmoji}>⚽</Text>
        </View>
      </View>
    </View>
  );
}

const FIELD_W = 120;
const FIELD_H = 83;
const BADGE = 24; // same as EventMapPin BD

const cx = StyleSheet.create({
  outerWrapper: {
    alignItems: "center",
  },

  // ── Name label ───────────────────────────────────────────────
  labelContainer: {
    alignItems: "center",
    marginBottom: 4,
  },
  labelBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 18,
    maxWidth: 200,
    minWidth: 60,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }
      : { elevation: 5 }),
  },
  labelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  labelPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFFFFF",
  },

  // ── Marker wrapper — expanded so the badge never gets clipped ───
  // (mirrors EventMapPin's wrapper: SZ+4 trick)
  markerWrapper: {
    width: FIELD_W + BADGE / 2,
    height: FIELD_H + BADGE / 2,
  },

  // Field PNG — sticker outline is baked into the image; anchored top-left
  fieldImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: FIELD_W,
    height: FIELD_H,
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
      }
      : {}),
  },

  // ⚽ badge — sits at the bottom-right corner of the field, fully inside wrapper
  badge: {
    position: "absolute",
    bottom: 26,
    right: 22,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.20,
        shadowRadius: 4,
      }
      : { elevation: 5 }),
  },
  badgeEmoji: {
    fontSize: 12,
  },
});
