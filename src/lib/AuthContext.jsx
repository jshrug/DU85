import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    let settled = false;
    const finish = (u) => { settled = true; setUser(u); };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
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
    supabase?.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
