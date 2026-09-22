# Add project specific ProGuard rules here.

# 1. Отключаем лишнюю оптимизацию R8 (ускоряет запуск приложения)
-dontoptimize

# 2. Сохраняем классы и плагины Capacitor
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin

# 3. Сохраняем Google Maps и сервисы геолокации
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.location.** { *; }
-keep class com.equimaps.capacitor_background_geolocation.** { *; }

# 4. Сохраняем работу с WebView, JavaScript interfaces и сетевым стеком (убирает Failed to fetch)
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*, SourceFile, LineNumberTable
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-dontwarn javax.annotation.**

# 5. Сохраняем модели и сущности
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
