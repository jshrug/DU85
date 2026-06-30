import { supabase, COHORT_ID } from "./supabase";

function mapTeam(row) {
  return { id: row.id, name: row.name, createdAt: row.created_at, createdByUid: row.created_by_uid };
}

function mapTeamMember(row) {
  return { uid: row.uid, displayName: row.display_name, joinedAt: row.joined_at };
}

function mapMessage(row) {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    createdByUid: row.created_by_uid,
    createdByName: row.created_by_name,
  };
}

function mapMeeting(row) {
  return {
    id: row.id,
    title: row.title,
    dateTime: row.date_time,
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
    createdByUid: row.created_by_uid,
  };
}

export function subscribeTeams(callback) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("cohort_id", COHORT_ID)
      .order("created_at", { ascending: true });
    if (active) callback((data || []).map(mapTeam));
  }

  fetch();

  const channel = supabase
    .channel(`teams-${COHORT_ID}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}

export function subscribeMyTeam(uid, callback) {
  let active = true;
  let teamChannel = null;

  async function fetchTeam(teamId) {
    if (!teamId) { if (active) callback(null); return; }
    const { data } = await supabase.from("teams").select("*").eq("id", teamId).single();
    if (active) callback(data ? mapTeam(data) : null);
  }

  const memberChannel = supabase
    .channel(`my-team-member-${uid}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "members",
      filter: `id=eq.${uid}`,
    }, async (payload) => {
      const teamId = payload.new?.team_id ?? null;
      if (teamChannel) { supabase.removeChannel(teamChannel); teamChannel = null; }
      if (teamId) {
        teamChannel = supabase
          .channel(`my-team-doc-${teamId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `id=eq.${teamId}` },
            () => fetchTeam(teamId))
          .subscribe();
      }
      fetchTeam(teamId);
    })
    .subscribe();

  supabase.from("members").select("team_id").eq("id", uid).single().then(({ data }) => {
    fetchTeam(data?.team_id ?? null);
  });

  return () => {
    active = false;
    supabase.removeChannel(memberChannel);
    if (teamChannel) supabase.removeChannel(teamChannel);
  };
}

export function subscribeTeamMembers(teamId, callback) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });
    if (active) callback((data || []).map(mapTeamMember));
  }

  fetch();

  const channel = supabase
    .channel(`team-members-${teamId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "team_members", filter: `team_id=eq.${teamId}` }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}

export async function createTeam(name, createdByUid) {
  const { data, error } = await supabase
    .from("teams")
    .insert({ cohort_id: COHORT_ID, name, created_by_uid: createdByUid })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateTeam(teamId, name) {
  const { error } = await supabase.from("teams").update({ name }).eq("id", teamId);
  if (error) throw new Error(error.message);
}

export async function deleteTeam(teamId) {
  const { data: members } = await supabase.from("team_members").select("uid").eq("team_id", teamId);
  if (members?.length) {
    const uids = members.map((m) => m.uid);
    await supabase.from("members").update({ team_id: null }).in("id", uids);
  }
  await supabase.from("teams").delete().eq("id", teamId);
}

export async function assignMember(teamId, uid, displayName) {
  await supabase.from("team_members").upsert(
    { team_id: teamId, uid, display_name: displayName },
    { onConflict: "team_id,uid" }
  );
  await supabase.from("members").update({ team_id: teamId }).eq("id", uid);
}

export async function removeMember(teamId, uid) {
  await supabase.from("team_members").delete().match({ team_id: teamId, uid });
  await supabase.from("members").update({ team_id: null }).eq("id", uid);
}

export function subscribeTeamMessages(teamId, callback) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("team_messages")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (active) callback((data || []).map(mapMessage));
  }

  fetch();

  const channel = supabase
    .channel(`team-chat-${teamId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}

export async function sendTeamMessage(teamId, text, uid, displayName) {
  let name = displayName;
  if (!name) {
    const { data: member } = await supabase.from("members").select("display_name").eq("id", uid).single();
    name = member?.display_name || "Member";
  }
  const { error } = await supabase.from("team_messages").insert({
    team_id: teamId,
    text,
    created_by_uid: uid,
    created_by_name: name,
  });
  if (error) throw new Error(error.message);
}

export async function deleteTeamMessage(teamId, messageId) {
  const { error } = await supabase.from("team_messages").delete().eq("id", messageId);
  if (error) throw new Error(error.message);
}

export function subscribeTeamMeetings(teamId, callback) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("team_meetings")
      .select("*")
      .eq("team_id", teamId)
      .order("date_time", { ascending: true });
    if (active) callback((data || []).map(mapMeeting));
  }

  fetch();

  const channel = supabase
    .channel(`team-meetings-${teamId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "team_meetings", filter: `team_id=eq.${teamId}` }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}

export async function createMeeting(teamId, { title, dateTime, location, notes }, createdByUid) {
  const { error } = await supabase.from("team_meetings").insert({
    team_id: teamId,
    title,
    date_time: dateTime instanceof Date ? dateTime.toISOString() : dateTime,
    location: location || "",
    notes: notes || "",
    created_by_uid: createdByUid,
  });
  if (error) throw new Error(error.message);
}

export async function updateMeeting(teamId, meetingId, fields) {
  const patch = {};
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.dateTime !== undefined) patch.date_time = fields.dateTime instanceof Date ? fields.dateTime.toISOString() : fields.dateTime;
  if (fields.location !== undefined) patch.location = fields.location;
  if (fields.notes !== undefined) patch.notes = fields.notes;
  const { error } = await supabase.from("team_meetings").update(patch).eq("id", meetingId);
  if (error) throw new Error(error.message);
}

export async function deleteMeeting(teamId, meetingId) {
  const { error } = await supabase.from("team_meetings").delete().eq("id", meetingId);
  if (error) throw new Error(error.message);
}
