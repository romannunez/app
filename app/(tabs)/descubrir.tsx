import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEvents } from "../../lib/hooks/useEvents";
import { VideoPlayer } from "../../components/VideoPlayer";
import {
  AdvancedFiltersModal,
  DEFAULT_FILTERS,
  type AdvancedFilterOptions,
} from "../../components/AdvancedFiltersModal";
import type { EventWithOrganizer } from "../../lib/types";
import { CATEGORIES, MAPBOX_TOKEN } from "../../lib/constants";
import { MapboxMiniMap } from "../../components/MapboxWebMap";
import { EventMapPin } from "../../components/EventMapPin";
import { RNMapView, RNMarker } from "../../lib/maps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Local video assets ───
const VIDEO_RUNNING = require("../../assets/videos/running-event.mp4");
const VIDEO_SOCIAL = require("../../assets/videos/social-club.mp4");
const VIDEO_PISTA = require("../../assets/videos/pista-hielo.mp4");
const LOCAL_VIDEOS = [VIDEO_RUNNING, VIDEO_SOCIAL, VIDEO_PISTA];

// ─── Club assets ───
const CONECTAMOS_PROFILE = require("../../assets/clubs/conectamos/profile.jpg");
const CONECTAMOS_VIDEO1 = require("../../assets/clubs/conectamos/video1.mp4");
const CONECTAMOS_VIDEO2 = require("../../assets/clubs/conectamos/video2.mp4");
const CONECTAMOS_VIDEO3 = require("../../assets/clubs/conectamos/video3.mp4");


// ─── Mock data ───
const now = new Date();
const addDays = (d: number) =>
  new Date(now.getTime() + d * 86400000).toISOString();

const MOCK_EVENTS: (EventWithOrganizer & { _type: string })[] = [
  {
    id: 9001, title: "Noche de Jazz en El Arroyo", description: "Una noche de jazz en vivo con los mejores músicos de Córdoba", category: "music", _type: "evento",
    date: addDays(1), end_date: null, latitude: -31.42, longitude: -64.19, location_name: "El Arroyo Bar", location_address: "Av. Hipólito Yrigoyen 200",
    payment_type: "paid", price: 1500, max_capacity: 80, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop", organizer_id: "mock-1",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9002, title: "Noche de Electrónica — Club Hype", description: "DJ sets toda la noche", category: "music", _type: "evento",
    date: addDays(2), end_date: null, latitude: -31.41, longitude: -64.18, location_name: "Club Hype", location_address: "Bv. San Juan 500",
    payment_type: "paid", price: 3500, max_capacity: 200, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop", organizer_id: "mock-1",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9003, title: "Festival de Comida Callejera", description: "Food trucks y música en vivo", category: "food", _type: "evento",
    date: addDays(3), end_date: null, latitude: -31.43, longitude: -64.17, location_name: "Parque Sarmiento", location_address: "Av. Poeta Lugones",
    payment_type: "free", price: null, max_capacity: 500, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop", organizer_id: "mock-2",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9004, title: "Stand Up Comedy Night", description: "Los mejores comediantes locales", category: "social", _type: "evento",
    date: addDays(4), end_date: null, latitude: -31.42, longitude: -64.20, location_name: "Teatro Real", location_address: "San Jerónimo 66",
    payment_type: "paid", price: 2000, max_capacity: 120, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&h=300&fit=crop", organizer_id: "mock-2",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9005, title: "Conferencia de Tecnología CBA", description: "Charlas sobre IA, Web3 y más", category: "technology", _type: "evento",
    date: addDays(5), end_date: null, latitude: -31.41, longitude: -64.19, location_name: "Centro de Convenciones", location_address: "Av. Figueroa Alcorta 50",
    payment_type: "paid", price: 5000, max_capacity: 300, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop", organizer_id: "mock-3",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9006, title: "Tarde de Café y Juegos de Mesa", description: "Café artesanal y boardgames", category: "games", _type: "plan",
    date: addDays(1), end_date: null, latitude: -31.42, longitude: -64.18, location_name: "Córdoba, Argentina", location_address: "Nueva Córdoba",
    payment_type: "free", price: null, max_capacity: 15, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop", organizer_id: "mock-3",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9007, title: "Paseo Fotográfico por el Centro", description: "Recorrido fotográfico por puntos históricos", category: "art", _type: "plan",
    date: addDays(2), end_date: null, latitude: -31.41, longitude: -64.18, location_name: "Córdoba, Argentina", location_address: "Plaza San Martín",
    payment_type: "free", price: null, max_capacity: 20, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop", organizer_id: "mock-4",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9008, title: "Picnic en el Parque", description: "Tarde de picnic con amigos nuevos", category: "social", _type: "plan",
    date: addDays(3), end_date: null, latitude: -31.43, longitude: -64.17, location_name: "Parque de las Tejas", location_address: "Av. Richieri",
    payment_type: "free", price: null, max_capacity: 30, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=300&fit=crop", organizer_id: "mock-4",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9011, title: "Fútbol 5 los Miércoles", description: "Fútbol 5 semanal en complejo público", category: "sports", _type: "evento",
    date: addDays(2), end_date: null, latitude: -31.38, longitude: -64.25, location_name: "Complejo Público...", location_address: "Granja de Funes",
    payment_type: "paid", price: 2500, max_capacity: 30, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&h=600&fit=crop", organizer_id: "mock-1",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
  {
    id: 9012, title: "Workshop de Fotografía Urbana", description: "Aprende fotografía urbana en la ciudad", category: "art", _type: "evento",
    date: addDays(4), end_date: null, latitude: -31.40, longitude: -64.19, location_name: "Centro Cultural España", location_address: "Entre Ríos 40",
    payment_type: "paid", price: 3000, max_capacity: 25, privacy_type: "public", gender_preference: null, photo_url: null, media_items: null,
    main_media_type: "video", main_media_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop", organizer_id: "mock-2",
    created_at: now.toISOString(), updated_at: now.toISOString(),
  },
];

// ─── Mock PARA TI posts ───
const PARA_TI_POSTS = [
  {
    id: "pt1",
    title: "Workshop de Fotografía Urbana",
    subtitle: "Los Tordos · Chule · Los Overos",
    location: "Córdoba, Argentina",
    date: "SAB, 22 MAR",
    time: "15:00",
    distance: "3,2 km",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop",
    videoUrl: VIDEO_RUNNING,
    mapLat: -31.41,
    mapLng: -64.18,
    category: "education",
  },
  {
    id: "pt2",
    title: "MOONFEST 2026",
    subtitle: "El festival \"de otro planeta\" que trae a Konstantin Sibold.",
    location: "Mendoza, Argentina",
    date: "VIE, 28 MAR",
    time: "22:00",
    distance: "680 km",
    imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=600&fit=crop",
    videoUrl: VIDEO_SOCIAL,
    mapLat: -32.89,
    mapLng: -68.84,
    category: "music",
  },
  {
    id: "pt3",
    title: "Lago y Naturaleza en Uritorco",
    subtitle: "La obra que no te podés perder.",
    location: "Capilla del Monte",
    date: "DOM, 30 MAR",
    time: "10:00",
    distance: "95 km",
    imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=600&fit=crop",
    videoUrl: VIDEO_PISTA,
    mapLat: -30.85,
    mapLng: -64.52,
    category: "outdoor",
  },
  {
    id: "pt4",
    title: "Senderismo en las Sierras",
    subtitle: "Charla Bartley, Carlos Green, Danger Mouse",
    location: "Sierras de Córdoba",
    date: "LUN, 31 MAR",
    time: "08:00",
    distance: "45 km",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=600&fit=crop",
    videoUrl: VIDEO_RUNNING,
    mapLat: -31.58,
    mapLng: -64.55,
    category: "sports",
  },
];

// ─── Mock CLUBES data ───
const MOCK_CLUBS = [
  {
    id: "club1",
    name: "conectamoscba",
    description: "conectaMos - eventos y conexiones reales en la vida real",
    avatarLocal: CONECTAMOS_PROFILE,
    avatarUri: "",
    members: 243,
    videoThumbs: [CONECTAMOS_VIDEO1, CONECTAMOS_VIDEO2, CONECTAMOS_VIDEO3],
    photos: [] as string[],
  },
  {
    id: "club2",
    name: "vinoconamigas",
    description: "vino con amigas",
    avatarLocal: null as any,
    avatarUri: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=60&h=60&fit=crop&crop=face",
    members: 127,
    videoThumbs: [] as any[],
    photos: [
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=200&h=300&fit=crop",
      "https://images.unsplash.com/photo-1474722883778-792e7990302f?w=200&h=300&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=300&fit=crop",
    ],
  },
  {
    id: "club3",
    name: "corredorescba",
    description: "Grupo de running en Córdoba. Salimos 3 veces por semana.",
    avatarLocal: null as any,
    avatarUri: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=60&h=60&fit=crop&crop=face",
    members: 312,
    videoThumbs: [] as any[],
    photos: [
      "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=200&h=300&fit=crop",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&h=300&fit=crop",
      "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=200&h=300&fit=crop",
    ],
  },
  {
    id: "club4",
    name: "techcba",
    description: "Comunidad tech de Córdoba",
    avatarLocal: null as any,
    avatarUri: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=60&h=60&fit=crop&crop=face",
    members: 189,
    videoThumbs: [] as any[],
    photos: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&h=300&fit=crop",
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&h=300&fit=crop",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=300&fit=crop",
    ],
  },
];

// ─── Mock PROPUESTAS data ───
const MOCK_PROPUESTAS = [
  {
    id: "prop1",
    userName: "Fabbiani Lucas",
    userHandle: "@fabbianilucas",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    rating: "4 / 15",
    people: 5,
    text: "Busco gente para ir al uritorco a buscar ovnis se coparian?",
    images: [] as string[],
  },
  {
    id: "prop2",
    userName: "Fabbiani Lucas",
    userHandle: "@fabbianilucas",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    rating: "4 / 15",
    people: 5,
    text: "Busco gente para ir al uritorco a buscar ovnis se copan?",
    images: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
    ],
  },
  {
    id: "prop3",
    userName: "Fabbiani Lucas",
    userHandle: "@fabbianilucas",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    rating: "4 / 15",
    people: 5,
    text: "Busco gente para ir al uritorco a buscar ovnis se coparian?",
    images: [] as string[],
  },
];

// ─── Mock VIBES data ───
const MOCK_VIBES = [
  { id: "v1", imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=500&fit=crop", title: "Cerro Arco", videoUrl: VIDEO_RUNNING },
  { id: "v2", imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=500&fit=crop", title: "Aventura en el lago", videoUrl: VIDEO_SOCIAL },
  { id: "v3", imageUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=500&fit=crop", title: "Sunset vibes", videoUrl: VIDEO_PISTA },
  { id: "v4", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=500&fit=crop", title: "Festival night", videoUrl: VIDEO_RUNNING },
  { id: "v5", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop", title: "Montaña mágica", videoUrl: VIDEO_SOCIAL },
  { id: "v6", imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=500&fit=crop", title: "Bosque profundo", videoUrl: VIDEO_PISTA },
];

// ─── Filter pill definitions ───
const FILTER_PILLS: { key: string; label: string; icon: string; materialIcon?: string }[] = [
  { key: "filtros", label: "Filtros", icon: "options-outline" },
  { key: "eventos", label: "Eventos", icon: "calendar-outline" },
  { key: "deportes", label: "Deportes", icon: "walk-outline", materialIcon: "directions_run" },
  { key: "planes", label: "Planes", icon: "cafe-outline" },
  { key: "grupal", label: "Actividades grupales", icon: "people-outline" },
  { key: "experiencias", label: "Experiencias", icon: "sparkles-outline" },
];

// ─── Time filter tabs ───
const TIME_TABS = [
  { key: "hoy", label: "Hoy" },
  { key: "cerca", label: "Cerca de mí" },
  { key: "manana", label: "Mañana" },
  { key: "finde", label: "Este finde" },
  { key: "semana", label: "En la semana" },
  { key: "proxima", label: "Próxima semana" },
];

// ─── Category items (uses app CATEGORIES + Descubrir) ───
const CATEGORY_ITEMS = [
  { key: "all", label: "Descubrir", emoji: "🔍", color: "#10B981" },
  ...CATEGORIES.map((c) => ({ key: c.id, label: c.label, emoji: c.icon, color: c.color })),
];

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

export default function DescubrirScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: dbEvents = [], isLoading } = useEvents();
  const trendingScrollRef = useRef<FlatList>(null);

  // ─── Load Material Symbols font on web ───
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const id = "material-symbols-outlined";
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=directions_run,groups,movie,person_raised_hand";
        document.head.appendChild(link);
      }
    }
  }, []);

  // ─── State ───
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] =
    useState<AdvancedFilterOptions>(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [activeFilterPill, setActiveFilterPill] = useState<string | null>(null);
  const [activeCategoryIcon, setActiveCategoryIcon] = useState("all");
  const [trendingIndex, setTrendingIndex] = useState(0);
  const [activeTimeTab, setActiveTimeTab] = useState<string | null>(null);

  // Section-level mute: false = sound ON (auto-play with audio)
  // When user mutes a video, all subsequent videos in that section inherit the mute
  const [trendingMuted, setTrendingMuted] = useState(false);
  const [paraTiMuted, setParaTiMuted] = useState(false);
  const [vibesMuted, setVibesMuted] = useState(false);
  const toggleTrendingMute = useCallback(() => setTrendingMuted((m) => !m), []);
  const toggleParaTiMute = useCallback(() => setParaTiMuted((m) => !m), []);
  const toggleVibesMute = useCallback(() => setVibesMuted((m) => !m), []);

  // Merge DB events + mock events
  const allEvents = useMemo(() => {
    const dbWithType = dbEvents.map((e) => ({
      ...e,
      _type: "evento" as string,
    }));
    return [...dbWithType, ...MOCK_EVENTS];
  }, [dbEvents]);

  // Trending events (top 10 closest by date)
  const trendingEvents = useMemo(() => {
    const n = new Date();
    return [...allEvents]
      .sort(
        (a, b) =>
          Math.abs(new Date(a.date).getTime() - n.getTime()) -
          Math.abs(new Date(b.date).getTime() - n.getTime())
      )
      .slice(0, 10);
  }, [allEvents]);

  // Track visible trending item — initialize eagerly so video plays on first render
  const firstTrendingId = trendingEvents.length > 0 ? trendingEvents[0].id : null;
  const [visibleTrendingId, setVisibleTrendingId] = useState<number | null>(firstTrendingId);

  // Sync visible trending ID when data loads / changes
  useEffect(() => {
    if (firstTrendingId != null && visibleTrendingId == null) {
      setVisibleTrendingId(firstTrendingId);
    }
  }, [firstTrendingId]);

  const onTrendingScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offset / SCREEN_WIDTH);
      setTrendingIndex(idx);
    },
    []
  );

  // 70% threshold for Instagram-like visibility detection
  const trendingViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 70 }).current;
  const onTrendingViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item) {
        setVisibleTrendingId(viewableItems[0].item.id);
      }
    }
  ).current;

  // ─── Para Ti: viewability-based tracking ───
  const [visibleParaTiId, setVisibleParaTiId] = useState<string>(PARA_TI_POSTS[0]?.id ?? "");
  const paraTiViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 70 }).current;
  const onParaTiViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item) {
        setVisibleParaTiId(viewableItems[0].item.id);
      }
    }
  ).current;

  // ─── Vibes: track which vibe is "active" (first visible in viewport) ───
  const [activeVibeId, setActiveVibeId] = useState<string>(MOCK_VIBES[0]?.id ?? "");

  // Format event date for trending card
  const formatTrendingDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const dayNum = d.getDate();
      const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      return `${day}, ${dayNum} ${month}`;
    } catch {
      return "";
    }
  };

  // Local video source for each trending card (cycle through the 3 local videos)
  const getTrendingVideo = useCallback((eventId: number) => {
    return LOCAL_VIDEOS[eventId % LOCAL_VIDEOS.length];
  }, []);

  // Static map URL helper
  const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const getStaticMapUrl = (lat: number, lng: number) =>
    `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=400x400&maptype=roadmap&markers=color:green%7C${lat},${lng}&style=feature:all%7Celement:labels%7Cvisibility:on&key=${GMAPS_KEY}`;

  // ─── Render trending card ───
  const renderTrendingCard = ({
    item,
  }: {
    item: EventWithOrganizer & { _type: string };
  }) => {
    const isVisible = visibleTrendingId === item.id;
    const videoSource = getTrendingVideo(item.id);
    return (
      <View style={s.trendingCardWrapper}>
        <TouchableOpacity
          style={s.trendingCard}
          activeOpacity={0.9}
          onPress={() => {
            if (item.id < 9000) router.push(`/event/${item.id}`);
          }}
        >
          <VideoPlayer
            source={videoSource}
            style={s.trendingCardImage}
            shouldPlay={isVisible}
            isLooping={false}
            isMuted={trendingMuted}
            onToggleMute={toggleTrendingMute}
            posterUri={item.main_media_url || undefined}
            muteButtonPosition="top-left"
          />



          {/* Top icons */}
          <View style={s.trendingCardTopIcons}>
            <TouchableOpacity style={s.trendingIconBtn}>
              <Ionicons name="share-outline" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={s.trendingIconBtn}>
              <Ionicons name="bookmark-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Bottom text overlay */}
          <View style={s.trendingCardBottom}>
            <Text style={s.trendingCardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={s.trendingCardMeta}>
              <Text style={s.trendingCardDate}>
                {formatTrendingDate(item.date)}
              </Text>
              <Text style={s.trendingCardSep}> | </Text>
              <Text style={s.trendingCardTime}>7:30 PM GMT · 3</Text>
              <Text style={s.trendingCardSep}> </Text>
              <Ionicons name="location" size={12} color="#ffd500ff" />
              <Text style={s.trendingCardLocation} numberOfLines={1}>
                {" "}{item.location_name}
              </Text>
            </View>
            <Text style={s.trendingCardSub} numberOfLines={1}>
              11,7 km · by irlandesa Cordobesa | small gatherings ...
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Para ti card index (for pagination dots) ───
  const PARA_TI_CARD_WIDTH = SCREEN_WIDTH - 32;
  const PARA_TI_CARD_GAP = 12;
  const PARA_TI_SNAP_INTERVAL = PARA_TI_CARD_WIDTH + PARA_TI_CARD_GAP;
  const PARA_TI_SIDE_INSET = (SCREEN_WIDTH - PARA_TI_CARD_WIDTH) / 2;
  const [paraTiIndex, setParaTiIndex] = useState(0);
  const onParaTiScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offset / PARA_TI_SNAP_INTERVAL);
      setParaTiIndex(idx);
    },
    []
  );

  // ─── Clubes carousel state (paired: 2 cards per page) ───
  const CLUB_PAGE_WIDTH = SCREEN_WIDTH - 32;
  const CLUB_PAGE_GAP = 12;
  const CLUB_SNAP_INTERVAL = CLUB_PAGE_WIDTH + CLUB_PAGE_GAP;
  const CLUB_SIDE_INSET = (SCREEN_WIDTH - CLUB_PAGE_WIDTH) / 2;
  // Group clubs into pages of 2
  const clubPages = useMemo(() => {
    const pages: (typeof MOCK_CLUBS)[] = [];
    for (let i = 0; i < MOCK_CLUBS.length; i += 2) {
      pages.push(MOCK_CLUBS.slice(i, i + 2));
    }
    return pages;
  }, []);
  const [clubIndex, setClubIndex] = useState(0);
  const onClubScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offset / CLUB_SNAP_INTERVAL);
      setClubIndex(idx);
    },
    []
  );

  // ─── Propuestas carousel state (paired: 2 cards per page) ───
  const PROP_PAGE_WIDTH = SCREEN_WIDTH - 32;
  const PROP_PAGE_GAP = 12;
  const PROP_SNAP_INTERVAL = PROP_PAGE_WIDTH + PROP_PAGE_GAP;
  const PROP_SIDE_INSET = (SCREEN_WIDTH - PROP_PAGE_WIDTH) / 2;
  const propPages = useMemo(() => {
    const pages: (typeof MOCK_PROPUESTAS)[] = [];
    for (let i = 0; i < MOCK_PROPUESTAS.length; i += 2) {
      pages.push(MOCK_PROPUESTAS.slice(i, i + 2));
    }
    return pages;
  }, []);
  const [propIndex, setPropIndex] = useState(0);
  const onPropScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offset / PROP_SNAP_INTERVAL);
      setPropIndex(idx);
    },
    []
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={s.mainScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ══════════ 1. HEADER ══════════ */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Descubrir</Text>
          </View>
        </View>

        {/* ══════════ 2. SEARCH BAR ══════════ */}
        <View style={s.searchBarContainer}>
          <View style={s.searchBar}>
            <Ionicons
              name="search"
              size={18}
              color="#9CA3AF"
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder="¿De qué querés participar hoy?"
                placeholderTextColor="#374151"
                style={s.searchInput}
                value={searchText}
                onChangeText={setSearchText}
              />
              {!searchText && (
                <Text style={s.searchSubPlaceholder}>
                  Cualquier evento, plan o actividad
                </Text>
              )}
            </View>
          </View>
        </View>


        {/* ══════════ 3. EVENT TYPE CHIPS ══════════ */}
        <View style={s.filterPillsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterPillsScroll}
          >
            {FILTER_PILLS.map((pill) => {
              const isActive = activeFilterPill === pill.key;
              const isFiltros = pill.key === "filtros";
              return (
                <TouchableOpacity
                  key={pill.key}
                  style={[
                    isFiltros ? s.filtrosButton : s.filterPill,
                    isActive && !isFiltros && s.filterPillActive,
                  ]}
                  onPress={() => {
                    if (isFiltros) {
                      setShowFilters(true);
                    } else {
                      setActiveFilterPill(isActive ? null : pill.key);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {pill.materialIcon && Platform.OS === "web" ? (
                    <Text
                      style={{
                        fontFamily: "Material Symbols Outlined",
                        fontSize: 16,
                        color: isActive && !isFiltros ? "white" : "#374151",
                        marginRight: 4,
                      }}
                    >
                      {pill.materialIcon}
                    </Text>
                  ) : pill.materialIcon ? (
                    <MaterialIcons
                      name="directions-run"
                      size={16}
                      color={isActive && !isFiltros ? "white" : "#374151"}
                      style={{ marginRight: 4 }}
                    />
                  ) : (
                    <Ionicons
                      name={pill.icon as any}
                      size={14}
                      color={isActive && !isFiltros ? "white" : "#374151"}
                      style={{ marginRight: 5 }}
                    />
                  )}
                  <Text
                    style={[
                      isFiltros ? s.filtrosText : s.filterPillText,
                      isActive && !isFiltros && s.filterPillTextActive,
                    ]}
                  >
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ══════════ 3b. TIME FILTER TABS ══════════ */}
        <View style={s.timeTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.timeTabsScroll}
          >
            {TIME_TABS.map((tab) => {
              const isActive = activeTimeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.timeTab, isActive && s.timeTabActive]}
                  onPress={() => setActiveTimeTab(isActive ? null : tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.timeTabText, isActive && s.timeTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ══════════ 4. CATEGORY ICONS BAR ══════════ */}
        <View style={s.categoryBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categoryIconsScroll}
          >
            {CATEGORY_ITEMS.map((cat) => {
              const isActive = activeCategoryIcon === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={s.categoryIconItem}
                  onPress={() => setActiveCategoryIcon(cat.key)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.categoryIconCircle,
                      isActive && {
                        borderWidth: 2.5,
                        borderColor: "#ffd500ff",
                      },
                    ]}
                  >
                    <Text style={s.categoryEmoji}>{cat.emoji}</Text>
                  </View>
                  <Text
                    style={[
                      s.categoryLabel,
                      isActive && { color: "#ffd500ff", fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ══════════ 5. TENDENCIA HOY ══════════ */}
        <View style={s.sectionContainer}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="trending-up" size={22} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={s.sectionTitle}>Tendencia hoy</Text>
              <View style={s.sectionBadge}>
                <Text style={s.sectionBadgeText}>
                  {trendingEvents.length}
                </Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={s.verTodos}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {/* Trending carousel */}
          {isLoading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
          ) : (
            <>
              <FlatList
                ref={trendingScrollRef}
                data={trendingEvents}
                renderItem={renderTrendingCard}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onTrendingScroll}
                scrollEventThrottle={16}
                snapToInterval={SCREEN_WIDTH}
                decelerationRate="fast"
                viewabilityConfig={trendingViewabilityConfig}
                onViewableItemsChanged={onTrendingViewableItemsChanged}
              />

              {/* Pagination dots */}
              <View style={s.paginationDots}>
                {trendingEvents.slice(0, 5).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.dot,
                      trendingIndex === i ? s.dotActive : s.dotInactive,
                    ]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* ══════════ 6. PARA TI ══════════ */}
        <View style={s.sectionContainer}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <View style={s.paraTiIconCircle}>
                <Ionicons name="compass" size={20} color="white" />
              </View>
              <Text style={s.sectionTitle}>Para ti</Text>
              <View style={s.sectionBadge}>
                <Text style={s.sectionBadgeText}>10</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={s.verTodos}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.sectionSubtitle}>Te podría interesar</Text>

          {/* Split card carousel: Map left + Video right + white bottom banner */}
          <FlatList
            data={PARA_TI_POSTS}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onParaTiScroll}
            scrollEventThrottle={16}
            snapToInterval={PARA_TI_SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: PARA_TI_SIDE_INSET }}
            viewabilityConfig={paraTiViewabilityConfig}
            onViewableItemsChanged={onParaTiViewableItemsChanged}
            renderItem={({ item }) => (
              <View style={s.paraTiCardWrapper}>
                <View style={s.paraTiCard}>
                  {/* Top split: Map + Video */}
                  <View style={s.paraTiSplit}>
                    {/* Left: Map */}
                    <View style={s.paraTiMapSide}>
                      {Platform.OS === "web" ? (
                        <MapboxMiniMap
                          accessToken={MAPBOX_TOKEN}
                          latitude={item.mapLat}
                          longitude={item.mapLng}
                          title={item.title}
                          pinColor="#10B981"
                          imageUrl={item.imageUrl}
                          category={item.category}
                          interactive={true}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : RNMapView ? (
                        /* Native: real react-native-maps mini-map with EventMapPin */
                        <>
                          <RNMapView
                            style={{ width: "100%", height: "100%" }}
                            initialRegion={{
                              latitude: item.mapLat,
                              longitude: item.mapLng,
                              latitudeDelta: 0.015,
                              longitudeDelta: 0.015,
                            }}
                            scrollEnabled={true}
                            zoomEnabled={true}
                            rotateEnabled={true}
                            pitchEnabled={true}
                            showsUserLocation={false}
                            showsMyLocationButton={false}
                            showsCompass={false}
                            showsBuildings={true}
                            mapType="standard"
                          >
                            <RNMarker
                              coordinate={{
                                latitude: item.mapLat,
                                longitude: item.mapLng,
                              }}
                              anchor={{ x: 0.5, y: 1 }}
                              tracksViewChanges={false}
                            >
                              <EventMapPin
                                imageUrl={item.imageUrl}
                                category={item.category}
                                title={item.title}
                              />
                            </RNMarker>
                          </RNMapView>
                        </>
                      ) : (
                        /* Fallback: static map image + EventMapPin overlay */
                        <>
                          <Image
                            source={{
                              uri: getStaticMapUrl(item.mapLat, item.mapLng),
                            }}
                            style={s.paraTiMapImage}
                            resizeMode="cover"
                          />
                          {/* EventMapPin overlay  */}
                          <View style={s.paraTiMapPinOverlay}>
                            <EventMapPin
                              imageUrl={item.imageUrl}
                              category={item.category}
                              title={item.title}
                            />
                          </View>
                        </>
                      )}
                      {/* Label removed — marker's dark label shows the title */}
                    </View>

                    {/* Right: Auto-playing local video */}
                    <View style={s.paraTiImageSide}>
                      <VideoPlayer
                        source={item.videoUrl}
                        style={s.paraTiImage}
                        shouldPlay={visibleParaTiId === item.id}
                        isLooping={true}
                        isMuted={paraTiMuted}
                        onToggleMute={toggleParaTiMute}
                        posterUri={item.imageUrl}
                        muteButtonPosition="bottom-right"
                      />
                    </View>
                  </View>

                  {/* White bottom banner */}
                  <View style={s.paraTiBottomBanner}>
                    <Text style={s.paraTiBannerTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={s.paraTiBannerRow}>
                      <View style={s.paraTiBannerTextCol}>
                        <Text style={s.paraTiBannerDateLine} numberOfLines={1}>
                          {item.date} | {item.time} PM GMT · 3{" "}
                          <Text style={{ color: "#EF4444" }}>📍</Text>
                          {" "}{item.location}
                        </Text>
                        <Text style={s.paraTiBannerSub} numberOfLines={1}>
                          {item.distance} · by irlandesa Cordobesa | small gatherings...
                        </Text>
                      </View>
                      <TouchableOpacity style={s.paraTiVerMasBtn}>
                        <Text style={s.paraTiVerMasBtnText}>Ver más</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Para ti pagination dots */}
          <View style={s.paginationDots}>
            {PARA_TI_POSTS.slice(0, 4).map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  paraTiIndex === i ? s.dotActive : s.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* ══════════ 7. PROPUESTAS ══════════ */}
        <View style={s.sectionContainer}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              {Platform.OS === "web" ? (
                <Text
                  style={{
                    fontFamily: "Material Symbols Outlined",
                    fontSize: 26,
                    marginRight: 6,
                    color: "#10B981",
                  }}
                >
                  person_raised_hand
                </Text>
              ) : (
                <Ionicons name="hand-left" size={22} color="#10B981" style={{ marginRight: 6 }} />
              )}
              <Text style={s.sectionTitle}>Propuestas</Text>
            </View>
            <TouchableOpacity>
              <Text style={s.verTodos}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {/* Propuesta cards horizontal carousel - 2 cards per page */}
          <FlatList
            data={propPages}
            keyExtractor={(_, i) => `prop-page-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onPropScroll}
            scrollEventThrottle={16}
            snapToInterval={PROP_SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: PROP_SIDE_INSET }}
            renderItem={({ item: page }) => (
              <View style={s.propPageWrapper}>
                {page.map((prop) => (
                  <View key={prop.id} style={s.propuestaCard}>
                    {/* Header row */}
                    <View style={s.propuestaHeader}>
                      <Image source={{ uri: prop.userAvatar }} style={s.propuestaAvatar} />
                      <View style={s.propuestaUserInfo}>
                        <Text style={s.propuestaUserName} numberOfLines={1}>{prop.userName}</Text>
                        <Text style={s.propuestaUserHandle} numberOfLines={1}>{prop.userHandle}</Text>
                      </View>
                      <View style={s.propuestaMetaRow}>
                        <Text style={s.propuestaRatingText}>{prop.rating}</Text>
                        <Ionicons name="person-outline" size={14} color="#6B7280" />
                      </View>
                      <TouchableOpacity style={s.propuestaVerMasBtn}>
                        <Text style={s.propuestaVerMasBtnText}>Ver más</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Body text */}
                    <Text style={s.propuestaText} numberOfLines={2}>
                      {prop.text}{" "}
                    </Text>

                    {/* Images grid (side by side) */}
                    {prop.images && prop.images.length > 0 && (
                      <View style={s.propuestaImagesRow}>
                        {prop.images.map((img, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: img }}
                            style={[
                              s.propuestaImageItem,
                              idx === 0 && { borderBottomLeftRadius: 12 },
                              idx === prop.images.length - 1 && { borderBottomRightRadius: 12 },
                            ]}
                            resizeMode="cover"
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          />

          {/* Propuesta pagination dots */}
          <View style={s.paginationDots}>
            {propPages.map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  propIndex === i ? s.dotActive : s.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* ══════════ 8. CLUBES ══════════ */}
        <View style={s.sectionContainer}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              {Platform.OS === "web" ? (
                <Text
                  style={{
                    fontFamily: "Material Symbols Outlined",
                    fontSize: 26,
                    marginRight: 6,
                    color: "#10B981",
                  }}
                >
                  groups
                </Text>
              ) : (
                <Ionicons name="people" size={24} color="#10B981" style={{ marginRight: 6 }} />
              )}
              <Text style={s.sectionTitle}>Clubes</Text>
            </View>
            <TouchableOpacity>
              <Text style={s.verTodos}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {/* Club cards horizontal carousel - 2 cards per page */}
          <FlatList
            data={clubPages}
            keyExtractor={(_, i) => `club-page-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onClubScroll}
            scrollEventThrottle={16}
            snapToInterval={CLUB_SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: CLUB_SIDE_INSET }}
            renderItem={({ item: page }) => (
              <View style={s.clubPageWrapper}>
                {page.map((club) => (
                  <View key={club.id} style={s.clubCard}>
                    {/* Club header */}
                    <View style={s.clubCardHeader}>
                      <Image
                        source={club.avatarLocal || { uri: club.avatarUri }}
                        style={s.clubCardAvatar}
                      />
                      <View style={s.clubCardInfo}>
                        <View style={s.clubCardNameRow}>
                          <Text style={s.clubCardName} numberOfLines={1}>{club.name}</Text>
                          <Text style={s.clubCardDots}>···</Text>
                        </View>
                        <Text style={s.clubCardDesc} numberOfLines={1}>{club.description}</Text>
                      </View>
                      <TouchableOpacity style={s.clubVerMasBtn}>
                        <Text style={s.clubVerMasBtnText}>ver más</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Club photos/videos - horizontal row */}
                    <View style={s.clubPhotosRow}>
                      {(club.videoThumbs.length > 0
                        ? club.videoThumbs.map((vid, idx, arr) => {
                          const isFirst = idx === 0;
                          const isLast = idx === arr.length - 1;
                          return (
                            <View
                              key={idx}
                              style={[
                                s.clubPhotoContainer,
                                isFirst && { borderBottomLeftRadius: 10 },
                                isLast && { borderBottomRightRadius: 10 },
                              ]}
                            >
                              <VideoPlayer
                                source={vid}
                                style={s.clubRowPhoto}
                                shouldPlay={false}
                                isLooping={false}
                                isMuted={true}
                                onToggleMute={() => { }}
                                posterUri={undefined}
                                muteButtonPosition="bottom-right"
                              />
                            </View>
                          );
                        })
                        : club.photos.slice(0, 3).map((photo, idx, arr) => {
                          const isFirst = idx === 0;
                          const isLast = idx === arr.length - 1;
                          return (
                            <View
                              key={idx}
                              style={[
                                s.clubPhotoContainer,
                                isFirst && { borderBottomLeftRadius: 10 },
                                isLast && { borderBottomRightRadius: 10 },
                              ]}
                            >
                              <Image
                                source={{ uri: photo }}
                                style={s.clubRowPhoto}
                                resizeMode="cover"
                              />
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          />

          {/* Club pagination dots (per page, not per club) */}
          <View style={s.paginationDots}>
            {clubPages.map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  clubIndex === i ? s.dotActive : s.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* ══════════ 9. VIBES ══════════ */}
        <View style={s.sectionContainer}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              {Platform.OS === "web" ? (
                <Text
                  style={{
                    fontFamily: "Material Symbols Outlined",
                    fontSize: 26,
                    marginRight: 6,
                    color: "#10B981",
                  }}
                >
                  movie
                </Text>
              ) : (
                <Ionicons name="videocam" size={22} color="#10B981" style={{ marginRight: 6 }} />
              )}
              <Text style={s.sectionTitle}>Vibes</Text>
            </View>
            <TouchableOpacity>
              <Text style={s.verTodos}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {/* Instagram Explore-style grid (3 columns, some tall) */}
          <View style={s.vibesGrid}>
            {MOCK_VIBES.map((vibe, idx) => {
              // Items at index 0 and 5 span 2 rows (tall)
              const isTall = idx === 0 || idx === 5;
              return (
                <TouchableOpacity
                  key={vibe.id}
                  style={[s.vibeGridItem, isTall && s.vibeGridItemTall]}
                  activeOpacity={0.85}
                >
                  <VideoPlayer
                    source={vibe.videoUrl}
                    style={s.vibeGridImage}
                    shouldPlay={activeVibeId === vibe.id}
                    isLooping={false}
                    isMuted={vibesMuted}
                    onToggleMute={toggleVibesMute}
                    posterUri={vibe.imageUrl}
                    muteButtonPosition="bottom-right"
                  />
                  <View style={s.vibeGridOverlay}>
                    <Text style={s.vibeGridTitle} numberOfLines={1}>{vibe.title}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* Advanced Filters Modal */}
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
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════

const CARD_WIDTH = SCREEN_WIDTH - 32;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mainScroll: {
    flex: 1,
  },

  // ─── HEADER ───
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  // ─── SEARCH BAR ───
  searchBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 2,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    padding: 0,
    margin: 0,
  },
  searchSubPlaceholder: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // ─── FILTER PILLS ───
  filterPillsContainer: {
    marginBottom: -9,
  },
  filterPillsScroll: {
    paddingHorizontal: 16,
    gap: 7,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
  },
  filtrosButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  filtrosText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  filterPillActive: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
    letterSpacing: -0.1,
  },
  filterPillTextActive: {
    color: "white",
    fontWeight: "600",
  },

  // ─── TIME FILTER TABS ───
  timeTabsContainer: {
    marginBottom: 4,
    marginTop: 0
  },
  timeTabsScroll: {
    paddingHorizontal: 16,
    gap: 7,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
  },
  timeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  timeTabActive: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  timeTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    letterSpacing: -0.1,
  },
  timeTabTextActive: {
    color: "white",
    fontWeight: "600",
  },

  // ─── CATEGORY BAR ───
  categoryBar: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryIconsScroll: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  categoryIconItem: {
    alignItems: "center",
    width: 66,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "500",
  },

  // ─── SECTION HEADER (shared) ───
  sectionContainer: {
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginRight: 8,
  },
  sectionBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  verTodos: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // ─── TRENDING CAROUSEL ───
  trendingCardWrapper: {
    width: SCREEN_WIDTH,
  },
  trendingCard: {
    height: 280,
    borderRadius: 0,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1F2937",
  },
  trendingCardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  trendingCardTopIcons: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    gap: 12,
  },
  trendingIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  trendingCardBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 18,
    backgroundColor: "rgba(0,0,0,0.50)",
  },
  trendingCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
    marginBottom: 4,
    lineHeight: 22,
  },
  trendingCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    flexWrap: "wrap",
  },
  trendingCardDate: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  trendingCardSep: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  trendingCardTime: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
  },
  trendingCardLocation: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    flex: 1,
  },
  trendingCardSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },

  // ─── PAGINATION DOTS ───
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#6d3bf6ff",
  },
  dotInactive: {
    backgroundColor: "#D1D5DB",
  },

  // ─── PARA TI (split card carousel) ───
  paraTiIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  paraTiCardWrapper: {
    width: CARD_WIDTH,
    marginRight: 12,
  },

  // ─── CLUBES (paired card carousel) ───
  clubPageWrapper: {
    width: CARD_WIDTH,
    marginRight: 12,
    gap: 8,
  },
  clubCard: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    paddingTop: 8,
    paddingBottom: 6,
  },
  clubCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
  },
  clubCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  clubCardInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  clubCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clubCardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  clubCardDots: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "700",
  },
  clubCardDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  clubVerMasBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    flexShrink: 0,
  },
  clubVerMasBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  clubPhotosRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    gap: 2,
  },
  clubPhotoContainer: {
    flex: 1,
    overflow: "hidden",
  },
  clubRowPhoto: {
    width: "100%",
    aspectRatio: 0.6,
    backgroundColor: "#E5E7EB",
  },

  paraTiCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  paraTiSplit: {
    flexDirection: "row",
    height: 220,
  },
  paraTiMapSide: {
    flex: 1,
    position: "relative",
    backgroundColor: "#E5E7EB",
  },
  paraTiMapImage: {
    width: "100%",
    height: "100%",
  },
  paraTiMapPinOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -26,
    marginTop: -26,
  },
  nativeMiniMapLabel: {
    position: "absolute",
    top: 10,
    left: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nativeMiniMapLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
  paraTiMapLabelPill: {
    position: "absolute",
    top: 12,
    left: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    alignItems: "center",
  },
  paraTiMapLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  paraTiImageSide: {
    flex: 1,
    position: "relative",
  },
  paraTiImage: {
    width: "100%",
    height: "100%",
    overflow: "hidden" as any,
  },
  paraTiBottomBanner: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  paraTiBannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  paraTiBannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  paraTiBannerTextCol: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  paraTiBannerDateLine: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 2,
  },
  paraTiBannerSub: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 1,
  },
  paraTiVerMasBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    flexShrink: 0,
  },
  paraTiVerMasBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  // ─── CLUBES (old styles removed, card styles are above) ───
  verMasLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10B981",
  },

  // ─── PROPUESTAS (paired card carousel) ───
  propPageWrapper: {
    width: CARD_WIDTH,
    marginRight: 12,
    gap: 8,
  },
  propuestaCard: {
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden"
  },
  propuestaHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 18,
    paddingBottom: 20,
  },
  propuestaAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
  },
  propuestaUserInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 6,
  },
  propuestaUserName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  propuestaUserHandle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  propuestaMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginRight: 8,
  },
  propuestaRatingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  propuestaVerMasBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    flexShrink: 0,
  },
  propuestaVerMasBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  propuestaText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 19,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  propuestaLeerMas: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  propuestaImagesRow: {
    flexDirection: "row",
    gap: 2,
  },
  propuestaImageItem: {
    flex: 1,
    height: 140,
    backgroundColor: "#E5E7EB",
  },

  // ─── VIBES (Instagram Explore grid) ───
  vibesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 1,
  },
  vibeGridItem: {
    width: (SCREEN_WIDTH - 34) / 3,
    height: (SCREEN_WIDTH - 34) / 3,
    borderRadius: 0,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1F2937",
  },
  vibeGridItemTall: {
    height: ((SCREEN_WIDTH - 34) / 3) * 2 + 1,
  },
  vibeGridImage: {
    width: "100%",
    height: "100%",
  },
  vibeGridOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  vibeGridTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },

  // ─── MISC ───
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});
