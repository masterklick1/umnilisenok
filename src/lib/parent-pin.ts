import { supabase } from "@/integrations/supabase/client";

// The PIN itself is never stored on the device. Only a salted SHA-256 hash is
// sent to the server, where it is kept in a table that no client can read.
// Verification happens server-side through a security definer function.

export const PIN_UNLOCK_KEY = "parentPinUnlocked";
const LEGACY_PIN_KEY = "settings.parentPin";

const hashPin = async (userId: string, pin: string): Promise<string> => {
  const data = new TextEncoder().encode(`umnilisenok:${userId}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** Removes any legacy plaintext PIN left in localStorage by older versions. */
export const purgeLegacyPin = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_PIN_KEY);
};

/** True when the signed-in parent has a PIN configured on the server. */
export const hasParentPin = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc("has_parent_pin");
  if (error) return false;
  return data === true;
};

export const setParentPin = async (userId: string, pin: string): Promise<boolean> => {
  if (!/^\d{4}$/.test(pin)) return false;
  const { error } = await supabase.rpc("set_parent_pin", { p_hash: await hashPin(userId, pin) });
  if (!error) purgeLegacyPin();
  return !error;
};

export const clearParentPin = async (): Promise<boolean> => {
  const { error } = await supabase.rpc("clear_parent_pin");
  if (!error) {
    purgeLegacyPin();
    lockParentPin();
  }
  return !error;
};

/** Server-side PIN verification — the correct PIN never reaches the client. */
export const verifyParentPin = async (userId: string, pin: string): Promise<boolean> => {
  if (!/^\d{4}$/.test(pin)) return false;
  const { data, error } = await supabase.rpc("verify_parent_pin", {
    p_hash: await hashPin(userId, pin),
  });
  return !error && data === true;
};

export const isParentPinUnlocked = (): boolean => {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PIN_UNLOCK_KEY) === "true";
};

export const unlockParentPin = (): void => {
  sessionStorage.setItem(PIN_UNLOCK_KEY, "true");
};

export const lockParentPin = (): void => {
  sessionStorage.removeItem(PIN_UNLOCK_KEY);
};
