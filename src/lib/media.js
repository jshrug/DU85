import { supabase, COHORT_ID } from "./supabase";

function mapItem(row) {
  return {
    id: row.id,
    type: row.type,
    city: row.city,
    title: row.title,
    url: row.url,
    description: row.description,
    source: row.source,
    createdAt: row.created_at,
  };
}

export function subscribeMedia(callback) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("media_items")
      .select("*")
      .eq("cohort_id", COHORT_ID)
      .order("created_at", { ascending: false });
    if (active) callback((data || []).map(mapItem));
  }

  fetch();

  const channel = supabase
    .channel(`media-${COHORT_ID}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "media_items" }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}

export async function addMediaItem(item) {
  const { error } = await supabase.from("media_items").insert({
    cohort_id: COHORT_ID,
    type: item.type,
    city: item.city,
    title: item.title,
    url: item.url,
    description: item.description || "",
    source: item.source || "",
  });
  if (error) throw new Error(error.message);
}

export async function deleteMediaItem(id) {
  const { error } = await supabase.from("media_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
