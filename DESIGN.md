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
  wind: "#9b51e0"
  hot: "#ff4f00"
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
  dark-wind: "#9b51e0"
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
  black-wind: "#9b51e0"
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
  dracula-wind: "#9b51e0"
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
  solarized-wind: "#9b51e0"
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
  clear-sky-wind: "#9b51e0"
  clear-sky-selection: "#4188d7"
typography:
  display:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "43px"
    fontWeight: 500
    letterSpacing: "-.035em"
  headline:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-.025em"
  title:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.025em"
  body:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
  region:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "15px"
    fontWeight: 600
  control:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "28px"
  graph-temperature:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "14px"
    fontWeight: 600
  graph-temperature-selected:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "18px"
    fontWeight: 600
  graph-time:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "12px"
    fontWeight: 600
  graph-secondary:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "11px"
    fontWeight: 600
  detail-label:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
  detail-value:
    fontFamily: "ui-rounded, \"SF Pro Rounded\", -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", sans-serif"
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

The existing Weather Line interface is the visual authority. Preserve its quiet neutral surfaces, compact SF Rounded typography, condition-colored temperature lines, original weather icons, and rounded forecast sheet. The local v2.8 captures, July 2020 unframed screens, and April 2021 SVG assets define the direction; this record documents the implemented recreation rather than proposing a new identity.

The app stays a narrow, direct forecast tool on every screen size. Weather carries the color; controls use a separate accent. Forecasts and monthly climate values come from Apple WeatherKit. There is no demo or reference forecast mode. Genuine saved forecasts remain labeled saved; unavailable data keeps an explicit retry.

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

Sun colors sunny conditions; rain colors wet conditions; slate colors ordinary night tracks; gray colors clouds and fog. Wind, snow, sleet, hail and ice use the original purple #9B51E0. Hot and severe-weather glyphs use the original red #FF4F00. These purple/red values are shared by icons, graph lines, labels, condition text and highlights in every theme, including overnight tracks. Partly cloudy retains sun.

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

Daily viewBox is (420 by 330); ten forecast days form (42-unit) columns. High points are centered; lows are staggered onto subsequent column boundaries, leaving nine low markers. Y starts at (65) and spans (180) over a range of at least (8°C). Cubic control points share each segment's midpoint x. Strokes are (2.2); high/low icons are (24/22) square. Weekday/date labels sit at y (299/320).

The full-height selected column fades from transparent to sun at opacity (.18). Pointer press selects; primary-button dragging scrubs. A roving tab stop exposes the selected column. Enter/Space selects; Left/Right moves selection and focus and scrolls the target into view. The summary announces updates politely. Selection changes directly without animation.

Hourly shows up to (72) hours in (54px) columns at (330px) height, with horizontal scrolling and NOW/hour/AM-PM labels. Compact viewBox height is (175), temperature span (50), and high icons (22) square; it hides lows, selection strip, details, and keyboard column targets. Its handle rotates.

### Sheets, search, and settings

Settings and Locations use a full-height native modal card: width `min(560px, 100%)`, height/max-height 100dvh with a 100vh fallback, and inset 0. It fills the mobile viewport; wider displays keep the app column. The dialog is the single vertical scroll container, and its child sheet has min-height 100%. Side padding is at least 19px and respects horizontal safe areas; the sticky navigation header respects the top safe area, and the bottom retains safe-area padding. Done and Escape dismiss the card, with native focus containment and opener-focus restoration. Monthly averages remain inline in the forecast.

Mobile entrance moves from (45px) below over (.25s), easing `cubic-bezier(.16,1,.3,1)`; desktop has no entrance animation. Loading spins linearly over (1s); switch track/thumb transition over (.2s). Reduced motion disables all animations and transitions.

City search is (42px) high, with inline SVG, text input, and clear action. Feedback stays inline. Location rows are at least (70px), with title/region hierarchy and accent actions. Preferences and saved locations persist in this browser.

Appearance uses a four-column grid with gaps (18px 10px). All seven choices have a thumbnail, label, and `aria-pressed`; selection adds an accent outline and check badge. Thumbnails are (58px) high, at most (90px) wide. Settings groups have (13px) side inset and rows of at least (51px). The switch is (40 by 24px); its (20px) thumb travels (16px).

### Monthly and data labels

Austin monthly viewBox is (420 by 370), with twelve centers at x (17 + 35 × index), a (35-unit) selection strip, (2-unit) lines, and (5.5-unit) points. Sun/night lines sit above a rain-colored shape. All months accept keyboard focus and Enter/Space. The selected month and two aligned average values follow.

Forecasts show update time, Apple Weather attribution, and refresh; cached real data says Saved forecast. Loading/error states retain the card and provide centered status or retry actions. No illustrative forecast or monthly data is shown.

## Do's and Don'ts

### Do:

- **Do** preserve the original weather SVGs and their internal artwork.
- **Do** keep condition text, chart segments, and current temperature synchronized with the selected weather and theme roles.
- **Do** align each detail label and value on a shared baseline within the two-column grid.
- **Do** retain clear loading, unavailable, retry and saved-forecast states.
- **Do** retain roving chart focus, keyboard selection, native modal focus behavior, safe-area spacing, and reduced-motion support.

### Don't:

- **Don't** invent a replacement brand, display font, hero artwork, or desktop dashboard.
- **Don't** restyle theme choices as new palettes or recolor the original SVG artwork.
- **Don't** label saved forecasts as fresh weather or historical monthly averages as upcoming forecasts.
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


The v2.8 English 3 screenshot confirms #9B51E0 in wind glyphs, lines and labels; English 2 confirms #FF4F00 in Hot glyphs, lines and labels. April 2021 frozen-weather SVGs use the same purple. Named wind/frozen conditions retain their category ahead of generic storm matching.


Typography uses the native SF Rounded system face through `ui-rounded`, with SF Pro Rounded and system sans-serif fallbacks; Apple font files are not bundled. Body text, controls, labels and SVG graph temperatures share `--font-ui`. Weather detail labels (including Actual Temp) are 12px, 11px at widths up to 360px, and 13px on desktop. The graph date/AM–PM row is 11px. These labels are one logical point larger; temperature values and the primary weekday/hour row retain their existing sizes. [Apple native font guidance](https://developer.apple.com/documentation/technologyoverviews/managing-the-fonts-for-your-app).
