import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Try to import native DateTimePicker, fallback for Expo Go
let DateTimePickerNative: any = null;
try {
  DateTimePickerNative = require("@react-native-community/datetimepicker").default;
} catch (e) {
  // Not available in Expo Go
}

// Fallback DateTimePicker for Expo Go - just show current value, no picker
const FallbackDateTimePicker = ({ value, mode, onChange }: any) => {
  const display = mode === "date"
    ? value.toLocaleDateString("es-AR")
    : value.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={{ padding: 12, backgroundColor: "#F9FAFB", borderRadius: 12, marginTop: 8, alignItems: "center" }}>
      <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 6 }}>
        Selector nativo no disponible en Expo Go
      </Text>
      <Text style={{ color: "#1A1A1A", fontSize: 16, fontWeight: "600" }}>{display}</Text>
    </View>
  );
};

const DateTimePicker = DateTimePickerNative || FallbackDateTimePicker;
import * as ImagePicker from "expo-image-picker";
import { CATEGORIES, MEDIA_LIMITS, CORDOBA_CENTER } from "../lib/constants";
import { useCreateEvent } from "../lib/hooks/useEvents";
import { useAuthStore } from "../lib/store";

const STEPS = ["Detalles", "Fecha y precio", "Privacidad", "Media"];

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createEvent = useCreateEvent();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [latitude, setLatitude] = useState(CORDOBA_CENTER.latitude);
  const [longitude, setLongitude] = useState(CORDOBA_CENTER.longitude);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [paymentType, setPaymentType] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");

  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [genderPreference, setGenderPreference] = useState("all_people");

  const [mediaUris, setMediaUris] = useState<string[]>([]);

  // Image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisos", "Necesitamos acceso a tu galería para subir fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: MEDIA_LIMITS.maxPhotos - mediaUris.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setMediaUris((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisos", "Necesitamos acceso a tu cámara.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setMediaUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUris((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Ingresá un título para el evento.");
      return;
    }
    if (!category) {
      Alert.alert("Error", "Seleccioná una categoría.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Error", "Agregá una descripción.");
      return;
    }

    try {
      let mainMediaUrl: string | undefined;
      let mainMediaType: string | undefined;
      let mediaItemsJson: string | undefined;

      if (mediaUris.length > 0 && user) {
        const { uploadMultipleMedia } = await import("../lib/storage");
        const uploaded = await uploadMultipleMedia(mediaUris, user.id);

        if (uploaded.length > 0) {
          mainMediaUrl = uploaded[0].url;
          mainMediaType = uploaded[0].type;
          mediaItemsJson = JSON.stringify(uploaded);
        }
      }

      await createEvent.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
        date: date.toISOString(),
        latitude,
        longitude,
        location_name: locationName.trim() || "Córdoba, Argentina",
        location_address: locationAddress.trim() || "Córdoba",
        payment_type: paymentType,
        price: paymentType === "paid" ? Number(price) || 0 : undefined,
        max_capacity: maxCapacity ? Number(maxCapacity) : undefined,
        privacy_type: privacy,
        gender_preference: genderPreference !== "all_people" ? genderPreference : undefined,
        main_media_url: mainMediaUrl,
        main_media_type: mainMediaType,
        media_items: mediaItemsJson,
      });

      Alert.alert("¡Listo!", "Tu evento fue creado correctamente.", [
        { text: "Genial", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo crear el evento.");
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 0:
        return title.trim() && category && description.trim();
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear evento</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepsContainer}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              i <= step ? styles.stepDotActive : styles.stepDotInactive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Paso {step + 1} de {STEPS.length}: {STEPS[step]}
      </Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* Step 0: Details */}
        {step === 0 && (
          <View style={{ gap: 16 }}>
            {/* Section card with yellow left border */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Detalles del Evento</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Título *</Text>
                <TextInput
                  placeholder="Nombre del evento"
                  placeholderTextColor="#9CA3AF"
                  style={styles.formInput}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ubicación</Text>
                <TextInput
                  placeholder="Ej: Parque Sarmiento"
                  placeholderTextColor="#9CA3AF"
                  style={styles.formInput}
                  value={locationName}
                  onChangeText={setLocationName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dirección</Text>
                <TextInput
                  placeholder="Ej: Av. Hipólito Yrigoyen 500"
                  placeholderTextColor="#9CA3AF"
                  style={styles.formInput}
                  value={locationAddress}
                  onChangeText={setLocationAddress}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Categoría *</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      style={[
                        styles.categoryChip,
                        category === cat.id && {
                          backgroundColor: cat.color + "15",
                          borderColor: cat.color,
                        },
                      ]}
                    >
                      <Text style={{ marginRight: 4 }}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat.id && { color: cat.color, fontWeight: "600" },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descripción *</Text>
                <TextInput
                  placeholder="Describí tu evento..."
                  placeholderTextColor="#9CA3AF"
                  style={[styles.formInput, styles.formTextarea]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{description.length}/500</Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 1: Date & Price */}
        {step === 1 && (
          <View style={{ gap: 16 }}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Fecha y hora</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fecha</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.formButton}
                >
                  <Ionicons name="calendar-outline" size={18} color="#ffd500ff" />
                  <Text style={styles.formButtonText}>
                    {date.toLocaleDateString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_: any, selectedDate: any) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (selectedDate) setDate(selectedDate);
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hora</Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  style={styles.formButton}
                >
                  <Ionicons name="time-outline" size={18} color="#ffd500ff" />
                  <Text style={styles.formButtonText}>
                    {date.toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={date}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_: any, selectedDate: any) => {
                      setShowTimePicker(Platform.OS === "ios");
                      if (selectedDate) setDate(selectedDate);
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Tipo de acceso</Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setPaymentType("free")}
                  style={[
                    styles.optionCard,
                    paymentType === "free" && styles.optionCardActive,
                  ]}
                >
                  <Text style={styles.optionEmoji}>🎟️</Text>
                  <Text
                    style={[
                      styles.optionText,
                      paymentType === "free" && styles.optionTextActive,
                    ]}
                  >
                    Gratis
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPaymentType("paid")}
                  style={[
                    styles.optionCard,
                    paymentType === "paid" && styles.optionCardActive,
                  ]}
                >
                  <Text style={styles.optionEmoji}>💰</Text>
                  <Text
                    style={[
                      styles.optionText,
                      paymentType === "paid" && styles.optionTextActive,
                    ]}
                  >
                    Pago
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentType === "paid" && (
                <View style={[styles.formGroup, { marginTop: 12 }]}>
                  <Text style={styles.formLabel}>Precio (ARS)</Text>
                  <TextInput
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    style={styles.formInput}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <View style={[styles.formGroup, { marginTop: 12 }]}>
                <Text style={styles.formLabel}>Capacidad máxima (opcional)</Text>
                <TextInput
                  placeholder="Sin límite"
                  placeholderTextColor="#9CA3AF"
                  style={styles.formInput}
                  value={maxCapacity}
                  onChangeText={setMaxCapacity}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Privacy */}
        {step === 2 && (
          <View style={{ gap: 16 }}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Privacidad del evento</Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setPrivacy("public")}
                  style={[
                    styles.privacyCard,
                    privacy === "public" && styles.privacyCardActive,
                  ]}
                >
                  <Ionicons
                    name="globe-outline"
                    size={28}
                    color={privacy === "public" ? "#ffd500ff" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.privacyTitle,
                      privacy === "public" && styles.privacyTitleActive,
                    ]}
                  >
                    Público
                  </Text>
                  <Text style={styles.privacyDesc}>
                    Cualquiera puede ver y unirse
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPrivacy("private")}
                  style={[
                    styles.privacyCard,
                    privacy === "private" && styles.privacyCardActive,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={28}
                    color={privacy === "private" ? "#ffd500ff" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.privacyTitle,
                      privacy === "private" && styles.privacyTitleActive,
                    ]}
                  >
                    Privado
                  </Text>
                  <Text style={styles.privacyDesc}>
                    Solo con aprobación
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Destinado Para</Text>
              <View style={styles.formButton}>
                <Ionicons name="people-outline" size={18} color="#ffd500ff" />
                <Text style={styles.formButtonText}>Todas las Personas</Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Media */}
        {step === 3 && (
          <View style={{ gap: 16 }}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Fotos y videos del evento</Text>
              <Text style={styles.sectionSubtitle}>
                Máximo {MEDIA_LIMITS.maxPhotos} fotos y {MEDIA_LIMITS.maxVideos} videos
              </Text>

              <View style={styles.mediaGrid}>
                {mediaUris.map((uri, index) => (
                  <View key={uri} style={styles.mediaItem}>
                    <Image source={{ uri }} style={styles.mediaImage} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => removeMedia(index)}
                      style={styles.mediaRemove}
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}

                {mediaUris.length < MEDIA_LIMITS.maxPhotos && (
                  <>
                    <TouchableOpacity onPress={pickImage} style={styles.mediaAdd}>
                      <Ionicons name="images-outline" size={24} color="#9CA3AF" />
                      <Text style={styles.mediaAddText}>Galería</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={takePhoto} style={styles.mediaAdd}>
                      <Ionicons name="camera-outline" size={24} color="#9CA3AF" />
                      <Text style={styles.mediaAddText}>Cámara</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom nav buttons */}
      <View
        style={[
          styles.bottomNav,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        {step > 0 && (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={styles.prevButton}
          >
            <Ionicons name="arrow-back" size={16} color="#6B7280" />
            <Text style={styles.prevButtonText}>Anterior</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            onPress={() => canGoNext() && setStep(step + 1)}
            disabled={!canGoNext()}
            style={[
              styles.nextButton,
              !canGoNext() && styles.nextButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.nextButtonText,
                !canGoNext() && styles.nextButtonTextDisabled,
              ]}
            >
              Siguiente
            </Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={canGoNext() ? "#1A1A1A" : "#D1D5DB"}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createEvent.isPending}
            style={[
              styles.submitButton,
              createEvent.isPending && styles.submitButtonDisabled,
            ]}
          >
            {createEvent.isPending ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.submitButtonText}>Crear Evento</Text>
            )}
          </TouchableOpacity>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  stepsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepDotActive: {
    backgroundColor: "#ffd500ff",
  },
  stepDotInactive: {
    backgroundColor: "#E5E7EB",
  },
  stepLabel: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    marginBottom: 4,
  },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#ffd500ff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 12,
    marginTop: -8,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "500",
  },
  formInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formTextarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  formButton: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formButtonText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginLeft: 12,
  },
  charCount: {
    fontSize: 11,
    color: "#D1D5DB",
    textAlign: "right",
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  categoryChipText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  optionCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  optionCardActive: {
    borderColor: "#ffd500ff",
    backgroundColor: "#FFFBEB",
  },
  optionEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  optionText: {
    fontWeight: "600",
    color: "#6B7280",
  },
  optionTextActive: {
    color: "#ffd500ff",
  },
  privacyCard: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  privacyCardActive: {
    borderColor: "#ffd500ff",
    backgroundColor: "#FFFBEB",
  },
  privacyTitle: {
    fontWeight: "600",
    marginTop: 8,
    color: "#6B7280",
  },
  privacyTitleActive: {
    color: "#ffd500ff",
  },
  privacyDesc: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 4,
  },
  mediaAdd: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  mediaAddText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  bottomNav: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  prevButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  prevButtonText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffd500ff",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  nextButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },
  nextButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
  },
  nextButtonTextDisabled: {
    color: "#D1D5DB",
  },
  submitButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffd500ff",
    borderRadius: 14,
    paddingVertical: 14,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 15,
  },
});
