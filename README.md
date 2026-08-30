# Desert Almanac Card

An editorial, almanac-style weather panel for Home Assistant. Sand-paper background, serif masthead, and an illustrated desert scene where **the sun and moon ride their real arc across the sky in realtime** — the scene brightens at dawn, washes warm at sunset, and falls dark with stars at night, with both bodies rising and setting behind the mountains.

## Features

- **Realtime sky** — sun position is computed every minute from your `sun.sun` entity's rise/set times; the moon takes over at night. Dawn/dusk warm washes and the night tint are driven by solar elevation, so the panel always matches the sky outside.
- **Condition-driven scenes** — the desert scene reacts to the weather: sepia-outlined clouds drift in when partly cloudy; a cumulus-field deck rolls over for cloudy/rain/storms; rain falls; lightning flashes the sky; wind brings gust streaks, dust puffs, and a rolling tumbleweed; and an active **Dust Storm Warning summons a full haboob** — a billowing dust wall that swallows the eastern ridge.
- **Three-tier alert band** — ink info band from forecast precip probability (label configurable, e.g. `MONSOON WATCH`), ochre advisory band and a pulsing red EAS-style warning band from an optional NWS alerts sensor (`alerts_entity`).
- **Giant serif temperature** over the scene with condition, high/low, and feels-like; text flips to cream at night so it stays readable.
- **24-hour chart** — smoothed temperature curve with precipitation-probability bars, auto-scaled, with "now" and overnight-low markers.
- **Conditions strip** — UV index with level, wind + gusts, humidity + dew point, pressure with trend arrow, sunrise · sunset.
- **Week ahead** — 7 days of hand-drawn ink-line condition icons, precip %, and low→high range bars on a shared scale, with a tick marking the current temperature on today's bar.
- **Tap anything** — the scene, strip cells, and week section open the more-info/history dialog for their entity.
- **Responsive** — container-query scaling; everything is proportional to card width.

## Requirements

- A weather entity that supports **daily and hourly forecasts** (e.g. [Pirate Weather](https://github.com/Pirate-Weather/pirate-weather-ha), Met.no, AccuWeather, OpenWeatherMap). The card subscribes to forecast updates via the modern `weather/subscribe_forecast` API (HA 2023.9+).
- The `sun` integration (enabled by default) for the realtime arc.
- *(Optional)* an NWS alerts sensor for the advisory/EAS tiers — either the [NWS Alerts](https://github.com/finity69x2/nws_alerts) HACS integration or any sensor whose state is the active-alert count with an `alerts` attribute listing `{event, severity, ends}`. Without it the card simply never shows tier 2/3 bands.

## Installation (HACS)

1. HACS → menu (⋮) → **Custom repositories**
2. Add `https://github.com/LoneWolf345/desert-almanac-card` with category **Dashboard** (Plugin)
3. Install **Desert Almanac Card** — HACS registers the resource automatically
4. Add the card to a dashboard:

```yaml
type: custom:desert-almanac-card
entity: weather.home
```

## Configuration

| Option | Default | Description |
|---|---|---|
| `entity` | *(required)* | Weather entity with daily + hourly forecast support |
| `sun_entity` | `sun.sun` | Sun entity used for the arc and day/night state |
| `title` | `THE DAILY ALMANAC` | Masthead kicker text |
| `location` | HA location name | Location shown after the title |
| `alert_label` | `RAIN WATCH` | Label for the precipitation band |
| `alert_threshold` | `25` | Precip probability (%) in the next 24 h that shows the band |
| `alerts_entity` | *(none)* | NWS alerts sensor for advisory/warning bands + haboob scene |
| `days` | `7` | Days in the Week Ahead section |

Example with everything:

```yaml
type: custom:desert-almanac-card
entity: weather.home
location: Maricopa, Arizona
alert_label: MONSOON WATCH
alert_threshold: 25
alerts_entity: sensor.nws_alerts
```

## Notes

- The card commits to its almanac look (sand paper, ink text) in light and dark themes alike.
- Sunrise/sunset are derived from `sun.sun`'s `next_rising`/`next_setting`, so no extra configuration is needed anywhere on Earth.
- Units follow your weather entity (°F/°C, in/mm, etc.).

## Versioning

This card follows Home Assistant's CalVer style: `YYYY.M.PATCH`. Current: **2026.8.2**.

---

Designed round-by-round on a Claude design canvas from a live Home Assistant data inventory; built by Claude Code.
