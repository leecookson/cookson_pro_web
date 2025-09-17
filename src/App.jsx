import {
  AppBar,
  Container,
  CssBaseline,
  Toolbar,
  Typography,
} from '@mui/material';

import SlideShow from './components/SlideShow.jsx';
import PlatformBanner from './components/PlatformBanner.jsx';

const App = () => {
  return (
    <Container>
      <CssBaseline />
      <AppBar position="fixed" sx={{ top: 0, bottom: 'auto' }}>
        <Toolbar>
          <Typography variant="h6">CooksonPro</Typography>
        </Toolbar>
      </AppBar>
      // creates empty space so SlideShow doesn't appear behind the top AppBar
      <Toolbar />
      <SlideShow />
      <AppBar position="fixed" sx={{ top: 'auto', bottom: 0 }}>
        <Toolbar>
          <Typography variant="h6">Lee Cookson (<a href="mailto:lee@cookson.pro">lee@cookson.pro</a>)</Typography>
        </Toolbar>
      </AppBar>
    </Container>
  );
};

export default App;