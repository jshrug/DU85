import { useState, useEffect } from "react";
import { supabase, COHORT_ID } from "../lib/supabase.js";

export default function useLockedDestinations() {
  const [locked, setLocked] = useState({ anchorWinner: null, companionWinner: null });

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("cohort_state")
      .select("anchor_winner,companion_winner")
      .eq("cohort_id", COHORT_ID)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setLocked({ anchorWinner: data.anchor_winner || null, companionWinner: data.companion_winner || null });
      });

    const ch = supabase
      .channel("home-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cohort_state", filter: `cohort_id=eq.${COHORT_ID}` },
        (payload) => {
          if (payload.new)
            setLocked({
              anchorWinner: payload.new.anchor_winner || null,
              companionWinner: payload.new.companion_winner || null,
            });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  return locked;
}
