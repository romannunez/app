import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyAttendingEvents } from "../../lib/hooks/useEvents";
import { CATEGORIES } from "../../lib/constants";
import type { EventWithOrganizer } from "../../lib/types";

export default function ChatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: myEvents = [], isLoading } = useMyAttendingEvents();

  const getCategoryIcon = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found?.icon ?? "📌";
  };

  const getCategoryColor = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found?.color ?? "#ffd500ff";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  };

  const renderChat = ({ item }: { item: EventWithOrganizer }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chat/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {/* Category icon badge */}
      <View
        style={[
          styles.chatAvatar,
          { backgroundColor: getCategoryColor(item.category) + "20" },
        ]}
      >
        <Text style={{ fontSize: 18 }}>{getCategoryIcon(item.category)}</Text>
      </View>

      {/* Event info */}
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={styles.chatTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.chatSubtitle} numberOfLines={1}>
          {item.location_name} · {formatDate(item.date)}
        </Text>
        <Text style={styles.chatHint}>Toca para abrir el chat</Text>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <Text style={styles.headerSubtitle}>
          Conversaciones de tus eventos
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffd500ff" size="large" />
        </View>
      ) : (
        <FlatList
          data={myEvents}
          renderItem={renderChat}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No hay chats aún</Text>
              <Text style={styles.emptySubtitle}>
                Unite a un evento para acceder a su chat grupal
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)")}
                style={styles.emptyCta}
              >
                <Text style={styles.emptyCtaText}>Explorar eventos</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "white",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  chatSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  chatHint: {
    fontSize: 11,
    color: "#D1D5DB",
    marginTop: 2,
    fontStyle: "italic",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  emptyCta: {
    backgroundColor: "#ffd500ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyCtaText: {
    color: "#1A1A1A",
    fontWeight: "600",
    fontSize: 14,
  },
});
