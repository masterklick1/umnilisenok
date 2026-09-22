# Add project specific ProGuard rules here.

# 1. Отключаем тяжелую оптимизацию R8 (ускоряет запуск приложения)
-dontoptimize

# 2. Сохраняем классы и плагины Capacitor
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin

# 3. Сохраняем Google Maps и сервисы геолокации
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.location.** { *; }
-keep class com.equimaps.capacitor_background_geolocation.** { *; }

# 4. Полная защита сетевого стека, WebView и Supabase (убирает Failed to fetch)
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*, SourceFile, LineNumberTable
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Сетевые библиотеки OkHttp, Retrofit и Apache HTTP
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }
-keep class org.apache.http.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-dontwarn javax.annotation.**

# Защита Supabase / Kotlin Coroutines / Serialization (если используются в нативном коде)
-keep class io.supabase.** { *; }
-keep class kotlinx.serialization.** { *; }
-keep class kotlinx.coroutines.** { *; }

# 5. Сохраняем модели и сущности JSON
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
