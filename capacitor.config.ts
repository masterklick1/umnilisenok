import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.86978e2af29e452288743ecba72c9930",
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
  },
};

export default config;

