import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES } from "../lib/constants";
import type { EventWithOrganizer } from "../lib/types";

interface EventCardProps {
  event: EventWithOrganizer;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const catInfo = CATEGORIES.find((c) => c.id === event.category) ?? {
    label: event.category,
    icon: "📌",
    color: "#ffd500ff",
  };

  const isPaid = event.payment_type === "paid" && event.price;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      {event.main_media_url ? (
        <Image
          source={{ uri: event.main_media_url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbPlaceholder]}>
          <Text style={{ fontSize: 24 }}>{catInfo.icon}</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: catInfo.color + "15" },
            ]}
          >
            <Text style={{ marginRight: 2, fontSize: 10 }}>{catInfo.icon}</Text>
            <Text style={[styles.categoryText, { color: catInfo.color }]}>
              {catInfo.label}
            </Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              {isPaid ? `$${event.price}` : "Gratis"}
            </Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>
            {new Date(event.date).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color="#9CA3AF" />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.location_name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  thumbPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
  },
  priceBadge: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffd500ff",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 4,
    flex: 1,
  },
});
