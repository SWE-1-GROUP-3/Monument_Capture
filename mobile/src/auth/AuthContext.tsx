import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";

import { registerSignOut, setAuthenticatedUser, useCurrentUser } from "../demo/store";
import type { User } from "../demo/types";
import { loadCurrentUser } from "../api/client";
import { clearLocalSession, getSupabaseClient } from "./supabase";

type AuthContextType = {
  isLoggedIn: boolean;
  user: User | undefined;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const loginPending = useRef(false);
  const loggedOut = useRef(false);
  const logoutPending = useRef(false);

  async function synchronize(session: Session | null) {
    const attempt = ++generation.current;
    setAuthenticatedUser(null);
    setLoading(true);
    try {
      const current = session ? await loadCurrentUser(session.access_token) : null;
      if (attempt !== generation.current) return false;
      setAuthenticatedUser(current);
      setError(null);
      return current !== null;
    } catch (e) {
      if (attempt === generation.current) setError(e instanceof Error ? e.message : "Account verification failed.");
      return false;
    } finally {
      if (attempt === generation.current) setLoading(false);
    }
  }

  useEffect(() => { registerSignOut(logout); return () => registerSignOut(undefined); }, []);

  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};
    let removeAppState = () => {};
    setAuthenticatedUser(null);
    try {
      const client = getSupabaseClient();
      const initialGeneration = generation.current;
      void client.auth.getSession().then(({ data, error: failure }) => {
        if (!alive || generation.current !== initialGeneration) return;
        if (failure) { setError("Could not restore your session. Please log in again."); setLoading(false); }
        else void synchronize(data.session);
      }).catch(() => { if (alive) { setLoading(false); setError("Could not restore your session."); } });
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (!alive || event === "INITIAL_SESSION" || loginPending.current) return;
        if (event === "SIGNED_OUT") { loggedOut.current = true; ++generation.current; setAuthenticatedUser(null); setLoading(false); return; }
        if (loggedOut.current) return;
        // Do not await provider methods from the SDK callback (its auth lock is held).
        void synchronize(session);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      if (Platform.OS !== "web") {
        if (AppState.currentState === "active") client.auth.startAutoRefresh();
        const listener = AppState.addEventListener("change", state => {
          if (state === "active") client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh();
        });
        removeAppState = () => { listener.remove(); client.auth.stopAutoRefresh(); };
      }
    } catch { setLoading(false); }
    return () => { alive = false; ++generation.current; unsubscribe(); removeAppState(); };
  }, []);

  async function login(email: string, password: string) {
    if (logoutPending.current) { setError("Finishing sign out. Please retry in a moment."); return false; }
    if (loginPending.current) return false;
    loginPending.current = true;
    loggedOut.current = false;
    const attempt = ++generation.current;
    setAuthenticatedUser(null);
    setLoading(true);
    setError(null);
    try {
      const client = getSupabaseClient();
      const { data, error: failure } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (attempt !== generation.current || loggedOut.current) return false;
      if (failure || !data.session) throw new Error("Invalid email or password.");
      if (Platform.OS === "web" || AppState.currentState === "active") client.auth.startAutoRefresh();
      return await synchronize(data.session);
    } catch (e) {
      if (attempt !== generation.current) return false;
      setError(e instanceof Error ? e.message : "Could not log in. Please retry.");
      setLoading(false);
      return false;
    } finally { loginPending.current = false; }
  }

  async function logout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    loggedOut.current = true;
    ++generation.current;
    setAuthenticatedUser(null);
    setLoading(false);
    setError(null);
    try {
      const client = getSupabaseClient();
      client.auth.stopAutoRefresh();
      const { error: failure } = await client.auth.signOut({ scope: "local" });
      if (failure) throw failure;
    } catch { setError("Signed out on this device. Remote logout could not be confirmed."); }
    finally {
      try { await clearLocalSession(); }
      catch { setError("Could not clear saved credentials. Clear this app's storage before sharing the device."); }
      finally { logoutPending.current = false; }
    }
  }

  return <AuthContext.Provider value={{ isLoggedIn: !!user, user, loading, error, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
