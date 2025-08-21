import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAstroData } from '../apis/astro';
import { fetchLocation } from '../apis/location';
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
import { toLabelCase } from '../util/labels';

const AstroDisplay = () => {
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

  const [showMore, setShowMore] = useState(false);

  const latitude = locationData?.lat;
  const longitude = locationData?.lon;

  const {
    data: astroData,
    error: astroError,
    isLoading: isAstroLoading,
    isError: isAstroError,
  } = useQuery({
    // The query key now includes latitude and longitude.
    // This is important for caching and re-fetching when the location changes.
    queryKey: ['astro', latitude, longitude],
    queryFn: () => fetchAstroData(latitude, longitude),
    // The `enabled` option ensures this query only runs when latitude and longitude are available.
    enabled: !!(latitude && longitude),
  });

  if (isLocationLoading || isAstroLoading) {
    return <Container sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Container>;
  }

  if (isLocationError) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">Error fetching location data: {locationError?.message}</Alert></Container>;
  }

  if (isAstroError) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">Error fetching astronomical data: {astroError?.message}</Alert></Container>;
  }

  return (
    <Paper elevation={3} sx={{ position: 'relative', margin: 1, padding: 2, pb: 6, maxHeight: '300px', overflowY: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Zenith
      </Typography>
      <List>

        <ListItem key={"name"} divider>
          <ListItemText primary={"Name"} secondary={
            <a href={`https://science.nasa.gov/?search=${astroData?.data?.[0]?.name}`} target="_blank" rel="noopener noreferrer">
              {astroData?.data?.[0]?.name}
            </a>
          } />
        </ListItem>
        <ListItem key={"type"} divider>
          <ListItemText primary={"Type"} secondary={astroData?.data?.[0]?.type?.name} />
        </ListItem>
        <ListItem key={"constellation_name"} divider>
          <ListItemText primary={"Constellation"} secondary={astroData?.data[0]?.position?.constellation?.name} />
        </ListItem>
        {showMore && astroData?.data?.[0]?.position && (
          <>
            {astroData.data[0].position.equatorial && Object.entries(astroData.data[0].position.equatorial).map(([key, value]) => (
              <ListItem key={`eq-${key}`} divider>
                <ListItemText primary={toLabelCase(key)} secondary={`${Object.values(value)[0]}${key === 'rightAscension' ? 'h' : '°'}`} />
              </ListItem>
            ))}
            {astroData.data[0].position.horizontal && Object.entries(astroData.data[0].position.horizontal).map(([key, value]) => (
              <ListItem key={`hor-${key}`} divider>
                <ListItemText primary={toLabelCase(key)} secondary={`${Object.values(value)[0]}°`} />
              </ListItem>
            ))}
          </>
        )}

      </List>
      <Box sx={{ position: 'absolute', bottom: 0, right: 8 }}>
        <IconButton onClick={() => setShowMore(!showMore)} size="small">
          {showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
    </Paper>
  );
};

export default AstroDisplay;