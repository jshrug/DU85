import { supabase } from "./supabase";

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
