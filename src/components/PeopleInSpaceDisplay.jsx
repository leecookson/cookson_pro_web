import { useQuery } from '@tanstack/react-query';
import { fetchPeopleInSpace } from '../apis/space';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Box,
  IconButton,
} from '@mui/material';
import { LoadingCard, ErrorCard } from './GhostCard';
import { useExpandScroll } from '../util/useExpandScroll';

const SOURCE_NAMES = {
  'launch-library-2': 'Launch Library 2',
  corquaid: 'People in space feed',
};

// "RU" -> 🇷🇺 (regional indicator letters)
const flagEmoji = (code) =>
  /^[A-Z]{2}$/.test(code ?? '')
    ? String.fromCodePoint(...[...code].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65))
    : '';

const days = (n) => (n === 1 ? '1 day' : `${n} days`);

const stationName = (station) => station ?? 'Free flight';

const PeopleInSpaceDisplay = () => {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['people-in-space'],
    queryFn: fetchPeopleInSpace,
    retry: 1,
    // Crews change a few times a month; the API caches for an hour
    staleTime: 10 * 60000,
  });

  const { showMore, toggleShowMore, panelRef } = useExpandScroll();

  if (isLoading) {
    return <LoadingCard />;
  }

  if (isError) {
    return <ErrorCard>Error fetching people in space: {error?.message}</ErrorCard>;
  }

  const { people, stations, sources, unavailable } = data;

  const stationRows = stations.map(({ name, count }) => {
    const crafts = [...new Set(people.filter((p) => p.station === name).map((p) => p.spacecraft).filter(Boolean))];
    return (
      <ListItem key={`station-${name}`} divider>
        <ListItemText
          primary={stationName(name)}
          secondary={[`${count} aboard`, crafts.join(', ')].filter(Boolean).join(' · ')} />
      </ListItem>
    );
  });

  const longest = people
    .filter((p) => p.daysInSpace != null)
    .reduce((best, p) => (!best || p.daysInSpace > best.daysInSpace ? p : best), null);

  const personRows = people.map((p) => (
    <ListItem key={`person-${p.name}`} divider>
      <ListItemText
        primary={
          <>
            {flagEmoji(p.countryCode)}{' '}
            {p.wiki
              ? <a href={p.wiki} target="_blank" rel="noopener noreferrer">{p.name}</a>
              : p.name}
          </>
        }
        secondary={[
          stationName(p.station),
          p.role,
          p.spacecraft,
          p.daysInSpace != null && days(p.daysInSpace),
        ].filter(Boolean).join(' · ')} />
    </ListItem>
  ));

  const failed = Object.values(unavailable ?? {});
  const sourcesValue = [
    sources.map((s) => SOURCE_NAMES[s] ?? s).join(' + '),
    ...failed,
  ].join(' · ');

  const rows = [
    ...stationRows,
    longest && (
      <ListItem key="longest" divider>
        <ListItemText
          primary="Longest Aboard"
          secondary={`${flagEmoji(longest.countryCode)} ${longest.name} · ${days(longest.daysInSpace)}`.trim()} />
      </ListItem>
    ),
    ...personRows,
    <ListItem key="sources" divider>
      <ListItemText primary="Sources" secondary={sourcesValue} />
    </ListItem>,
  ].filter(Boolean);

  return (
    <Box sx={{ position: 'relative', margin: '8px 8px 0px 8px' }}>
      <Paper ref={panelRef} elevation={3} sx={{ position: 'relative', padding: 2, pb: 5, height: '300px', overflowY: showMore ? 'auto' : 'hidden' }}>
        <Typography variant="h5" gutterBottom>
          People in Space
        </Typography>
        <List>
          {/* Collapsed shows the first 3 rows; expanding adds the rest */}
          {showMore ? rows : rows.slice(0, 3)}
        </List>
      </Paper>
      <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
        <IconButton onClick={toggleShowMore} size="small">
          {showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default PeopleInSpaceDisplay;
