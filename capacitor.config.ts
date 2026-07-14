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
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      androidScaleType: "CENTER_CROP",
    },
    BackgroundGeolocation: {
      androidNotificationTitle: "Умный Лисёнок отслеживает геопозицию",
      androidNotificationText: "Нажмите, чтобы закрыть отслеживание",
      androidNotificationIconName: "ic_stat_name",
      androidForegroundServiceType: "location",
    },
    // Ключ для нативной Google Maps SDK для Android/iOS.
    // Android: значение читается из meta-data com.google.android.geo.API_KEY
    // в AndroidManifest.xml (см. codemagic.yaml — awk-инъекция).
    // Здесь поле оставлено для документации — реальный ключ подставляется в манифест.
    GoogleMaps: {},
  },
};

export default config;
