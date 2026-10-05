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
  CircularProgress,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  Container,
  Box,
  IconButton,
} from '@mui/material';

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

// "from 7:41 PM · highest 52° SSE · mag 0.2 in Cetus". start/end are clipped to
// the window, so matching a window edge means it's up when the window opens or still up at midnight.
const planetValue = ({ start, peak, end, magnitude, constellation }, viewWindow) => {
  const upAtStart = start.time === viewWindow.start;
  const upAtEnd = end.time === viewWindow.end;
  const when = upAtStart && upAtEnd ? 'up all evening'
    : upAtStart ? `until ${formatTime(end.time)}`
      : upAtEnd ? `from ${formatTime(start.time)}`
        : `${formatTime(start.time)} – ${formatTime(end.time)}`;
  const where = `highest ${Math.round(peak.altitude)}° ${toCompass(peak.azimuth)}`;
  const brightness = magnitude != null ? `mag ${magnitude.toFixed(1)}${constellation ? ` in ${constellation}` : ''}` : constellation;
  return [when, where, brightness].filter(Boolean).join(' · ');
};

// window.darkness/darkest are newer than the rest of the API; fall back to the sun's twilight times
const darkSkyValue = (viewWindow, sun) => {
  const fullyDark = viewWindow.darkness ? viewWindow.darkness.astronomical : sun.twilight?.astronomical?.end;
  const darkest = viewWindow.darkest ?? (fullyDark ? 'astronomical' : null);
  if (darkest === 'astronomical' && fullyDark) return `Fully dark from ${formatTime(fullyDark)}`;
  const nautical = viewWindow.darkness?.nautical;
  return nautical ? `Never fully dark tonight · stars from ${formatTime(nautical)}` : 'Never fully dark tonight';
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

// "Partly cloudy", or "Clear all evening" when cover hardly changes over the window
const skyLabel = ({ sky, steady }) => {
  const label = SKY_LABEL[sky] ?? toLabelCase(sky);
  return steady ? `${label} all evening` : label;
};

// Whether the moon is up during the window, from the rise/set times the API returns.
// The latest event at or before the window start says whether it is up at the start;
// any events inside the window say when that changes. Returns null when it can't tell.
const moonInWindow = (moon, viewWindow) => {
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
  const during = events.find((e) => e.date > start && e.date < end);

  if (during) {
    return { up: true, text: during.type === 'rise' ? `rises ${formatTime(during.time)}` : `sets ${formatTime(during.time)}` };
  }
  if (!before) return null;
  return before.type === 'rise'
    ? { up: true, text: 'up all evening' }
    : { up: false, text: 'Below horizon all evening' };
};

// The phase only matters if the moon is up to light the sky
const moonValue = (moon, when) => {
  if (when && !when.up) return when.text;
  const phase = `${MOON_PHASE_EMOJI[moon.phase.name] ?? ''} ${toLabelCase(moon.phase.name)} · ${Math.round(moon.phase.illumination * 100)}%`;
  return when ? `${phase} · ${when.text}` : phase;
};

// clearest is null when the cover is steady, so no hour stands out
const cloudsValue = ({ meanCover, minCover, maxCover, clearest }) => {
  const range = `${meanCover}% avg (${minCover}–${maxCover}%)`;
  return clearest ? `${range} · clearest ${formatTime(clearest.time)}` : range;
};

const Row = ({ label, value, action }) => (
  <ListItem disableGutters dense divider secondaryAction={action}>
    <ListItemText primary={label} secondary={value} />
  </ListItem>
);

const CloudBars = ({ hourly }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, mt: 1 }}>
    {hourly.map((h) => (
      <Box key={h.time} title={`${formatTime(h.time)} · ${h.cover}% cloud`} sx={{ flex: 1, textAlign: 'center' }}>
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
        <Typography variant="caption" color="text.secondary">{formatHour(h.time)}</Typography>
      </Box>
    ))}
  </Box>
);

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
    enabled: !!(latitude && longitude),
    retry: 1,
    // This card only uses the window-based parts of the response (forecast, passes,
    // rise/set times), which change slowly, so it needn't follow the API's 60 s max-age
    refetchInterval: 15 * 60000,
  });

  if (isLocationLoading || isLoading) {
    return <Container sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Container>;
  }

  if (isLocationError) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">Error fetching location data: {locationError?.message}</Alert></Container>;
  }

  if (isError) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">Error fetching tonight&apos;s sky: {error?.message}</Alert></Container>;
  }

  const { status, reason, window: viewWindow, sun, moon, clouds, objects, unavailable } = data;
  const moonWhen = viewWindow && moonInWindow(moon, viewWindow);
  // Kinds the card doesn't know yet are skipped
  const passes = (objects ?? [])
    .filter((o) => o.kind === 'satellite')
    .flatMap((o) => (o.passes ?? []).map((p) => ({ ...p, id: o.id })));
  // Brightest first (lower magnitude is brighter)
  const planets = (objects ?? [])
    .filter((o) => o.kind === 'planet')
    .sort((a, b) => (a.magnitude ?? 99) - (b.magnitude ?? 99));
  const unavailableObjects = Object.entries(unavailable ?? {})
    .filter(([key]) => key.startsWith('objects.'))
    .map(([key, why]) => ({ id: key.slice('objects.'.length), why }));

  return (
    <Box sx={{ position: 'relative', margin: '8px 8px 0px 8px' }}>
      <Paper ref={panelRef} elevation={3} sx={{ position: 'relative', padding: 2, pb: 5, height: '300px', overflowY: showMore ? 'auto' : 'hidden' }}>
        <Typography variant="h5" gutterBottom>
          Night Sky
          {viewWindow && (
            <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
              {formatTime(viewWindow.start)} – {formatTime(viewWindow.end)}
            </Typography>
          )}
        </Typography>

        {status === 'na' && <Alert severity="info" sx={{ mb: 1 }}>{reason}</Alert>}

        <List disablePadding>
          {clouds && (
            <Row
              label={`Clouds · ${skyLabel(clouds.summary)}`}
              value={cloudsValue(clouds.summary)} />
          )}
          {status === 'ok' && !clouds && (
            <Row label="Clouds" value={unavailable?.clouds ?? 'Not available'} />
          )}
          <Row label="Moon" value={moonValue(moon, moonWhen)} />
          {planets.map((p) => (
            <Row
              key={p.id}
              label={p.name}
              value={planetValue(p, viewWindow)}
              action={(
                <IconButton edge="end" size="small" aria-label={`View ${p.name} in the sky`} title="Show in sky view"
                  onClick={() => setSkyView({ focusId: p.id })}>
                  <ExploreIcon fontSize="small" />
                </IconButton>
              )} />
          ))}
          {passes.map((p) => (
            <Row key={`${p.id}-${p.start.time}`} label={`${objectLabel(p.id)} pass`} value={passValue(p)} />
          ))}
          {unavailableObjects.map(({ id, why }) => (
            <Row key={id} label={objectLabel(id)} value={why} />
          ))}
          {status === 'ok' && (
            <Row label="Dark sky" value={darkSkyValue(viewWindow, sun)} />
          )}
        </List>

        {clouds?.hourly?.length > 0 && <CloudBars hourly={clouds.hourly} />}

        {showMore && clouds?.hourly?.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Hourly · low / mid / high
            </Typography>
            <List disablePadding>
              {clouds.hourly.map((h) => (
                <Row
                  key={h.time}
                  label={`${formatTime(h.time)} · ${h.cover}%`}
                  value={`${h.low} / ${h.mid} / ${h.high}% · visibility ${Math.round(h.visibilityMeters / 1000)} km`} />
              ))}
            </List>
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
      {/* Pass rows can overflow the card even without hourly detail, so expand is always offered */}
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
