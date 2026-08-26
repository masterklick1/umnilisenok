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
const appManifest = join(root, "android/app/src/main/AndroidManifest.xml");

const REQUIRED_PERMISSIONS = [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
];

const FGS_SERVICE_BLOCK = `        <service
            android:name="com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location"
            android:stopWithTask="false"
            tools:node="replace" />
`;

function ensureAppManifest() {
  if (!existsSync(appManifest)) {
    console.log("Skip app AndroidManifest patch: android platform not generated yet");
    return;
  }

  let xml = readFileSync(appManifest, "utf8");
  let changed = false;

  if (!xml.includes("xmlns:tools=")) {
    xml = xml.replace(
      "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\"",
      "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\"\n    xmlns:tools=\"http://schemas.android.com/tools\"",
    );
    changed = true;
  }

  for (const perm of REQUIRED_PERMISSIONS) {
    if (!xml.includes(perm)) {
      xml = xml.replace(
        /<manifest([^>]*)>/,
        (m) => `${m}\n    <uses-permission android:name="${perm}" />`,
      );
      changed = true;
    }
  }

  if (!xml.includes("BackgroundGeolocationService")) {
    if (xml.includes("</application>")) {
      xml = xml.replace("</application>", `${FGS_SERVICE_BLOCK}    </application>`);
      changed = true;
    }
  } else if (!xml.includes('android:foregroundServiceType="location"')) {
    xml = xml.replace(
      /<service([^>]*BackgroundGeolocationService[^>]*)(\/>|>)/,
      '<service$1 android:foregroundServiceType="location"$2',
    );
    changed = true;
  }

  if (changed) {
    writeFileSync(appManifest, xml);
    console.log("Patched android/app/src/main/AndroidManifest.xml (permissions + location FGS)");
  } else {
    console.log("android/app/src/main/AndroidManifest.xml already has location permissions and FGS type");
  }
}

ensureAppManifest();

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

const appStrings = join(root, "android/app/src/main/res/values/strings.xml");

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
