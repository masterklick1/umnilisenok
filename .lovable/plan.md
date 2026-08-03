# План: проверка codemagic.yaml и генерации иконки для Android

## Цель
Убедиться, что при сборке в Codemagic из исходников в `resources/` генерируется нормальная иконка приложения на Android (обычная + адаптивная), и дать пользователю чёткие шаги для пересборки.

## Текущее состояние (подтверждёно по файлам)
- В `resources/` есть:
  - `icon.png` 1024×1024
  - `splash.png` / `splash-dark.png` 2732×2732
  - `icon-foreground.png` — лиса на прозрачном фоне
  - `icon-background.png` — сплошной цвет `#FFCD3C`
- `capacitor.config.ts` корректен: `appId`, `webDir: dist`, продакшн-режим (server.url закомментирован).
- `codemagic.yaml` содержит два workflow: `android-release` и `android-debug`. Оба включают шаг генерации иконок через `@capacitor/assets`.

## Что нужно проверить / исправить
1. **Порядок шагов генерации иконок**
   - Генерация `@capacitor/assets` должна идти **после** `npx cap sync android`, но **до** сборки Gradle. Сейчас так и есть, но убедимся, что `cap sync` не перезапишет сгенерированные ресурсы.

2. **Команда генерации иконок**
   - Текущая: `npx --yes @capacitor/assets generate --android --assetPath resources ...`
   - Проверим, достаточно ли флагов для адаптивной иконки. При необходимости добавим `--androidIconPath` или уточним пути.

3. **Патч `build.gradle` для релизной подписи**
   - Проверим, что `awk`-скрипт корректно вставляет `signingConfigs.release` и прикрепляет его к `buildTypes.release`. Сейчас скрипт ищет `buildTypes {` и добавляет `signingConfig signingConfigs.release` после `minifyEnabled`, что может быть ненадёжно. При необходимости заменим на более точный `sed`/`awk`.

4. **Инъекция разрешений в `AndroidManifest.xml`**
   - Убедимся, что `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `POST_NOTIFICATIONS`, `CAMERA`, `RECORD_AUDIO` добавляются после открывающего тега `<manifest>` и не дублируются при повторных запусках.

5. **Настройка Google Maps API key в AndroidManifest.xml**
   - Для нативных карт `@capacitor/google-maps` требуется `com.google.android.geo.API_KEY`. Проверим, есть ли шаг вставки ключа из переменных окружения Codemagic.

6. **Итоговая инструкция для пользователя**
   - После правок: `git pull`, запуск workflow в Codemagic, скачивание APK/AAB.

## Результат
- Пользователь получит исправленный `codemagic.yaml`.
- Иконка и сплеш-экран будут генерироваться автоматически при сборке.
- Подпись релизного AAB и разрешения будут настроены корректно.
