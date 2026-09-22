# Add project specific ProGuard rules here.

# Отключаем тяжелую оптимизацию R8, чтобы ускорить запуск приложения (при этом обфускация и сжатие остаются)
-dontoptimize

# Сохраняем классы и плагины Capacitor
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin

# Сохраняем Google Maps и сервисы геолокации
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.location.** { *; }
-keep class com.equimaps.capacitor_background_geolocation.** { *; }

# Сохраняем работу с WebView и JavaScript interfaces
-keepattributes *Annotation*,Signature,InnerClasses,SourceFile,LineNumberTable,EnclosingMethod
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Сохраняем модели и сущности
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
