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
    </Container>
  );
};

export default App;