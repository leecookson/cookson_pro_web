import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

const LocationDisplay = () => {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['location'],
    queryFn: () => fetchLocation(),
    retry: 1,
  });

  const [showMore, setShowMore] = useState(false);

  if (isLoading) {
    return <Container sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Container>;
  }

  if (isError) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">Error fetching data: {error?.message}</Alert></Container>;
  }

  const keysToSkip = ['city', 'country', 'timezone', 'status'];

  return (
    <Paper elevation={3} sx={{ position: 'relative', margin: 1, padding: 2, pb: 6, maxHeight: '300px', overflowY: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Location
      </Typography>
      <List>

        <ListItem key={"description"} divider>
          <ListItemText primary={"Location"} secondary={data.city} />
        </ListItem>
        <ListItem key={"country"} divider>
          <ListItemText primary={"Country"} secondary={data.country} />
        </ListItem>
        <ListItem key={"timezone"} divider>
          <ListItemText primary={"Timezone"} secondary={data.timezone} />
        </ListItem>
        {showMore &&
          data &&
          Object.keys(data)
            .filter((key) => !keysToSkip.includes(key))
            .map((key) => (
              <ListItem key={key} divider>
                <ListItemText primary={toLabelCase(key)} secondary={data[key]} />
              </ListItem>
            ))}

      </List>
      <Box sx={{ position: 'absolute', bottom: 0, right: 8 }}>
        <IconButton onClick={() => setShowMore(!showMore)} size="small">
          {showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
    </Paper>
  );
};

export default LocationDisplay;