import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BCp-2vIxJ4Rbjk0Zk-1cPN6OCw5O1XFPKmrkVbA7X6nm5lk1Dum59dpnQUt1d6MUPFB0YuN4WvkJuBfTaNIx5Q8";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  typeof Notification !== "undefined";

export const getPushPermission = (): NotificationPermission => {
  if (!isPushSupported()) return "denied";
  try {
    return Notification.permission;
  } catch (e) {
    console.warn("Plugin error skipped:", e);
    return "denied";
  }
};

export const ensureServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.warn("Plugin error skipped:", e);
    return null;
  }
};

export const subscribeToPush = async (userId: string): Promise<boolean> => {
  try {
    if (!isPushSupported()) return false;
    
    let permission: NotificationPermission = "denied";
    try {
      permission = await Notification.requestPermission();
    } catch (e) {
      console.warn("Plugin error skipped:", e);
      return false;
    }
    
    if (permission !== "granted") return false;

    const reg = await ensureServiceWorker();
    if (!reg) return false;

    try {
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys) return false;

      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh!,
          auth: json.keys.auth!,
          user_agent: navigator.userAgent,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

      return true;
    } catch (e) {
      console.warn("Plugin error skipped:", e);
      return false;
    }
  } catch (e) {
    console.warn("Plugin error skipped:", e);
    return false;
  }
};

export const unsubscribeFromPush = async () => {
  try {
    if (!isPushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      try {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      } catch (e) {
        console.warn("Plugin error skipped:", e);
      }
      try {
        await sub.unsubscribe();
      } catch (e) {
        console.warn("Plugin error skipped:", e);
      }
    }
  } catch (e) {
    console.warn("Plugin error skipped:", e);
  }
};

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  endpoint: string | null;
  lastSyncedAt: string | null;
  matchesCurrentUser: boolean;
}

export const getPushStatus = async (userId?: string): Promise<PushStatus> => {
  try {
    if (!isPushSupported()) {
      return {
        supported: false,
        permission: "unsupported",
        subscribed: false,
        endpoint: null,
        lastSyncedAt: null,
        matchesCurrentUser: false,
      };
    }

    let permission: NotificationPermission = "denied";
    try {
      permission = Notification.permission;
    } catch (e) {
      console.warn("Plugin error skipped:", e);
      return {
        supported: false,
        permission: "unsupported",
        subscribed: false,
        endpoint: null,
        lastSyncedAt: null,
        matchesCurrentUser: false,
      };
    }

    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();

    if (!sub) {
      return {
        supported: true,
        permission,
        subscribed: false,
        endpoint: null,
        lastSyncedAt: null,
        matchesCurrentUser: false,
      };
    }

    let lastSyncedAt: string | null = null;
    let matchesCurrentUser = false;
    if (userId) {
      try {
        const { data } = await supabase
          .from("push_subscriptions")
          .select("last_synced_at, user_id")
          .eq("endpoint", sub.endpoint)
          .maybeSingle();
        lastSyncedAt = (data as any)?.last_synced_at ?? null;
        matchesCurrentUser = data?.user_id === userId;
      } catch (e) {
        console.warn("Plugin error skipped:", e);
      }
    }

    return {
      supported: true,
      permission,
      subscribed: true,
      endpoint: sub.endpoint,
      lastSyncedAt,
      matchesCurrentUser,
    };
  } catch (e) {
    console.warn("Plugin error skipped:", e);
    return {
      supported: false,
      permission: "unsupported",
      subscribed: false,
      endpoint: null,
      lastSyncedAt: null,
      matchesCurrentUser: false,
    };
  }
};
