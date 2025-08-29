import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWeather } from '../apis/weather';
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
  Box, IconButton
} from '@mui/material';
import { toLabelCase } from '../util/labels';

const WeatherDisplay = () => {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['weather'],
    queryFn: fetchWeather,
  });

  const [showMore, setShowMore] = useState(false);

  if (isLoading) {
    return <Container sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Container>;
  }

  if (isError) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">Error fetching data: {error?.message}</Alert></Container>;
  }

  const keysToSkip = ['temp', 'feels_like'];

  return (
    <Paper elevation={3} sx={{ position: 'relative', margin: '8px 8px 0px 8px', padding: 2, pb: 5, height: '300px', overflowY: showMore ? 'auto' : 'hidden' }}>
      <Typography variant="h5" gutterBottom>
        Local Weather
      </Typography>
      <List>

        <ListItem key={"description"} divider>
          <ListItemText primary={"Location"} secondary={data?.name} />
        </ListItem>
        <ListItem key={"temp"} divider>
          <ListItemText primary={"Temp (C)"} secondary={data.main.temp} />
        </ListItem>
        <ListItem key={"feels_like"} divider>
          <ListItemText primary={"Feels Like (C)"} secondary={data.main.feels_like} />
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
      <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
        <IconButton onClick={() => setShowMore(!showMore)} size="small">
          {showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
    </Paper>
  );
};

export default WeatherDisplay;