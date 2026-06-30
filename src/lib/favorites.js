import { supabase } from "./supabase";

export function subscribeFavorites(onChange) {
  let active = true;
  let channel = null;

  supabase.auth.getSession().then(({ data: { session } }) => {
    const uid = session?.user?.id;
    if (!uid) { onChange(new Set()); return; }

    async function fetch() {
      const { data } = await supabase
        .from("user_favorites")
        .select("explore_id")
        .eq("uid", uid);
      if (active) onChange(new Set((data || []).map((r) => r.explore_id)));
    }

    fetch();

    channel = supabase
      .channel(`favorites-${uid}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_favorites",
        filter: `uid=eq.${uid}`,
      }, fetch)
      .subscribe();
  });

  return () => {
    active = false;
    if (channel) supabase.removeChannel(channel);
  };
}

export async function toggleFavorite(exploreId, isFavorited) {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return false;

  if (isFavorited) {
    if (!window.confirm("Remove this place from your favorites?")) return false;
    await supabase.from("user_favorites").delete().match({ explore_id: exploreId, uid });
  } else {
    await supabase.from("user_favorites").insert({ explore_id: exploreId, uid });
  }
  return true;
}
