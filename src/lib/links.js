import { supabase, COHORT_ID } from "./supabase";

export const MAX_URL_LENGTH = 500;
export const MAX_TITLE_LENGTH = 120;
export const MAX_NOTES_LENGTH = 240;

function mapLink(row) {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    notes: row.notes || "",
    createdAt: row.created_at,
    createdByUid: row.created_by_uid,
    createdByName: row.created_by_name,
  };
}

export function validateLink({ url, title, notes }) {
  const trimmedUrl = (url || "").trim();
  const trimmedTitle = (title || "").trim();
  const trimmedNotes = (notes || "").trim();
  if (!trimmedTitle) return "Title is required.";
  if (trimmedTitle.length > MAX_TITLE_LENGTH) return `Title is too long (max ${MAX_TITLE_LENGTH} characters).`;
  if (!trimmedUrl) return "URL is required.";
  if (!/^https?:\/\//i.test(trimmedUrl)) return "URL must start with http:// or https://";
  if (trimmedUrl.length > MAX_URL_LENGTH) return `URL is too long (max ${MAX_URL_LENGTH} characters).`;
  if (trimmedNotes.length > MAX_NOTES_LENGTH) return `Notes are too long (max ${MAX_NOTES_LENGTH} characters).`;
  return null;
}

export function subscribeLinks(callback) {
  if (!supabase) return () => {};
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("shared_links")
      .select("*")
      .eq("cohort_id", COHORT_ID)
      .order("created_at", { ascending: false });
    if (active) callback((data || []).map(mapLink));
  }

  fetch();

  const channel = supabase
    .channel(`shared-links-${COHORT_ID}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "shared_links" }, fetch)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function addLink({ url, title, notes }, { uid, name }) {
  const error = validateLink({ url, title, notes });
  if (error) throw new Error(error);
  if (!uid) throw new Error("Not signed in.");

  const { error: insertError } = await supabase.from("shared_links").insert({
    cohort_id: COHORT_ID,
    url: url.trim(),
    title: title.trim(),
    notes: (notes || "").trim(),
    created_by_uid: uid,
    created_by_name: name || "Member",
  });
  if (insertError) {
    if (insertError.code === "42501" || insertError.code === "42P01") {
      throw new Error("Could not save. Joe still needs to run the command-center SQL so members can add docs.");
    }
    throw new Error(insertError.message);
  }
}

export async function deleteLink(id) {
  const { error } = await supabase.from("shared_links").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
