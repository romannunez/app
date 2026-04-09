import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from "react-native";
import { showAlert } from "../../lib/alert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useEventById,
  useAttendeeCount,
  useIsAttending,
  useJoinEvent,
  useLeaveEvent,
} from "../../lib/hooks/useEvents";
import { useAuthStore } from "../../lib/store";
import { CATEGORIES } from "../../lib/constants";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: event, isLoading } = useEventById(id);
  const { data: attendeeCount = 0 } = useAttendeeCount(event?.id);
  const { data: isAttending = false } = useIsAttending(event?.id);
  const joinMutation = useJoinEvent();
  const leaveMutation = useLeaveEvent();

  // Comments state
  const [commentText, setCommentText] = useState("");

  const getCategoryInfo = (cat: string) =>
    CATEGORIES.find((c) => c.id === cat) ?? { label: cat, icon: "📌", color: "#888" };

  if (isLoading || !event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ffd500ff" size="large" />
      </View>
    );
  }

  const catInfo = getCategoryInfo(event.category);
  const isPaid = event.payment_type === "paid" && event.price;
  const isOrganizer = user && String(event.organizer_id) === user.id;

  const handleJoinLeave = async () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    try {
      if (isAttending) {
        await leaveMutation.mutateAsync(event.id);
      } else {
        await joinMutation.mutateAsync(event.id);
      }
    } catch (err: any) {
      showAlert("Error", err?.message ?? "No se pudo procesar la solicitud");
    }
  };

  const mutating = joinMutation.isPending || leaveMutation.isPending;

  return (
    <View style={styles.container}>
      {/* Hero section */}
      <View style={styles.hero}>
        <View
          style={[styles.heroGradient, { backgroundColor: catInfo.color + "25" }]}
        />

        {/* Top nav */}
        <View style={[styles.topNav, { top: insets.top + 4 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.navButton}
          >
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="share-outline" size={20} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* Category badge */}
        <View style={styles.heroBadgeContainer}>
          <View
            style={[
              styles.categoryPill,
              { backgroundColor: catInfo.color + "20" },
            ]}
          >
            <Text style={{ marginRight: 4 }}>{catInfo.icon}</Text>
            <Text style={[styles.categoryPillText, { color: catInfo.color }]}>
              {catInfo.label}
            </Text>
          </View>
        </View>

        {/* Price badge */}
        <View style={styles.priceBadgeContainer}>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              {isPaid ? `$${event.price}` : "Gratis"}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <Text style={styles.eventTitle}>{event.title}</Text>

        {/* Organizer */}
        <View style={styles.organizerRow}>
          <View style={styles.organizerAvatar}>
            <Text style={styles.organizerInitial}>
              {event.organizer?.name?.charAt(0) ?? "O"}
            </Text>
          </View>
          <View>
            <Text style={styles.organizerLabel}>Organizado por</Text>
            <Text style={styles.organizerName}>
              {event.organizer?.name ?? "Organizador"}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#ffd500ff" />
            <Text style={styles.infoText}>
              {new Date(event.date).toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#ffd500ff" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.infoText}>{event.location_name}</Text>
              <Text style={styles.infoSubtext}>{event.location_address}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color="#ffd500ff" />
            <Text style={styles.infoText}>
              {attendeeCount} asistente{attendeeCount !== 1 ? "s" : ""}
              {event.max_capacity ? ` / ${event.max_capacity} cupos` : ""}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name={event.privacy_type === "public" ? "globe-outline" : "lock-closed-outline"}
              size={18}
              color="#ffd500ff"
            />
            <Text style={styles.infoText}>
              {event.privacy_type === "public" ? "Evento público" : "Evento privado"}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.descriptionText}>{event.description}</Text>
        </View>

        {/* Chat link */}
        {(isAttending || isOrganizer) && (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${event.id}` as any)}
            style={styles.chatLink}
          >
            <Ionicons name="chatbubbles" size={22} color="#ffd500ff" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.chatLinkTitle}>Chat del evento</Text>
              <Text style={styles.chatLinkSubtitle}>
                Conversá con los otros asistentes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        )}

        {/* Comments section */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>Comentarios</Text>
          
          {/* Placeholder comments */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>U</Text>
              </View>
              <View style={styles.commentContent}>
                <Text style={styles.commentTime}>hace alrededor de 1 hora</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity>
                    <Text style={styles.commentAction}>Responder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentLike}>
                    <Ionicons name="heart-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.commentAction}>Me gusta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {/* Comment input */}
          <View style={styles.commentInputRow}>
            <TextInput
              placeholder={`Comentar como ${user?.name ?? "usuario"}...`}
              placeholderTextColor="#9CA3AF"
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity style={styles.commentSendBtn}>
              <Text style={styles.commentSendText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomCta,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        {isOrganizer ? (
          <View style={styles.organizerBadge}>
            <Text style={styles.organizerBadgeText}>
              Sos el organizador de este evento
            </Text>
          </View>
        ) : (
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.heartButton}>
              <Ionicons name="heart-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Text style={styles.shareButtonText}>Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleJoinLeave}
              disabled={mutating}
              style={[
                styles.joinButton,
                isAttending && styles.joinButtonActive,
              ]}
              activeOpacity={0.85}
            >
              {mutating ? (
                <ActivityIndicator color={isAttending ? "#6B7280" : "#1A1A1A"} />
              ) : (
                <Text
                  style={[
                    styles.joinButtonText,
                    isAttending && styles.joinButtonTextActive,
                  ]}
                >
                  {isAttending
                    ? "Salir"
                    : isPaid
                    ? `Comprar · $${event.price}`
                    : "Quiero unirme"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    height: 200,
    position: "relative",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topNav: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  navButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  heroBadgeContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  priceBadgeContainer: {
    position: "absolute",
    bottom: 16,
    right: 16,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: -16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1A1A1A",
    marginBottom: 12,
    marginTop: 20,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  organizerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffd500ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  organizerInitial: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  organizerLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  organizerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 12,
    flex: 1,
  },
  infoSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  chatLink: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 16,
  },
  chatLinkTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  chatLinkSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  organizerBadge: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  organizerBadgeText: {
    color: "#ffd500ff",
    fontWeight: "600",
    fontSize: 14,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heartButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 13,
  },
  joinButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ffd500ff",
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonActive: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  joinButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 15,
  },
  joinButtonTextActive: {
    color: "#6B7280",
  },

  // Comments section
  commentItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  commentContent: {
    flex: 1,
  },
  commentTime: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  commentActions: {
    flexDirection: "row",
    gap: 16,
  },
  commentAction: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  commentLike: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 13,
    color: "#1A1A1A",
  },
  commentSendBtn: {
    backgroundColor: "#ffd500ff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  commentSendText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
});
