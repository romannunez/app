import { create } from "zustand";
import type { CategoryId, LightPreset } from "./constants";

// ============================================================
// Auth State
// ============================================================
interface AuthState {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    interests: CategoryId[];
    bio?: string | null;
    gender?: string | null;
    handle?: string | null;
  } | null;
  isAuthenticated: boolean;
  setUser: (user: AuthState["user"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

// ============================================================
// Map State
// ============================================================
interface MapState {
  region: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  lightPreset: LightPreset;
  setRegion: (region: MapState["region"]) => void;
  setLightPreset: (preset: LightPreset) => void;
}

export const useMapStore = create<MapState>((set) => ({
  region: {
    latitude: -31.4167,
    longitude: -64.1833,
    zoom: 13,
  },
  lightPreset: "day",
  setRegion: (region) => set({ region }),
  setLightPreset: (preset) => set({ lightPreset: preset }),
}));

// ============================================================
// Filter State
// ============================================================
interface FilterState {
  selectedCategory: CategoryId | null;
  distanceKm: number;
  dateFilter: string | null;
  paraFilter: string | null;
  setCategory: (category: CategoryId | null) => void;
  setDistance: (km: number) => void;
  setDateFilter: (filter: string | null) => void;
  setParaFilter: (filter: string | null) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedCategory: null,
  distanceKm: 25,
  dateFilter: null,
  paraFilter: null,
  setCategory: (category) => set({ selectedCategory: category }),
  setDistance: (km) => set({ distanceKm: km }),
  setDateFilter: (dateFilter) => set({ dateFilter }),
  setParaFilter: (paraFilter) => set({ paraFilter }),
  clearFilters: () =>
    set({
      selectedCategory: null,
      distanceKm: 25,
      dateFilter: null,
      paraFilter: null,
    }),
}));

// ============================================================
// Event Creation State
// ============================================================
interface CreateEventState {
  step: number;
  location: { latitude: number; longitude: number; address: string } | null;
  title: string;
  category: CategoryId | null;
  description: string;
  date: Date | null;
  isFree: boolean;
  price: number;
  isPrivate: boolean;
  genderFilter: "todos" | "masculino" | "femenino" | "otro";
  media: { uri: string; type: "photo" | "video" }[];
  setStep: (step: number) => void;
  setLocation: (loc: CreateEventState["location"]) => void;
  setTitle: (title: string) => void;
  setCategory: (cat: CategoryId | null) => void;
  setDescription: (desc: string) => void;
  setDate: (date: Date | null) => void;
  setIsFree: (free: boolean) => void;
  setPrice: (price: number) => void;
  setIsPrivate: (priv: boolean) => void;
  setGenderFilter: (filter: CreateEventState["genderFilter"]) => void;
  addMedia: (item: { uri: string; type: "photo" | "video" }) => void;
  removeMedia: (uri: string) => void;
  reset: () => void;
}

const initialCreateState = {
  step: 0,
  location: null,
  title: "",
  category: null,
  description: "",
  date: null,
  isFree: true,
  price: 0,
  isPrivate: false,
  genderFilter: "todos" as const,
  media: [] as { uri: string; type: "photo" | "video" }[],
};

export const useCreateEventStore = create<CreateEventState>((set) => ({
  ...initialCreateState,
  setStep: (step) => set({ step }),
  setLocation: (location) => set({ location }),
  setTitle: (title) => set({ title }),
  setCategory: (category) => set({ category }),
  setDescription: (description) => set({ description }),
  setDate: (date) => set({ date }),
  setIsFree: (isFree) => set({ isFree }),
  setPrice: (price) => set({ price }),
  setIsPrivate: (isPrivate) => set({ isPrivate }),
  setGenderFilter: (genderFilter) => set({ genderFilter }),
  addMedia: (item) =>
    set((state) => ({ media: [...state.media, item] })),
  removeMedia: (uri) =>
    set((state) => ({ media: state.media.filter((m) => m.uri !== uri) })),
  reset: () => set(initialCreateState),
}));
