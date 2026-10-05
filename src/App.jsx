import {
  AppBar,
  Container,
  CssBaseline,
  Toolbar,
  Typography,
} from '@mui/material';

import CardGrid from './components/CardGrid.jsx';
import PlatformBanner from './components/PlatformBanner.jsx';

const App = () => {
  return (
    <Container maxWidth={false}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ top: 0, bottom: 'auto' }}>
        <Toolbar>
          <Typography variant="h6">CooksonPro</Typography>
        </Toolbar>
      </AppBar>
      {/* Spacers keep the grid clear of the fixed top and bottom AppBars */}
      <Toolbar />
      <CardGrid />
      <Toolbar />
      <AppBar position="fixed" sx={{ top: 'auto', bottom: 0 }}>
        <Toolbar>
          <Typography variant="h6">Lee Cookson (<a href="mailto:lee@cookson.pro">lee@cookson.pro</a>)</Typography>
        </Toolbar>
      </AppBar>
    </Container>
  );
};

export default App;