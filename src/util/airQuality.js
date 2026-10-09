// Display details for the air quality categories returned by /api/v1/weather/air.
// Colors are each scale's official palette: EPA for the US AQI, EEA for the European AQI.
// `short` fits in a chip; `label` is the full name.
export const AQI_SCALES = {
  us: {
    name: 'US',
    categories: {
      good: { label: 'Good', short: 'Good', color: '#00E400' },
      moderate: { label: 'Moderate', short: 'Moderate', color: '#FFFF00' },
      unhealthy_sensitive: { label: 'Unhealthy for Sensitive Groups', short: 'Unhealthy for some', color: '#FF7E00' },
      unhealthy: { label: 'Unhealthy', short: 'Unhealthy', color: '#FF0000' },
      very_unhealthy: { label: 'Very Unhealthy', short: 'Very unhealthy', color: '#8F3F97' },
      hazardous: { label: 'Hazardous', short: 'Hazardous', color: '#7E0023' },
    },
  },
  eu: {
    name: 'EU',
    categories: {
      good: { label: 'Good', short: 'Good', color: '#50F0E6' },
      fair: { label: 'Fair', short: 'Fair', color: '#50CCAA' },
      moderate: { label: 'Moderate', short: 'Moderate', color: '#F0E641' },
      poor: { label: 'Poor', short: 'Poor', color: '#FF5050' },
      very_poor: { label: 'Very Poor', short: 'Very poor', color: '#960032' },
      extremely_poor: { label: 'Extremely Poor', short: 'Extremely poor', color: '#7D2181' },
    },
  },
};

export const POLLUTANT_LABELS = {
  pm2_5: 'PM2.5',
  pm10: 'PM10',
  ozone: 'O₃',
  no2: 'NO₂',
  so2: 'SO₂',
  co: 'CO',
};

// WHO UV index bands
export const uvLabel = (uv) => {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
};

// Black or white, whichever reads better on `hex` (WCAG relative luminance)
export const textColorOn = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
};
