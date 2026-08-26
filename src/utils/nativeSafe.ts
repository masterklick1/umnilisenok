// Утилиты для безопасных вызовов нативных плагинов.
// Используйте runNative(() => { ... }) для побочных эффектов,
// runNativeOr(() => ..., fallback) для получения значения с безопасным fallback.
import { Capacitor } from "@capacitor/core";

export async function runNative(fn: () => Promise<void> | void): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await Promise.resolve(fn());
  } catch (err) {
    // Логируем как warning — плагин отсутствует / отказ — пропускаем.
    // Это ключевое поведение: приложение не должно падать.
    // eslint-disable-next-line no-console
    console.warn("Plugin error skipped:", err);
  }
}

export async function runNativeOr<T>(fn: () => Promise<T> | T, fallback: T): Promise<T> {
  try {
    if (!Capacitor.isNativePlatform()) return fallback;
    return await Promise.resolve(fn());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Plugin error skipped:", err);
    return fallback;
  }
}
