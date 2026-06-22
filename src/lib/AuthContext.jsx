import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const AuthContext = createContext(null);

const ALLOWED_DOMAIN = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || "du.edu").toLowerCase();

function checkUser(session) {
  if (!session) return { user: null, wrongDomain: false };
  const email = (session.user.email || "").toLowerCase();
  if (!email.endsWith("@" + ALLOWED_DOMAIN)) return { user: null, wrongDomain: true };
  return { user: session.user, wrongDomain: false };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [wrongDomain, setWrongDomain] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const result = checkUser(session);
      if (result.wrongDomain) supabase.auth.signOut();
      setWrongDomain(result.wrongDomain);
      setUser(result.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const result = checkUser(session);
      if (result.wrongDomain) supabase.auth.signOut();
      setWrongDomain(result.wrongDomain);
      setUser(result.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  function sendMagicLink(email) {
    if (!supabase) return Promise.reject(new Error("Supabase not configured."));
    const clean = email.trim().toLowerCase();
    if (!clean.endsWith("@" + ALLOWED_DOMAIN)) {
      return Promise.reject(new Error(`Only @${ALLOWED_DOMAIN} addresses are allowed.`));
    }
    return supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin },
    });
  }

  function signOut() {
    supabase?.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, wrongDomain, sendMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
