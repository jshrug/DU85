import { supabase } from "./supabase";

export function subscribeIsAdmin(cb) {
  let uid = null;
  let adminChannel = null;

  async function checkAdmin() {
    if (!uid) { cb(false); return; }
    const { data } = await supabase
      .from("admins")
      .select("enabled")
      .eq("id", uid)
      .single();
    cb(!!data?.enabled);
  }

  function subscribeAdminDoc(newUid) {
    if (adminChannel) { supabase.removeChannel(adminChannel); adminChannel = null; }
    if (!newUid) return;
    adminChannel = supabase
      .channel(`admin-doc-${newUid}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "admins",
        filter: `id=eq.${newUid}`,
      }, checkAdmin)
      .subscribe();
  }

  supabase.auth.getSession().then(({ data: { session } }) => {
    uid = session?.user?.id ?? null;
    subscribeAdminDoc(uid);
    checkAdmin();
  });

  const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_, session) => {
    const newUid = session?.user?.id ?? null;
    if (newUid !== uid) {
      uid = newUid;
      subscribeAdminDoc(uid);
      checkAdmin();
    }
  });

  return () => {
    authSub.unsubscribe();
    if (adminChannel) supabase.removeChannel(adminChannel);
  };
}
