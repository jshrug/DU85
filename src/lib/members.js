import { supabase, COHORT_ID } from "./supabase";

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
  };
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
      default_city: "Singapore",
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

export async function updateMyProfile(uid, { displayName, defaultCity }) {
  const patch = {};
  if (typeof displayName === "string") patch.display_name = displayName.trim();
  if (typeof defaultCity === "string") patch.default_city = defaultCity;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("members").update(patch).eq("id", uid);
  if (error) throw new Error(error.message);
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
