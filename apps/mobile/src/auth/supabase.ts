// Supabase client for the mobile app (auth only). Sessions persist in
// expo-secure-store. When EXPO_PUBLIC_SUPABASE_* is absent the client is null and
// the app runs fully local/anonymous (free tier, ADR-002) — login is optional and
// only unlocks Pro/cloud.
import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** SecureStore-backed storage adapter for supabase-js session persistence. */
const SecureStorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** The Supabase client, or null when auth isn't configured (app stays local). */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: SecureStorageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/** True when Supabase auth is configured for this build. */
export const isAuthConfigured = supabase !== null;
