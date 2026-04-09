// ============================================================
// Smart Scanner Route — Full-screen camera scanner
// ============================================================
import React from "react";
import { Platform, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Only import SmartScanner on native (camera doesn't work on web)
let SmartScannerComponent: React.ComponentType | null = null;
if (Platform.OS !== "web") {
  try {
    SmartScannerComponent =
      require("../components/SmartScanner").SmartScanner;
  } catch {
    SmartScannerComponent = null;
  }
}

export default function SmartScannerScreen() {
  const router = useRouter();

  // Web fallback — camera is not available
  if (Platform.OS === "web" || !SmartScannerComponent) {
    return (
      <View style={styles.fallback}>
        <View style={styles.fallbackCard}>
          <Ionicons name="camera-outline" size={56} color="#ffd500" />
          <Text style={styles.fallbackTitle}>Smart Scanner</Text>
          <Text style={styles.fallbackText}>
            El Smart Scanner utiliza la cámara de tu dispositivo para descubrir
            eventos y promos cerca tuyo. Esta función solo está disponible en
            la app nativa (Android / iOS).
          </Text>
          <TouchableOpacity
            style={styles.fallbackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.fallbackButtonText}>Volver al mapa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <SmartScannerComponent />;
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  fallbackCard: {
    alignItems: "center",
    padding: 32,
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginTop: 20,
    textAlign: "center",
  },
  fallbackText: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
  },
  fallbackButton: {
    backgroundColor: "#ffd500",
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 28,
  },
  fallbackButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
});
