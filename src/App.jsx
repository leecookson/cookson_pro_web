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
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">CooksonPro</Typography>
        </Toolbar>
      </AppBar>
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