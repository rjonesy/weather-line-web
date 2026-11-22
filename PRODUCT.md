# Weather Line for the browser

<!-- impeccable:product-schema 1 -->

## Platform
web

## Product Purpose
Recreate the final Weather Line app for mobile browsers, with particular fidelity to color, alignment, typography, and forecast charts.

## Capabilities and Constraints
Use Apple WeatherKit for live weather. Exclude widgets and weather radar. Preserve hourly and daily forecasts, forecast inspection, saved locations, settings, themes, and the monthly averages view. Never present reference data as live weather.

## Brand Commitments
The existing Weather Line interface is binding. The local v2.8 App Store screenshots, July 2020 unframed app captures, April 2021 weather SVGs, and original theme source are visual evidence. Photos albums were inspected; their references are older than the local asset archive.

## Confirmed Preferences
Use the browser's current location by default and follow the device's light/dark theme. The app is published to a public personal GitHub repository and GitHub Pages, using a public server for Apple WeatherKit and Apple Maps requests. Private signing credentials remain on the server.


## Saved-location navigation

The main screen presents every saved location as its own compact forecast tile. Opening a tile shows that city's full forecast. A downward touch pull at the top closes the city and restores the main list's scroll position and focus. A text Back to saved locations button remains available to screen readers and appears on keyboard focus. Weather pages have no up/down chevrons. New locations persist and appear in the main list; Current Location refreshes its coordinates when location permission is available.


Saved locations are managed in the first Settings section. Each saved record corresponds to one vertically stacked main-screen tile, in exactly the order shown in Settings. Adding a city saves it and returns to the main stack. Users can remove every city; an intentionally empty list persists across reloads. Current Location updates in its existing saved position and cannot be silently reinserted after removal. A first-ever visit may initialize Current Location automatically. An interrupted first attempt remains pending across reloads until it succeeds or the user cancels or edits the location list.


Feels Like applies to every forecast air-temperature display: current readings, saved-city badges, hourly temperatures, daily high/low curves and labels, and summary values. The comparison detail is Feels Like while actual temperatures are selected, and Actual Temp while Feels Like is selected. Daily comparison values are a high/low pair. Dew point is its own physical measurement. Monthly averages retain historical air temperatures regardless of the forecast Feels Like preference. The heading stays Monthly Averages.

Every visible app open and return from the background starts a fresh WeatherKit request for every saved city and the open city, bypassing browser and server caches. A restored page also refreshes. The current city, selected forecast range, saved order, and scroll position remain in place. Returning focus within the open app does not start another batch. Monthly averages refresh with the open city. Failed requests keep saved forecasts marked as saved, or show a retry message if no forecast is available.

The daily Avg. dew point detail is the duration-weighted mean from 5 AM up to 10 PM in the selected city's local calendar day. It uses the complete hourly forecast, including earlier hours of today, and remains an actual dew-point measurement in either temperature mode. Missing or incomplete daytime coverage is unavailable. A validated derived average survives saving and reloading an upcoming-only forecast. Hourly Dew point shows the selected hour's reading.

Current Location uses the browser's GPS fix for forecasts and an Apple Maps street address as its subtitle. Only the number and street name are displayed; coordinates and landmark names never substitute for the street. Address lookup stays ephemeral, goes only to Apple through the server, and is not saved to browser storage. An unavailable address does not block weather. The interface contains no map. The user explicitly requested text-only Apple Maps addresses for this prototype and deferred the corresponding map display until later. The former address provider and its UI have been removed. New York replaces the old automatic Apple Park placeholder. A first visit starts with New York until GPS is available; an intentionally empty saved list stays empty and shows an unsaved New York preview. Real saved cities and their order are preserved.


User changes to an hourly/day point or forecast range request a single very light 5 ms vibration where the browser supports it. Repeated events for the same selection and rapid scrubbing are deduplicated/rate-limited. Initial render, forecast refresh and city/reference resets stay silent. Current iPhone Safari has no supported programmatic selection-haptic API; unsupported devices retain the normal interface.


Snow and frozen-weather glyphs retain their purple palette in every forecast row, including the daily overnight track. Their outgoing low-temperature curve segments and labels use the corresponding purple colors; other overnight conditions retain the night palette. Clear and partly cloudy sun symbols retain their sunny color.


The footer Refresh and Refresh all buttons reload the latest app document with a fresh URL, then fetch fresh weather. A short-lived, one-use session context preserves the saved city, range, selection and scroll without storing address or coordinate data. Removed cities are not restored. The Apple Weather footer mark is compact (12px high, at most 80px wide); its legal link remains available.

Hourly and Daily share measured pixel chart geometry: 175px saved previews and 330px expanded graphs, with identical forecast icon, text and stroke sizes. Switching ranges preserves card and section positions at a given viewport. The selected condition uses the same typography in both ranges; invisible, accessibility-hidden sizing copy reserves the longest available summary without truncating real text. Feels Like unavailable notices reserve one common row when missing values are possible. Horizontal hourly scrolling and keyboard point selection remain available.

Location detection tries a fresh precise fix, then one coarse or recent fix when the provider times out or is temporarily unavailable. Permission denials do not trigger repeated prompts. Location progress, cancellation, errors and retry stay inside Locations. Main and city forecast screens retain the original clean layout. Opening a city preserves background location refresh, while intentional location changes cancel an obsolete request.

Graph typography follows the original Theme.swift: system SF, normal temperature labels 14px semibold and selected labels 18px semibold. The latest screenshot orange #FF9700 also colors sunny text; the former brown text ink is removed. Hourly and Daily retain the same measured chart sizes.

The next-hour precipitation chart uses the original probability-adjusted nonlinear intensity mapping and smooth area, with three equal intensity bands, original rain-droplet glyphs, and ten-minute labels. Monthly Averages has no long explanatory footnote or Typical monthly weather subtitle. Average Precip Days sums Apple daily historical probabilities within each month; February 29 is weighted by its Gregorian frequency. Missing daily data leaves that value unavailable without blocking temperatures or rainfall.

Settings and Locations open as full-height cards that fill the mobile viewport, including when Locations has only a few saved cities. On wider displays they retain the 560px app column and fill its viewport height. The dialog alone scrolls; its sticky Done header and side/bottom padding respect safe areas. Opening either card focuses Done rather than the search input, and the sheet fills empty space so blank taps do not dismiss it.
