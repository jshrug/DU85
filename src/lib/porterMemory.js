import { supabase, COHORT_ID } from "./supabase.js";

export async function submitCountryBrief({ countryName, teamMembers, content }) {
  if (!supabase) throw new Error("Supabase not configured.");
  const { error } = await supabase
    .from("porter_memory")
    .upsert(
      {
        cohort_id: COHORT_ID,
        memory_type: "country_brief",
        country_name: countryName.trim(),
        team_members: teamMembers.trim(),
        content: content.trim(),
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "cohort_id,memory_type,country_name" }
    );
  if (error) throw error;
}

export async function fetchCountryBriefs() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("porter_memory")
    .select("*")
    .eq("cohort_id", COHORT_ID)
    .eq("memory_type", "country_brief")
    .order("submitted_at", { ascending: true });
  if (error) return [];
  return data || [];
}
