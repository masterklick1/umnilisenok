
# Миграция карт: Web JS API → нативный @capacitor/google-maps

Проблема: Google Maps JS API использует HTTP-referrer ключи, которые не работают в Capacitor WebView (нет http-referer в native запросах). В собранном APK карта либо не грузится, либо падает с `RefererNotAllowedMapError`.

## Этапы (буду выполнять последовательно, показывая полное содержимое каждого изменённого файла)

### Этап 1. Инфраструктура
- Установить `@capacitor/google-maps`
- Добавить в `capacitor.config.ts` секцию `GoogleMaps` с плейсхолдером под API-ключ для Android (`androidGoogleMapsApiKey`) — пользователь потом добавит свой ключ в `codemagic.yaml` как переменную окружения. Для iOS аналогично, но проект собирается только под Android.
- Создать `src/lib/platform.ts` хелпер `isNative()` через `Capacitor.isNativePlatform()` (если ещё нет — в `useLocationTracker.ts` уже используется, вынесу в общее место)

### Этап 2. Edge Functions (прокси)
Создать две функции:
- `supabase/functions/places-proxy/index.ts` — принимает `{ action: "autocomplete" | "details" | "textsearch", input, sessionToken?, location?, placeId? }`, вызывает Places API (New) через `X-Goog-Api-Key: GOOGLE_MAPS_SERVER_KEY`, возвращает нормализованный ответ.
- `supabase/functions/directions-proxy/index.ts` — принимает `{ origin: {lat,lng}, destination: {lat,lng}, mode? }`, вызывает Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`) с сервером ключом, возвращает polyline + duration + distance.
- Обе функции: CORS, валидация Zod, JWT verify (`verify_jwt = true` — вызовы только от авторизованных родителей).
- Секрет: `GOOGLE_MAPS_SERVER_KEY` — пользователь добавит сам, в коде читаю через `Deno.env.get`.

### Этап 3. Клиентская обёртка `src/lib/maps-client.ts`
Единый API поверх Edge-функций:
- `autocompletePlaces(query, near?)` → `SearchPlaceResult[]`
- `getPlaceDetails(placeId)`
- `getDirections(from, to)`
Заменяет `searchPlaces` из `src/lib/google-maps.ts`.

### Этап 4. `LocationMap.tsx` — dual-mode
- Если `Capacitor.isNativePlatform()` → рендер через `GoogleMap.create({ element, config: { center, zoom, apiKey } })`, добавление маркеров через `addMarkers()`, круг геозоны через `addCircles()`, маршрут — polyline через `addPolylines()` (координаты берутся из Edge `directions-proxy`).
- Иначе (web) → оставляем текущую реализацию через `window.google.maps.Map` (fallback для preview в браузере).
- Общий контракт props не меняется — потребители (`ParentDashboard`, `SafetyPanel`) не трогаются.

### Этап 5. `PlaceAddressSearch.tsx`
- Удалить прямой `new google.maps.places.Autocomplete(input)` .
- Заменить на debounced-запрос к `autocompletePlaces()` из `maps-client.ts` с рендером выпадающего списка (стандартный shadcn Command/Popover). Работает одинаково в web и в native.
- Кнопка «Найти» тоже уходит на Edge — единая точка.

### Этап 6. `src/lib/google-maps.ts`
- Оставить только `loadGoogleMaps()` + `isGoogleMapsConfigured()` для web-fallback карты.
- `searchPlacesGoogle` / `searchPlacesOsm` удалить (перенесено в Edge). `searchPlaces` — reexport из `maps-client.ts` для обратной совместимости.

## Что НЕ трогаю
- Схему БД (`child_saved_places`, `child_place_status`, `child_settings`)
- Логику `useLocationTracker.ts`, `geo-permission.ts`
- Компоненты `MyPlacePicker`, `ChildRoomViewer` и остальные — они получают данные через уже существующие props/hooks.
- `codemagic.yaml` в этом этапе не трогаю — Android API-ключ для нативной карты нужно будет добавить в отдельный шаг (напомню в конце с точной инструкцией куда вписать `GOOGLE_MAPS_ANDROID_API_KEY` и как прокинуть его в `AndroidManifest.xml` через `meta-data com.google.android.geo.API_KEY`).

## Открытые вопросы (сделаю разумное допущение, если не поправишь)
1. **Ключи**: буду считать, что серверный ключ `GOOGLE_MAPS_SERVER_KEY` (для Edge) и Android-ключ `GOOGLE_MAPS_ANDROID_API_KEY` (для манифеста) — два разных ключа Google Cloud с разными ограничениями (server: IP-restrictions или без; android: SHA-1 + package name). Это правильный путь по документации Google.
2. **Directions**: перехожу на **Routes API v2** (`computeRoutes`) вместо legacy Directions API — legacy депрекейтед и удалён из Lovable-коннектора. Функционально эквивалентно.
3. **Places**: использую **Places API (New)** (`places:autocomplete`, `places:searchText`, `places/{id}`), а не legacy Places.

## Как проверю
- `npm run build` после каждого этапа.
- Ручную проверку в native через `npx cap sync` пользователь делает сам после `git pull`.

Подтверди план — начну с Этапа 1.
