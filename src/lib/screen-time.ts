// Device-local screen time settings & usage counter.
const LIMIT_KEY = "screenTimeLimitMin"; // 0 = no limit
const LOGIN_NOTIFY_KEY = "loginNotifyEnabled";
const usageKey = () => `screenTimeUsed:${new Date().toISOString().slice(0, 10)}`;

export const getLimitMinutes = () => Number(localStorage.getItem(LIMIT_KEY) || 0);
export const setLimitMinutes = (m: number) => {
  localStorage.setItem(LIMIT_KEY, String(m));
  window.dispatchEvent(new Event("screentime-change"));
};
export const getUsedSeconds = () => Number(localStorage.getItem(usageKey()) || 0);
export const addUsedSeconds = (s: number) =>
  localStorage.setItem(usageKey(), String(getUsedSeconds() + s));
export const resetUsageToday = () => {
  localStorage.removeItem(usageKey());
  window.dispatchEvent(new Event("screentime-change"));
};
export const isLoginNotifyEnabled = () => localStorage.getItem(LOGIN_NOTIFY_KEY) !== "false";
export const setLoginNotifyEnabled = (v: boolean) => localStorage.setItem(LOGIN_NOTIFY_KEY, String(v));
