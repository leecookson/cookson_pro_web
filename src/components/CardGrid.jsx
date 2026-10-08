import { Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import LocationDisplay from './LocationDisplay';
import AstroDisplay from './AstroDisplay';
import WeatherDisplay from './WeatherDisplay';
import SunMoonDisplay from './SunMoonDisplay';
import NightSkyDisplay from './NightSkyDisplay';
import GhostCard from './GhostCard';
import CardErrorBoundary from './CardErrorBoundary';

const CARDS = [LocationDisplay, WeatherDisplay, AstroDisplay, SunMoonDisplay, NightSkyDisplay];

// 1 column on phones, 2 from sm, 3 from md, all 5 in one row from xl. Column
// counts are explicit so the layout doesn't depend on card min-widths. The page
// itself scrolls vertically.
const COLUMNS = { xs: 1, sm: 2, md: 3, xl: 5 };

// Current column count, matching the gridTemplateColumns breakpoints
const useColumnCount = () => {
  const theme = useTheme();
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const isSm = useMediaQuery(theme.breakpoints.up('sm'));
  if (isXl) return COLUMNS.xl;
  if (isMd) return COLUMNS.md;
  if (isSm) return COLUMNS.sm;
  return COLUMNS.xs;
};

function CardGrid() {
  const columns = useColumnCount();
  const ghostCount = (columns - (CARDS.length % columns)) % columns;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: Object.fromEntries(
          Object.entries(COLUMNS).map(([bp, n]) => [bp, n === 1 ? '1fr' : `repeat(${n}, 1fr)`])
        ),
        // Cards carry their own 8px side margins; add matching vertical spacing
        rowGap: 2,
        pt: 1,
        pb: 2,
      }}
    >
      {CARDS.map((Card, i) => <CardErrorBoundary key={i}><Card /></CardErrorBoundary>)}
      {Array.from({ length: ghostCount }, (_, i) => <GhostCard key={`ghost-${i}`} />)}
    </Box>
  );
}

export default CardGrid;
