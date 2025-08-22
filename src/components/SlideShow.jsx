import { useRef, useState, useEffect } from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import LocationDisplay from './LocationDisplay';
import AstroDisplay from './AstroDisplay';
import WeatherDisplay from './WeatherDisplay';

function SlideShow() {
  const containerRef = useRef(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  const checkScroll = () => {
    const container = containerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftButton(scrollLeft > 0);
      // Use a 1px tolerance for floating point inaccuracies
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    container.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll(); // Initial check

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', checkScroll);
    };
  }, []);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollLeft -= 305; // Adjust scroll amount (width + gap)
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += 305; // Adjust scroll amount (width + gap)
    }
  };

  const slideBoxSx = {
    flexShrink: 0,
    height: '330px',
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
          visibility: showLeftButton ? 'visible' : 'hidden',
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
            height: '330px', // Contain the items
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
          visibility: showRightButton ? 'visible' : 'hidden',
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