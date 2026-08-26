import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.umnilisenok",
  appName: "umnilisenok",
  webDir: "dist",
  // ⚠️ Для продакшн-сборки (Google Play и др.) server.url должен быть выключен —
  // приложение обязано грузить локальный dist/, а не внешний URL.
  // Раскомментируйте только для локальной разработки с hot-reload на телефоне:
  // server: {
  //   url: "https://86978e2a-f29e-4522-8874-3ecba72c9930.lovableproject.com?forceHideBadge=true",
  //   cleartext: true,
  // },
  android: {
    // Required by @capacitor-community/background-geolocation so location
    // updates do not halt after ~5 minutes in the background.
    useLegacyBridge: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      androidScaleType: "CENTER_CROP",
    },
    // Persistent FGS notification copy is passed to BackgroundGeolocation.addWatcher
    // (backgroundTitle / backgroundMessage). This plugin does not read
    // androidNotificationTitle from Capacitor config.
    LocalNotifications: {
      iconColor: "#E67E22",
    },
  },
};

export default config;
