// ============================================================
// Pipol — Shared TypeScript types (matches Supabase schema)
// ============================================================

import type { CategoryId } from "./constants";

export interface DbUser {
  id: string; // UUID from auth.users
  username: string | null;
  email: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  gender: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEvent {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  end_date: string | null;
  latitude: number;
  longitude: number;
  location_name: string;
  location_address: string;
  payment_type: "free" | "paid";
  price: number | null;
  max_capacity: number | null;
  privacy_type: "public" | "private";
  gender_preference: string | null;
  photo_url: string | null;
  media_items: string | null;
  main_media_type: string | null;
  main_media_url: string | null;
  organizer_id: string; // UUID
  created_at: string;
  updated_at: string;
}

export interface DbEventAttendee {
  id: number;
  event_id: number;
  user_id: string; // UUID
  status: "pending" | "approved" | "rejected";
  payment_status: string | null;
  created_at: string;
}

export interface DbMessage {
  id: number;
  event_id: number;
  sender_id: string; // UUID
  content: string;
  message_type: string;
  created_at: string;
  sender?: DbUser;
}

export interface DbUserInterest {
  id: number;
  user_id: string; // UUID
  category: string;
  created_at: string;
}

// Events with joined organizer data
export interface EventWithOrganizer extends DbEvent {
  organizer?: DbUser;
  attendee_count?: number;
}

// For the vibes feed
export interface VibeItem {
  id: string;
  eventId: number;
  username: string;
  category: string;
  categoryColor: string;
  location: string;
  description: string;
  mediaUrl: string;
  mediaType: "photo" | "video";
  likes: number;
  comments: number;
  shares: number;
  date: string;
  title: string;
}
