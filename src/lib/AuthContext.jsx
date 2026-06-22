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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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
