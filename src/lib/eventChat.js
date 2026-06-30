import { supabase } from "./supabase";

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

export function subscribeEventChat(eventId, cb) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("event_messages")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .limit(50);
    if (active) cb((data || []).map(mapMessage));
  }

  fetch();

  const channel = supabase
    .channel(`event-chat-${eventId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "event_messages",
      filter: `event_id=eq.${eventId}`,
    }, fetch)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function sendEventMessage(eventId, text) {
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

  const { error } = await supabase.from("event_messages").insert({
    event_id: eventId,
    text: trimmed,
    created_by_uid: user.id,
    created_by_name: displayName,
  });
  if (error) throw new Error(error.message);
}

export async function deleteEventMessage(eventId, messageId) {
  const { error } = await supabase.from("event_messages").delete().eq("id", messageId);
  if (error) throw new Error(error.message);
}
