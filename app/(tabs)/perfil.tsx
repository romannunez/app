import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../lib/store";
import {
  useMyAttendingEvents,
  useMyCreatedEvents,
} from "../../lib/hooks/useEvents";
import { signOut } from "../../lib/hooks/useAuth";
import { CATEGORIES } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { showAlert } from "../../lib/alert";
import type { EventWithOrganizer, DbUserInterest } from "../../lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function PerfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: attendingEvents = [], isLoading: loadingAttending } =
    useMyAttendingEvents();
  const { data: createdEvents = [], isLoading: loadingCreated } =
    useMyCreatedEvents();

  // Fetch interests
  const { data: interests = [] } = useQuery({
    queryKey: ["interests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_interests")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as DbUserInterest[];
    },
    enabled: !!user,
  });

  // Add interest
  const addInterest = useMutation({
    mutationFn: async (category: string) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase.from("user_interests").insert({
        user_id: Number(user.id),
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interests"] }),
  });

  // Remove interest
  const removeInterest = useMutation({
    mutationFn: async (interestId: number) => {
      const { error } = await supabase
        .from("user_interests")
        .delete()
        .eq("id", interestId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interests"] }),
  });

  const [activeTab, setActiveTab] = useState<"attending" | "created">(
    "attending"
  );

  const handleLogout = async () => {
    showAlert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            // ignore
          }
        },
      },
    ]);
  };

  // ─── Profile editing ───
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [editHandle, setEditHandle] = useState(user?.handle ?? "");
  const [editBio, setEditBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editName.trim() || user.name,
          username: editHandle.trim().replace(/^@/, "") || user.handle,
          bio: editBio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update local store
      setUser({
        ...user,
        name: editName.trim() || user.name,
        handle: editHandle.trim().replace(/^@/, "") || user.handle,
        bio: editBio.trim() || null,
      });
      setIsEditing(false);
      showAlert("Listo", "Perfil actualizado correctamente.");
    } catch (err: any) {
      showAlert("Error", err?.message ?? "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
  const getCategoryColor = (cat: string) =>
    CATEGORIES.find((c) => c.id === cat)?.color ?? "#888";

  const availableCategories = CATEGORIES.filter(
    (cat) => !interests.find((i) => i.category === cat.id)
  );

  const [showInterestPicker, setShowInterestPicker] = useState(false);

  const renderEventItem = ({ item }: { item: EventWithOrganizer }) => (
    <TouchableOpacity
      onPress={() => router.push(`/event/${item.id}`)}
      style={styles.eventCard}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
            <Text style={styles.eventMeta}>
              {new Date(item.date).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={styles.eventMeta} numberOfLines={1}>
              {item.location_name}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryColor(item.category) + "15" },
          ]}
        >
          <Text
            style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}
          >
            {getCategoryLabel(item.category)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Not logged in
  if (!user) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <Ionicons name="person-circle" size={72} color="#D1D5DB" />
        <Text style={styles.loginTitle}>Inicia sesión</Text>
        <Text style={styles.loginSubtitle}>
          Para ver tu perfil, eventos e intereses
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/auth")}
          style={styles.loginCta}
        >
          <Text style={styles.loginCtaText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          {isEditing ? (
            /* ─── Edit mode ─── */
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(editName || user.name)?.charAt(0)?.toUpperCase() ?? "U"}
                  </Text>
                </View>
                <Text style={[styles.userName, { marginLeft: 16 }]}>Editar perfil</Text>
              </View>
              <View>
                <Text style={styles.editLabel}>Nombre</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Tu nombre"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View>
                <Text style={styles.editLabel}>Usuario</Text>
                <TextInput
                  style={styles.editInput}
                  value={editHandle}
                  onChangeText={setEditHandle}
                  placeholder="@tuusuario"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>
              <View>
                <Text style={styles.editLabel}>Bio</Text>
                <TextInput
                  style={[styles.editInput, { minHeight: 60, textAlignVertical: "top" }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Contá algo sobre vos..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(false);
                    setEditName(user.name);
                    setEditHandle(user.handle ?? "");
                    setEditBio(user.bio ?? "");
                  }}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={saving}
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                >
                  {saving ? (
                    <ActivityIndicator color="#1A1A1A" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ─── View mode ─── */
            <>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </Text>
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text style={styles.userName}>{user.name}</Text>
                  {user.handle && (
                    <Text style={styles.userHandle}>@{user.handle}</Text>
                  )}
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditName(user.name);
                    setEditHandle(user.handle ?? "");
                    setEditBio(user.bio ?? "");
                    setIsEditing(true);
                  }}
                  style={styles.editBtn}
                >
                  <Ionicons name="pencil-outline" size={16} color="#ffd500ff" />
                </TouchableOpacity>
              </View>

              {user.bio && (
                <Text style={styles.userBio}>{user.bio}</Text>
              )}
            </>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#ffd500ff" }]}>
                {attendingEvents.length}
              </Text>
              <Text style={styles.statLabel}>Asistidos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#3B82F6" }]}>
                {createdEvents.length}
              </Text>
              <Text style={styles.statLabel}>Creados</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#1A1A1A" }]}>
                {interests.length}
              </Text>
              <Text style={styles.statLabel}>Intereses</Text>
            </View>
          </View>
        </View>

        {/* Interests */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Intereses</Text>
            <TouchableOpacity
              onPress={() => setShowInterestPicker(!showInterestPicker)}
            >
              <Text style={styles.sectionAction}>
                {showInterestPicker ? "Cerrar" : "+ Añadir"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current interests */}
          <View style={styles.interestChips}>
            {interests.map((interest) => (
              <TouchableOpacity
                key={interest.id}
                onPress={() => removeInterest.mutate(interest.id)}
                style={[
                  styles.interestChip,
                  {
                    borderColor: getCategoryColor(interest.category) + "40",
                    backgroundColor: getCategoryColor(interest.category) + "10",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.interestChipText,
                    { color: getCategoryColor(interest.category) },
                  ]}
                >
                  {getCategoryLabel(interest.category)}
                </Text>
                <Ionicons
                  name="close"
                  size={12}
                  color={getCategoryColor(interest.category)}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            ))}
            {interests.length === 0 && (
              <Text style={styles.interestEmpty}>
                Añadí intereses para recibir recomendaciones
              </Text>
            )}
          </View>

          {/* Interest picker */}
          {showInterestPicker && (
            <View style={styles.interestPicker}>
              {availableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => addInterest.mutate(cat.id)}
                  style={styles.interestPickerItem}
                >
                  <Text style={{ marginRight: 4 }}>{cat.icon}</Text>
                  <Text style={styles.interestPickerText}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Events tabs */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              onPress={() => setActiveTab("attending")}
              style={[
                styles.tabItem,
                activeTab === "attending" && styles.tabItemActive,
              ]}
            >
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === "attending" && styles.tabItemTextActive,
                ]}
              >
                Asistiendo ({attendingEvents.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("created")}
              style={[
                styles.tabItem,
                activeTab === "created" && styles.tabItemActive,
              ]}
            >
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === "created" && styles.tabItemTextActive,
                ]}
              >
                Creados ({createdEvents.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Events list */}
          {(activeTab === "attending" ? loadingAttending : loadingCreated) ? (
            <ActivityIndicator color="#ffd500ff" style={{ paddingVertical: 32 }} />
          ) : (
            <FlatList
              data={activeTab === "attending" ? attendingEvents : createdEvents}
              renderItem={renderEventItem}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyEvents}>
                  <Ionicons
                    name={
                      activeTab === "attending"
                        ? "ticket-outline"
                        : "create-outline"
                    }
                    size={40}
                    color="#D1D5DB"
                  />
                  <Text style={styles.emptyEventsText}>
                    {activeTab === "attending"
                      ? "No estás asistiendo a ningún evento"
                      : "No has creado ningún evento"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1A1A1A",
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffd500ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  userHandle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  userEmail: {
    fontSize: 12,
    color: "#D1D5DB",
    marginTop: 2,
  },
  userBio: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  sectionAction: {
    fontSize: 13,
    color: "#ffd500ff",
    fontWeight: "600",
  },
  interestChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  interestEmpty: {
    fontSize: 13,
    color: "#D1D5DB",
  },
  interestPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  interestPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  interestPickerText: {
    fontSize: 12,
    color: "#6B7280",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabItemActive: {
    backgroundColor: "#ffd500ff",
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  tabItemTextActive: {
    color: "white",
    fontWeight: "600",
  },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  eventMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyEvents: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyEventsText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 16,
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  loginCta: {
    backgroundColor: "#ffd500ff",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  loginCtaText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 16,
  },
});
