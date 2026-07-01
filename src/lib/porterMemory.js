import { supabase, COHORT_ID } from "./supabase.js";

const BRIEFS_BUCKET = "porter-briefs";

export async function loadConversation(userId) {
  if (!supabase || !userId) return [];
  const { data } = await supabase
    .from("porter_conversations")
    .select("messages")
    .eq("cohort_id", COHORT_ID)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.messages || [];
}

export async function saveConversation(userId, messages) {
  if (!supabase || !userId) return;
  await supabase
    .from("porter_conversations")
    .upsert(
      { cohort_id: COHORT_ID, user_id: userId, messages, updated_at: new Date().toISOString() },
      { onConflict: "cohort_id,user_id" }
    );
}

export async function submitCountryBrief({ countryName, teamMembers, content, file }) {
  if (!supabase) throw new Error("Supabase not configured.");

  let fileFields = {};
  if (file) {
    const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
    const slug = countryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const storagePath = `${COHORT_ID}/${slug}_${Date.now()}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BRIEFS_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from(BRIEFS_BUCKET).getPublicUrl(storagePath);
    fileFields = { file_name: file.name, file_type: file.type, storage_path: storagePath, download_url: publicUrl };
  }

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
        ...fileFields,
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
