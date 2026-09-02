# Настройка собственного ключа Google Maps для Android

## Почему managed-ключ Lovable не подходит

Бесплатный управляемый ключ Google Maps от Lovable привязан к доменам `*.lovable.app` / `*.lovableproject.com` и работает только в веб-версии. В нативном Android-приложении (пакет `app.lovable.umnilisenok`) такого домена нет, поэтому нативная карта `@capacitor/google-maps` не получает разрешения и отображается белым экраном. Для Android нужен отдельный ключ с включённым **Maps SDK for Android**.

## Цель

Заставить нативную карту в родительском кабинете (`LocationMap.tsx`) работать в Android-сборке через собственный Google Maps API-ключ.

## План работ

### 1. Подготовка в Google Cloud Console

1.1. Открыть [Google Cloud Console](https://console.cloud.google.com/) и выбрать проект (или создать новый).

1.2. Включить биллинг — Maps SDK for Android требует привязанного способа оплаты, даже если расходы укладываются в бесплатный tier.

1.3. Включить API:
- Перейти в **APIs & Services → Library**.
- Найти и включить **Maps SDK for Android**.
- При необходимости включить также **Places API (New)** и **Routes API**, если используются поиск/маршруты через edge-функции.

1.4. Создать или открыть существующий API-ключ в **APIs & Services → Credentials → API keys**.

### 2. Настройка ограничений ключа

2.1. В разделе **Application restrictions** выбрать **Android apps**.

2.2. Добавить пакет приложения:
```
app.lovable.umnilisenok
```

2.3. Добавить SHA-1 fingerprint. Источник отпечатка зависит от способа установки:
- **Для APK, подписанного в Codemagic (`upload.keystore`)**: взять SHA-1 из лога шага `Print keystore SHA-1` в Codemagic.
- **Для релиза через Google Play**: дополнительно добавить SHA-1 из **Google Play Console → App integrity → App signing**.

2.4. В **API restrictions** ограничить ключ только нужными API:
- Maps SDK for Android
- Places API (New) (если используется)
- Routes API (если используется)

### 3. Обновление сборки в проекте

3.1. Убедиться, что `codemagic.yaml` ожидает переменную `GOOGLE_MAPS_ANDROID_API_KEY` и вставляет её в `AndroidManifest.xml` как `com.google.android.geo.API_KEY`. Текущий конфиг уже делает это через awk-скрипт.

3.2. Проверить, что в `capacitor.config.ts` плагин `GoogleMaps` присутствует (уже есть).

3.3. Проверить, что `LocationMap.tsx` передаёт пустой `apiKey` в нативном режиме, чтобы плагин брал ключ из манифеста (текущая реализация: `NATIVE_MAP_API_KEY` пустая строка по умолчанию).

### 4. Добавление секрета в Codemagic

4.1. В Codemagic открыть **Team / User settings → Secrets**.

4.2. Создать секрет с именем `GOOGLE_MAPS_ANDROID_API_KEY` и значением — созданным ключом из Google Cloud Console.

4.3. Добавить секрет в группу `google_maps` (уже подключена в `codemagic.yaml` через `environment.groups`).

### 5. Сборка и проверка

5.1. Запустить workflow `android-debug` или `android-release` в Codemagic.

5.2. В логах убедиться, что:
- шаг `Print keystore SHA-1` вывел SHA-1;
- шаг `Force required permissions and Maps API key in manifest` не выдал `Warning: GOOGLE_MAPS_ANDROID_API_KEY env variable is not set!`;
- в `AndroidManifest.xml` появилась строка `<meta-data android:name="com.google.android.geo.API_KEY" ... />`.

5.3. Установить свежий APK/AAB на телефон, удалив старую версию приложения.

5.4. Открыть родительский кабинет, перейти в раздел с картой и проверить, что карта загружается (не белый экран).

### 6. Диагностика на случай проблем

6.1. Если карта всё ещё белая — проверить в Android Studio / logcat ошибки вида `REQUEST_DENIED`, `API_KEY_HTTP_REFERRER_BLOCKED` или `API_KEY_SERVICE_BLOCKED`.

6.2. Убедиться, что SHA-1 в Google Cloud Console совпадает с тем, которым подписан APK/AAB.

6.3. Убедиться, что пакет в ограничениях ключа точно `app.lovable.umnilisenok`.

6.4. Убедиться, что Maps SDK for Android включён и на проекте активен биллинг.

## Что останется без изменений

- Веб-версия продолжит использовать managed-ключ Lovable или `VITE_GOOGLE_MAPS_NATIVE_KEY`/`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
- Edge-функции `places-proxy` и `directions-proxy` продолжат работать через gateway Lovable.
- Логика сбора геопозиции ребёнка не меняется.
