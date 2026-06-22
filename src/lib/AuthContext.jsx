import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const AuthContext = createContext(null);

function checkUser(session) {
  if (!session) return { user: null };
  return { user: session.user };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    // Subscribe FIRST — getSession() after, or the SIGNED_IN event from a
    // magic-link redirect fires before the listener is attached and gets lost.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(checkUser(session).user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(checkUser(session).user);
    });

    return () => subscription.unsubscribe();
  }, []);

  function sendMagicLink(email) {
    if (!supabase) return Promise.reject(new Error("Supabase not configured."));
    return supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
  }

  function signOut() {
    supabase?.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, sendMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
