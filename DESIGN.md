---
name: "Weather Line for the browser"
description: "A faithful mobile-browser recreation of the final Weather Line interface."
colors:
  background: "#f7f7f7"
  surface: "#fff"
  text: "#1c1c1e"
  secondary: "#929292"
  muted: "#717176"
  rule: "#dedee1"
  control: "#eeeef0"
  accent: "#249fd7"
  sun: "#ff9700"
  rain: "#00a4e4"
  night: "#596e77"
  wind: "#9c54d8"
  selection: "#e4f1f8"
  dark-background: "#101724"
  dark-surface: "#172131"
  dark-text: "#f3f4f7"
  dark-secondary: "#8e9eb5"
  dark-muted: "#a5b3c7"
  dark-rule: "#2d3c50"
  dark-control: "#243045"
  dark-accent: "#7bbbe1"
  dark-sun: "#ffcf6b"
  dark-rain: "#95ddf1"
  dark-night: "#8293ad"
  dark-wind: "#bb9be3"
  dark-selection: "#243955"
  black-background: "#000"
  black-surface: "#111"
  black-text: "#ededed"
  black-secondary: "#aaa"
  black-muted: "#999"
  black-rule: "#303030"
  black-control: "#242424"
  black-accent: "#ccc"
  black-sun: "#bbb"
  black-rain: "#86bdda"
  black-night: "#737d8c"
  black-wind: "#ad99cb"
  black-selection: "#242a2e"
  dracula-background: "#202544"
  dracula-surface: "#292f58"
  dracula-text: "#f4f3ff"
  dracula-secondary: "#a3a9cc"
  dracula-muted: "#a9b0da"
  dracula-rule: "#41476c"
  dracula-control: "#202748"
  dracula-accent: "#8580ff"
  dracula-sun: "#ffe58e"
  dracula-rain: "#a1e3f4"
  dracula-night: "#969bcb"
  dracula-wind: "#d0a3f9"
  dracula-selection: "#3d467d"
  solarized-background: "#142e38"
  solarized-surface: "#203e4c"
  solarized-text: "#e6f2ef"
  solarized-secondary: "#9cb9bb"
  solarized-muted: "#a1bbbc"
  solarized-rule: "#395862"
  solarized-control: "#142e38"
  solarized-accent: "#81cfc8"
  solarized-sun: "#f0d777"
  solarized-rain: "#8fd4e4"
  solarized-night: "#9aafb4"
  solarized-wind: "#a9a1d6"
  solarized-selection: "#335765"
  clear-sky-background: "#2361b0"
  clear-sky-surface: "#2c70c5"
  clear-sky-text: "#fff"
  clear-sky-secondary: "#c4dcf9"
  clear-sky-muted: "#d2e4fc"
  clear-sky-rule: "#5791d3"
  clear-sky-control: "#2059a3"
  clear-sky-accent: "#c0e5ff"
  clear-sky-sun: "#ffdd71"
  clear-sky-rain: "#a0ddff"
  clear-sky-night: "#123f75"
  clear-sky-wind: "#e6c2ff"
  clear-sky-selection: "#4188d7"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "43px"
    fontWeight: 500
    letterSpacing: "-.035em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-.025em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.025em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
  region:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "15px"
    fontWeight: 600
  control:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "28px"
  graph-temperature:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "14px"
    fontWeight: 600
  graph-temperature-selected:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "18px"
    fontWeight: 600
  graph-time:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "12px"
    fontWeight: 600
  graph-secondary:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "10px"
    fontWeight: 600
  detail-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.3
  detail-value:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  segment: "7px"
  control: "9px"
  preview: "10px"
  settings-group: "11px"
  forecast-sheet: "17px"
  dialog: "18px"
  desktop-sheet: "20px"
  circle: "50%"
spacing:
  space-2: "2px"
  space-4: "4px"
  space-6: "6px"
  space-7: "7px"
  space-10: "10px"
  space-14: "14px"
  space-18: "18px"
  space-20: "20px"
  space-24: "24px"
  space-30: "30px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 24px"
  button-text:
    textColor: "{colors.accent}"
  button-icon:
    textColor: "{colors.accent}"
  forecast-range:
    backgroundColor: "{colors.control}"
    rounded: "{rounded.control}"
    padding: "2px"
    height: "34px"
  forecast-range-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.control}"
    rounded: "{rounded.segment}"
  forecast-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.forecast-sheet}"
    padding: "0 0 2px"
  search-field:
    backgroundColor: "{colors.control}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "42px"
  dialog-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "18px 18px 0 0"
    width: "min(560px, 100%)"
---

# Design System: Weather Line for the browser

## Overview

**Creative North Star: "Weather Line, as shipped"**

The existing Weather Line interface is the visual authority. Preserve its quiet neutral surfaces, compact system typography, condition-colored temperature lines, original weather icons, and rounded forecast sheet. The local v2.8 captures, July 2020 unframed screens, and April 2021 SVG assets define the direction; this record documents the implemented recreation rather than proposing a new identity.

The app stays a narrow, direct forecast tool on every screen size. Weather carries the color; controls use a separate accent. The New York forecast and Austin monthly view are explicitly labeled design previews. The dated reference forecast is never presented as live weather; live Apple Weather forecasts require WeatherKit credentials, and monthly climate data is a separate dependency.

**Key Characteristics:**

- Centered mobile-width interface, including on desktop.
- Smooth weather lines, small original SVG icons, and a full-column selection strip.
- Two aligned weather-detail columns with muted uppercase labels and tabular values.
- Seven appearance choices using the implemented original-theme palettes.

## Colors

The frontmatter owns the exact colors. Unprefixed tokens are Light; fixed theme variants use their theme ID as a prefix. Automatic follows system Light/Dark and does not introduce another palette. Original SVG artwork retains its internal colors.

### Primary

Control accent colors actions, selected segments, links, carets, and focus outlines.

### Secondary

Sun colors sunny temperature text and lines; rain colors wet conditions and precipitation; night colors the low track and overcast/night conditions; wind colors wind, fog, and haze. The condition resolver prioritizes rain, wind/fog, night/cloud/snow/sleet, then sun. Partly cloudy retains sun.

### Neutral

Background surrounds the app; surface fills sheets; text carries primary copy. Secondary carries region, graph dates, and detail labels; muted carries supporting copy; rule separates groups; control fills search and segment tracks. Selection fills the monthly column and text selection. Forecast selection instead uses a transparent-to-sun gradient.

| Choice | ID | Character |
| --- | --- | --- |
| Automatic | auto | System Light/Dark; split thumbnail. |
| Light | light | White sheet, off-white surround, blue controls, orange sun, slate lows. |
| Dark | dark | Navy, pale blue controls, cream sun, blue-gray lows. |
| Black | black | Black/near-black surfaces, gray controls and sun. |
| Dracula | dracula | Indigo, violet controls, pale yellow sun. |
| Solarized | solarized | Deep teal, pale teal controls, muted yellow sun. |
| Clear Sky | clear-sky | Saturated blue, pale blue controls, yellow sun, dark blue lows. |

**The Existing Interface Rule.** Use the final Weather Line references and supplied original assets as the authority for new or repaired interface details.

**The Condition Color Rule.** Keep weather meaning separate from the control accent: sunny, wet, overcast/night, and wind/fog conditions retain their dedicated roles in every theme.

## Typography

Use the Apple system stack recorded above. Current temperature is the display role; location is the headline; selected condition is the title. Temperatures and values use tabular numerals; detail values also request small caps. Detail labels are uppercase, values never wrap, condition titles balance their wrapping, and long location names may wrap anywhere.

The frontmatter defines mobile sizes. At (700px) and above, location/current temperature/condition/region become (28/48/27/16px), with detail labels/values at (12/15px). At (360px) and below, location/temperature/condition become (22/37/21px), with details at (9/12px). Sheet navigation headings are (22px); section headings are (18px).

## Layout

The centered shell is at most (560px) wide, with (10px) side padding and minimum height of (100dvh), giving a maximum forecast width of (540px). Top padding uses `env(safe-area-inset-top)` and bottom padding uses `max(30px, env(safe-area-inset-bottom))`. At (700px), top padding becomes (25px), toolbar height grows from (75px) to (82px), and the app stays narrow. At (360px) and below, side padding becomes (7px) and toolbar gap shrinks to (10px).

The toolbar places settings, the range control, and locations in a single row. The rounded forecast sheet groups handle, location/current temperature, chart, centered selection summary, details, precipitation, and monthly navigation.

Details use two equal columns: gap (18px), row gap (10px), and margin (0 18px 25px). Each item aligns label/value on a shared baseline with space between. Left: Average or Feels like, Precipitation, Rain, Dew point, Humidity. Right: Sunrise, Sunset, Wind, UV index, Cloud cover. Desktop uses side margins (24px), column/row gaps (28/13px); narrow screens use side margins (14px) and column gap (12px).

**The Mobile Width Rule.** Keep the app centered at its implemented maximum width; wider viewports do not turn the forecast into a dashboard.

## Elevation & Depth

Surface contrast and thin rules do most grouping. Light has a faint forecast shadow; all dark palettes remove it. A small shadow defines the selected segment and white switch thumb. The modal uses an upward shadow and dark translucent backdrop. Exact shadow values live in the sidecar.

**The Quiet Depth Rule.** Use borders and tonal surfaces for ordinary grouping; reserve the existing shadows for the light forecast sheet, selected segment, switch thumb, and modal sheet.

## Shapes

Preserve the clipped rounded forecast sheet, nested segment radii, rounded search/action controls, small theme thumbnails, and fine separators. The forecast radius grows on desktop. Modal corners round at the top on mobile and all around on desktop. Chart strokes have round caps; monthly markers are circles.

## Components

### Controls and states

Icon actions have minimum targets of (40 by 44px). Text actions are accent-colored and at least (34px) high; footer actions use (25px). Filled retry uses accent/surface, padding (10px 24px), and minimum height (44px). Buttons darken on hover through `brightness(.96)`; disabled buttons use opacity (.5) and a wait cursor. No pressed transform is defined.

Keyboard focus uses an accent outline (2px), offset (4px). Graph targets instead use an accent SVG stroke (1px). City search outlines its surrounding field with `:focus-within`, at (2px) and offset (3px). Pointer graph selection blurs the target; keyboard focus remains visible.

Hourly/Daily uses a (34px) track, maximum width (240px), and inset (2px). Selected `aria-pressed` uses accent fill, surface text, and a local shadow. Changing range resets selection and horizontal scrolling.

### Forecast chart

Daily viewBox is (420 by 330); ten reference days form (42-unit) columns. High points are centered; lows are staggered onto subsequent column boundaries, leaving nine low markers. Y starts at (65) and spans (180) over a range of at least (8°C). Cubic control points share each segment's midpoint x. Strokes are (2.2); high/low icons are (24/22) square. Weekday/date labels sit at y (299/320).

The full-height selected column fades from transparent to sun at opacity (.18). Pointer press selects; primary-button dragging scrubs. A roving tab stop exposes the selected column. Enter/Space selects; Left/Right moves selection and focus and scrolls the target into view. The summary announces updates politely. Selection changes directly without animation.

Hourly shows up to (72) hours in (54px) columns at (330px) height, with horizontal scrolling and NOW/hour/AM-PM labels. Compact viewBox height is (175), temperature span (50), and high icons (22) square; it hides lows, selection strip, details, and keyboard column targets. Its handle rotates.

### Sheets, search, and settings

Settings, Locations, and Monthly share a native modal dialog: bottom-aligned mobile, width `min(560px, 100%)`, max height (94dvh); vertically centered desktop, max height (85dvh). Content usually has (19px) side padding, bottom safe-area padding, minimum height (450px), and sticky navigation. Escape, backdrop, and Done/back/close dismiss it. Native modal focus containment and opener-focus restoration are retained.

Mobile entrance moves from (45px) below over (.25s), easing `cubic-bezier(.16,1,.3,1)`; desktop has no entrance animation. Loading spins linearly over (1s); switch track/thumb transition over (.2s). Reduced motion disables all animations and transitions.

City search is (42px) high, with inline SVG, text input, and clear action. Feedback stays inline. Location rows are at least (70px), with title/region hierarchy and accent actions. Preferences and saved locations persist in this browser.

Appearance uses a four-column grid with gaps (18px 10px). All seven choices have a thumbnail, label, and `aria-pressed`; selection adds an accent outline and check badge. Thumbnails are (58px) high, at most (90px) wide. Settings groups have (13px) side inset and rows of at least (51px). The switch is (40 by 24px); its (20px) thumb travels (16px).

### Monthly and data labels

Austin monthly viewBox is (420 by 370), with twelve centers at x (17 + 35 × index), a (35-unit) selection strip, (2-unit) lines, and (5.5-unit) points. Sun/night lines sit above a rain-colored shape. All months accept keyboard focus and Enter/Space. The selected month and two aligned average values follow.

Keep “Austin, TX · Original reference” and its historical-reference note. Keep “Reference forecast · July 18, 2020”; hourly also labels its illustrative, non-live status. WeatherKit responses instead show update time, Apple Weather attribution, and refresh; cached live data says Saved forecast. Loading/error states retain the sheet and provide centered status or retry/reference actions.

## Do's and Don'ts

### Do:

- **Do** preserve the original weather SVGs and their internal artwork.
- **Do** keep condition text, chart segments, and current temperature synchronized with the selected weather and theme roles.
- **Do** align each detail label and value on a shared baseline within the two-column grid.
- **Do** keep visible reference labels on the illustrative New York forecast, illustrative hourly preview, and Austin monthly averages.
- **Do** retain roving chart focus, keyboard selection, native modal focus behavior, safe-area spacing, and reduced-motion support.

### Don't:

- **Don't** invent a replacement brand, display font, hero artwork, or desktop dashboard.
- **Don't** restyle theme choices as new palettes or recolor the original SVG artwork.
- **Don't** imply that reference values or monthly climate data come from a live WeatherKit forecast.
- **Don't** add radar or widgets to this recreation.
- **Don't** animate forecast selection or add elevation beyond the implemented vocabulary.


## Saved locations and city dismissal

The main screen keeps the established compact Weather Line card, chart, type and palette, repeated once for each saved city with 15px separation (12px at narrow widths). Global Hourly/Daily controls apply to every tile. Each card owns its location's data and timezone; inactive cities never reuse the open city's forecast.

The authored navigation moment is the expanded city following a deliberate downward pull at the document top. Use resisted translation, an 84px raw-touch threshold, and a short return transition for incomplete pulls. Horizontal chart movement, normal scrolling below the top, dialogs and form controls keep their own gestures. The handle and city header permit downward pulling, while the handle button also returns to the list without touch. Restore the originating tile's focus and list scroll position after closing. Respect reduced motion.


Saved Locations appears first in Settings, using the existing grouped-row surface and theme tokens. Each row includes the city and region, 44px move-up/move-down actions, and Remove. Boundary actions remain focusable and report their disabled state. Moving retains focus on that city's control; removing focuses the next/previous row, or Add Location when empty. Settings order is the main screen order. Search saving returns to the stacked cards, while opening a saved tile still enters its city screen.


The Feels Like switch changes the temperature data without changing the established chart colors, curve smoothing, typography or geometry. Daily apparent highs/lows are derived from complete Apple hourly forecast intervals, including earlier hours of today. Missing apparent values appear as a dash with a gap in the curve rather than an actual-temperature substitution. The weather-detail comparison switches to Actual Temp; daily values display high / low with spoken high/low labels. Monthly climatology remains explicitly actual because Apple does not provide historical apparent averages.


## Consistent forecast range sizing

Hourly and Daily render in measured pixel viewboxes with shared 175px compact and 330px expanded chart heights. Both use the same 22px compact and 24px expanded daytime glyph sizes, physical stroke widths, 14px normal and 18px selected temperature labels, 12px time labels and 10px secondary labels, all semibold. Hourly retains its scrolling timeline and Daily its high/low curves. Scrollbars do not add mode-dependent height.

Both forecast summaries use 21px type, 1.3 line height and the same tracking. An invisible, aria-hidden sizing grid reserves the tallest available summary at the current width; the visible copy stays complete. Missing Feels Like notices use the same reservation when relevant. This keeps the details grid and following sections in place while changing range or selected point.

The November 16 source comparison restores #FF9700 for Light sunny weather text. Normal graph temperatures use 14px semibold and the selected pair uses 18px semibold, following the archived native Theme definitions. The next-hour chart has three 50px intensity bands, original droplet artwork, a smoothed source-calibrated area and ten-minute labels. Monthly supporting copy is limited to the place; the long climate footnote is removed.
