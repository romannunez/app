import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useMapLighting } from "../../lib/hooks/useMapLighting";
import { useEvents } from "../../lib/hooks/useEvents";
import { CORDOBA_CENTER, MAPBOX_TOKEN, CATEGORIES } from "../../lib/constants";
import { useAuthStore } from "../../lib/store";
import { FloatingButton } from "../../components/FloatingButton";
import { EventMapPin } from "../../components/EventMapPin";
import { ComplexMarkerPin } from "../../components/ComplexMarkerPin";
import { MapboxWebMap, type MapMarker, type MapboxWebMapHandle } from "../../components/MapboxWebMap";
import {
  AdvancedFiltersModal,
  DEFAULT_FILTERS,
  type AdvancedFilterOptions,
} from "../../components/AdvancedFiltersModal";
import { useUserLocation } from "../../lib/hooks/useUserLocation";
import { useGeocoding, type GeocodingResult } from "../../lib/hooks/useGeocoding";

// Only import Mapbox on native (it crashes on web and Expo Go)
let MapboxGL: any = null;
if (Platform.OS !== "web") {
  try {
    MapboxGL = require("@rnmapbox/maps").default;
    MapboxGL.setAccessToken(MAPBOX_TOKEN);
  } catch (e) {
    // Mapbox not available (Expo Go), will use fallback UI
    MapboxGL = null;
  }
}

// Import react-native-maps via platform-specific module (maps.web.ts returns nulls)
import { RNMapView, RNMarker, RNCallout } from "../../lib/maps";

// Pin colors by category
const PIN_COLORS: Record<string, string> = {
  social: "#3B82F6",
  music: "#A855F7",
  spiritual: "#818CF8",
  education: "#10B981",
  sports: "#F97316",
  food: "#EF4444",
  art: "#EC4899",
  technology: "#6366F1",
  games: "#14B8A6",
  outdoor: "#22C55E",
  networking: "#8B5CF6",
  workshop: "#F59E0B",
  conference: "#0EA5E9",
  party: "#F43F5E",
  fair: "#D946EF",
  exhibition: "#0D9488",
};

// ─── Combined filter chips (single row) ───
const COMBINED_CHIPS: { key: string; label: string; icon?: string; materialIcon?: string; type: "filter" | "time" }[] = [
  { key: "eventos", label: "Eventos", icon: "calendar-outline", type: "filter" },
  { key: "hoy", label: "Hoy", type: "time" },
  { key: "deportes", label: "Deportes", materialIcon: "directions_run", icon: "walk-outline", type: "filter" },
  { key: "cerca", label: "Cerca de mí", type: "time" },
  { key: "planes", label: "Planes", icon: "cafe-outline", type: "filter" },
  { key: "manana", label: "Mañana", type: "time" },
  { key: "grupal", label: "Actividades grupales", icon: "people-outline", type: "filter" },
  { key: "finde", label: "Este finde", type: "time" },
  { key: "experiencias", label: "Experiencias", icon: "sparkles-outline", type: "filter" },
  { key: "semana", label: "En la semana", type: "time" },
  { key: "proxima", label: "Próxima semana", type: "time" },
];

// ─── Associated complexes (special markers) ───
type AssociatedComplex = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  canchas: number;
  phone: string;
  hours: string;
};

const ASSOCIATED_COMPLEXES: AssociatedComplex[] = [
  {
    id: "complex-lagran7",
    name: "La Gran 7",
    // Celso Barrios 3100, Córdoba (verified via OpenStreetMap)
    latitude: -31.43485,
    longitude: -64.18125,
    description: "Complejo de canchas de fútbol 5, 7 y 11. Césped sintético de última generación.",
    canchas: 5,
    phone: "+54 351 555-1234",
    hours: "Lun-Vie 16:00-00:00 · Sáb-Dom 09:00-00:00",
  },
  {
    id: "complex-america",
    name: "Complejo América",
    // Friuli 1996, Córdoba
    latitude: -31.4375,
    longitude: -64.1962,
    description: "El mejor complejo de canchas de Córdoba. Fútbol, pádel y más.",
    canchas: 8,
    phone: "+54 351 555-5678",
    hours: "Todos los días 10:00-01:00",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lightPreset = useMapLighting();
  const user = useAuthStore((s) => s.user);

  const { data: events = [], isLoading } = useEvents();

  // ─── Load Material Symbols font on web ───
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const id = "material-symbols-outlined-home";
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=directions_run";
        document.head.appendChild(link);
      }
    }
  }, []);

  // Map ref for flyTo (web)
  const mapRef = useRef<MapboxWebMapHandle>(null);
  // Camera ref for flyTo on native Mapbox
  const cameraRef = useRef<any>(null);
  // Map ref for react-native-maps (Expo Go / no Mapbox)
  const rnMapRef = useRef<any>(null);

  // User location
  const { location: userLocation, loading: locationLoading, refresh: refreshLocation } = useUserLocation();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Geocoding
  const { results: geocodingResults, loading: geocodingLoading } = useGeocoding(searchQuery);

  // Long-press menu state
  const [longPressCoords, setLongPressCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showPinMenu, setShowPinMenu] = useState(false);

  // Filter chip state
  const [activeFilterPill, setActiveFilterPill] = useState<string | null>(null);
  const [activeTimeTab, setActiveTimeTab] = useState<string | null>(null);

  // Notifications modal
  const [showNotifications, setShowNotifications] = useState(false);

  // Advanced filters modal
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] =
    useState<AdvancedFilterOptions>(DEFAULT_FILTERS);

  // Location selection mode (for creating event at specific location)
  const [locationSelectMode, setLocationSelectMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Complex bottom sheet state
  const [selectedComplex, setSelectedComplex] = useState<AssociatedComplex | null>(null);
  const [showComplexSheet, setShowComplexSheet] = useState(false);

  // Complex labels hidden until very close zoom (latitudeDelta < 0.03 ≈ zoom 15+)
  const [showComplexLabels, setShowComplexLabels] = useState(false);

  const handleLongPress = useCallback(
    (event: any) => {
      const coords = event.geometry?.coordinates;
      if (coords) {
        if (locationSelectMode) {
          setSelectedLocation({ latitude: coords[1], longitude: coords[0] });
        } else {
          setLongPressCoords({ latitude: coords[1], longitude: coords[0] });
          setShowPinMenu(true);
        }
      }
    },
    [locationSelectMode]
  );

  const handleMapPress = useCallback(
    (event: any) => {
      if (locationSelectMode) {
        const coords = event.geometry?.coordinates;
        if (coords) {
          setSelectedLocation({ latitude: coords[1], longitude: coords[0] });
        }
      }
    },
    [locationSelectMode]
  );

  const handleCreateEventHere = () => {
    setShowPinMenu(false);
    setLocationSelectMode(false);
    if (!user) {
      router.push("/auth");
      return;
    }
    router.push("/create-event");
  };

  const handleEnterLocationSelectMode = () => {
    setShowPinMenu(false);
    setLongPressCoords(null);
    setLocationSelectMode(true);
    setSelectedLocation(null);
  };

  const handleCancelLocationSelect = () => {
    setLocationSelectMode(false);
    setSelectedLocation(null);
  };

  const handleMarkerPress = useCallback(
    (eventId: number) => {
      router.push(`/event/${eventId}`);
    },
    [router]
  );

  // Complex marker press handler
  const handleComplexPress = useCallback(
    (complexId: string) => {
      const complex = ASSOCIATED_COMPLEXES.find((c) => c.id === complexId);
      if (!complex) return;

      // Fly to complex location
      if (mapRef.current) {
        mapRef.current.flyTo(complex.longitude, complex.latitude, 17);
      }

      // Open bottom sheet after fly-to animation
      setTimeout(() => {
        setSelectedComplex(complex);
        setShowComplexSheet(true);
      }, 1200);
    },
    []
  );

  // react-native-maps complex press handler — animateToRegion + open sheet
  const handleRNComplexPress = useCallback((complexId: string) => {
    const complex = ASSOCIATED_COMPLEXES.find((c) => c.id === complexId);
    if (!complex) return;

    if (rnMapRef.current) {
      rnMapRef.current.animateToRegion(
        {
          latitude: complex.latitude,
          longitude: complex.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        900
      );
    }

    setTimeout(() => {
      setSelectedComplex(complex);
      setShowComplexSheet(true);
    }, 1100);
  }, []);

  // Native-specific complex press handler — uses MapboxGL.Camera ref for flyTo
  const handleNativeComplexPress = useCallback((complexId: string) => {
    const complex = ASSOCIATED_COMPLEXES.find((c) => c.id === complexId);
    if (!complex) return;

    if (cameraRef.current) {
      cameraRef.current.flyTo(
        [complex.longitude, complex.latitude],
        1000 // animation duration ms
      );
    }

    setTimeout(() => {
      setSelectedComplex(complex);
      setShowComplexSheet(true);
    }, 1200);
  }, []);

  // Search filtering
  const searchResults = events.filter(
    (evt) =>
      searchQuery.length >= 2 &&
      evt.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryLabel = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found?.label ?? cat;
  };

  // Handle location button press
  const handleLocationPress = useCallback(() => {
    if (userLocation) {
      // Already have location — fly to it
      if (mapRef.current) {
        mapRef.current.flyTo(userLocation.longitude, userLocation.latitude, 15);
      }
    } else {
      // Request location
      refreshLocation();
    }
  }, [userLocation, refreshLocation]);

  // Auto-flyTo once location resolves (so first press works in one tap)
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation.longitude, userLocation.latitude, 15);
    }
  }, [userLocation]);

  // Handle place result tap
  const handlePlacePress = useCallback((place: GeocodingResult) => {
    setSearchQuery("");
    setShowSearchResults(false);
    if (mapRef.current) {
      mapRef.current.flyTo(place.longitude, place.latitude, 16);
    }
  }, []);

  // ── Expo Go fallback with react-native-maps ──────────────────
  if (Platform.OS !== "web" && !MapboxGL && RNMapView) {
    return (
      <View style={{ flex: 1 }}>
        {/* Interactive map via react-native-maps */}
        <RNMapView
          ref={rnMapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: -31.40,
            longitude: -64.195,
            latitudeDelta: 0.12,
            longitudeDelta: 0.12,
          }}
          showsBuildings={true}
          pitchEnabled={true}
          rotateEnabled={true}
          mapType="standard"
          showsUserLocation
          showsMyLocationButton={false}
          onRegionChangeComplete={(region) => {
            // Show complex name labels when zoomed in past ~zoom 13
            setShowComplexLabels(region.latitudeDelta < 0.03);
          }}
          onLongPress={(e: any) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setLongPressCoords({ latitude, longitude });
            setShowPinMenu(true);
          }}
        >
          {/* Event markers */}
          {events.map((evt) => (
            <RNMarker
              key={`event-${evt.id}`}
              coordinate={{
                latitude: Number(evt.latitude),
                longitude: Number(evt.longitude),
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleMarkerPress(evt.id)}
              tracksViewChanges={true}
            >
              <EventMapPin
                imageUrl={evt.main_media_url}
                category={evt.category}
                title={evt.title}
                showLabel={showComplexLabels}
              />
            </RNMarker>
          ))}

          {/* ── Associated complex markers ── */}
          {ASSOCIATED_COMPLEXES.map((cx) => (
            <RNMarker
              key={cx.id}
              coordinate={{ latitude: cx.latitude, longitude: cx.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => handleRNComplexPress(cx.id)}
              tracksViewChanges={true}
            >
              <ComplexMarkerPin name={cx.name} showLabel={showComplexLabels} />
            </RNMarker>
          ))}
        </RNMapView>

        {/* ── Top overlay: Search bar + filter ── */}
        <View
          style={[
            styles.searchContainer,
            { top: insets.top + 8 },
          ]}
        >
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <TextInput
                placeholder="¿De qué quieres participar hoy?"
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowSearchResults(text.length >= 2);
                }}
              />
              <Text style={styles.searchSubtitle}>Cualquier evento, plan o actividad</Text>
            </View>
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setShowSearchResults(false);
                }}
              >
                <Ionicons name="close-circle" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.chipsFiltrosButton} activeOpacity={0.7} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={18} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Search results dropdown — events + places */}
        {showSearchResults && (searchResults.length > 0 || geocodingResults.length > 0) && (
          <View
            style={[
              styles.searchResults,
              { top: insets.top + 68 },
            ]}
          >
            {/* Event results */}
            {searchResults.slice(0, 3).map((evt) => (
              <TouchableOpacity
                key={evt.id}
                style={styles.searchResultItem}
                onPress={() => {
                  setShowSearchResults(false);
                  setSearchQuery("");
                  handleMarkerPress(evt.id);
                }}
              >
                {evt.main_media_url && (
                  <Image
                    source={{ uri: evt.main_media_url }}
                    style={styles.searchResultImage}
                  />
                )}
                <View style={{ flex: 1, marginLeft: evt.main_media_url ? 12 : 0 }}>
                  <Text style={styles.searchResultCategory}>
                    {getCategoryLabel(evt.category).toUpperCase()}
                  </Text>
                  <Text style={styles.searchResultTitle} numberOfLines={1}>
                    {evt.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Separator if both sections have results */}
            {searchResults.length > 0 && geocodingResults.length > 0 && (
              <View style={styles.searchSectionDivider}>
                <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                <Text style={styles.searchSectionLabel}>Lugares</Text>
              </View>
            )}

            {/* Place/geocoding results */}
            {geocodingResults.slice(0, 4).map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.searchResultItem}
                onPress={() => handlePlacePress(place)}
              >
                <View style={styles.placeIconContainer}>
                  <Ionicons name="location" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.searchResultTitle} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.searchResultMeta} numberOfLines={1}>
                    {place.fullAddress}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            ))}

            {/* Loading indicator */}
            {geocodingLoading && searchQuery.length >= 3 && geocodingResults.length === 0 && (
              <View style={styles.searchLoadingRow}>
                <ActivityIndicator size="small" color="#9CA3AF" />
                <Text style={styles.searchResultMeta}>Buscando lugares...</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Combined filter chips overlay (single row) ── */}
        <View
          style={[
            styles.chipsOverlay,
            { top: insets.top + 68 },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsPillsScroll}
          >
            {COMBINED_CHIPS.map((chip) => {
              const isFilterChip = chip.type === "filter";
              const isActive = isFilterChip
                ? activeFilterPill === chip.key
                : activeTimeTab === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[
                    isFilterChip ? styles.chipsPill : styles.chipsTimeTab,
                    isActive && (isFilterChip ? styles.chipsPillActive : styles.chipsTimeTabActive),
                  ]}
                  onPress={() =>
                    isFilterChip
                      ? setActiveFilterPill(isActive ? null : chip.key)
                      : setActiveTimeTab(isActive ? null : chip.key)
                  }
                  activeOpacity={0.7}
                >
                  {isFilterChip && chip.materialIcon && Platform.OS === "web" ? (
                    <Text
                      style={{
                        fontFamily: "Material Symbols Outlined",
                        fontSize: 16,
                        color: isActive ? "white" : "#374151",
                        marginRight: 4,
                      }}
                    >
                      {chip.materialIcon}
                    </Text>
                  ) : isFilterChip && chip.materialIcon ? (
                    <MaterialIcons
                      name="directions-run"
                      size={16}
                      color={isActive ? "white" : "#374151"}
                      style={{ marginRight: 4 }}
                    />
                  ) : isFilterChip && chip.icon ? (
                    <Ionicons
                      name={chip.icon as any}
                      size={14}
                      color={isActive ? "white" : "#374151"}
                      style={{ marginRight: 5 }}
                    />
                  ) : null}
                  <Text
                    style={[
                      isFilterChip ? styles.chipsPillText : styles.chipsTimeTabText,
                      isActive && (isFilterChip ? styles.chipsPillTextActive : styles.chipsTimeTabTextActive),
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Left side floating buttons ── */}
        <View
          style={[
            styles.sideButtons,
            { top: insets.top + 128 },
          ]}
        >
          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => setShowNotifications(true)}
          >
            <Ionicons name="notifications" size={22} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sideButton, userLocation && styles.sideButtonActive]}
            onPress={handleLocationPress}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <Ionicons name="location" size={22} color={userLocation ? "#4285F4" : "#4B5563"} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideButton} onPress={() => router.push("/smart-scanner" as any)}>
            <Ionicons name="camera" size={22} color="#4B5563" />
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.bottomActions,
            { bottom: Platform.OS === "ios" ? 110 : 95 },
          ]}
        >
          <FloatingButton
            label="Cosas que hacer"
            icon="compass-outline"
            variant="outline"
            onPress={() => router.push("/(tabs)/descubrir")}
          />
          <FloatingButton
            label="Crear un evento"
            icon="add"
            variant="primary"
            onPress={() => {
              if (!user) {
                router.push("/auth");
                return;
              }
              router.push("/create-event");
            }}
          />
        </View>

        {/* ── Long-press context menu ── */}
        <Modal
          visible={showPinMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPinMenu(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setShowPinMenu(false);
              setLongPressCoords(null);
            }}
          >
            <View style={styles.contextMenu}>
              <Text style={styles.contextMenuTitle}>¿Qué quieres hacer?</Text>
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  setShowPinMenu(false);
                  router.push("/(tabs)/descubrir");
                }}
              >
                <Ionicons name="compass-outline" size={20} color="#6B7280" />
                <Text style={styles.contextMenuText}>Ver eventos cercanos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={handleCreateEventHere}
              >
                <Ionicons name="add" size={20} color="#6B7280" />
                <Text style={styles.contextMenuText}>Crear evento aquí</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  setShowPinMenu(false);
                  setLongPressCoords(null);
                }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
                <Text style={styles.contextMenuText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* ── Notifications modal (glassmorphic) ── */}
        <Modal
          visible={showNotifications}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNotifications(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowNotifications(false)}
          >
            <View style={styles.notificationsPanel}>
              {Platform.OS === "ios" && (
                <BlurView
                  intensity={80}
                  tint="light"
                  style={[
                    StyleSheet.absoluteFill,
                    { borderRadius: 20, overflow: "hidden" },
                  ]}
                />
              )}
              <View style={{ position: "relative", zIndex: 1 }}>
                <View style={styles.notificationsHeader}>
                  <Text style={styles.notificationsTitle}>Notificaciones</Text>
                  <TouchableOpacity onPress={() => setShowNotifications(false)}>
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.notificationsEmpty}>
                  <Ionicons name="time-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.notificationsEmptyText}>
                    No tienes notificaciones pendientes
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* ── Advanced Filters modal ── */}
        <AdvancedFiltersModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          filters={advancedFilters}
          onApply={(filters) => {
            setAdvancedFilters(filters);
            setShowFilters(false);
          }}
          onClear={() => {
            setAdvancedFilters(DEFAULT_FILTERS);
            setActiveFilterPill(null);
          }}
        />

        {/* ── Complex bottom sheet ── */}
        <Modal
          visible={showComplexSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowComplexSheet(false)}
        >
          <Pressable
            style={styles.complexSheetOverlay}
            onPress={() => setShowComplexSheet(false)}
          >
            <View style={styles.complexSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.complexSheetHandle} />
              {selectedComplex && (
                <>
                  <View style={styles.complexSheetHeader}>
                    <View style={styles.complexSheetBadge}>
                      <Text style={styles.complexSheetBadgeText}>⚽</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.complexSheetName}>{selectedComplex.name}</Text>
                      <Text style={styles.complexSheetAssoc}>Complejo asociado</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.complexSheetClose}
                      onPress={() => setShowComplexSheet(false)}
                    >
                      <Ionicons name="close" size={22} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.complexSheetDesc}>{selectedComplex.description}</Text>
                  <View style={styles.complexSheetInfoRow}>
                    <Ionicons name="football-outline" size={18} color="#16A34A" />
                    <Text style={styles.complexSheetInfoText}>{selectedComplex.canchas} canchas disponibles</Text>
                  </View>
                  <View style={styles.complexSheetInfoRow}>
                    <Ionicons name="call-outline" size={18} color="#16A34A" />
                    <Text style={styles.complexSheetInfoText}>{selectedComplex.phone}</Text>
                  </View>
                  <View style={styles.complexSheetInfoRow}>
                    <Ionicons name="time-outline" size={18} color="#16A34A" />
                    <Text style={styles.complexSheetInfoText}>{selectedComplex.hours}</Text>
                  </View>
                  <View style={styles.complexSheetActions}>
                    <TouchableOpacity style={styles.complexSheetBtnOutline}>
                      <Ionicons name="call" size={18} color="#16A34A" />
                      <Text style={styles.complexSheetBtnOutlineText}>Llamar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.complexSheetBtnPrimary}>
                      <Ionicons name="calendar" size={18} color="#FFFFFF" />
                      <Text style={styles.complexSheetBtnPrimaryText}>Reservar cancha</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // ── Web: Full Mapbox GL JS 3D map ──────────────────────────
  const webMapMarkers: MapMarker[] = [
    ...events.map((evt) => ({
      id: String(evt.id),
      longitude: Number(evt.longitude),
      latitude: Number(evt.latitude),
      color: PIN_COLORS[evt.category] || "#ffd500ff",
      emoji: CATEGORIES.find((c) => c.id === evt.category)?.icon ?? "📅",
      title: evt.title,
      imageUrl: evt.main_media_url,
      category: evt.category,
      locationName: evt.location_name,
    })),
    ...ASSOCIATED_COMPLEXES.map((cx) => ({
      id: cx.id,
      longitude: cx.longitude,
      latitude: cx.latitude,
      title: cx.name,
      isComplex: true,
    })),
  ];

  const handleWebMarkerPress = useCallback(
    (markerId: string) => {
      // Check if it's a complex marker
      if (markerId.startsWith("complex-")) {
        handleComplexPress(markerId);
        return;
      }
      const id = Number(markerId);
      if (!isNaN(id)) handleMarkerPress(id);
    },
    [handleMarkerPress, handleComplexPress]
  );

  if (Platform.OS === "web" || (!MapboxGL && !RNMapView)) {
    return (
      <View style={{ flex: 1 }}>
        {/* Mapbox GL JS 3D Map — full screen */}
        <MapboxWebMap
          ref={mapRef}
          accessToken={MAPBOX_TOKEN}
          center={[CORDOBA_CENTER.longitude, CORDOBA_CENTER.latitude]}
          zoom={6}
          pitch={0}
          bearing={0}
          markers={webMapMarkers}
          onMarkerPress={handleWebMarkerPress}
          lightPreset={lightPreset}
          showBuildings3D={true}
          interactive={true}
          userLocation={userLocation}
        />

        {/* ── Top overlay: Search bar + filter ── */}
        <View
          style={[
            styles.searchContainer,
            { top: insets.top + 8 },
          ]}
        >
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <TextInput
                placeholder="¿De qué quieres participar hoy?"
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowSearchResults(text.length >= 2);
                }}
              />
              <Text style={styles.searchSubtitle}>Cualquier evento, plan o actividad</Text>
            </View>
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setShowSearchResults(false);
                }}
              >
                <Ionicons name="close-circle" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.chipsFiltrosButton} activeOpacity={0.7} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={18} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Search results dropdown — events + places */}
        {showSearchResults && (searchResults.length > 0 || geocodingResults.length > 0) && (
          <View
            style={[
              styles.searchResults,
              { top: insets.top + 68 },
            ]}
          >
            {/* Event results */}
            {searchResults.slice(0, 3).map((evt) => (
              <TouchableOpacity
                key={evt.id}
                style={styles.searchResultItem}
                onPress={() => {
                  setShowSearchResults(false);
                  setSearchQuery("");
                  handleMarkerPress(evt.id);
                }}
              >
                {evt.main_media_url && (
                  <Image
                    source={{ uri: evt.main_media_url }}
                    style={styles.searchResultImage}
                  />
                )}
                <View style={{ flex: 1, marginLeft: evt.main_media_url ? 12 : 0 }}>
                  <Text style={styles.searchResultCategory}>
                    {getCategoryLabel(evt.category).toUpperCase()}
                  </Text>
                  <Text style={styles.searchResultTitle} numberOfLines={1}>
                    {evt.title}
                  </Text>
                  <Text style={styles.searchResultMeta}>
                    {new Date(evt.date).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Separator if both sections have results */}
            {searchResults.length > 0 && geocodingResults.length > 0 && (
              <View style={styles.searchSectionDivider}>
                <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                <Text style={styles.searchSectionLabel}>Lugares</Text>
              </View>
            )}

            {/* Place/geocoding results */}
            {geocodingResults.slice(0, 4).map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.searchResultItem}
                onPress={() => handlePlacePress(place)}
              >
                <View style={styles.placeIconContainer}>
                  <Ionicons name="location" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.searchResultTitle} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.searchResultMeta} numberOfLines={1}>
                    {place.fullAddress}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            ))}

            {/* Loading indicator */}
            {geocodingLoading && searchQuery.length >= 3 && geocodingResults.length === 0 && (
              <View style={styles.searchLoadingRow}>
                <ActivityIndicator size="small" color="#9CA3AF" />
                <Text style={styles.searchResultMeta}>Buscando lugares...</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Combined filter chips overlay (single row) ── */}
        <View
          style={[
            styles.chipsOverlay,
            { top: insets.top + 72 },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsPillsScroll}
            style={Platform.OS === "web" ? { overflow: "visible" as any } : undefined}
          >
            {COMBINED_CHIPS.map((chip) => {
              const isFilterChip = chip.type === "filter";
              const isActive = isFilterChip
                ? activeFilterPill === chip.key
                : activeTimeTab === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[
                    isFilterChip ? styles.chipsPill : styles.chipsTimeTab,
                    isActive && (isFilterChip ? styles.chipsPillActive : styles.chipsTimeTabActive),
                  ]}
                  onPress={() =>
                    isFilterChip
                      ? setActiveFilterPill(isActive ? null : chip.key)
                      : setActiveTimeTab(isActive ? null : chip.key)
                  }
                  activeOpacity={0.7}
                >
                  {isFilterChip && chip.materialIcon && Platform.OS === "web" ? (
                    <Text
                      style={{
                        fontFamily: "Material Symbols Outlined",
                        fontSize: 16,
                        color: isActive ? "white" : "#374151",
                        marginRight: 4,
                      }}
                    >
                      {chip.materialIcon}
                    </Text>
                  ) : isFilterChip && chip.icon ? (
                    <Ionicons
                      name={chip.icon as any}
                      size={14}
                      color={isActive ? "white" : "#374151"}
                      style={{ marginRight: 5 }}
                    />
                  ) : null}
                  <Text
                    style={[
                      isFilterChip ? styles.chipsPillText : styles.chipsTimeTabText,
                      isActive && (isFilterChip ? styles.chipsPillTextActive : styles.chipsTimeTabTextActive),
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Left side floating buttons ── */}
        <View
          style={[
            styles.sideButtons,
            { top: insets.top + 136 },
          ]}
        >
          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => setShowNotifications(true)}
          >
            <Ionicons name="notifications" size={22} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sideButton, userLocation && styles.sideButtonActive]}
            onPress={handleLocationPress}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <Ionicons name="location" size={22} color={userLocation ? "#4285F4" : "#4B5563"} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideButton} onPress={() => router.push("/smart-scanner" as any)}>
            <Ionicons name="camera" size={22} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* ── Bottom action buttons ── */}
        <View
          style={[
            styles.bottomActions,
            { bottom: 30 },
          ]}
        >
          <FloatingButton
            label="Cosas que hacer"
            icon="compass-outline"
            variant="outline"
            onPress={() => router.push("/(tabs)/descubrir")}
          />
          <FloatingButton
            label="Crear un evento"
            icon="add"
            variant="primary"
            onPress={() => {
              if (!user) {
                router.push("/auth");
                return;
              }
              router.push("/create-event");
            }}
          />
        </View>

        {/* ── Notifications modal ── */}
        <Modal
          visible={showNotifications}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNotifications(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowNotifications(false)}
          >
            <View style={styles.notificationsPanel}>
              <View style={{ position: "relative", zIndex: 1 }}>
                <View style={styles.notificationsHeader}>
                  <Text style={styles.notificationsTitle}>Notificaciones</Text>
                  <TouchableOpacity onPress={() => setShowNotifications(false)}>
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.notificationsEmpty}>
                  <Ionicons name="time-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.notificationsEmptyText}>
                    No tienes notificaciones pendientes
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* ── Advanced Filters modal ── */}
        <AdvancedFiltersModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          filters={advancedFilters}
          onApply={(filters) => {
            setAdvancedFilters(filters);
            setShowFilters(false);
          }}
          onClear={() => {
            setAdvancedFilters(DEFAULT_FILTERS);
            setActiveFilterPill(null);
          }}
        />

        {/* ── Complex bottom sheet ── */}
        <Modal
          visible={showComplexSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowComplexSheet(false)}
        >
          <Pressable
            style={styles.complexSheetOverlay}
            onPress={() => setShowComplexSheet(false)}
          >
            <View style={styles.complexSheet} onStartShouldSetResponder={() => true}>
              {/* Handle bar */}
              <View style={styles.complexSheetHandle} />

              {selectedComplex && (
                <>
                  {/* Header */}
                  <View style={styles.complexSheetHeader}>
                    <View style={styles.complexSheetBadge}>
                      <Text style={styles.complexSheetBadgeText}>⚽</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.complexSheetName}>{selectedComplex.name}</Text>
                      <Text style={styles.complexSheetAssoc}>Complejo asociado</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.complexSheetClose}
                      onPress={() => setShowComplexSheet(false)}
                    >
                      <Ionicons name="close" size={22} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Info rows */}
                  <Text style={styles.complexSheetDesc}>{selectedComplex.description}</Text>

                  <View style={styles.complexSheetInfoRow}>
                    <Ionicons name="football-outline" size={18} color="#16A34A" />
                    <Text style={styles.complexSheetInfoText}>{selectedComplex.canchas} canchas disponibles</Text>
                  </View>
                  <View style={styles.complexSheetInfoRow}>
                    <Ionicons name="call-outline" size={18} color="#16A34A" />
                    <Text style={styles.complexSheetInfoText}>{selectedComplex.phone}</Text>
                  </View>
                  <View style={styles.complexSheetInfoRow}>
                    <Ionicons name="time-outline" size={18} color="#16A34A" />
                    <Text style={styles.complexSheetInfoText}>{selectedComplex.hours}</Text>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.complexSheetActions}>
                    <TouchableOpacity style={styles.complexSheetBtnOutline}>
                      <Ionicons name="call" size={18} color="#16A34A" />
                      <Text style={styles.complexSheetBtnOutlineText}>Llamar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.complexSheetBtnPrimary}>
                      <Ionicons name="calendar" size={18} color="#FFFFFF" />
                      <Text style={styles.complexSheetBtnPrimaryText}>Reservar cancha</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // ── Native: Full Mapbox map ──────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      {/* Mapbox map — full screen */}
      <MapboxGL.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/standard"
        onLongPress={handleLongPress}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={11}
          centerCoordinate={[CORDOBA_CENTER.longitude, CORDOBA_CENTER.latitude]}
          pitch={0}
          animationMode="flyTo"
          animationDuration={1500}
        />

        {/* Atmosphere for 3D feel */}
        <MapboxGL.Atmosphere
          style={{
            starIntensity: 0.15,
            color: "white",
            highColor: "#245bde",
            horizonBlend: 0.05,
            spaceColor: "#dce6f5",
          }}
        />

        {/* Event markers */}
        {events.map((evt) => (
          <MapboxGL.PointAnnotation
            key={`event-${evt.id}`}
            id={`event-${evt.id}`}
            coordinate={[Number(evt.longitude), Number(evt.latitude)]}
            onSelected={() => handleMarkerPress(evt.id)}
          >
            <EventMapPin
              imageUrl={evt.main_media_url}
              category={evt.category}
            />
            <MapboxGL.Callout title={evt.title} />
          </MapboxGL.PointAnnotation>
        ))}

        {/* ── Associated complex markers ── */}
        {ASSOCIATED_COMPLEXES.map((cx) => (
          <MapboxGL.PointAnnotation
            key={cx.id}
            id={cx.id}
            coordinate={[cx.longitude, cx.latitude]}
            anchor={{ x: 0.5, y: 1 }}
            onSelected={() => handleNativeComplexPress(cx.id)}
          >
            <ComplexMarkerPin name={cx.name} />
          </MapboxGL.PointAnnotation>
        ))}

        {/* Long-press temporary pin */}
        {longPressCoords && (
          <MapboxGL.PointAnnotation
            id="temp-pin"
            coordinate={[longPressCoords.longitude, longPressCoords.latitude]}
          >
            <View style={styles.tempPin}>
              <Ionicons name="add-circle" size={32} color="#ffd500ff" />
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      {/* Location selection mode banner */}
      {locationSelectMode && (
        <View
          style={[
            styles.locationBanner,
            { top: insets.top + 68 },
          ]}
        >
          {selectedLocation ? (
            <>
              <Text style={styles.locationBannerTitle}>Ubicación seleccionada</Text>
              <Text style={styles.locationBannerSubtitle}>
                Ubicación aproximada: {selectedLocation.latitude.toFixed(4)}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.locationBannerTitle}>Modo de selección activado</Text>
              <Text style={styles.locationBannerSubtitle}>
                Haz clic en el mapa o busca un lugar para seleccionar la ubicación del evento
              </Text>
            </>
          )}
        </View>
      )}

      {/* Yellow location select banner */}
      {locationSelectMode && !selectedLocation && (
        <View
          style={[
            styles.selectBanner,
            { top: insets.top + 8 + 56 },
          ]}
        >
          <Text style={styles.selectBannerText}>
            Selecciona la ubicación para el evento
          </Text>
        </View>
      )}

      {/* ── Top overlay: Search bar + filter ── */}
      <View
        style={[
          styles.searchContainer,
          { top: insets.top + 8 },
        ]}
      >
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <TextInput
              placeholder="¿De qué quieres participar hoy?"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSearchResults(text.length >= 2);
              }}
            />
            <Text style={styles.searchSubtitle}>Cualquier evento, plan o actividad</Text>
          </View>
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setShowSearchResults(false);
              }}
            >
              <Ionicons name="close-circle" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.chipsFiltrosButton} activeOpacity={0.7} onPress={() => setShowFilters(true)}>
          <Ionicons name="options-outline" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Search results dropdown — events + places */}
      {showSearchResults && (searchResults.length > 0 || geocodingResults.length > 0) && (
        <View
          style={[
            styles.searchResults,
            { top: insets.top + 68 },
          ]}
        >
          {/* Event results */}
          {searchResults.slice(0, 3).map((evt) => (
            <TouchableOpacity
              key={evt.id}
              style={styles.searchResultItem}
              onPress={() => {
                setShowSearchResults(false);
                setSearchQuery("");
                handleMarkerPress(evt.id);
              }}
            >
              {evt.main_media_url && (
                <Image
                  source={{ uri: evt.main_media_url }}
                  style={styles.searchResultImage}
                />
              )}
              <View style={{ flex: 1, marginLeft: evt.main_media_url ? 12 : 0 }}>
                <Text style={styles.searchResultCategory}>
                  {getCategoryLabel(evt.category).toUpperCase()}
                </Text>
                <Text style={styles.searchResultTitle} numberOfLines={1}>
                  {evt.title}
                </Text>
                <Text style={styles.searchResultMeta}>
                  {new Date(evt.date).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Separator if both sections have results */}
          {searchResults.length > 0 && geocodingResults.length > 0 && (
            <View style={styles.searchSectionDivider}>
              <Ionicons name="location-outline" size={13} color="#9CA3AF" />
              <Text style={styles.searchSectionLabel}>Lugares</Text>
            </View>
          )}

          {/* Place/geocoding results */}
          {geocodingResults.slice(0, 4).map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.searchResultItem}
              onPress={() => handlePlacePress(place)}
            >
              <View style={styles.placeIconContainer}>
                <Ionicons name="location" size={18} color="#6366F1" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.searchResultTitle} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={styles.searchResultMeta} numberOfLines={1}>
                  {place.fullAddress}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}

          {/* Loading indicator */}
          {geocodingLoading && searchQuery.length >= 3 && geocodingResults.length === 0 && (
            <View style={styles.searchLoadingRow}>
              <ActivityIndicator size="small" color="#9CA3AF" />
              <Text style={styles.searchResultMeta}>Buscando lugares...</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Combined filter chips overlay (single row) ── */}
      <View
        style={[
          styles.chipsOverlay,
          { top: insets.top + 72 },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsPillsScroll}
        >
          {COMBINED_CHIPS.map((chip) => {
            const isFilterChip = chip.type === "filter";
            const isActive = isFilterChip
              ? activeFilterPill === chip.key
              : activeTimeTab === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  isFilterChip ? styles.chipsPill : styles.chipsTimeTab,
                  isActive && (isFilterChip ? styles.chipsPillActive : styles.chipsTimeTabActive),
                ]}
                onPress={() =>
                  isFilterChip
                    ? setActiveFilterPill(isActive ? null : chip.key)
                    : setActiveTimeTab(isActive ? null : chip.key)
                }
                activeOpacity={0.7}
              >
                {isFilterChip && chip.icon && (
                  <Ionicons
                    name={chip.icon as any}
                    size={14}
                    color={isActive ? "white" : "#374151"}
                    style={{ marginRight: 5 }}
                  />
                )}
                <Text
                  style={[
                    isFilterChip ? styles.chipsPillText : styles.chipsTimeTabText,
                    isActive && (isFilterChip ? styles.chipsPillTextActive : styles.chipsTimeTabTextActive),
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Left side floating buttons ── */}
      <View
        style={[
          styles.sideButtons,
          { top: insets.top + 136 },
        ]}
      >
        <TouchableOpacity style={styles.sideButton}>
          <Text style={styles.sideButtonText}>2D</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => setShowNotifications(true)}
        >
          <Ionicons name="notifications" size={22} color="#4B5563" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideButton, userLocation && styles.sideButtonActive]}
          onPress={handleLocationPress}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <Ionicons name="location" size={22} color={userLocation ? "#4285F4" : "#4B5563"} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideButton} onPress={() => router.push("/smart-scanner" as any)}>
          <Ionicons name="camera" size={22} color="#4B5563" />
        </TouchableOpacity>
      </View>
      <View
        style={[
          styles.bottomActions,
          { bottom: Platform.OS === "ios" ? 110 : 95 },
        ]}
      >
        {locationSelectMode ? (
          <>
            <FloatingButton
              label="Cancelar"
              icon="close"
              variant="outline"
              onPress={handleCancelLocationSelect}
            />
            <FloatingButton
              label="Crear un evento aquí"
              icon="checkmark"
              variant="primary"
              onPress={handleCreateEventHere}
            />
          </>
        ) : (
          <>
            <FloatingButton
              label="Cosas que hacer"
              icon="compass-outline"
              variant="outline"
              onPress={() => router.push("/(tabs)/descubrir")}
            />
            <FloatingButton
              label="Crear un evento"
              icon="add"
              variant="primary"
              onPress={() => {
                if (!user) {
                  router.push("/auth");
                  return;
                }
                router.push("/create-event");
              }}
            />
          </>
        )}
      </View>

      {/* ── Long-press context menu ── */}
      <Modal
        visible={showPinMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowPinMenu(false);
            setLongPressCoords(null);
          }}
        >
          <View style={styles.contextMenu}>
            <Text style={styles.contextMenuTitle}>¿Qué quieres hacer?</Text>
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                setShowPinMenu(false);
                router.push("/(tabs)/descubrir");
              }}
            >
              <Ionicons name="compass-outline" size={20} color="#6B7280" />
              <Text style={styles.contextMenuText}>Ver eventos cercanos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={handleCreateEventHere}
            >
              <Ionicons name="add" size={20} color="#6B7280" />
              <Text style={styles.contextMenuText}>Crear evento aquí</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                setShowPinMenu(false);
                setLongPressCoords(null);
              }}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
              <Text style={styles.contextMenuText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Notifications modal (glassmorphic) ── */}
      <Modal
        visible={showNotifications}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowNotifications(false)}
        >
          <View style={styles.notificationsPanel}>
            {Platform.OS === "ios" && (
              <BlurView
                intensity={80}
                tint="light"
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: 20, overflow: "hidden" },
                ]}
              />
            )}
            <View style={{ position: "relative", zIndex: 1 }}>
              <View style={styles.notificationsHeader}>
                <Text style={styles.notificationsTitle}>Notificaciones</Text>
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.notificationsEmpty}>
                <Ionicons name="time-outline" size={48} color="#D1D5DB" />
                <Text style={styles.notificationsEmptyText}>
                  No tienes notificaciones pendientes
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Advanced Filters modal ── */}
      <AdvancedFiltersModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={advancedFilters}
        onApply={(filters) => {
          setAdvancedFilters(filters);
          setShowFilters(false);
        }}
        onClear={() => {
          setAdvancedFilters(DEFAULT_FILTERS);
          setActiveFilterPill(null);
        }}
      />

      {/* ── Complex bottom sheet ── */}
      <Modal
        visible={showComplexSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComplexSheet(false)}
      >
        <Pressable
          style={styles.complexSheetOverlay}
          onPress={() => setShowComplexSheet(false)}
        >
          <View style={styles.complexSheet} onStartShouldSetResponder={() => true}>
            {/* Handle bar */}
            <View style={styles.complexSheetHandle} />

            {selectedComplex && (
              <>
                {/* Header */}
                <View style={styles.complexSheetHeader}>
                  <View style={styles.complexSheetBadge}>
                    <Text style={styles.complexSheetBadgeText}>⚽</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.complexSheetName}>{selectedComplex.name}</Text>
                    <Text style={styles.complexSheetAssoc}>Complejo asociado</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.complexSheetClose}
                    onPress={() => setShowComplexSheet(false)}
                  >
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <Text style={styles.complexSheetDesc}>{selectedComplex.description}</Text>

                {/* Info rows */}
                <View style={styles.complexSheetInfoRow}>
                  <Ionicons name="football-outline" size={18} color="#16A34A" />
                  <Text style={styles.complexSheetInfoText}>{selectedComplex.canchas} canchas disponibles</Text>
                </View>
                <View style={styles.complexSheetInfoRow}>
                  <Ionicons name="call-outline" size={18} color="#16A34A" />
                  <Text style={styles.complexSheetInfoText}>{selectedComplex.phone}</Text>
                </View>
                <View style={styles.complexSheetInfoRow}>
                  <Ionicons name="time-outline" size={18} color="#16A34A" />
                  <Text style={styles.complexSheetInfoText}>{selectedComplex.hours}</Text>
                </View>

                {/* Action buttons */}
                <View style={styles.complexSheetActions}>
                  <TouchableOpacity style={styles.complexSheetBtnOutline}>
                    <Ionicons name="call" size={18} color="#16A34A" />
                    <Text style={styles.complexSheetBtnOutlineText}>Llamar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.complexSheetBtnPrimary}>
                    <Ionicons name="calendar" size={18} color="#FFFFFF" />
                    <Text style={styles.complexSheetBtnPrimaryText}>Reservar cancha</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Search bar
  searchContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
  },
  searchInput: {
    flex: 1,
    color: "#1A1A1A",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  searchSubtitle: {
    fontSize: 11,
    color: "#B0B5BD",
    marginTop: -1,
    letterSpacing: -0.1,
  },
  filterButton: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 22,
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
  },

  // Search results
  searchResults: {
    position: "absolute",
    left: 16,
    right: 60,
    zIndex: 20,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchResultImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  searchResultCategory: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 2,
  },
  searchResultMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // Side buttons
  sideButtons: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    gap: 8,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.21,
    shadowRadius: 8,
    elevation: 4,
  },
  sideButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  // Bottom actions
  bottomActions: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },

  // Markers
  markerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  markerInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  markerImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  tempPin: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal / Context menu
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  contextMenu: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  contextMenuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  contextMenuText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 12,
    fontWeight: "500",
  },

  // Notifications (glassmorphic)
  notificationsPanel: {
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 24,
    width: "80%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(200,200,200,0.3)",
    overflow: "hidden",
  },
  notificationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  notificationsEmpty: {
    alignItems: "center",
    paddingVertical: 32,
  },
  notificationsEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
  },

  // Location selection mode
  locationBanner: {
    position: "absolute",
    left: 12,
    right: 60,
    zIndex: 15,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  locationBannerSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  selectBanner: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 15,
    backgroundColor: "#ffd500ff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // ─── FILTER CHIPS ───
  chipsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 12,
    overflow: "visible",
  },
  chipsPillsScroll: {
    paddingHorizontal: 16,
    gap: 7,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
    ...(Platform.OS === "web" ? { overflow: "visible" as any } : {}),
  },
  chipsFiltrosButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.97)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  chipsPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.21,
    shadowRadius: 8,
    elevation: 4,
  },
  chipsPillActive: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  chipsPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
    letterSpacing: -0.1,
  },
  chipsPillTextActive: {
    color: "white",
    fontWeight: "600",
  },
  chipsTimeTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.21,
    shadowRadius: 8,
    elevation: 4,
  },
  chipsTimeTabActive: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  chipsTimeTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    letterSpacing: -0.1,
  },
  chipsTimeTabTextActive: {
    color: "white",
    fontWeight: "600",
  },

  // ─── Location button active state ───
  sideButtonActive: {
    borderColor: "rgba(66,133,244,0.3)",
    backgroundColor: "rgba(66,133,244,0.08)",
  },

  // ─── Geocoding / Place search results ───
  searchSectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 6,
  },
  searchSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  placeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },

  // ─── Complex bottom sheet ───
  complexSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  complexSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  complexSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 20,
  },
  complexSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  complexSheetBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#16A34A",
  },
  complexSheetBadgeText: {
    fontSize: 24,
  },
  complexSheetName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  complexSheetAssoc: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  complexSheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  complexSheetDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  complexSheetInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  complexSheetInfoText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  complexSheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  complexSheetBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#16A34A",
    backgroundColor: "transparent",
  },
  complexSheetBtnOutlineText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#16A34A",
  },
  complexSheetBtnPrimary: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  complexSheetBtnPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
