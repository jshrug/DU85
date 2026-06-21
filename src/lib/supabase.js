import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const COHORT_ID = import.meta.env.VITE_COHORT_ID || "global85";

export function getOrCreateUserId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("g85_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("g85_user_id", id);
  }
  return id;
}

/*
  ── SQL to run once in Supabase SQL Editor ──────────────────────────────────

  CREATE TABLE IF NOT EXISTS cohort_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cohort_id TEXT NOT NULL,
    vote_phase TEXT NOT NULL,
    country_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE cohort_votes
    ADD CONSTRAINT cohort_votes_unique UNIQUE (cohort_id, vote_phase, user_id);
  ALTER TABLE cohort_votes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public_rw" ON cohort_votes FOR ALL USING (true) WITH CHECK (true);

  CREATE TABLE IF NOT EXISTS cohort_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cohort_id TEXT NOT NULL UNIQUE,
    mission_index INT DEFAULT 0,
    anchor_winner TEXT,
    companion_winner TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE cohort_state ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public_rw" ON cohort_state FOR ALL USING (true) WITH CHECK (true);

  -- Enable Realtime replication for both tables
  ALTER PUBLICATION supabase_realtime ADD TABLE cohort_votes;
  ALTER PUBLICATION supabase_realtime ADD TABLE cohort_state;

  ────────────────────────────────────────────────────────────────────────────
*/
