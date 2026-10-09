import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWeather, fetchAirQuality } from '../apis/weather';
import { fetchLocation } from '../apis/location';
import { sigDigits } from '../util/labels';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  Box, IconButton, Chip
} from '@mui/material';
import { LoadingCard, ErrorCard } from './GhostCard';
import { toLabelCase } from '../util/labels';
import { useExpandScroll } from '../util/useExpandScroll';
import { isSamePlace } from '../util/placeName';
import { AQI_SCALES, POLLUTANT_LABELS, uvLabel, textColorOn } from '../util/airQuality';

// "US 55 · Moderate" in the category's color, or an outlined "US —" when the scale has no value
const AqiChip = ({ scale, reading }) => {
  const { name, categories } = AQI_SCALES[scale];
  const category = reading && categories[reading.category];
  if (!category) {
    return <Chip size="small" variant="outlined" label={`${name} —`} />;
  }
  return (
    <Chip
      size="small"
      label={`${name} ${reading.value} · ${category.short}`}
      title={`${name} AQI: ${category.label}`}
      sx={{ bgcolor: category.color, color: textColorOn(category.color) }} />
  );
};

// Kind of weather from OpenWeatherMap's condition code (weather[0].id):
// https://openweathermap.org/weather-conditions. `night` swaps the sun for a moon when clear.
const conditionKind = (id, night) => {
  if (id >= 200 && id < 300) return { emoji: '⛈️', kind: 'Thunderstorm' };
  if (id >= 300 && id < 400) return { emoji: '🌦️', kind: 'Drizzle' };
  if (id >= 500 && id < 600) return { emoji: '🌧️', kind: 'Rain' };
  if (id >= 600 && id < 700) return { emoji: '🌨️', kind: 'Snow' };
  if (id === 781) return { emoji: '🌪️', kind: 'Tornado' };
  if (id >= 700 && id < 800) return { emoji: '🌫️', kind: null }; // mist, fog, haze, smoke, dust: use OWM's own word
  if (id === 800) return { emoji: night ? '🌙' : '☀️', kind: 'Clear' };
  if (id === 801) return { emoji: night ? '🌙' : '🌤️', kind: 'Mostly clear' };
  if (id === 802) return { emoji: '⛅', kind: 'Partly cloudy' };
  if (id === 803) return { emoji: '🌥️', kind: 'Mostly cloudy' };
  if (id === 804) return { emoji: '☁️', kind: 'Cloudy' };
  return { emoji: '', kind: null };
};

// "🌧️ Rain · light rain". For clear and cloudy skies (800-804) the kind already says it
// better than OWM's description ("broken clouds"), so that is left off.
const conditionsValue = (weather) => {
  if (!weather) return '—';
  const { emoji, kind } = conditionKind(weather.id, weather.icon?.endsWith('n'));
  const label = kind ?? weather.main;
  const sky = weather.id >= 800 && weather.id <= 804;
  const detail = !sky && weather.description && weather.description.toLowerCase() !== label.toLowerCase()
    ? ` · ${weather.description}` : '';
  return `${emoji} ${label}${detail}`.trim();
};

const WeatherDisplay = () => {
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
    queryKey: ['weather', latitude, longitude],
    queryFn: () => fetchWeather(latitude, longitude),
    enabled: latitude != null && longitude != null,
  });

  // Separate from the weather query, so an air quality failure only affects its own rows
  const { data: air, error: airError } = useQuery({
    queryKey: ['airquality', latitude, longitude],
    queryFn: () => fetchAirQuality(latitude, longitude),
    enabled: latitude != null && longitude != null,
    retry: 1,
    refetchInterval: 30 * 60000,
  });

  const { showMore, toggleShowMore, panelRef } = useExpandScroll();

  if (isLocationLoading || isLoading) {
    return <LoadingCard />;
  }

  if (isLocationError) {
    return <ErrorCard>Error fetching location data: {locationError?.message}</ErrorCard>;
  }

  if (isError) {
    return <ErrorCard>Error fetching data: {error?.message}</ErrorCard>;
  }

  const keysToSkip = ['temp', 'feels_like'];

  const rows = [
    // Only when OpenWeatherMap reports for a different town than the Location card shows
    data?.name && !isSamePlace(locationData?.city, data.name) && (
      <ListItem key="reported-for" divider>
        <ListItemText primary="Reported For" secondary={data.name} />
      </ListItem>
    ),
    <ListItem key="conditions" divider>
      <ListItemText primary="Conditions" secondary={conditionsValue(data.weather?.[0])} />
    </ListItem>,
    <ListItem key="temp" divider>
      <ListItemText primary="Temp (C)" secondary={`${sigDigits(data.main.temp, 3)} · feels like ${sigDigits(data.main.feels_like, 3)}`} />
    </ListItem>,
    // Hidden when neither scale has a value
    (air?.aqi?.us || air?.aqi?.eu) && (
      <ListItem key="air-quality" divider>
        <ListItemText
          primary="Air Quality"
          slotProps={{ secondary: { component: 'div' } }}
          secondary={
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              <AqiChip scale="us" reading={air.aqi.us} />
              <AqiChip scale="eu" reading={air.aqi.eu} />
            </Box>
          } />
      </ListItem>
    ),
  ].filter(Boolean);

  // Air quality details, shown only when expanded
  const dominantValue = air && ['us', 'eu']
    .filter((scale) => air.aqi[scale]?.dominant)
    .map((scale) => `${AQI_SCALES[scale].name}: ${POLLUTANT_LABELS[air.aqi[scale].dominant]}`)
    .join(' · ');

  const airDetailRows = airError ? [
    <ListItem key="air-error" divider>
      <ListItemText primary="Air Quality" secondary={`Unavailable: ${airError.message}`} />
    </ListItem>,
  ] : air ? [
    dominantValue && (
      <ListItem key="air-dominant" divider>
        <ListItemText primary="Main Pollutant" secondary={dominantValue} />
      </ListItem>
    ),
    air.uvIndex != null && (
      <ListItem key="uv" divider>
        <ListItemText primary="UV Index" secondary={`${air.uvIndex} · ${uvLabel(air.uvIndex)}`} />
      </ListItem>
    ),
    ...Object.entries(air.pollutants)
      .filter(([, p]) => p)
      .map(([key, p]) => (
        <ListItem key={`pollutant-${key}`} divider>
          <ListItemText
            primary={POLLUTANT_LABELS[key]}
            secondary={`${p.value} ${p.unit ?? ''} · US ${p.usAqi ?? '—'} · EU ${p.euAqi ?? '—'}`} />
        </ListItem>
      )),
  ].filter(Boolean) : [];

  return (
    <Box sx={{ position: 'relative', margin: '8px 8px 0px 8px' }}>
      <Paper ref={panelRef} elevation={3} sx={{ position: 'relative', padding: 2, pb: 5, height: '300px', overflowY: showMore ? 'auto' : 'hidden' }}>
        <Typography variant="h5" gutterBottom>
          Local Weather
        </Typography>
        <List>

          {/* Collapsed shows the first 3 rows; expanding adds the rest */}
          {showMore ? rows : rows.slice(0, 3)}
          {showMore && airDetailRows}
          {showMore &&
            data?.main &&
            Object.keys(data.main)
              .filter((key) => !keysToSkip.includes(key))
              .map((key) => (
                <ListItem key={key} divider>
                  <ListItemText primary={toLabelCase(key)} secondary={sigDigits(data.main[key], 4)} />
                </ListItem>
              ))}
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

export default WeatherDisplay;