import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWeather } from '../apis/weather';
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
  Box, IconButton
} from '@mui/material';
import { LoadingCard, ErrorCard } from './GhostCard';
import { toLabelCase } from '../util/labels';
import { useExpandScroll } from '../util/useExpandScroll';

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
    enabled: !!(latitude && longitude),
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

  return (
    <Box sx={{ position: 'relative', margin: '8px 8px 0px 8px' }}>
      <Paper ref={panelRef} elevation={3} sx={{ position: 'relative', padding: 2, pb: 5, height: '300px', overflowY: showMore ? 'auto' : 'hidden' }}>
        <Typography variant="h5" gutterBottom>
          Local Weather
        </Typography>
        <List>

          <ListItem key={"description"} divider>
            <ListItemText primary={"Location"} secondary={data?.name} />
          </ListItem>
          <ListItem key={"conditions"} divider>
            <ListItemText primary={"Conditions"} secondary={conditionsValue(data.weather?.[0])} />
          </ListItem>
          <ListItem key={"temp"} divider>
            <ListItemText primary={"Temp (C)"} secondary={`${sigDigits(data.main.temp, 3)} · feels like ${sigDigits(data.main.feels_like, 3)}`} />
          </ListItem>
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