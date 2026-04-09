import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEvents } from "../../lib/hooks/useEvents";
import { CATEGORIES } from "../../lib/constants";
import type { EventWithOrganizer } from "../../lib/types";
import { LinearGradient } from "expo-linear-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function VibesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: events = [], isLoading } = useEvents();

  // Only show events that have media
  const vibeEvents = events.filter(
    (evt) => evt.main_media_url || evt.media_items
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const getMediaUrl = (evt: EventWithOrganizer) => {
    if (evt.main_media_url) return evt.main_media_url;
    if (evt.media_items) {
      try {
        const items = JSON.parse(evt.media_items);
        return items[0]?.url ?? null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const getCategoryLabel = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found?.label ?? cat;
  };

  const getCategoryColor = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found?.color ?? "#ffd500ff";
  };

  const renderVibe = useCallback(
    ({ item }: { item: EventWithOrganizer }) => {
      const mediaUrl = getMediaUrl(item);

      return (
        <View style={{ height: SCREEN_HEIGHT, backgroundColor: "#111" }}>
          {/* Background media */}
          {mediaUrl ? (
            <Image
              source={{ uri: mediaUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholderBg]}>
              <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.15)" />
            </View>
          )}

          {/* Top gradient */}
          <LinearGradient
            colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.3)", "transparent"]}
            style={styles.topGradient}
          />

          {/* Bottom gradient */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.9)"]}
            style={styles.bottomGradient}
          />

          {/* Top-left: Organizer info */}
          <View
            style={[styles.topLeft, { top: insets.top + 8 }]}
          >
            <View style={styles.organizerRow}>
              <View
                style={[
                  styles.organizerAvatar,
                  { backgroundColor: getCategoryColor(item.category) + "60" },
                ]}
              >
                <Text style={{ fontSize: 14 }}>
                  {CATEGORIES.find((c) => c.id === item.category)?.icon ?? "📌"}
                </Text>
              </View>
              <Text style={styles.organizerName}>
                {item.organizer?.name ?? "Organizador"}
              </Text>
            </View>
          </View>

          {/* Top-right: Price badge */}
          <View style={[styles.topRight, { top: insets.top + 8 }]}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>
                {item.payment_type === "paid" && item.price
                  ? `$${item.price}`
                  : "Gratis"}
              </Text>
            </View>
          </View>

          {/* Right action buttons */}
          <View
            style={[styles.rightActions, { bottom: insets.bottom + 160 }]}
          >
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart-outline" size={26} color="white" />
              <Text style={styles.actionLabel}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/chat/${item.id}` as any)}
            >
              <Ionicons name="chatbubble-outline" size={24} color="white" />
              <Text style={styles.actionLabel}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-social-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Bottom info */}
          <View
            style={[styles.bottomInfo, { bottom: insets.bottom + 100 }]}
          >
            <Text style={styles.vibeTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={styles.vibeDescription} numberOfLines={2}>
                {item.description}{'  '}
                <Text style={styles.verMas}>ver más</Text>
              </Text>
            ) : null}
            <View style={styles.vibeMetaRow}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.vibeMeta} numberOfLines={1}>
                {item.location_name}
              </Text>
              <Text style={styles.vibeDot}>·</Text>
              <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.vibeMeta}>
                {new Date(item.date).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>

            {/* CTA button */}
            <TouchableOpacity
              onPress={() => router.push(`/event/${item.id}`)}
              style={styles.vibeCta}
              activeOpacity={0.85}
            >
              <Ionicons name="information-circle" size={18} color="#1A1A1A" />
              <Text style={styles.vibeCtaText}>Ver detalles del evento</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [insets, router]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ffd500ff" size="large" />
        <Text style={styles.loadingText}>Cargando vibes...</Text>
      </View>
    );
  }

  if (vibeEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-outline" size={56} color="rgba(255,255,255,0.15)" />
        <Text style={styles.emptyTitle}>No hay vibes disponibles</Text>
        <Text style={styles.emptySubtitle}>
          Volvé pronto para descubrir nuevos vibes
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#111" }}>
      <FlatList
        data={vibeEvents}
        renderItem={renderVibe}
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 1,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
    zIndex: 1,
  },
  placeholderBg: {
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  topLeft: {
    position: "absolute",
    left: 16,
    right: 80,
    zIndex: 10,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  organizerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  organizerName: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  topRight: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  priceBadge: {
    backgroundColor: "#ffd500ff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  priceText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 13,
  },
  rightActions: {
    position: "absolute",
    right: 12,
    zIndex: 10,
    gap: 20,
    alignItems: "center",
  },
  actionButton: {
    alignItems: "center",
  },
  actionLabel: {
    color: "white",
    fontSize: 11,
    marginTop: 4,
  },
  bottomInfo: {
    position: "absolute",
    left: 16,
    right: 80,
    zIndex: 10,
  },
  vibeTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  vibeDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginBottom: 8,
  },
  verMas: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "500",
  },
  vibeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  vibeMeta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginLeft: 4,
  },
  vibeDot: {
    color: "rgba(255,255,255,0.3)",
    marginHorizontal: 8,
  },
  vibeCta: {
    backgroundColor: "#ffd500ff",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  vibeCtaText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "rgba(255,255,255,0.4)",
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});
