import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { useAuthStore } from "../store";
import { CORDOBA_CENTER } from "../constants";
import type { EventWithOrganizer } from "../types";

// ============================================================
// Fetch all events
// ============================================================
export function useEvents(categoryFilter?: string | null) {
  return useQuery({
    queryKey: ["events", categoryFilter],
    queryFn: async (): Promise<EventWithOrganizer[]> => {
      let query = supabase
        .from("events")
        .select("*, organizer:profiles!organizer_id(*)")
        .order("date", { ascending: true });

      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EventWithOrganizer[];
    },
  });
}

// ============================================================
// Fetch single event by ID
// ============================================================
export function useEventById(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async (): Promise<EventWithOrganizer | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("events")
        .select("*, organizer:profiles!organizer_id(*)")
        .eq("id", Number(id))
        .single();

      if (error) throw error;
      return data as EventWithOrganizer;
    },
    enabled: !!id,
  });
}

// ============================================================
// Fetch attendee count for an event
// ============================================================
export function useAttendeeCount(eventId: number | undefined) {
  return useQuery({
    queryKey: ["attendees", eventId],
    queryFn: async () => {
      if (!eventId) return 0;
      const { count, error } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "approved");

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!eventId,
  });
}

// ============================================================
// Check if current user has joined an event
// ============================================================
export function useIsAttending(eventId: number | undefined) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["isAttending", eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user?.id) return false;

      const { data, error } = await supabase
        .from("event_attendees")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!eventId && !!user?.id,
  });
}

// ============================================================
// Create event mutation
// ============================================================
export function useCreateEvent() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      category: string;
      date: string;
      end_date?: string;
      latitude: number;
      longitude: number;
      location_name: string;
      location_address: string;
      payment_type: "free" | "paid";
      price?: number;
      max_capacity?: number;
      privacy_type: "public" | "private";
      gender_preference?: string;
      main_media_url?: string;
      main_media_type?: string;
      media_items?: string;
    }) => {
      if (!user) throw new Error("Debes iniciar sesión para crear un evento");

      const { data, error } = await supabase
        .from("events")
        .insert({
          ...params,
          organizer_id: user.id,
          latitude: params.latitude || CORDOBA_CENTER.latitude,
          longitude: params.longitude || CORDOBA_CENTER.longitude,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// ============================================================
// Join event mutation
// ============================================================
export function useJoinEvent() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (eventId: number) => {
      if (!user) throw new Error("Debes iniciar sesión");

      const { data, error } = await supabase
        .from("event_attendees")
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: "approved",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, eventId) => {
      qc.invalidateQueries({ queryKey: ["attendees", eventId] });
      qc.invalidateQueries({ queryKey: ["isAttending", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// ============================================================
// Leave event mutation
// ============================================================
export function useLeaveEvent() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (eventId: number) => {
      if (!user) throw new Error("Debes iniciar sesión");

      const { error } = await supabase
        .from("event_attendees")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_data, eventId) => {
      qc.invalidateQueries({ queryKey: ["attendees", eventId] });
      qc.invalidateQueries({ queryKey: ["isAttending", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// ============================================================
// Fetch events user is attending
// ============================================================
export function useMyAttendingEvents() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["myAttending", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("event_attendees")
        .select("event_id, events:event_id(*, organizer:profiles!organizer_id(*))")
        .eq("user_id", user.id)
        .eq("status", "approved");

      if (error) throw error;
      return (data ?? []).map((d: any) => d.events).filter(Boolean);
    },
    enabled: !!user,
  });
}

// ============================================================
// Fetch events user created
// ============================================================
export function useMyCreatedEvents() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["myCreated", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("events")
        .select("*, organizer:profiles!organizer_id(*)")
        .eq("organizer_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
