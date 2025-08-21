import { useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import LocationDisplay from './LocationDisplay';
import AstroDisplay from './AstroDisplay';
import WeatherDisplay from './WeatherDisplay';

function SlideShow() {
  const containerRef = useRef(null);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollLeft -= 200; // Adjust scroll amount
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += 200; // Adjust scroll amount
    }
  };

  const slideBoxSx = {
    flexShrink: 0,
    height: '340px',
    width: '100%', // Full width for vertical layout
    '@media (min-width: 500px)': {
      width: '300px', // Fixed width for horizontal layout
    },
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <IconButton
        onClick={scrollLeft}
        sx={{
          '@media (max-width: 499px)': {
            display: 'none',
          },
        }}
      >
        <ChevronLeftIcon />
      </IconButton>
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          gap: '5px',
          // Mobile-first: vertical scroll by default
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          height: 'calc(100vh - 64px - 16px)', // Adjust based on AppBar height and margins
          width: '100%',

          // Styles for >= 350px
          '@media (min-width: 500px)': {
            flexDirection: 'row',
            overflowX: 'scroll',
            overflowY: 'hidden',
            scrollBehavior: 'smooth',
            height: '500px', // Contain the items
          },
        }}
      >
        {/* Your individual slides go here */}
        <Box sx={slideBoxSx}><WeatherDisplay /></Box>
        <Box sx={slideBoxSx}><LocationDisplay /></Box>
        <Box sx={slideBoxSx}><AstroDisplay /></Box>
        {/* Add more slides */}
      </Box>
      <IconButton
        onClick={scrollRight}
        sx={{
          '@media (max-width: 499px)': {
            display: 'none',
          },
        }}
      >
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}

export default SlideShow;