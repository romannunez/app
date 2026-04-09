// ============================================================
// Pipol — Constants & Configuration
// ============================================================

// Córdoba, Argentina coordinates
export const CORDOBA_CENTER = {
  latitude: -31.4167,
  longitude: -64.20,
};

export const DEFAULT_ZOOM = 13;

// ============================================================
// API Keys (loaded from .env via Expo's built-in env support)
// ============================================================
export const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

// Alias for convenience in screens
export const MAPBOX_TOKEN = MAPBOX_ACCESS_TOKEN;

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const MERCADO_PAGO_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? "";
export const MERCADO_PAGO_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN ?? "";

// ============================================================
// Event Categories — IDs match Supabase enum values (English)
// ============================================================
export const CATEGORIES = [
  { id: "social", label: "Social", icon: "👋", color: "#3B82F6" },
  { id: "music", label: "Música", icon: "🎵", color: "#A855F7" },
  { id: "spiritual", label: "Espiritual", icon: "🌿", color: "#818CF8" },
  { id: "education", label: "Educación", icon: "📚", color: "#10B981" },
  { id: "sports", label: "Deportes", icon: "⚽", color: "#F97316" },
  { id: "food", label: "Comida", icon: "🍔", color: "#EF4444" },
  { id: "art", label: "Arte", icon: "🎨", color: "#EC4899" },
  { id: "technology", label: "Tecnología", icon: "💻", color: "#6366F1" },
  { id: "games", label: "Juegos", icon: "🎮", color: "#14B8A6" },
  { id: "outdoor", label: "Aire Libre", icon: "☀️", color: "#84CC16" },
  { id: "networking", label: "Networking", icon: "🤝", color: "#8B5CF6" },
  { id: "workshop", label: "Talleres", icon: "🔧", color: "#F59E0B" },
  { id: "conference", label: "Conferencias", icon: "🎤", color: "#0EA5E9" },
  { id: "party", label: "Fiestas", icon: "🎉", color: "#F43F5E" },
  { id: "fair", label: "Ferias", icon: "🏪", color: "#D946EF" },
  { id: "exhibition", label: "Exposiciones", icon: "🖼️", color: "#0D9488" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

// ============================================================
// Light presets for Mapbox 3D Standard Style
// ============================================================
export type LightPreset = "dawn" | "day" | "dusk" | "night";

export const MEDIA_LIMITS = {
  maxPhotos: 6,
  maxVideos: 3,
};
