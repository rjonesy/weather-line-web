# Weather Line

A mobile browser recreation of Weather Line, built with React, Vite and Tailwind CSS. The main screen shows a forecast tile for every saved city. Open a tile for hourly and daily details, then pull down at the top to return. Keyboard users can focus the Back to saved locations control. Add cities from location search; reorder or remove any city in Settings → Saved Locations. Adding a city returns to the main screen, and an intentionally empty saved list stays empty after reload. It also includes device-aware themes, weather alerts, monthly averages and an optional nighttime conditions view. New York is the starter city, and an intentionally empty list shows an unsaved New York preview. The separate illustrative forecast is clearly labeled as design reference data. Selecting a different forecast point requests a short 5 ms vibration where the browser and hardware support it. Current Safari, including iPhone Safari, does not support this programmatic vibration API; no hidden switch controls are used.

## Run locally

Use Node.js 22.13 or newer and pnpm 10.32.1.

```sh
pnpm install
pnpm dev
```

The development URL includes `/weather-line-web/`. Development uses the local Vite `/api` proxy to reach the public weather service, without broadening the backend’s production browser-origin policy. An optional development API override can be set in `.env.development.local` using `.env.example`. Location access requires the browser’s permission; search for a city when location is unavailable. Current Location displays the street number and street name returned by Google Maps. Addresses stay in memory and never replace the GPS coordinates used for weather or get written into saved locations.

## Build and check

```sh
pnpm test
pnpm typecheck
pnpm build:pages
pnpm preview
```

`pnpm build:pages` builds the production app, then copies the complete static output into `docs/` and adds `.nojekyll`. Commit `docs/` alongside the source. In the public personal repository’s **Settings → Pages**, choose **Deploy from a branch**, then **main** and **/docs**. No GitHub Actions workflow or app sign-in is required. After each app change, run `pnpm build:pages` again and commit the updated source and `docs/` together.

The live app URL is `https://rjonesy.github.io/weather-line-web/`. The intermediate Vite build is also available in `dist/` for `pnpm preview`. If the repository path changes, update `base` in `vite.config.ts` and the manifest’s `id`, `start_url`, `scope` and icon paths together.

## iPhone Home Screen

Open the deployed site in Safari, use Share → Add to Home Screen, then launch Weather Line from its original app icon. It opens in standalone mode and follows the device theme by default. The app requests durable local storage when the browser supports it. No service worker is installed.

Cities and preferences are saved locally in the current browser or installed app. They are not synchronized between devices. iOS Home Screen apps have separate storage from Safari, so add cities inside the installed app. Clearing website/app data removes them. Saved forecasts are identified as saved data when used after a connection failure.

## Weather service

This is a static frontend. Live weather, city search, street addresses, alerts and monthly statistics depend on the separately hosted API at `https://weather-line-recreated.ryan-jones-3545.chatgpt.site`. That backend must remain available and allow the GitHub Pages origin through CORS. The production public API origin is configured in `.env.production`; development can override its proxy default in `.env.development.local` using `VITE_WEATHER_API_URL`.

The API URL is public configuration. WeatherKit signing credentials and the server-only `GOOGLE_MAPS_API_KEY` belong on the backend and are not included in this repository. Enable Google Maps Geocoding API for that key; a WeatherKit key cannot authorize address lookups. Address lookups use POST to `/api/address` with no-store responses; an unavailable address does not block weather. A small Google Maps attribution accompanies a successfully resolved address on the current-location tile and city screen. Settings and the saved-location menu do not display address data. Changing a Vite environment value requires rebuilding the frontend.
