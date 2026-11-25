import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTonight } from '../apis/astro';
import { fetchLocation } from '../apis/location';
import { toLabelCase } from '../util/labels';
import { useExpandScroll } from '../util/useExpandScroll';
import SkyView from './SkyView';
import ExploreIcon from '@mui/icons-material/Explore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  Box,
  IconButton,
} from '@mui/material';
import { LoadingCard, ErrorCard } from './GhostCard';

const MOON_PHASE_EMOJI = {
  new_moon: '🌑',
  waxing_crescent: '🌒',
  first_quarter: '🌓',
  waxing_gibbous: '🌔',
  full_moon: '🌕',
  waning_gibbous: '🌖',
  last_quarter: '🌗',
  waning_crescent: '🌘',
};

// "7:46 PM"
const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';

const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const toCompass = (azimuth) => COMPASS_POINTS[Math.round(azimuth / 22.5) % 16];

// Short names for objects, keyed by id, for row labels and unavailable reasons
const OBJECT_LABEL = { iss: 'ISS' };

const objectLabel = (id) => OBJECT_LABEL[id] ?? toLabelCase(id);

// "1m 30s"
const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

// "8:46 PM · NW → 25° NW · vanishes, 1m 30s"
const passValue = ({ start, peak, endsInShadow, durationSeconds }) => {
  const ending = endsInShadow ? 'vanishes' : 'sets';
  return `${formatTime(start.time)} · ${toCompass(start.azimuth)} → ${Math.round(peak.altitude)}° ${toCompass(peak.azimuth)} · ${ending}, ${formatDuration(durationSeconds)}`;
};

// "7:13p – 6:44a" for the card title, where a full "7:13 PM – 6:44 AM" would wrap
const formatCompact = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?([AP])M$/i, (_, p) => p.toLowerCase());

// What to call the window in phrases like "up all night": a window to dawn is the whole night,
// one to midnight (the API's default) only the evening
const windowSpan = (viewWindow) => (viewWindow?.until === 'dawn' ? 'night' : 'evening');

// "from 7:41 PM · highest 52° SSE · mag 0.2 in Cetus". start/end are clipped to the span the
// API searched (opensAt to closesAt), so matching an edge means it's up when that span opens or
// still up when it closes. Planets are searched over the whole window, stars from nautical dusk
// to nautical dawn.
const sightingValue = ({ start, peak, end, magnitude, constellation }, opensAt, closesAt, span) => {
  const upAtStart = start.time === opensAt;
  const upAtEnd = end.time === closesAt;
  const when = upAtStart && upAtEnd ? `up all ${span}`
    : upAtStart ? `until ${formatTime(end.time)}`
      : upAtEnd ? `from ${formatTime(start.time)}`
        : `${formatTime(start.time)} – ${formatTime(end.time)}`;
  const where = `highest ${Math.round(peak.altitude)}° ${toCompass(peak.azimuth)}`;
  const brightness = magnitude != null ? `mag ${magnitude.toFixed(1)}${constellation ? ` in ${constellation}` : ''}` : constellation;
  return [when, where, brightness].filter(Boolean).join(' · ');
};

// How many names fit on the collapsed card's one-line summary
const VISIBLE_SUMMARY_COUNT = 3;

// "Saturn, ISS, Arcturus +11 more": planets, then the ISS, then stars, each brightest first
const visibleSummary = (names) => {
  if (names.length === 0) return 'No planets or bright stars up';
  const rest = names.length - VISIBLE_SUMMARY_COUNT;
  const named = names.slice(0, VISIBLE_SUMMARY_COUNT).join(', ');
  return rest > 0 ? `${named} +${rest} more` : named;
};

// "from 8:02 PM", or "8:02 PM – 5:30 AM" when the window runs to dawn and says when it ends
const timeSpan = (from, until) => (until ? `${formatTime(from)} – ${formatTime(until)}` : `from ${formatTime(from)}`);

// window.darkness/darkest are newer than the rest of the API; fall back to the sun's twilight times.
// window.dawn is only there for a window that runs to dawn.
const darkSkyValue = (viewWindow, sun) => {
  const fullyDark = viewWindow.darkness ? viewWindow.darkness.astronomical : sun.twilight?.astronomical?.end;
  const darkest = viewWindow.darkest ?? (fullyDark ? 'astronomical' : null);
  if (darkest === 'astronomical' && fullyDark) return `Fully dark ${timeSpan(fullyDark, viewWindow.dawn?.astronomical)}`;
  const nautical = viewWindow.darkness?.nautical;
  return nautical
    ? `Never fully dark tonight · stars ${timeSpan(nautical, viewWindow.dawn?.nautical)}`
    : 'Never fully dark tonight';
};

// "7p" for the hourly cloud bars
const formatHour = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric' }).replace(/\s?([AP])M$/i, (_, p) => p.toLowerCase());

const SKY_LABEL = {
  clear: 'Clear',
  partly_cloudy: 'Partly cloudy',
  mostly_cloudy: 'Mostly cloudy',
  cloudy: 'Cloudy',
};

// "Partly cloudy", or "Clear all night" when cover hardly changes over the window
const skyLabel = ({ sky, steady }, span) => {
  const label = SKY_LABEL[sky] ?? toLabelCase(sky);
  return steady ? `${label} all ${span}` : label;
};

// Whether the moon is up during the window, from the rise/set times the API returns.
// The latest event at or before the window start says whether it is up at the start;
// any events inside the window say when that changes. A window to dawn is long enough for
// the moon to both rise and set in it. Returns null when it can't tell.
const moonInWindow = (moon, viewWindow) => {
  const span = windowSpan(viewWindow);
  const start = new Date(viewWindow.start);
  const end = new Date(viewWindow.end);
  const events = [
    { type: 'rise', time: moon.rise },
    { type: 'set', time: moon.set },
    { type: 'rise', time: moon.nextRise },
    { type: 'set', time: moon.nextSet },
  ]
    .filter((e) => e.time)
    .map((e) => ({ ...e, date: new Date(e.time) }))
    // nextRise/nextSet can repeat rise/set
    .filter((e, i, all) => all.findIndex((o) => o.type === e.type && +o.date === +e.date) === i)
    .sort((a, b) => a.date - b.date);

  const before = events.filter((e) => e.date <= start).pop();
  const during = events.filter((e) => e.date > start && e.date < end);

  if (during.length) {
    // "rises 9:40 PM", or "sets 1:20 AM, rises 11:05 PM" style when both happen
    const text = during.map((e) => `${e.type === 'rise' ? 'rises' : 'sets'} ${formatTime(e.time)}`).join(', ');
    return { up: true, text };
  }
  if (!before) return null;
  return before.type === 'rise'
    ? { up: true, text: `up all ${span}` }
    : { up: false, text: `Below horizon all ${span}` };
};

// The phase only matters if the moon is up to light the sky
const moonValue = (moon, when) => {
  if (when && !when.up) return when.text;
  const phase = `${MOON_PHASE_EMOJI[moon.phase.name] ?? ''} ${toLabelCase(moon.phase.name)} · ${Math.round(moon.phase.illumination * 100)}%`;
  return when ? `${phase} · ${when.text}` : phase;
};

// clearest is null when the cover is steady, so no hour stands out
// "Partly cloudy · clearest 9:00 PM", or "Clear all night"
const cloudsValue = (summary, span) =>
  summary.clearest ? `${skyLabel(summary, span)} · clearest ${formatTime(summary.clearest.time)}` : skyLabel(summary, span);

// "12% avg (4–30%)"
const coverValue = ({ meanCover, minCover, maxCover }) => `${meanCover}% avg (${minCover}–${maxCover}%)`;

// Same row style as the other cards
const Row = ({ label, value, action }) => (
  <ListItem divider secondaryAction={action}>
    <ListItemText primary={label} secondary={value} />
  </ListItem>
);

const SectionHeading = ({ children }) => (
  <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1, px: 2 }}>
    {children}
  </Typography>
);

// Hour labels that fit under the bars; a window to dawn has more hours than that, so only
// every other one is labelled (each bar still has its time in its tooltip)
const MAX_HOUR_LABELS = 8;

const CloudBars = ({ hourly }) => {
  const labelEvery = Math.ceil(hourly.length / MAX_HOUR_LABELS);
  return (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, mt: 1 }}>
    {hourly.map((h, i) => (
      // minWidth 0 lets the bars share the width however many there are
      <Box key={h.time} title={`${formatTime(h.time)} · ${h.cover}% cloud`} sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        <Box sx={{ height: 40, display: 'flex', alignItems: 'flex-end', bgcolor: 'action.hover', borderRadius: 0.5 }}>
          <Box
            sx={{
              width: '100%',
              // Keep a sliver visible at 0% so the hour still reads as a bar
              height: `${Math.max(h.cover, 3)}%`,
              bgcolor: 'text.secondary',
              opacity: 0.6,
              borderRadius: 0.5,
            }} />
        </Box>
        {/* Unlabelled bars keep an empty line so all the bars stay aligned */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>
          {i % labelEvery === 0 ? formatHour(h.time) : ' '}
        </Typography>
      </Box>
    ))}
  </Box>
  );
};

const NightSkyDisplay = () => {
  const {
    data: locationData,
    isLoading: isLocationLoading,
    isError: isLocationError,
    error: locationError,
  } = useQuery({
    queryKey: ['location'],
    queryFn: () => fetchLocation(),
    retry: 1,
  });

  const { showMore, toggleShowMore, panelRef } = useExpandScroll();
  // null when closed, otherwise { focusId } (focusId null for no particular object)
  const [skyView, setSkyView] = useState(null);

  const latitude = locationData?.lat;
  const longitude = locationData?.lon;

  const { data, error, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['tonight', latitude, longitude],
    queryFn: () => fetchTonight(latitude, longitude),
    enabled: latitude != null && longitude != null,
    retry: 1,
    // This card only uses the window-based parts of the response (forecast, passes,
    // rise/set times), which change slowly, so it needn't follow the API's 60 s max-age
    refetchInterval: 15 * 60000,
  });

  if (isLocationLoading || isLoading) {
    return <LoadingCard />;
  }

  if (isLocationError) {
    return <ErrorCard>Error fetching location data: {locationError?.message}</ErrorCard>;
  }

  if (isError) {
    return <ErrorCard>Error fetching tonight&apos;s sky: {error?.message}</ErrorCard>;
  }

  const { status, reason, window: viewWindow, sun, moon, clouds, objects, unavailable } = data;
  const moonWhen = viewWindow && moonInWindow(moon, viewWindow);
  const span = windowSpan(viewWindow);
  // Stars are searched to nautical dawn, when they fade, if the window runs to dawn
  const starsUntil = viewWindow?.dawn?.nautical ?? viewWindow?.end;
  // Kinds the card doesn't know yet are skipped
  const passes = (objects ?? [])
    .filter((o) => o.kind === 'satellite')
    .flatMap((o) => (o.passes ?? []).map((p) => ({ ...p, id: o.id })));
  // Brightest first (lower magnitude is brighter)
  const planets = (objects ?? [])
    .filter((o) => o.kind === 'planet')
    .sort((a, b) => (a.magnitude ?? 99) - (b.magnitude ?? 99));
  const stars = (objects ?? [])
    .filter((o) => o.kind === 'star')
    .sort((a, b) => (a.magnitude ?? 99) - (b.magnitude ?? 99));
  const visibleNames = [
    ...planets.map((p) => p.name),
    ...(passes.length ? [objectLabel('iss')] : []),
    ...stars.map((s) => s.name),
  ];
  const unavailableObjects = Object.entries(unavailable ?? {})
    .filter(([key]) => key.startsWith('objects.'))
    .map(([key, why]) => ({ id: key.slice('objects.'.length), why }));

  // Row button that opens the sky view centred on an object
  const showInSky = (o) => (
    <IconButton edge="end" size="small" aria-label={`View ${o.name} in the sky`} title="Show in sky view"
      onClick={() => setSkyView({ focusId: o.id })}>
      <ExploreIcon fontSize="small" />
    </IconButton>
  );

  return (
    <Box sx={{ position: 'relative', margin: '8px 8px 0px 8px' }}>
      <Paper ref={panelRef} elevation={3} sx={{ position: 'relative', padding: 2, pb: 5, height: '300px', overflowY: showMore ? 'auto' : 'hidden' }}>
        {/* Right padding keeps the window time clear of the sky view button */}
        <Typography variant="h5" gutterBottom sx={{ pr: 4 }}>
          Night Sky
          {viewWindow && (
            <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
              {viewWindow.until === 'dawn'
                ? `${formatCompact(viewWindow.start)} – ${formatCompact(viewWindow.end)}`
                // A window to midnight (the API default) always ends there
                : `from ${formatTime(viewWindow.start)}`}
            </Typography>
          )}
        </Typography>

        {status === 'na' && <Alert severity="info" sx={{ mb: 1 }}>{reason}</Alert>}

        {/* Three rows collapsed, like the other cards; expanding continues the same list */}
        <List>
          {clouds && <Row label="Clouds" value={cloudsValue(clouds.summary, span)} />}
          {status === 'ok' && !clouds && (
            <Row label="Clouds" value={unavailable?.clouds ?? 'Not available'} />
          )}
          <Row label="Moon" value={moonValue(moon, moonWhen)} />
          {status === 'ok' && <Row label="Visible tonight" value={visibleSummary(visibleNames)} />}
          {showMore && status === 'ok' && (
            <>
              <Row label="Dark sky" value={darkSkyValue(viewWindow, sun)} />
              {planets.map((p) => (
                <Row
                  key={p.id}
                  label={p.name}
                  value={sightingValue(p, viewWindow.start, viewWindow.end, span)}
                  action={showInSky(p)} />
              ))}
              {passes.map((p) => (
                <Row key={`${p.id}-${p.start.time}`} label={`${objectLabel(p.id)} pass`} value={passValue(p)} />
              ))}
              {unavailableObjects.map(({ id, why }) => (
                <Row key={id} label={objectLabel(id)} value={why} />
              ))}
            </>
          )}
        </List>

        {showMore && status === 'ok' && (
          <>
            {stars.length > 0 && (
              <>
                <SectionHeading>
                  Bright stars · {timeSpan(viewWindow.darkness.nautical, viewWindow.dawn?.nautical)}
                </SectionHeading>
                <List>
                  {stars.map((s) => (
                    <Row
                      key={s.id}
                      label={s.name}
                      value={sightingValue(s, viewWindow.darkness.nautical, starsUntil, span)}
                      action={showInSky(s)} />
                  ))}
                </List>
              </>
            )}

            {clouds?.hourly?.length > 0 && (
              <>
                <SectionHeading>Cloud cover · {coverValue(clouds.summary)}</SectionHeading>
                <Box sx={{ px: 2 }}><CloudBars hourly={clouds.hourly} /></Box>
                <List>
                  {clouds.hourly.map((h) => (
                    <Row
                      key={h.time}
                      label={`${formatTime(h.time)} · ${h.cover}%`}
                      value={`low ${h.low} · mid ${h.mid} · high ${h.high}% · ${Math.round(h.visibilityMeters / 1000)} km visibility`} />
                  ))}
                </List>
              </>
            )}
          </>
        )}
      </Paper>
      {viewWindow && (
        <>
          <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
            <IconButton onClick={() => setSkyView({ focusId: null })} size="small" aria-label="Open sky view" title="Sky view">
              <ExploreIcon />
            </IconButton>
          </Box>
          <SkyView
            open={!!skyView}
            onClose={() => setSkyView(null)}
            focusId={skyView?.focusId}
            data={data}
            latitude={latitude}
            longitude={longitude}
            anchorTime={dataUpdatedAt} />
        </>
      )}
      {/* Dark-sky time, planets, passes and stars are all under expand */}
      {status === 'ok' && (
        <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
          <IconButton onClick={toggleShowMore} size="small">
            {showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default NightSkyDisplay;
