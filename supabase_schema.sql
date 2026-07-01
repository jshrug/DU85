-- ─────────────────────────────────────────────────────────────────────────────
-- Global 85 — Supabase schema migration (run in Supabase SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- Member profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id     TEXT NOT NULL DEFAULT 'global85',
  email         TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT 'Member',
  role          TEXT NOT NULL DEFAULT 'member',
  default_city  TEXT NOT NULL DEFAULT 'Singapore',
  team_id       UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin allowlist
CREATE TABLE IF NOT EXISTS admins (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id TEXT NOT NULL DEFAULT 'global85',
  enabled   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Cohort-wide chat messages
CREATE TABLE IF NOT EXISTS cohort_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id       TEXT NOT NULL DEFAULT 'global85',
  text            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_uid  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT 'Member'
);

-- City events (RSVP-able, created by members for destination cities)
CREATE TABLE IF NOT EXISTS city_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id       TEXT NOT NULL DEFAULT 'global85',
  title           TEXT NOT NULL,
  city            TEXT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  location_name   TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_uid  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT 'Member'
);

-- RSVPs for city events (one row per user per event)
CREATE TABLE IF NOT EXISTS event_rsvps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES city_events(id) ON DELETE CASCADE,
  uid        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT 'Member',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, uid)
);

-- Per-event discussion chat
CREATE TABLE IF NOT EXISTS event_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES city_events(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_uid  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT 'Member'
);

-- Gallery photos
CREATE TABLE IF NOT EXISTS photos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id      TEXT NOT NULL DEFAULT 'global85',
  url            TEXT NOT NULL,
  storage_path   TEXT NOT NULL,
  city           TEXT,
  uploader_uid   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploader_name  TEXT NOT NULL DEFAULT 'Member',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Photo likes (junction table)
CREATE TABLE IF NOT EXISTS photo_likes (
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  uid      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, uid)
);

-- Explore items (restaurants, bars, activities, etc.)
CREATE TABLE IF NOT EXISTS explore_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id        TEXT NOT NULL DEFAULT 'global85',
  city             TEXT NOT NULL,
  type             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT '',
  name             TEXT NOT NULL,
  neighborhood     TEXT NOT NULL DEFAULT '',
  hours            TEXT NOT NULL DEFAULT '',
  price            TEXT NOT NULL DEFAULT '',
  tags             TEXT[] NOT NULL DEFAULT '{}',
  google_maps_url  TEXT NOT NULL DEFAULT '',
  reservation_url  TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  recommended_by   TEXT NOT NULL DEFAULT '',
  stable_key       TEXT UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_uid   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_uid   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- User favorites for explore items
CREATE TABLE IF NOT EXISTS user_favorites (
  explore_id UUID NOT NULL REFERENCES explore_items(id) ON DELETE CASCADE,
  uid        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (explore_id, uid)
);

-- User-uploaded files (private to each user)
CREATE TABLE IF NOT EXISTS user_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  storage_name  TEXT NOT NULL,
  file_size     INTEGER NOT NULL DEFAULT 0,
  file_type     TEXT NOT NULL DEFAULT '',
  storage_path  TEXT NOT NULL,
  download_url  TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id       TEXT NOT NULL DEFAULT 'global85',
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_uid  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add team FK to members after teams table is created
ALTER TABLE members
  ADD CONSTRAINT members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Team membership
CREATE TABLE IF NOT EXISTS team_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  uid          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Member',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, uid)
);

-- Team chat messages
CREATE TABLE IF NOT EXISTS team_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_uid  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT 'Member'
);

-- Team meetings
CREATE TABLE IF NOT EXISTS team_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  date_time       TIMESTAMPTZ NOT NULL,
  location        TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_uid  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id       TEXT NOT NULL DEFAULT 'global85',
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_uid  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT 'Admin'
);

-- Curated media links (videos + articles)
CREATE TABLE IF NOT EXISTS media_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id   TEXT NOT NULL DEFAULT 'global85',
  type        TEXT NOT NULL,
  city        TEXT NOT NULL,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Explore import audit logs
CREATE TABLE IF NOT EXISTS explore_import_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id          TEXT NOT NULL DEFAULT 'global85',
  admin_uid          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name          TEXT NOT NULL DEFAULT '',
  imported_count     INTEGER NOT NULL DEFAULT 0,
  updated_count      INTEGER NOT NULL DEFAULT 0,
  skipped_count      INTEGER NOT NULL DEFAULT 0,
  removed_duplicates INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Destination vote tallies (one row per cast/changed vote per user per phase)
CREATE TABLE IF NOT EXISTS cohort_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id    TEXT NOT NULL,
  vote_phase   TEXT NOT NULL,
  country_name TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, vote_phase, user_id)
);

-- Shared destination-vote protocol state (mission index, locked winners)
CREATE TABLE IF NOT EXISTS cohort_state (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id         TEXT NOT NULL UNIQUE,
  mission_index     INTEGER NOT NULL DEFAULT 0,
  anchor_winner     TEXT,
  companion_winner  TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Porter country briefs submitted by champion teams
CREATE TABLE IF NOT EXISTS porter_memory (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id      TEXT NOT NULL,
  memory_type    TEXT NOT NULL DEFAULT 'country_brief',
  country_name   TEXT NOT NULL,
  team_members   TEXT,
  content        TEXT NOT NULL,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, memory_type, country_name)
);

-- Porter persistent conversation history (one row per user)
CREATE TABLE IF NOT EXISTS porter_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id  TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  messages   JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, user_id)
);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE explore_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_files          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_meetings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE explore_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_votes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_state        ENABLE ROW LEVEL SECURITY;
ALTER TABLE porter_memory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE porter_conversations ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid() AND enabled = TRUE
  );
$$;

-- members: any authenticated user can read; each user manages their own row
CREATE POLICY "members_select" ON members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "members_insert" ON members FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "members_update_own" ON members FOR UPDATE USING (auth.uid() = id OR is_admin());

-- admins: any authenticated user can read (to check own status)
CREATE POLICY "admins_select" ON admins FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins_manage" ON admins FOR ALL USING (is_admin());

-- cohort_messages: authenticated users can read/insert; delete own or admin
CREATE POLICY "messages_select" ON cohort_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "messages_insert" ON cohort_messages FOR INSERT WITH CHECK (auth.uid() = created_by_uid);
CREATE POLICY "messages_delete" ON cohort_messages FOR DELETE USING (auth.uid() = created_by_uid OR is_admin());

-- city_events: authenticated users can read; any member can create; creator or admin can update/delete
CREATE POLICY "city_events_select" ON city_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "city_events_insert" ON city_events FOR INSERT WITH CHECK (auth.uid() = created_by_uid);
CREATE POLICY "city_events_update" ON city_events FOR UPDATE USING (auth.uid() = created_by_uid OR is_admin());
CREATE POLICY "city_events_delete" ON city_events FOR DELETE USING (auth.uid() = created_by_uid OR is_admin());

-- event_rsvps: authenticated users can read; manage own
CREATE POLICY "rsvps_select" ON event_rsvps FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rsvps_upsert" ON event_rsvps FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "rsvps_update" ON event_rsvps FOR UPDATE USING (auth.uid() = uid);
CREATE POLICY "rsvps_delete" ON event_rsvps FOR DELETE USING (auth.uid() = uid);

-- event_messages: authenticated read; insert own; delete own or admin
CREATE POLICY "event_messages_select" ON event_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_messages_insert" ON event_messages FOR INSERT WITH CHECK (auth.uid() = created_by_uid);
CREATE POLICY "event_messages_delete" ON event_messages FOR DELETE USING (auth.uid() = created_by_uid OR is_admin());

-- photos: authenticated read; insert own; admin can delete
CREATE POLICY "photos_select" ON photos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "photos_insert" ON photos FOR INSERT WITH CHECK (auth.uid() = uploader_uid);
CREATE POLICY "photos_delete" ON photos FOR DELETE USING (auth.uid() = uploader_uid OR is_admin());

-- photo_likes: authenticated read; manage own
CREATE POLICY "photo_likes_select" ON photo_likes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "photo_likes_insert" ON photo_likes FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "photo_likes_delete" ON photo_likes FOR DELETE USING (auth.uid() = uid);

-- explore_items: authenticated read; admin write
CREATE POLICY "explore_select" ON explore_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "explore_write" ON explore_items FOR ALL USING (is_admin());

-- user_favorites: each user manages their own
CREATE POLICY "favorites_select" ON user_favorites FOR SELECT USING (auth.uid() = uid);
CREATE POLICY "favorites_insert" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "favorites_delete" ON user_favorites FOR DELETE USING (auth.uid() = uid);

-- user_files: each user manages their own
CREATE POLICY "files_select" ON user_files FOR SELECT USING (auth.uid() = uid);
CREATE POLICY "files_insert" ON user_files FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "files_delete" ON user_files FOR DELETE USING (auth.uid() = uid);

-- teams: authenticated read; admin write
CREATE POLICY "teams_select" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teams_write" ON teams FOR ALL USING (is_admin());

-- team_members: authenticated read; admin write
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_members_write" ON team_members FOR ALL USING (is_admin());

-- team_messages: authenticated read; members insert own; delete own or admin
CREATE POLICY "team_messages_select" ON team_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_messages_insert" ON team_messages FOR INSERT WITH CHECK (auth.uid() = created_by_uid);
CREATE POLICY "team_messages_delete" ON team_messages FOR DELETE USING (auth.uid() = created_by_uid OR is_admin());

-- team_meetings: authenticated read; admin write
CREATE POLICY "team_meetings_select" ON team_meetings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_meetings_write" ON team_meetings FOR ALL USING (is_admin());

-- announcements: authenticated read; admin write
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "announcements_write" ON announcements FOR ALL USING (is_admin());

-- media_items: authenticated read; admin write
CREATE POLICY "media_select" ON media_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "media_write" ON media_items FOR ALL USING (is_admin());

-- explore_import_logs: admin only
CREATE POLICY "import_logs_write" ON explore_import_logs FOR ALL USING (is_admin());

-- cohort_votes / cohort_state: shared cohort-wide voting protocol, open to any authenticated member
CREATE POLICY "cohort_votes_rw" ON cohort_votes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cohort_state_rw" ON cohort_state FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- porter_memory / porter_conversations: authenticated members read/write
CREATE POLICY "porter_memory_rw" ON porter_memory FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "porter_conversations_rw" ON porter_conversations FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ─── Grants ──────────────────────────────────────────────────────────────────
-- RLS policies only take effect once the role also has the base table grant.
-- Without this, every query fails with "permission denied for table X" (42501)
-- regardless of how permissive the policies above are.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ─── Realtime ────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE admins;
ALTER PUBLICATION supabase_realtime ADD TABLE cohort_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE city_events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE event_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
ALTER PUBLICATION supabase_realtime ADD TABLE photo_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE explore_items;
ALTER PUBLICATION supabase_realtime ADD TABLE user_favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE team_meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE media_items;
ALTER PUBLICATION supabase_realtime ADD TABLE cohort_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE cohort_state;

-- ─── Storage buckets (create in Supabase Dashboard → Storage) ────────────────
-- gallery  — public, 10 MB max per file
-- user-files — private, 10 MB max per file
