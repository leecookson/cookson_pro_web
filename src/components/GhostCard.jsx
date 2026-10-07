import { Alert, Box, CircularProgress } from '@mui/material';

// A dimmed, empty card: same footprint as a card (8px side margins, 300px Paper), colored
// halfway between the card and the page background. Fills empty grid cells, and stands in
// for a card while it loads (with `children` centred, e.g. a spinner).
const GhostCard = ({ children }) => (
  <Box sx={{ margin: '8px 8px 0px 8px' }}>
    <Box
      sx={(theme) => ({
        height: '300px',
        borderRadius: `${theme.shape.borderRadius}px`,
        backgroundColor: `color-mix(in srgb, ${theme.palette.background.paper} 50%, ${theme.palette.background.default})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      })}>
      {children}
    </Box>
  </Box>
);

// Placeholder shown while a card's data loads
export const LoadingCard = () => (
  <GhostCard><CircularProgress /></GhostCard>
);

// Stands in for a card whose data failed to load, so the grid keeps its shape
export const ErrorCard = ({ children }) => (
  <GhostCard><Alert severity="error" sx={{ mx: 2 }}>{children}</Alert></GhostCard>
);

export default GhostCard;
