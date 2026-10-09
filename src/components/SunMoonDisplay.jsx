import { useQuery } from '@tanstack/react-query';
import { fetchSunMoon } from '../apis/astro';
import { fetchLocation } from '../apis/location';
import { toLabelCase } from '../util/labels';
import { useExpandScroll } from '../util/useExpandScroll';
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

const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const toCompass = (azimuth) => COMPASS_POINTS[Math.round(azimuth / 22.5) % 16];

const isToday = (date) => date.toDateString() === new Date().toDateString();

// "6:46 PM" today, "Tue 7:10 AM" on another day
const formatTime = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return isToday(date) ? time : `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

const formatCountdown = (iso) => {
  const minutes = Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000));
  return minutes < 60 ? `in ${minutes}m` : `in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

// Name the sky state from the sun's altitude, using the standard twilight bands
const sunState = (altitude) => {
  if (altitude >= 0) return 'above horizon';
  if (altitude >= -6) return 'civil twilight';
  if (altitude >= -12) return 'nautical twilight';
  if (altitude >= -18) return 'astronomical twilight';
  return 'night';
};

// Whichever of the next rise/set comes first
const nextEvent = ({ nextRise, nextSet }) => {
  if (!nextRise && !nextSet) return null;
  if (!nextSet || (nextRise && new Date(nextRise) < new Date(nextSet))) {
    return { label: 'Sunrise', time: nextRise };
  }
  return { label: 'Sunset', time: nextSet };
};

const SunMoonDisplay = () => {
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

  const latitude = locationData?.lat;
  const longitude = locationData?.lon;

  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['sunmoon', latitude, longitude],
    queryFn: () => fetchSunMoon(latitude, longitude),
    enabled: latitude != null && longitude != null,
    retry: 1,
    // Positions and countdowns are relative to now
    refetchInterval: 60000,
  });

  const { showMore, toggleShowMore, panelRef } = useExpandScroll();

  if (isLocationLoading || isLoading) {
    return <LoadingCard />;
  }

  if (isLocationError) {
    return <ErrorCard>Error fetching location data: {locationError?.message}</ErrorCard>;
  }

  if (isError) {
    return <ErrorCard>Error fetching sun &amp; moon data: {error?.message}</ErrorCard>;
  }

  const { sun, moon } = data;
  const nextPhase = moon.next?.[0];
  const sunEvent = nextEvent(sun);
  // Daytime is sunrise to sunset, i.e. the next sun event is a sunset. The sun's state leads
  // the card even when the moon is also up in the day.
  const daytime = sun.polar ? sun.polar === 'always_up' : sunEvent?.label === 'Sunset';

  const sunRows = [
    <ListItem key="sun-next" divider>
      <ListItemText
        primary={sunEvent ? sunEvent.label : 'Sunrise / Sunset'}
        secondary={
          sun.polar === 'always_up' ? 'Sun up all day'
            : sun.polar === 'always_down' ? 'Sun down all day'
              : sunEvent ? `${formatTime(sunEvent.time)} (${formatCountdown(sunEvent.time)})`
                : '—'
        } />
    </ListItem>,
    <ListItem key="sun-position" divider>
      <ListItemText
        primary="Sun Position"
        secondary={
          !sun.position ? '—'
            : sun.position.altitude >= 0 ? `${Math.round(sun.position.altitude)}° up, ${toCompass(sun.position.azimuth)}`
              : `${Math.round(sun.position.altitude)}°, ${sunState(sun.position.altitude)}`
        } />
    </ListItem>,
  ];

  const moonRows = [
    <ListItem key="moon-phase" divider>
      <ListItemText
        primary="Moon Phase"
        secondary={`${MOON_PHASE_EMOJI[moon.phase.name] ?? ''} ${toLabelCase(moon.phase.name)}, ${Math.round(moon.phase.illumination * 100)}% lit`} />
    </ListItem>,
    <ListItem key="moon-position" divider>
      <ListItemText
        primary="Moon Position"
        secondary={
          !moon.position ? '—'
            : moon.position.altitude >= 0 ? `${Math.round(moon.position.altitude)}° up, ${toCompass(moon.position.azimuth)}`
              : `Below horizon, rises ${formatTime(moon.nextRise)}`
        } />
    </ListItem>,
  ];

  return (
    <Box sx={{ position: 'relative', margin: '8px 8px 0px 8px' }}>
      <Paper ref={panelRef} elevation={3} sx={{ position: 'relative', padding: 2, pb: 5, height: '300px', overflowY: showMore ? 'auto' : 'hidden' }}>
        <Typography variant="h5" gutterBottom>
          Sun &amp; Moon
        </Typography>
        <List>

          {daytime ? [...sunRows, ...moonRows] : [...moonRows, ...sunRows]}
          {/* The next phase is the least time-sensitive, so it always comes last */}
          {nextPhase && (
            <ListItem key="moon-next" divider>
              <ListItemText
                primary={toLabelCase(nextPhase.name)}
                secondary={`${MOON_PHASE_EMOJI[nextPhase.name] ?? ''} ${formatDate(nextPhase.time)}`} />
            </ListItem>
          )}
        </List>
      </Paper>
      <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
        <IconButton onClick={toggleShowMore} size="small">
          {showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default SunMoonDisplay;
