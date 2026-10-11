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

## Time-oriented (not tied to location)

| Idea | Source | Why it's a good demo | Key? | Status |
|---|---|---|---|---|
| People in space right now | Launch Library 2 + corquaid people-in-space feed | Two cached sources merged into a better result; partial failure falls back to one source | No | planned (`/space/people` done; card in progress) |
| Hacker News top stories | HN Firebase API | Combining many calls into one: the proxy fetches the story IDs, then the top 10 stories in parallel | No | |
| Upcoming rocket launches, with countdowns | Launch Library 2 | Respecting a rate limit (~15 requests/hour): server-side caching is what makes it usable | No | |
| NASA Astronomy Picture of the Day | NASA APOD | Hiding a key; one cached copy a day serves every visitor | Yes (free) | |
| On this day | Wikipedia "On this day" feed | Events, births and deaths for today's date; very easy | No | |
| Sky calendar | `astronomy-engine` (already in the API) | Next eclipse, equinox/solstice, meteor shower peaks, planet events; no new external source | No | |
| Space weather | NOAA SWPC | Solar flares and global Kp over the last 24 hours; leads into aurora alerts | No | |
| Asteroids passing Earth this week | NASA NeoWs | Closest approach compared with the Moon's distance; a small chart | Yes (same as APOD) | |
| Exchange rates | Frankfurter (ECB rates) | Daily update, 30-day sparkline; default currency from the Location card's country | No | |
| Recent significant earthquakes | USGS feed | Worldwide over the last 24 hours, with relative times | No | |
| Space news | Spaceflight News API | Latest headlines; pairs with launches | No | |
| Today at a glance | None (computed) | Day of year, week number, % of the year gone, days to the next holiday | No | |

Rejected: **Open Notify** (`astros.json`) for people in space. It's HTTP-only, which would have shown the proxy working around browser restrictions, but its crew list stopped updating in 2024.

## Patterns the site doesn't show yet

- **Hiding secrets in the proxy:** a GitHub card (repos, recent commits) with the token kept server-side. Brings in rate-limit headers and pagination.
- **Server-side caching you can see:** NASA APOD changes once a day; cache it at the proxy and show a cache-hit indicator.
- **User input + debouncing:** city search (Nominatim or Open-Meteo geocoding) as a manual third tier of the location cascade, so visitors can look up weather and sky for anywhere.

## UX ideas

- **Location source badge and map** (Leaflet + OSM tiles) showing the browser-vs-IP accuracy circle, so the cascade is visible.
- **"API trace" drawer** per card: upstream source, latency, cache status, proxy path. For a proxy demonstrator this is the thing to show off.
- Consistent loading, retry and rate-limit (429) states. Loading and error ghost cards are done.
