import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const AuthContext = createContext(null);

// Where the reset-password email link sends people back to. Hardcoded to
// production so the link always lands on the live site (which is the address
// Supabase already allows), no matter where the request was made from.
const RESET_REDIRECT_URL = "https://www.duemba85.com";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [recovery, setRecovery] = useState(false); // true after a reset link is clicked

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    let settled = false;
    const finish = (u) => { settled = true; setUser(u); };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // A clicked reset link signs the user into a temporary recovery session
      // and fires PASSWORD_RECOVERY. Flag it so the UI shows "set new password"
      // instead of dropping them straight into the app.
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      finish(session?.user ?? null);
    });

    // getSession reads the persisted session from local storage first, so a
    // previously signed-in user still gets in even if the network is blocked.
    supabase.auth.getSession()
      .then(({ data: { session } }) => finish(session?.user ?? null))
      .catch(() => finish(null));

    // Fail-safe: if auth never answers (e.g. a school/corporate firewall stalls
    // Supabase), never hang on the loading spinner. Fall through to the app.
    const t = setTimeout(() => { if (!settled) setUser(null); }, 8000);

    return () => { clearTimeout(t); subscription.unsubscribe(); };
  }, []);

  function signUp(email, password) {
    if (!supabase) return Promise.reject(new Error("Supabase not configured."));
    return supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
  }

  function signIn(email, password) {
    if (!supabase) return Promise.reject(new Error("Supabase not configured."));
    return supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
  }

  function signOut() {
    setRecovery(false);
    supabase?.auth.signOut();
  }

  // Step 1 of reset: email the user a recovery link (via Supabase's built-in
  // email sender). Returns the Supabase { error } shape like signIn/signUp.
  function resetPassword(email) {
    if (!supabase) return Promise.reject(new Error("Supabase not configured."));
    return supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: RESET_REDIRECT_URL,
    });
  }

  // Step 2 of reset: set the new password for the recovery session created when
  // the user clicked the link. Clears the recovery flag on success.
  async function updatePassword(password) {
    if (!supabase) return { error: new Error("Supabase not configured.") };
    const result = await supabase.auth.updateUser({ password });
    if (!result.error) setRecovery(false);
    return result;
  }

  return (
    <AuthContext.Provider
      value={{ user, recovery, signUp, signIn, signOut, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
