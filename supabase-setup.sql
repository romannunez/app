-- ============================================================
-- Pipol — Complete Supabase SQL Setup (FULLY AUTOMATED)
-- Drops everything first, then recreates from scratch.
-- Safe to run on a fresh DB or an existing one.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0. CLEAN UP: Drop everything in reverse dependency order
-- ──────────────────────────────────────────────────────────────

-- Drop trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Remove tables from realtime publication (ignore errors if not there)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE messages;
EXCEPTION WHEN undefined_object THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;

-- Drop all storage policies on storage.objects
DROP POLICY IF EXISTS "Authenticated users can upload event media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for event media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own event media" ON storage.objects;

-- Drop all RLS policies on old "users" table (in case it exists)
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can be updated by themselves" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Drop all RLS policies on "profiles" table
DO $$ BEGIN
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop all RLS policies on events
DO $$ BEGIN
  DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
  DROP POLICY IF EXISTS "Events can be inserted by authenticated users" ON events;
  DROP POLICY IF EXISTS "Events can be updated by their organizers" ON events;
  DROP POLICY IF EXISTS "Events can be deleted by their organizers" ON events;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop all RLS policies on event_attendees
DO $$ BEGIN
  DROP POLICY IF EXISTS "Event attendees are viewable by everyone" ON event_attendees;
  DROP POLICY IF EXISTS "Users can register for events" ON event_attendees;
  DROP POLICY IF EXISTS "Users can update their attendance" ON event_attendees;
  DROP POLICY IF EXISTS "Users can delete their attendance" ON event_attendees;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop all RLS policies on user_interests
DO $$ BEGIN
  DROP POLICY IF EXISTS "User interests are viewable by everyone" ON user_interests;
  DROP POLICY IF EXISTS "Users can insert interests" ON user_interests;
  DROP POLICY IF EXISTS "Users can delete interests" ON user_interests;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop all RLS policies on messages
DO $$ BEGIN
  DROP POLICY IF EXISTS "Messages are viewable by event members" ON messages;
  DROP POLICY IF EXISTS "Messages can be sent by event members" ON messages;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop tables in dependency order (children first)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;  -- old table name, just in case

-- Drop all custom enums
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS attendee_status CASCADE;
DROP TYPE IF EXISTS multimedia_type CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS private_access_type CASCADE;
DROP TYPE IF EXISTS privacy_type CASCADE;
DROP TYPE IF EXISTS event_category CASCADE;

-- Try to clean storage bucket (Supabase may block direct DELETE — that's OK)
DO $$ BEGIN
  DELETE FROM storage.objects WHERE bucket_id = 'event-media';
EXCEPTION WHEN raise_exception THEN NULL;
          WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  DELETE FROM storage.buckets WHERE id = 'event-media';
EXCEPTION WHEN raise_exception THEN NULL;
          WHEN others THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────────────────────────
CREATE TYPE event_category AS ENUM (
  'social', 'music', 'spiritual', 'education',
  'sports', 'food', 'art', 'technology',
  'games', 'outdoor', 'networking', 'workshop',
  'conference', 'party', 'fair', 'exhibition'
);

CREATE TYPE privacy_type AS ENUM ('public', 'private');
CREATE TYPE private_access_type AS ENUM ('solicitud', 'postulacion', 'paga');
CREATE TYPE payment_type AS ENUM ('free', 'paid');
CREATE TYPE multimedia_type AS ENUM ('photo', 'video');
CREATE TYPE attendee_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE message_type AS ENUM ('text', 'image', 'system');

-- ──────────────────────────────────────────────────────────────
-- 2. TABLES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  bio TEXT,
  avatar TEXT,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category event_category NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  location_name TEXT NOT NULL,
  location_address TEXT NOT NULL,
  payment_type payment_type NOT NULL DEFAULT 'free',
  price DECIMAL(10, 2),
  max_capacity INTEGER,
  privacy_type privacy_type NOT NULL DEFAULT 'public',
  private_access_type private_access_type,
  gender_preference TEXT,
  photo_url TEXT,
  media_items TEXT,
  main_media_type multimedia_type DEFAULT 'photo',
  main_media_url TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_attendees (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status attendee_status NOT NULL DEFAULT 'approved',
  payment_status TEXT DEFAULT 'pending',
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE user_interests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category event_category NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category)
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ──────────────────────────────────────────────────────────────
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_messages_event ON messages(event_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ──────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Events policies
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT USING (true);

CREATE POLICY "Events can be inserted by authenticated users"
  ON events FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Events can be updated by their organizers"
  ON events FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Events can be deleted by their organizers"
  ON events FOR DELETE USING (auth.uid() = organizer_id);

-- Event attendees policies
CREATE POLICY "Event attendees are viewable by everyone"
  ON event_attendees FOR SELECT USING (true);

CREATE POLICY "Users can register for events"
  ON event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their attendance"
  ON event_attendees FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their attendance"
  ON event_attendees FOR DELETE USING (auth.uid() = user_id);

-- User interests policies
CREATE POLICY "User interests are viewable by everyone"
  ON user_interests FOR SELECT USING (true);

CREATE POLICY "Users can insert interests"
  ON user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete interests"
  ON user_interests FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Messages are viewable by event members"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_attendees
      WHERE event_attendees.event_id = messages.event_id
        AND event_attendees.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = messages.event_id
        AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Messages can be sent by event members"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM event_attendees
        WHERE event_attendees.event_id = messages.event_id
          AND event_attendees.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM events
        WHERE events.id = messages.event_id
          AND events.organizer_id = auth.uid()
      )
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 5. TRIGGER: Auto-create profile row on signup
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, profiles.name),
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- 6. REALTIME: Enable realtime for messages table
-- ──────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ──────────────────────────────────────────────────────────────
-- 7. STORAGE: Create event-media bucket
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media', 'event-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload event media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-media' AND (select auth.role()) = 'authenticated');

CREATE POLICY "Public read access for event media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-media');

CREATE POLICY "Users can delete their own event media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-media' AND auth.uid()::text = (storage.foldername(name))[1]);
