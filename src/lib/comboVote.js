import { supabase, COHORT_ID } from "./supabase.js";

// City B combo vote. Ballot = ordered top 3 City B picks (each tied to its
// City A anchor). Scoring = 3/2/1, same as the City A round. Unlike City A
// (top two advance), this round locks a single City A + City B combo —
// unless the top two are within RUNOFF_MARGIN points, which fires a runoff.
// Tiebreak within the runoff margin (pre-declared): most first-choice votes,
// then alphabetical.
export const ROUND = "city_b";
const WEIGHTS = [3, 2, 1];
const RUNOFF_MARGIN = 3;

// ── Status (open/close + published results) ──────────────────────────────────
export async function fetchVoteStatus() {
  if (!supabase) return { status: "closed", results: null };
  const { data } = await supabase
    .from("cohort_vote_status")
    .select("status,results")
    .eq("cohort_id", COHORT_ID)
    .eq("round", ROUND)
    .maybeSingle();
  return data || { status: "closed", results: null };
}

export function subscribeVoteStatus(onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`vote-status-${ROUND}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cohort_vote_status", filter: `cohort_id=eq.${COHORT_ID}` },
      (payload) => { if ((payload.new?.round ?? ROUND) === ROUND) onChange(payload.new); }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ── A member's own ballot ────────────────────────────────────────────────────
export async function fetchMyBallot(voterId) {
  if (!supabase || !voterId) return null;
  const { data } = await supabase
    .from("cohort_ballots")
    .select("ranking")
    .eq("cohort_id", COHORT_ID)
    .eq("round", ROUND)
    .eq("voter_id", voterId)
    .maybeSingle();
  return data?.ranking || null;
}

export async function submitBallot(voterId, ranking) {
  if (!supabase) throw new Error("Not connected.");
  if (!voterId) throw new Error("You need to be signed in to vote.");
  const clean = (ranking || []).filter(Boolean).slice(0, 3);
  if (clean.length === 0) throw new Error("Pick at least one pairing.");
  const { error } = await supabase
    .from("cohort_ballots")
    .upsert(
      { cohort_id: COHORT_ID, round: ROUND, voter_id: voterId, ranking: clean, submitted_at: new Date().toISOString() },
      { onConflict: "cohort_id,round,voter_id" }
    );
  if (error) throw error;
}

// Anonymous live progress: how many have voted (never who/what).
export async function fetchVotedCount() {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("ballot_count", { p_cohort: COHORT_ID, p_round: ROUND });
  if (error) return 0;
  return data ?? 0;
}

// ── Admin controls ───────────────────────────────────────────────────────────
export async function setVoteStatus(status) {
  if (!supabase) throw new Error("Not connected.");
  const { error } = await supabase
    .from("cohort_vote_status")
    .upsert(
      { cohort_id: COHORT_ID, round: ROUND, status, updated_at: new Date().toISOString() },
      { onConflict: "cohort_id,round" }
    );
  if (error) throw error;
}

// Admin closes the vote: read every ballot, apply 3/2/1, publish the full
// scoreboard + the winner. Members never read raw ballots (RLS); only this
// aggregate result is public.
export async function closeAndTally() {
  if (!supabase) throw new Error("Not connected.");
  const { data: ballots, error } = await supabase
    .from("cohort_ballots")
    .select("ranking")
    .eq("cohort_id", COHORT_ID)
    .eq("round", ROUND);
  if (error) throw error;

  const points = {};
  const firsts = {};
  (ballots || []).forEach((b) => {
    (b.ranking || []).slice(0, 3).forEach((city, i) => {
      points[city] = (points[city] || 0) + WEIGHTS[i];
    });
    const top = (b.ranking || [])[0];
    if (top) firsts[top] = (firsts[top] || 0) + 1;
  });

  const ranked = Object.keys(points)
    .map((city) => ({ city, points: points[city], firstPicks: firsts[city] || 0 }))
    .sort((a, b) => b.points - a.points || b.firstPicks - a.firstPicks || a.city.localeCompare(b.city));

  const winner = ranked[0]?.city || null;
  const runnerUp = ranked[1]?.city || null;
  const margin = ranked.length > 1 ? ranked[0].points - ranked[1].points : null;
  const needsRunoff = margin !== null && margin <= RUNOFF_MARGIN;

  const results = { ranked, winner, runnerUp, margin, needsRunoff, ballotCount: (ballots || []).length };

  const { error: e2 } = await supabase
    .from("cohort_vote_status")
    .upsert(
      { cohort_id: COHORT_ID, round: ROUND, status: "final", results, updated_at: new Date().toISOString() },
      { onConflict: "cohort_id,round" }
    );
  if (e2) throw e2;
  return results;
}
