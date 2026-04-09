import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EventWithOrganizer } from "../lib/types";

const CARD_WIDTH = 150;
const IMAGE_HEIGHT = 108;

interface DiscoverCardProps {
  event: EventWithOrganizer & { _type?: string };
  onPress: () => void;
}

export function DiscoverCard({ event, onPress }: DiscoverCardProps) {
  const isPaid = event.payment_type === "paid" && event.price;

  const dateLabel = (() => {
    try {
      return new Date(event.date).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  })();

  // Determine tag info based on _type field (from mock data)
  const eventType = (event as any)._type || "";
  const getTagInfo = () => {
    if (eventType === "actividad_grupal")
      return { label: "Actividad Grupal", color: "#14B8A6" };
    if (eventType === "experiencia")
      return { label: "Experiencia", color: "#F97316" };
    if (eventType === "plan") return { label: "Plan", color: "#A855F7" };
    return null;
  };

  const tagInfo = getTagInfo();

  // Check if experience / group type for special badges
  const isExperience = eventType === "experiencia";
  const isGroupActivity = eventType === "actividad_grupal";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.85}
    >
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {event.main_media_url ? (
          <Image
            source={{ uri: event.main_media_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color="#D1D5DB" />
          </View>
        )}

        {/* Date badge (top-left) */}
        {dateLabel ? (
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{dateLabel}</Text>
          </View>
        ) : null}

        {/* Favorite button (top-right) */}
        <TouchableOpacity
          style={styles.favButton}
          onPress={(e) => {
            // Prevent card press
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={13} color="#6B7280" />
        </TouchableOpacity>

        {/* Category/type tag overlay */}
        {tagInfo && (
          <View
            style={[styles.typeTag, { backgroundColor: tagInfo.color }]}
          >
            <Text style={styles.typeTagText}>{tagInfo.label}</Text>
          </View>
        )}

        {/* Rating badge */}
        {isExperience && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={styles.ratingText}>4.9</Text>
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {event.location_name || "Córdoba, Argentina"}
        </Text>
        <View
          style={[
            styles.pricePill,
            {
              backgroundColor: isPaid ? "#1F2937" : "#22C55E",
            },
          ]}
        >
          <Text style={styles.priceText}>
            {isPaid
              ? `$${event.price}${isExperience ? " por persona" : ""}`
              : "Gratis"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    position: "relative",
    backgroundColor: "#E5E7EB",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#111827",
  },
  favButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeTag: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "white",
  },
  ratingBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 15,
    marginBottom: 4,
  },
  location: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  pricePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
});
