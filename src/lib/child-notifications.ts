import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Локальные уведомления на устройстве ребёнка (только Android/iOS).
 * Используются для заряда батареи и школьного режима — тексты на русском.
 */

const CHANNELS = {
  battery: {
    id: "child-battery",
    name: "Заряд батареи",
    description: "Напоминание зарядить телефон, чтобы связь с родителем не пропала",
  },
  school: {
    id: "child-school-mode",
    name: "Школьный режим",
    description: "Сообщения о начале и окончании школьного времени",
  },
} as const;

type ChannelKey = keyof typeof CHANNELS;

const createdChannels = new Set<string>();

const ensureChannel = async (key: ChannelKey) => {
  const channel = CHANNELS[key];
  if (createdChannels.has(channel.id)) return channel.id;
  try {
    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: false,
      });
    }
    createdChannels.add(channel.id);
  } catch (e) {
    console.warn("Failed to create notification channel:", e);
  }
  return channel.id;
};

export const notifyChildDevice = async (
  key: ChannelKey,
  title: string,
  body: string,
): Promise<boolean> => {
  try {
    if (!Capacitor.isNativePlatform()) return false;

    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== "granted") return false;

    const channelId = await ensureChannel(key);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() % 2147483647),
          channelId,
          title,
          body,
        },
      ],
    });
    return true;
  } catch (e) {
    console.warn("Failed to show local notification:", e);
    return false;
  }
};

/* ---------- Батарея ---------- */

const BATTERY_THRESHOLDS = [20, 10, 5];
const BATTERY_STATE_KEY = "child-battery-notified-v1";

const readBatteryState = (): { level: number; at: number } | null => {
  try {
    const raw = localStorage.getItem(BATTERY_STATE_KEY);
    return raw ? (JSON.parse(raw) as { level: number; at: number }) : null;
  } catch {
    return null;
  }
};

/**
 * Показывает уведомление о низком заряде (20/10/5%), не чаще одного раза
 * на каждый порог и не чаще, чем раз в 30 минут. При зарядке молчим.
 */
export const maybeNotifyLowBattery = async (level: number | null, isCharging?: boolean) => {
  if (level === null || Number.isNaN(level)) return;

  const threshold = BATTERY_THRESHOLDS.find((t) => level <= t);

  if (threshold === undefined || isCharging) {
    // Заряд восстановлен или телефон на зарядке — разрешаем уведомить снова позже
    if (level > BATTERY_THRESHOLDS[0] || isCharging) {
      try {
        localStorage.removeItem(BATTERY_STATE_KEY);
      } catch {
        /* localStorage недоступен */
      }
    }
    return;
  }

  const prev = readBatteryState();
  if (prev && prev.level <= threshold && Date.now() - prev.at < 30 * 60_000) return;

  const shown = await notifyChildDevice(
    "battery",
    "🔋 Низкий заряд телефона",
    threshold <= 5
      ? `Осталось ${level}% — срочно поставь телефон на зарядку, иначе мама и папа тебя не увидят.`
      : `Осталось ${level}% — попроси взрослого поставить телефон на зарядку.`,
  );

  if (shown) {
    try {
      localStorage.setItem(BATTERY_STATE_KEY, JSON.stringify({ level: threshold, at: Date.now() }));
    } catch {
      /* localStorage недоступен */
    }
  }
};

/* ---------- Школьный режим ---------- */

const SCHOOL_STATE_KEY = "child-school-mode-notified-v1";

const formatTime = (t: string) => (t ? t.slice(0, 5) : "");

/**
 * Уведомляет один раз при начале и один раз при окончании школьного времени.
 */
export const notifySchoolModeChange = async (blocked: boolean, endTime: string) => {
  let prev: string | null = null;
  try {
    prev = localStorage.getItem(SCHOOL_STATE_KEY);
  } catch {
    /* localStorage недоступен */
  }

  const next = blocked ? "on" : "off";
  if (prev === next) return;

  // Первый запуск вне школьного времени — просто запоминаем, не шумим
  if (prev === null && !blocked) {
    try {
      localStorage.setItem(SCHOOL_STATE_KEY, next);
    } catch {
      /* localStorage недоступен */
    }
    return;
  }

  const shown = await notifyChildDevice(
    "school",
    blocked ? "🏫 Время уроков" : "🎒 Уроки закончились",
    blocked
      ? `Игры и занятия в приложении закрыты${endTime ? ` до ${formatTime(endTime)}` : ""}. Кнопка SOS работает всегда.`
      : "Школьное время закончилось — занятия и игры снова открыты!",
  );

  if (shown || !Capacitor.isNativePlatform()) {
    try {
      localStorage.setItem(SCHOOL_STATE_KEY, next);
    } catch {
      /* localStorage недоступен */
    }
  }
};
