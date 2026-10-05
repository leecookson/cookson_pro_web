# API: Sun & Moon times

Rise/set/twilight times and moon phase for a location and local date. Consumed by the Astro card (`src/components/AstroDisplay.jsx`) via `fetchSunMoon` in `src/apis/astro.js`.

## Request

```
GET /api/v1/astro/sunmoon/:lat/:lon?date=YYYY-MM-DD&tz=<IANA zone>
```

| Param | In | Required | Notes |
|---|---|---|---|
| `lat` | path | yes | Decimal degrees, -90..90 |
| `lon` | path | yes | Decimal degrees, -180..180 |
| `date` | query | no | Local calendar date in `tz`. Default: today in `tz` |
| `tz` | query | no | IANA zone, e.g. `America/Los_Angeles`. Default: `UTC`. Defines the day boundaries for `date` and the offset used in returned timestamps |

The client sends the browser's zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and today's date in that zone.

## Response `200`

```json
{
  "query": {
    "lat": 37.77,
    "lon": -122.42,
    "date": "2026-10-05",
    "tz": "America/Los_Angeles"
  },
  "sun": {
    "rise": "2026-10-05T07:09:00-07:00",
    "set": "2026-10-05T18:46:00-07:00",
    "transit": "2026-10-05T12:57:00-07:00",
    "dayLengthSeconds": 41842,
    "polar": null,
    "position": { "altitude": 27.9, "azimuth": 228.4 },
    "nextRise": "2026-10-06T07:10:00-07:00",
    "nextSet": "2026-10-05T18:46:00-07:00",
    "twilight": {
      "civil":        { "begin": "2026-10-05T06:42:00-07:00", "end": "2026-10-05T19:12:00-07:00" },
      "nautical":     { "begin": "2026-10-05T06:12:00-07:00", "end": "2026-10-05T19:42:00-07:00" },
      "astronomical": { "begin": "2026-10-05T05:41:00-07:00", "end": "2026-10-05T20:13:00-07:00" }
    }
  },
  "moon": {
    "rise": "2026-10-05T01:40:00-07:00",
    "set": "2026-10-05T16:16:00-07:00",
    "transit": "2026-10-05T09:03:00-07:00",
    "position": { "altitude": 42.1, "azimuth": 251.0 },
    "nextRise": "2026-10-06T02:42:00-07:00",
    "nextSet": "2026-10-05T16:16:00-07:00",
    "phase": {
      "name": "waning_crescent",
      "illumination": 0.26,
      "ageDays": 24.5,
      "fraction": 0.83
    },
    "next": [
      { "name": "new_moon",      "time": "2026-10-10T08:50:00-07:00" },
      { "name": "first_quarter", "time": "2026-10-18T09:13:00-07:00" }
    ]
  }
}
```

Example values were computed with `astronomy-engine@2.1.19`, rounded to the minute. The `position`, `nextRise` and `nextSet` values are illustrative, for a request made at about 2:30 PM local time.

### Field rules

- **Timestamps** are ISO 8601 strings with the offset of `tz`. Any event that does not happen on that local date is `null`. Moonrise or moonset is often `null`, because the moon rises about 50 minutes later each day. If the server can work out the next occurrence after the date, it may return that instead of `null`, but must then be consistent for all moon fields.
- **`position`** (sun and moon): topocentric `altitude` (degrees above the horizon; negative is below) and `azimuth` (degrees clockwise from true north), both at the time of the request. Altitude includes atmospheric refraction.
- **`nextRise` / `nextSet`** (sun and moon): the next occurrence after the time of the request, which may fall after `date`. These are `null` if there is none within 2 days (polar day or night). Unlike `rise`/`set`, they don't depend on `date`; the Sun & Moon card uses them for "next sunrise/sunset".
- **`sun.polar`** is `null` normally, `"always_up"` (midnight sun) or `"always_down"` (polar night). When it is set, `rise`/`set` are `null` and `dayLengthSeconds` is `86400` or `0`.
- **`twilight.*.begin/end`** are `null` when the sun never gets that low (e.g. summer at high latitude has no astronomical night).
- **`moon.phase.name`** is one of: `new_moon`, `waxing_crescent`, `first_quarter`, `waxing_gibbous`, `full_moon`, `waning_gibbous`, `last_quarter`, `waning_crescent`.
- **`moon.phase.illumination`**: lit fraction of the disc, 0..1.
- **`moon.phase.fraction`**: position in the synodic cycle, 0..1 (0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter). Phase values are computed at local noon on `date`.
- **`moon.next`**: the next 2 principal phases (new, first quarter, full, last quarter) after local noon on `date`, in time order.

## Errors

Non-2xx with the app's shared error body: `{ "status": "fail", "message": "<message>" }`.

| Status | When |
|---|---|
| `400` | lat/lon out of range or not numeric, malformed `date`, unknown `tz` |
| `502` | Upstream provider failed (if an external API backs this) |

## Caching

`position`, `nextRise` and `nextSet` depend on the time of the request, so whole responses can only be cached briefly: `Cache-Control: public, max-age=60`. Everything else depends only on `(lat, lon, date, tz)`, so you can cache it internally for longer if computing it is expensive. Rounding lat/lon to 2 decimal places (~1 km) changes the times by seconds at most. The card refreshes about once a minute.

## Implementation

Computed locally with `astronomy-engine@2.1.19`, with no upstream call and no key, so the `502` case does not apply today. The response shape does not depend on the provider. If a field later needs a live source (e.g. USNO `aa.usno.navy.mil/api/rstt/oneday`), this contract stays the same.
