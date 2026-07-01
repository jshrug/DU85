import { useState, useEffect, useId } from "react";
import { supabase, COHORT_ID } from "../lib/supabase.js";

export default function useCastCount() {
  const [state, setState] = useState({ castCount: null, routeLocked: false });
  const id = useId();

  useEffect(() => {
    if (!supabase) return;
    const PHASES = ["anchor-longlist", "anchor-runoff", "combo-vote", "combo-runoff"];

    async function load() {
      const [{ data: cohortState }, { data: votes }] = await Promise.all([
        supabase.from("cohort_state").select("mission_index,anchor_winner,companion_winner").eq("cohort_id", COHORT_ID).maybeSingle(),
        supabase.from("cohort_votes").select("user_id,vote_phase").eq("cohort_id", COHORT_ID),
      ]);
      const routeLocked = Boolean(cohortState?.anchor_winner && cohortState?.companion_winner);
      const idx = cohortState?.mission_index ?? 0;
      const phase = PHASES[Math.min(idx, PHASES.length - 1)];
      const castCount = new Set((votes || []).filter((v) => v.vote_phase === phase).map((v) => v.user_id)).size;
      setState({ castCount: routeLocked ? null : castCount, routeLocked });
    }

    load();

    const ch = supabase
      .channel(`home-cast-count-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cohort_votes", filter: `cohort_id=eq.${COHORT_ID}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cohort_state", filter: `cohort_id=eq.${COHORT_ID}` }, load)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  return state;
}
