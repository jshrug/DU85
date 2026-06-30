import { supabase, COHORT_ID } from "./supabase";

async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not signed in.");
  return user;
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

export function subscribeCohortChat(cb) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("cohort_messages")
      .select("*")
      .eq("cohort_id", COHORT_ID)
      .order("created_at", { ascending: true })
      .limit(100);
    if (active) cb((data || []).map(mapMessage));
  }

  fetch();

  const channel = supabase
    .channel(`cohort-chat-${COHORT_ID}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "cohort_messages",
      filter: `cohort_id=eq.${COHORT_ID}`,
    }, fetch)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function sendCohortMessage(text) {
  const user = await getCurrentUser();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message cannot be empty.");
  if (trimmed.length > 1000) throw new Error("Message too long (max 1000 characters).");

  const { data: member } = await supabase
    .from("members")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const displayName = member?.display_name || "Member";

  const { error } = await supabase.from("cohort_messages").insert({
    cohort_id: COHORT_ID,
    text: trimmed,
    created_by_uid: user.id,
    created_by_name: displayName,
  });
  if (error) throw new Error(error.message);
}

export async function deleteCohortMessage(messageId) {
  const { error } = await supabase.from("cohort_messages").delete().eq("id", messageId);
  if (error) throw new Error(error.message);
}
