import "react-native-url-polyfill/auto";
import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { sessionStorage } from "./sessionStorage";

const STORAGE_KEY = "monument-capture-auth";
let client: SupabaseClient | undefined;

export function getSupabaseClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Login is not configured. Contact the project administrator.");
  client ??= createClient(url, key, { auth: {
    storage: sessionStorage, storageKey: STORAGE_KEY,
    ...(Platform.OS !== "web" ? { lock: processLock } : {}),
    autoRefreshToken: true, persistSession: true, detectSessionInUrl: false,
  } });
  return client;
}

/** Also clear local credentials if remote logout cannot complete. */
export async function clearLocalSession() {
  await sessionStorage.removeItem(STORAGE_KEY);
  await sessionStorage.removeItem(`${STORAGE_KEY}-user`);
  await sessionStorage.removeItem(`${STORAGE_KEY}-code-verifier`);
}
