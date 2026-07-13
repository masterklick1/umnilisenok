
## Что меняется

Только один файл — `codemagic.yaml`. Никакого кода приложения, никакой БД.

Сейчас шаг **«Force location permissions in manifest»** (есть и в `android-release`, и в `android-debug`) добавляет в `AndroidManifest.xml` только:

- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`

Но приложение реально использует ещё:

- фоновую геолокацию (`@capacitor-community/background-geolocation`, foreground-сервис в `capacitor.config.ts`)
- push-уведомления родителю
- камеру и микрофон для функции monitoring

Без соответствующих `<uses-permission>` в AAB эти функции на устройстве либо не запросят разрешение, либо будут молча падать, а Google Play может отклонить релиз.

## Что делаю

1. Переименовываю шаг в **«Force required permissions in manifest»**.
2. Расширяю блок `awk` — при первом же встречном тэге `<manifest ...>` вставляю сразу все разрешения одним блоком:
   ```
   ACCESS_FINE_LOCATION
   ACCESS_COARSE_LOCATION
   ACCESS_BACKGROUND_LOCATION
   FOREGROUND_SERVICE
   FOREGROUND_SERVICE_LOCATION
   POST_NOTIFICATIONS
   CAMERA
   RECORD_AUDIO
   ```
3. Меняю проверку `grep -q "ACCESS_FINE_LOCATION"` → `grep -q "ACCESS_BACKGROUND_LOCATION"`, чтобы старые сборки, где уже был только FINE/COARSE, всё равно получили новые разрешения при следующем прогоне.
4. Дублирую тот же обновлённый шаг в оба workflow (`android-release` и `android-debug`) — чтобы дебажный APK на телефоне вёл себя так же, как релизный AAB.

## Что НЕ меняю

- `capacitor.config.ts`, код React/TS, edge-функции, БД — не трогаю.
- Логику подписи, keystore, versionCode, gradle-патч — не трогаю.
- Кэш `node_modules`/Gradle сейчас не добавляю (можно отдельным шагом позже, если захочется ускорить сборку).

## Что сделать вам после мержа

1. `git pull` в вашем репозитории.
2. В Codemagic нажать **«Check for configuration files»** (чтобы подтянулся новый `codemagic.yaml`).
3. Запустить workflow — сначала `android-debug` для проверки APK на телефоне, потом `android-release` для AAB в Google Play.
4. В Google Play Console при подаче AAB будет запрошено **обоснование `ACCESS_BACKGROUND_LOCATION`** — указать: «Родительский контроль детского приложения, отправка геопозиции ребёнка родителю с настраиваемым интервалом, работа при выключенном экране». Без этого Play может отклонить релиз.
