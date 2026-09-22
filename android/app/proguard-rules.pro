# Add project specific ProGuard rules here.

# Сохраняем классы и плагины Capacitor
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin

# Сохраняем Google Maps и сервисы геолокации
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.location.** { *; }
-keep class com.equimaps.capacitor_background_geolocation.** { *; }

# Сохраняем работы с WebView и JavaScript interfaces
-keepattributes *Annotation*,Signature,InnerClasses,SourceFile,LineNumberTable
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Сохраняем модели и сущности
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
