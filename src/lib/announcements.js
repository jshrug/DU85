import { supabase, COHORT_ID } from "./supabase";

async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not signed in.");
  return user;
}

function mapAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    status: row.status,
    createdAt: row.created_at,
    createdByUid: row.created_by_uid,
    createdByName: row.created_by_name,
  };
}

export async function createAnnouncement({ title, body, pinned }) {
  const user = await getCurrentUser();
  const { data: member } = await supabase.from("members").select("display_name").eq("id", user.id).single();

  const payload = {
    cohort_id: COHORT_ID,
    title: (title || "").trim(),
    body: (body || "").trim(),
    pinned: !!pinned,
    status: "active",
    created_by_uid: user.id,
    created_by_name: member?.display_name || "Admin",
  };

  if (!payload.title) throw new Error("Title is required.");
  if (!payload.body) throw new Error("Body is required.");

  const { data, error } = await supabase.from("announcements").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function setAnnouncementPinned(id, pinned) {
  const { error } = await supabase.from("announcements").update({ pinned: !!pinned }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function archiveAnnouncement(id) {
  const { error } = await supabase.from("announcements").update({ status: "archived", pinned: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export function subscribeAnnouncements(cb) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("cohort_id", COHORT_ID)
      .eq("status", "active")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);
    if (active) cb((data || []).map(mapAnnouncement));
  }

  fetch();

  const channel = supabase
    .channel(`announcements-${COHORT_ID}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}
