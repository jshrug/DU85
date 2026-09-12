import { supabase, COHORT_ID } from "./supabase";

export const READY_STATUSES = ["unknown", "yes", "no"];
export const ROOM_PREFERENCES = ["unknown", "double", "single"];
export const READY_FIELDS = ["passportValid", "visaTurkey", "visaKenya", "vaccinesStarted"];

function mapStatus(value) {
  return READY_STATUSES.includes(value) ? value : "unknown";
}

function mapMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    defaultCity: row.default_city,
    teamId: row.team_id,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    passportValid: mapStatus(row.passport_valid),
    visaTurkey: mapStatus(row.visa_turkey),
    visaKenya: mapStatus(row.visa_kenya),
    vaccinesStarted: mapStatus(row.vaccines_started),
    roomPreference: ROOM_PREFERENCES.includes(row.room_preference) ? row.room_preference : "unknown",
  };
}

export function isTripReady(member) {
  return READY_FIELDS.every((key) => member?.[key] === "yes");
}

export async function upsertMemberProfile(user) {
  if (!user?.id) throw new Error("Missing user.");
  const emailLower = (user.email || "").toLowerCase();

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!existing) {
    await supabase.from("members").insert({
      id: user.id,
      cohort_id: COHORT_ID,
      email: emailLower,
      display_name: user.user_metadata?.full_name || "Member",
      role: "member",
      default_city: "Istanbul",
    });
    return { created: true };
  }

  await supabase.from("members").update({
    email: emailLower,
    last_login_at: new Date().toISOString(),
  }).eq("id", user.id);

  return { created: false };
}

export function subscribeMember(uid, cb) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("id", uid)
      .single();
    if (active) cb(mapMember(data));
  }

  fetch();

  const channel = supabase
    .channel(`member-${uid}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "members",
      filter: `id=eq.${uid}`,
    }, fetch)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function updateMyProfile(uid, fields) {
  const patch = {};
  if (typeof fields.displayName === "string") patch.display_name = fields.displayName.trim();
  if (typeof fields.defaultCity === "string") patch.default_city = fields.defaultCity;
  if (READY_STATUSES.includes(fields.passportValid)) patch.passport_valid = fields.passportValid;
  if (READY_STATUSES.includes(fields.visaTurkey)) patch.visa_turkey = fields.visaTurkey;
  if (READY_STATUSES.includes(fields.visaKenya)) patch.visa_kenya = fields.visaKenya;
  if (READY_STATUSES.includes(fields.vaccinesStarted)) patch.vaccines_started = fields.vaccinesStarted;
  if (ROOM_PREFERENCES.includes(fields.roomPreference)) patch.room_preference = fields.roomPreference;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("members").update(patch).eq("id", uid);
  if (error) {
    if (error.code === "42703") {
      throw new Error("Could not save. Joe still needs to run the command-center SQL for trip-readiness fields.");
    }
    throw new Error(error.message);
  }
}

export function subscribeCohortMembers(cb) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("cohort_id", COHORT_ID)
      .order("display_name", { ascending: true });
    if (active) cb((data || []).map(mapMember));
  }

  fetch();

  const channel = supabase
    .channel(`cohort-members-${COHORT_ID}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}

export async function getMemberDisplayName(uid) {
  const { data } = await supabase
    .from("members")
    .select("display_name, email")
    .eq("id", uid)
    .single();
  return data?.display_name || data?.email || "Member";
}
