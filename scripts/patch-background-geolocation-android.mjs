#!/usr/bin/env node
/**
 * Post-install / CI helper for @capacitor-community/background-geolocation.
 *
 * 1. startForeground() must pass FOREGROUND_SERVICE_TYPE_LOCATION on Android 10+
 *    (required when targeting SDK 34+; otherwise the ongoing notification never appears).
 * 2. The service must declare android:foregroundServiceType="location".
 * 3. App strings.xml names the notification channel; default icon keeps tap → open app.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const serviceFile = join(
  root,
  "node_modules/@capacitor-community/background-geolocation/android/src/main/java/com/equimaps/capacitor_background_geolocation/BackgroundGeolocationService.java",
);
const pluginManifest = join(
  root,
  "node_modules/@capacitor-community/background-geolocation/android/src/main/AndroidManifest.xml",
);
const appStrings = join(root, "android/app/src/main/res/values/strings.xml");

const START_FOREGROUND_TYPED = `if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        startForeground(NOTIFICATION_ID, backgroundNotification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
                    } else {
                        startForeground(NOTIFICATION_ID, backgroundNotification);
                    }`;

if (existsSync(serviceFile)) {
  let src = readFileSync(serviceFile, "utf8");
  if (!src.includes("FOREGROUND_SERVICE_TYPE_LOCATION")) {
    if (!src.includes("android.content.pm.ServiceInfo")) {
      src = src.replace(
        "import android.app.Service;",
        "import android.app.Service;\nimport android.content.pm.ServiceInfo;",
      );
    }
    if (!src.includes("import android.os.Build;")) {
      src = src.replace("import android.os.Binder;", "import android.os.Binder;\nimport android.os.Build;");
    }
    src = src.replace(
      "startForeground(NOTIFICATION_ID, backgroundNotification);",
      START_FOREGROUND_TYPED,
    );
    writeFileSync(serviceFile, src);
    console.log("Patched BackgroundGeolocationService.startForeground with LOCATION type");
  } else {
    console.log("BackgroundGeolocationService already declares FOREGROUND_SERVICE_TYPE_LOCATION");
  }
} else {
  console.log("Skip FGS Java patch: plugin source not found");
}

if (existsSync(pluginManifest)) {
  let xml = readFileSync(pluginManifest, "utf8");
  if (xml.includes("BackgroundGeolocationService") && !xml.includes("foregroundServiceType")) {
    xml = xml.replace(
      /<service([^>]*android:name="[^"]*BackgroundGeolocationService"[^>]*)\/>/,
      '<service$1 android:foregroundServiceType="location" />',
    );
    xml = xml.replace(
      /<service([^>]*android:name="[^"]*BackgroundGeolocationService"[^>]*)>/,
      '<service$1 android:foregroundServiceType="location">',
    );
    writeFileSync(pluginManifest, xml);
    console.log("Patched plugin AndroidManifest with foregroundServiceType=location");
  } else {
    console.log("Plugin AndroidManifest already has foregroundServiceType or no service tag");
  }
}

const CHANNEL_NAME_TAG =
  '    <string name="capacitor_background_geolocation_notification_channel_name">Геолокация активна</string>';
const CHANNEL_ICON_TAG =
  '    <string name="capacitor_background_geolocation_notification_icon">mipmap/ic_launcher</string>';

if (existsSync(appStrings)) {
  let strings = readFileSync(appStrings, "utf8");
  let changed = false;
  if (!strings.includes("capacitor_background_geolocation_notification_channel_name")) {
    strings = strings.replace("</resources>", `${CHANNEL_NAME_TAG}\n${CHANNEL_ICON_TAG}\n</resources>`);
    changed = true;
  }
  if (changed) {
    writeFileSync(appStrings, strings);
    console.log("Patched android strings.xml with background-geolocation channel name and icon");
  } else {
    console.log("android strings.xml already has background-geolocation channel resources");
  }
} else {
  console.log("Skip strings.xml patch: android platform not generated yet");
}
