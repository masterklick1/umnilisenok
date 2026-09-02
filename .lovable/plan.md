# Настройка Google Maps для Android-сборки

## Что означает требование
Google разрешит показывать нативную карту только приложению с пакетом `app.lovable.umnilisenok`, подписанному вашим ключом сборки. SHA-1 — уникальный отпечаток этого ключа подписи.

## Что нужно сделать

### 1. Включить API
1. Открыть [Google Cloud Console](https://console.cloud.google.com).
2. Выбрать проект, где создан ключ Google Maps.
3. Перейти в **APIs & Services → Library**.
4. Найти **Maps SDK for Android** и нажать **Enable**.
5. Убедиться, что в проекте включён биллинг.

### 2. Получить правильный SHA-1
Для APK, подписанного вашим `upload.keystore`:

```bash
keytool -list -v -keystore upload.keystore -alias upload
```

Скопировать значение из строки **SHA1**.

Для AAB, распространяемого через Google Play, дополнительно потребуется SHA-1 ключа **App signing** из Google Play Console. Загрузочный и Play-ключи обычно имеют разные SHA-1.

### 3. Ограничить Android-ключ
1. Открыть **APIs & Services → Credentials** и выбрать ключ, который сохранён в Codemagic как `GOOGLE_MAPS_ANDROID_KEY`.
2. В **Application restrictions** выбрать **Android apps**.
3. Добавить:
   - Package name: `app.lovable.umnilisenok`
   - SHA-1: отпечаток из предыдущего шага.
4. Если приложение устанавливается через Google Play, добавить второй элемент с тем же пакетом и SHA-1 ключа **App signing**.
5. В **API restrictions** разрешить **Maps SDK for Android** и сохранить изменения.

### 4. Проверить Codemagic
Убедиться, что секрет `GOOGLE_MAPS_ANDROID_KEY` содержит именно этот Android API key и подключён к используемому workflow.

### 5. Проверить результат
1. Подождать несколько минут после сохранения настроек Google.
2. Запустить новую сборку Codemagic.
3. Удалить старую версию приложения с телефона и установить новую.
4. Открыть родительскую карту и проверить отображение.

## Важно
- Package name вводится строго: `app.lovable.umnilisenok`.
- SHA-1 нельзя выдумать: он извлекается из реального ключа подписи.
- Для локально установленного APK нужен SHA-1 upload-keystore; для приложения из Google Play — SHA-1 App signing.
- Сам файл keystore и пароль никому отправлять не нужно.