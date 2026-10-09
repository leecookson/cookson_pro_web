# Feature ideas

A backlog of APIs and UX ideas for this site. The site shows API integration through the `cookson_pro_api` proxy, using the browser → IP location cascade. Update the status when you start or finish an item.

Status: **done**, **planned**, or blank for not started.

## Location-driven (reuse the existing cascade)

| Idea | Source | Why it's a good demo | Key? | Status |
|---|---|---|---|---|
| Sun/moon times and moon phase | `astronomy-engine` (local), USNO as a live option | Fits next to Astro; "dark enough to stargaze?" combines it with cloud cover | No | done (Sun & Moon card, `/astro/sunmoon`) |
| ISS / bright satellite passes | CelesTrak TLEs + local propagation; N2YO for passes | Live data; distance and bearing from the user; drawn on the sky view | N2YO only | done (in `/astro/tonight`) |
| Cloud forecast for tonight | Open-Meteo forecast | Combines sources server-side; per-source caching and partial failure | No | done (in `/astro/tonight`) |
| Air quality | Open-Meteo Air Quality, OpenAQ | Gauge/color-scale UX on the Weather card | No | done (Weather card, `/weather/air`, US and EU scales) |
| Aurora chance / Kp index | NOAA SWPC Kp, OVATION grid | Live feed; a large grid reduced to a value for one location | No | |
| Nearby earthquakes | USGS GeoJSON feeds | Radius filtering, sorting, relative times ("3h ago") | No | |
| What's near me | Wikipedia geosearch | Turns coordinates into readable content with thumbnails and links | No | |
| Public holidays | Nager.Date, by country from the IP lookup | Uses the non-coordinate fields of the location response | No | |
| Meteor shower outlook | Static shower calendar + moon illumination | No live API; fits as a new object type in `/astro/tonight` | No | |
| Sky darkness / light pollution | Light-pollution map data | Shows hiding a key behind the proxy | Usually | |

## Patterns the site doesn't show yet

- **Hiding secrets in the proxy:** a GitHub card (repos, recent commits) with the token kept server-side. Brings in rate-limit headers and pagination.
- **Server-side caching you can see:** NASA APOD changes once a day; cache it at the proxy and show a cache-hit indicator.
- **User input + debouncing:** city search (Nominatim or Open-Meteo geocoding) as a manual third tier of the location cascade, so visitors can look up weather and sky for anywhere.
- **Countdowns and timers:** upcoming rocket launches (Launch Library 2).

## UX ideas

- **Location source badge and map** (Leaflet + OSM tiles) showing the browser-vs-IP accuracy circle, so the cascade is visible.
- **"API trace" drawer** per card: upstream source, latency, cache status, proxy path. For a proxy demonstrator this is the thing to show off.
- Consistent loading, retry and rate-limit (429) states. Loading and error ghost cards are done.
