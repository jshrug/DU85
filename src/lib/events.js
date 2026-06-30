import { supabase, COHORT_ID } from "./supabase";

async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not signed in.");
  return user;
}

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    startTime: row.start_time,
    locationName: row.location_name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    createdByUid: row.created_by_uid,
    createdByName: row.created_by_name,
  };
}

function mapRsvp(row) {
  return {
    uid: row.uid,
    status: row.status,
    name: row.name,
    updatedAt: row.updated_at,
  };
}

export async function createEvent(data) {
  const user = await getCurrentUser();

  const payload = {
    cohort_id: COHORT_ID,
    title: (data.title || "").trim(),
    city: data.city,
    start_time: data.startTime instanceof Date ? data.startTime.toISOString() : data.startTime,
    location_name: (data.locationName || "").trim(),
    description: (data.description || "").trim(),
    status: "active",
    created_by_uid: user.id,
    created_by_name: user.user_metadata?.full_name || "Member",
  };

  if (!payload.title) throw new Error("Title is required.");
  if (!payload.city) throw new Error("City is required.");
  if (!payload.start_time) throw new Error("Start time is required.");
  if (!payload.location_name) throw new Error("Location name is required.");

  const { data: row, error } = await supabase
    .from("city_events")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("event_rsvps").insert({
    event_id: row.id,
    uid: user.id,
    status: "going",
    name: payload.created_by_name,
  });

  return row.id;
}

export async function updateEvent(eventId, patch) {
  await getCurrentUser();
  const payload = {};
  if (typeof patch.title === "string") payload.title = patch.title.trim();
  if (typeof patch.city === "string") payload.city = patch.city;
  if (patch.startTime) payload.start_time = patch.startTime instanceof Date ? patch.startTime.toISOString() : patch.startTime;
  if (typeof patch.locationName === "string") payload.location_name = patch.locationName.trim();
  if (typeof patch.description === "string") payload.description = patch.description.trim();
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from("city_events").update(payload).eq("id", eventId);
  if (error) throw new Error(error.message);
}

export async function archiveEvent(eventId) {
  await getCurrentUser();
  const { error } = await supabase.from("city_events").update({ status: "archived" }).eq("id", eventId);
  if (error) throw new Error(error.message);
}

export async function setRsvp(eventId, status) {
  const user = await getCurrentUser();
  const allowed = new Set(["going", "interested", "not_going"]);
  if (!allowed.has(status)) throw new Error("Invalid RSVP status.");

  const { data: member } = await supabase
    .from("members")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("event_rsvps").upsert({
    event_id: eventId,
    uid: user.id,
    status,
    name: member?.display_name || "Member",
    updated_at: new Date().toISOString(),
  }, { onConflict: "event_id,uid" });
  if (error) throw new Error(error.message);
}

export function subscribeEventsByCity(city, cb) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("city_events")
      .select("*")
      .eq("cohort_id", COHORT_ID)
      .eq("city", city)
      .eq("status", "active")
      .order("start_time", { ascending: true })
      .limit(50);
    if (active) cb((data || []).map(mapEvent));
  }

  fetch();

  const channel = supabase
    .channel(`city-events-${city}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "city_events",
    }, fetch)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export function subscribeRsvps(eventId, cb) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("event_rsvps")
      .select("*")
      .eq("event_id", eventId);
    if (active) cb((data || []).map(mapRsvp));
  }

  fetch();

  const channel = supabase
    .channel(`rsvps-${eventId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "event_rsvps",
      filter: `event_id=eq.${eventId}`,
    }, fetch)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}
