import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Try to import native Slider, fallback for Expo Go
let SliderComponent: any = null;
try {
  SliderComponent = require("@react-native-community/slider").default;
} catch (e) {
  // Not available in Expo Go
}

// Fallback slider component for Expo Go
const FallbackSlider = ({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
}: any) => {
  const percentage =
    ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
  return (
    <View style={{ paddingHorizontal: 4 }}>
      <View
        style={{
          height: 6,
          backgroundColor: "#E5E7EB",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: "#ffd500ff",
            borderRadius: 3,
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <TouchableOpacity
          onPress={() =>
            onValueChange(Math.max(minimumValue, value - step * 5))
          }
          style={{
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: "#F3F4F6",
          }}
        >
          <Text style={{ fontSize: 12, color: "#6B7280" }}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            onValueChange(Math.min(maximumValue, value + step * 5))
          }
          style={{
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: "#F3F4F6",
          }}
        >
          <Text style={{ fontSize: 12, color: "#6B7280" }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Slider = SliderComponent || FallbackSlider;

// ─── Filter types ───
export interface AdvancedFilterOptions {
  types: string[];
  priceRange: [number, number];
  dateRange: string;
  distance: number;
  groupSize: [number, number];
  rating: number;
  categories: string[];
  timeOfDay: string[];
}

export const DEFAULT_FILTERS: AdvancedFilterOptions = {
  types: [],
  priceRange: [0, 1000],
  dateRange: "any",
  distance: 25,
  groupSize: [1, 100],
  rating: 0,
  categories: [],
  timeOfDay: [],
};

interface AdvancedFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: AdvancedFilterOptions;
  onApply: (filters: AdvancedFilterOptions) => void;
  onClear: () => void;
}

const ACTIVITY_TYPES = [
  { id: "evento", label: "Eventos", icon: "ticket-outline" as const, color: "#3B82F6" },
  { id: "plan", label: "Planes", icon: "cafe-outline" as const, color: "#A855F7" },
  {
    id: "actividad_grupal",
    label: "Actividades Grupales",
    icon: "people-outline" as const,
    color: "#14B8A6",
  },
  {
    id: "experiencia",
    label: "Experiencias",
    icon: "sparkles-outline" as const,
    color: "#F97316",
  },
];

const CATEGORIES_LIST = [
  "Social",
  "Música",
  "Arte",
  "Deportes",
  "Comida",
  "Educación",
  "Tecnología",
  "Juegos",
  "Outdoor",
  "Networking",
  "Espiritual",
];

const TIME_SLOTS = [
  "Mañana (6-12)",
  "Tarde (12-18)",
  "Noche (18-24)",
  "Madrugada (0-6)",
];

const RATINGS = [4.5, 4.0, 3.5, 3.0];

const DATE_OPTIONS = [
  { label: "Cualquier momento", value: "any" },
  { label: "Hoy", value: "today" },
  { label: "Mañana", value: "tomorrow" },
  { label: "Esta semana", value: "this_week" },
  { label: "Este fin de semana", value: "this_weekend" },
  { label: "Este mes", value: "this_month" },
];

export function AdvancedFiltersModal({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
}: AdvancedFiltersModalProps) {
  const insets = useSafeAreaInsets();
  const [localFilters, setLocalFilters] =
    useState<AdvancedFilterOptions>(filters);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["types", "price"])
  );

  // Sync when modal opens
  React.useEffect(() => {
    if (visible) setLocalFilters(filters);
  }, [visible]);

  const toggleSection = (section: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(section)) newSet.delete(section);
    else newSet.add(section);
    setExpanded(newSet);
  };

  const update = (key: keyof AdvancedFilterOptions, value: any) =>
    setLocalFilters((prev) => ({ ...prev, [key]: value }));

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const getActiveCount = () => {
    let c = 0;
    if (localFilters.types.length > 0) c++;
    if (localFilters.priceRange[1] < 1000 || localFilters.priceRange[0] > 0)
      c++;
    if (localFilters.dateRange !== "any") c++;
    if (localFilters.distance < 25) c++;
    if (localFilters.groupSize[0] > 1 || localFilters.groupSize[1] < 100) c++;
    if (localFilters.rating > 0) c++;
    if (localFilters.categories.length > 0) c++;
    if (localFilters.timeOfDay.length > 0) c++;
    return c;
  };

  const activeCount = getActiveCount();

  const renderSectionHeader = (
    title: string,
    sectionKey: string,
    icon?: string
  ) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(sectionKey)}
      activeOpacity={0.7}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons
        name={expanded.has(sectionKey) ? "chevron-up" : "chevron-down"}
        size={18}
        color="#9CA3AF"
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="funnel-outline" size={20} color="#6B7280" />
            <Text style={styles.headerTitle}>Filtros</Text>
            {activeCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tipo de Actividad */}
          {renderSectionHeader("Tipo de Actividad", "types")}
          {expanded.has("types") && (
            <View style={styles.sectionBody}>
              {ACTIVITY_TYPES.map((type) => {
                const isSelected = localFilters.types.includes(type.id);
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeCard,
                      isSelected && {
                        borderColor: "#EC4899",
                        backgroundColor: "#FDF2F8",
                      },
                    ]}
                    onPress={() =>
                      update(
                        "types",
                        toggleArrayItem(localFilters.types, type.id)
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={type.color}
                    />
                    <Text style={styles.typeCardLabel}>{type.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.divider} />

          {/* Rango de Precio */}
          {renderSectionHeader("Rango de Precio", "price")}
          {expanded.has("price") && (
            <View style={styles.sectionBody}>
              <View style={styles.priceLabel}>
                <Text style={{ color: "#22C55E", fontWeight: "600" }}>$</Text>
                <Text style={styles.priceLabelText}>
                  ${localFilters.priceRange[0]} - ${localFilters.priceRange[1]}
                </Text>
              </View>
              <Slider
                minimumValue={0}
                maximumValue={1000}
                step={10}
                value={localFilters.priceRange[1]}
                onValueChange={(val: number) =>
                  update("priceRange", [localFilters.priceRange[0], val])
                }
                minimumTrackTintColor="#ffd500ff"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#ffd500ff"
              />
              <View style={styles.quickButtons}>
                {[
                  { label: "Gratis", range: [0, 0] as [number, number] },
                  { label: "$0-100", range: [0, 100] as [number, number] },
                  { label: "$0-500", range: [0, 500] as [number, number] },
                ].map((btn) => (
                  <TouchableOpacity
                    key={btn.label}
                    style={[
                      styles.quickButton,
                      localFilters.priceRange[1] === btn.range[1] &&
                        localFilters.priceRange[0] === btn.range[0] &&
                        styles.quickButtonActive,
                    ]}
                    onPress={() => update("priceRange", btn.range)}
                  >
                    <Text
                      style={[
                        styles.quickButtonText,
                        localFilters.priceRange[1] === btn.range[1] &&
                          localFilters.priceRange[0] === btn.range[0] &&
                          styles.quickButtonTextActive,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Cuándo */}
          {renderSectionHeader("Cuándo", "date")}
          {expanded.has("date") && (
            <View style={styles.sectionBody}>
              <View style={styles.datePickerContainer}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color="#9CA3AF"
                  style={{ marginRight: 8 }}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {DATE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.dateOption,
                        localFilters.dateRange === opt.value &&
                          styles.dateOptionActive,
                      ]}
                      onPress={() => update("dateRange", opt.value)}
                    >
                      <Text
                        style={[
                          styles.dateOptionText,
                          localFilters.dateRange === opt.value &&
                            styles.dateOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Distancia */}
          {renderSectionHeader("Distancia", "distance")}
          {expanded.has("distance") && (
            <View style={styles.sectionBody}>
              <View style={styles.priceLabel}>
                <Ionicons name="location-outline" size={14} color="#3B82F6" />
                <Text style={styles.priceLabelText}>
                  Hasta {localFilters.distance} km
                </Text>
              </View>
              <Slider
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={localFilters.distance}
                onValueChange={(val: number) => update("distance", val)}
                minimumTrackTintColor="#ffd500ff"
                maximumTrackTintColor="#1F2937"
                thumbTintColor="#ffd500ff"
              />
            </View>
          )}

          <View style={styles.divider} />

          {/* Tamaño de Grupo */}
          {renderSectionHeader("Tamaño de Grupo", "groupSize")}
          {expanded.has("groupSize") && (
            <View style={styles.sectionBody}>
              <View style={styles.priceLabel}>
                <Ionicons name="people-outline" size={14} color="#A855F7" />
                <Text style={styles.priceLabelText}>
                  {localFilters.groupSize[0]} - {localFilters.groupSize[1]}{" "}
                  personas
                </Text>
              </View>
              <Slider
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={localFilters.groupSize[1]}
                onValueChange={(val: number) =>
                  update("groupSize", [localFilters.groupSize[0], val])
                }
                minimumTrackTintColor="#ffd500ff"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#ffd500ff"
              />
              <View style={styles.quickButtons}>
                {[
                  { label: "Íntimo", range: [1, 5] as [number, number] },
                  { label: "Mediano", range: [6, 20] as [number, number] },
                  { label: "Grande", range: [21, 100] as [number, number] },
                ].map((btn) => (
                  <TouchableOpacity
                    key={btn.label}
                    style={[
                      styles.quickButton,
                      localFilters.groupSize[0] === btn.range[0] &&
                        localFilters.groupSize[1] === btn.range[1] &&
                        styles.quickButtonActive,
                    ]}
                    onPress={() => update("groupSize", btn.range)}
                  >
                    <Text
                      style={[
                        styles.quickButtonText,
                        localFilters.groupSize[0] === btn.range[0] &&
                          localFilters.groupSize[1] === btn.range[1] &&
                          styles.quickButtonTextActive,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Calificación */}
          {renderSectionHeader("Calificación", "rating")}
          {expanded.has("rating") && (
            <View style={styles.sectionBody}>
              {RATINGS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.typeCard,
                    localFilters.rating === r && {
                      borderColor: "#F59E0B",
                      backgroundColor: "#FFFBEB",
                    },
                  ]}
                  onPress={() =>
                    update("rating", localFilters.rating === r ? 0 : r)
                  }
                >
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.typeCardLabel}>{r}+ estrellas</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Categorías */}
          {renderSectionHeader("Categorías", "categories")}
          {expanded.has("categories") && (
            <View style={[styles.sectionBody, styles.categoriesGrid]}>
              {CATEGORIES_LIST.map((cat) => {
                const sel = localFilters.categories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      sel && styles.categoryPillActive,
                    ]}
                    onPress={() =>
                      update(
                        "categories",
                        toggleArrayItem(localFilters.categories, cat)
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        sel && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.divider} />

          {/* Horario */}
          {renderSectionHeader("Horario", "timeOfDay")}
          {expanded.has("timeOfDay") && (
            <View style={styles.sectionBody}>
              {TIME_SLOTS.map((slot) => {
                const sel = localFilters.timeOfDay.includes(slot);
                return (
                  <TouchableOpacity
                    key={slot}
                    style={styles.timeSlotRow}
                    onPress={() =>
                      update(
                        "timeOfDay",
                        toggleArrayItem(localFilters.timeOfDay, slot)
                      )
                    }
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        sel && styles.radioCircleActive,
                      ]}
                    >
                      {sel && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.timeSlotText}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setLocalFilters(DEFAULT_FILTERS);
              onClear();
            }}
          >
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => onApply(localFilters)}
          >
            <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  countBadge: {
    backgroundColor: "#EC4899",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  sectionBody: {
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    gap: 12,
  },
  typeCardLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  priceLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  priceLabelText: {
    fontSize: 13,
    color: "#6B7280",
  },
  quickButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  quickButtonActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  quickButtonTextActive: {
    color: "white",
  },
  datePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  dateOptionActive: {
    borderColor: "#EC4899",
    backgroundColor: "#FDF2F8",
  },
  dateOptionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  dateOptionTextActive: {
    color: "#EC4899",
    fontWeight: "600",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryPillActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  categoryPillTextActive: {
    color: "white",
  },
  timeSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#F97316",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F97316",
  },
  timeSlotText: {
    fontSize: 13,
    color: "#374151",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#EC4899",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
});
