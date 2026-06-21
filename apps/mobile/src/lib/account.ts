// Account / data deletion (DPA right to erasure). Wipes all on-device data: the
// SQLite tables, the at-rest encryption key (so any leftover ciphertext is
// unrecoverable), and local usage counters. The cloud account (if signed in) is
// deleted separately via the /api/account/delete endpoint (see api-client).
import * as SecureStore from "expo-secure-store";
import { wipeAllData } from "../db/client";

// Keys this app writes to the secure store. The encryption key MUST go so old
// ciphertext can never be read again.
const SECURE_KEYS = [
  "otto.encryption.key.v1",
  "otto.launchCount.v1",
  "otto.proOfferShown.v1",
];

/** Erase all locally stored data (DB rows + secure-store keys). Best-effort. */
export async function wipeLocalData(): Promise<void> {
  try {
    wipeAllData();
  } catch {
    // table wipe failed (e.g., DB not open) — continue clearing keys anyway
  }
  await Promise.all(
    SECURE_KEYS.map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)),
  );
}
