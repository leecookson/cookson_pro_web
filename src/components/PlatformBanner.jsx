import Box from '@mui/material/Box';

const PlatformBanner = () => {
  return (

    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        p: '8px',
        height: '36pt',
        width: '100%',
        bgcolor: '#FFEDD3',
        display: 'flex', // Use flexbox for alignment
        alignItems: 'center' // Vertically center the image within the padded Box
        // justifyContent: 'flex-start', // Default for a single flex item, ensures left alignment
      }}
    >
      <img src="https://www.cookson.pro/aws.svg" alt="AWS Logo" style={{
        height: '100%', // Make image height 100% of the content box of the parent
        width: 'auto',   // Adjust width to maintain aspect ratio
        objectFit: 'contain' // Ensures the image fits and maintains aspect ratio
      }} />
    </Box>
  );
};

export default PlatformBanner;