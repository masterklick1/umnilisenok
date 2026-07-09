## Что уже готово в репо
- `capacitor.config.ts` — production-режим (без `server.url`) ✅
- `codemagic.yaml` — workflow `android-release` (AAB) и `android-debug` (APK) ✅

## Что нужно доделать, чтобы Codemagic реально собрал APK/AAB

### 1. Локально сгенерировать папку `android/` и закоммитить
Codemagic может сам вызвать `npx cap add android`, но тогда у вас не будет контроля над `applicationId`, иконками, `google-services.json`, версией. Правильно — сгенерировать один раз локально:
```
git pull
npm install
npm run build
npx cap add android
npx cap sync android
git add android/ capacitor.config.ts codemagic.yaml
git commit -m "chore: add android platform"
git push
```

### 2. Keystore для подписи (обязательно для AAB в Google Play)
```
keytool -genkey -v -keystore upload.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
Загрузить в Codemagic → **Teams → Integrations → Code signing identities → Android keystores**:
- Reference name: `umnilisenok_keystore` (именно так — на него ссылается `codemagic.yaml`)
- Alias: `upload`
- Ввести оба пароля

### 3. Настроить подпись release-сборки в `android/app/build.gradle`
Codemagic пробрасывает keystore через env-переменные `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD`. В `android/app/build.gradle` нужно добавить блок `signingConfigs.release`, читающий их, и подключить его в `buildTypes.release`. Без этого `bundleRelease` соберёт **неподписанный** AAB, и Play Console его отклонит.

Я сделаю это автоматически post-generation (шаг в codemagic.yaml, который патчит `build.gradle` перед сборкой) — так вам не придётся править Gradle руками.

### 4. Иконка и splash приложения
Пока Capacitor поставит дефолтную иконку Android. Для нормального вида — сгенерировать иконки через `@capacitor/assets`:
```
npm i -D @capacitor/assets
npx capacitor-assets generate --android
```
Нужна одна PNG 1024×1024 в `resources/icon.png` и splash 2732×2732 в `resources/splash.png`. **Скажите — сгенерирую иконку под «Умнилисёнок» через imagegen.**

### 5. Push-уведомления (FCM) — опционально сейчас
Плагин `@capacitor/push-notifications` уже в проекте. Для работы на Android нужен `google-services.json` из Firebase Console → положить в `android/app/`. Без него сборка пройдёт, но пуши работать не будут. Можно отложить до момента, когда захотите пуши на телефоне.

### 6. Мелочи в `codemagic.yaml`, которые улучшу
- Добавить шаг патчинга `build.gradle` с `signingConfig` (см. пункт 3).
- Поднять `versionName` (сейчас `1.0` от Capacitor — Google Play примет, но лучше явно задать).
- В `android-debug` — тоже собрать web (`npm run build`) перед `cap sync` — уже есть ✅.

## Технические изменения в файлах
- `codemagic.yaml`: добавить шаг «Configure release signing» — вписывает `signingConfigs.release { ... }` в `android/app/build.gradle` через `sed`/`printf`, используя `$CM_KEYSTORE_PATH` и т.д.
- Опционально: `resources/icon.png` + `resources/splash.png` (если разрешите сгенерировать).

## Порядок действий для вас
1. Разрешаете — я обновлю `codemagic.yaml` (пункт 3) и, если хотите, сгенерирую иконку (пункт 4).
2. Вы локально выполняете шаги из блока 1 (создание `android/`) и 2 (keystore в Codemagic).
3. Запускаете workflow `android-release` — получаете подписанный AAB, готовый для Play Console.

## Вопросы к вам
1. Сгенерировать иконку/splash сейчас (пункт 4)?
2. Настраиваем пуши через Firebase сейчас или позже (пункт 5)?
