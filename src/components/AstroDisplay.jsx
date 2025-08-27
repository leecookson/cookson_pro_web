import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAstroData, fetchStarChartUrl } from '../apis/astro';
import { fetchLocation } from '../apis/location';
import { sigDigits } from '../util/labels';
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
  const [skyChartVisible, setSkyChartVisible] = useState(false);

  const latitude = locationData?.lat;
  const longitude = locationData?.lon;

  const {
    data: astroData,
    error: astroError,
    isLoading: isAstroLoading,
    isError: isAstroError
  } = useQuery({
    // The query key now includes latitude and longitude.
    // This is important for caching and re-fetching when the location changes.
    queryKey: ['astro', latitude, longitude],
    queryFn: () => fetchAstroData(latitude, longitude),
    // The `enabled` option ensures this query only runs when latitude and longitude are available.
    enabled: !!(latitude && longitude)
  });

  const {
    data: skyData,
    error: skyError,
    refetch: refetchStarChart,
    isLoading: isSkyLoading,
    isError: isSkyError,
  } = useQuery({
    // The query key now includes latitude and longitude.
    // This is important for caching and re-fetching when the location changes.
    queryKey: ['sky', latitude, longitude],
    queryFn: () => fetchStarChartUrl(latitude, longitude),
    enabled: false, // Disable automatic fetching
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
  if (isSkyError) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">Error fetching sky chart data: {skyError?.message}</Alert></Container>;
  }
  const type = astroData.data?.[0]?.type?.name;
  const subType = astroData.data?.[0]?.type?.subtype;

  return (
    <Paper elevation={3} sx={{ position: 'relative', margin: '8px 8px 0px 8px', padding: 2, pb: 5, height: '300px', overflowY: showMore ? 'auto' : 'hidden' }}>
      <Typography variant="h5" gutterBottom>
        Zenith
        <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
          - RA {sigDigits(astroData?.query.ra)} - Dec {sigDigits(astroData?.query.dec)}
        </Typography>
      </Typography>
      <List>

        <ListItem key={"name"} divider>
          <ListItemText primary={"Name"} secondary={
            <a href={astroData.data?.[0]?.link ? astroData.data?.[0]?.link : `https://science.nasa.gov/?search=${astroData.data?.[0]?.name}`} target="_blank" rel="noopener noreferrer">
              {astroData.data?.[0]?.name}
            </a>
          } />
        </ListItem>
        <ListItem key={"type"} divider>
          <ListItemText primary={"Type"} secondary={type + (subType ? ` (${subType})` : '')} />
        </ListItem>
        <ListItem key={"constellation_name"} divider>
          <ListItemText primary={"Constellation"} secondary={astroData.data?.[0]?.position?.constellation?.name} />
        </ListItem>
        {showMore && astroData.data?.[0]?.position && (
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
            <ListItem>
              <ListItemText
                primary={"Sky Chart"}
                secondary={
                  isSkyLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <a href="#" onClick={(e) => { e.preventDefault(); refetchStarChart(); setSkyChartVisible(true); }} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                      View Star Chart
                    </a>
                  )
                } />
            </ListItem>
          </>
        )}
      </List>
      <Box sx={{ position: 'absolute', bottom: 0, right: 8 }}>
        <IconButton onClick={() => setShowMore(!showMore)} size="small">
          {showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      {skyData && skyChartVisible && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '95vw',
            height: '95vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            p: 2,
            boxSizing: 'border-box',
          }}
          onClick={() => {
            // Optionally, add a state to control the visibility of this overlay
            // For now, clicking anywhere on the overlay closes it.
            // You might want a dedicated close button.
            setSkyChartVisible(false);
          }}
        >
          <div style={{ position: 'absolute', top: '5%', left: '5%', right: '5%', bottom: '5%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={skyData.imageUrl}
              alt="A placeholder image with text"
              style={{ width: '400%', height: '400%', objectFit: 'cover', transform: 'scale(1)', objectPosition: 'center' }} />
          </div>
        </Box>
      )}
    </Paper>
  );
};

export default AstroDisplay;