export const PIN_KEY = "settings.parentPin";
export const PIN_UNLOCK_KEY = "parentPinUnlocked";

export const getStoredPin = (): string | null => {
  if (typeof window === "undefined") return null;
  const pin = localStorage.getItem(PIN_KEY);
  return pin && /^\d{4}$/.test(pin) ? pin : null;
};

export const isParentPinUnlocked = (): boolean => {
  if (typeof window === "undefined") return true;
  if (!getStoredPin()) return true;
  return sessionStorage.getItem(PIN_UNLOCK_KEY) === "true";
};

export const unlockParentPin = (): void => {
  sessionStorage.setItem(PIN_UNLOCK_KEY, "true");
};

export const lockParentPin = (): void => {
  sessionStorage.removeItem(PIN_UNLOCK_KEY);
};
