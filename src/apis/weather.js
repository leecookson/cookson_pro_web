export const fetchWeather = async (latitude, longitude) => {
  const response = await fetch(`/api/v1/weather/${latitude}/${longitude}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

/**
 * Fetches current US and European AQI, pollutant levels and UV index.
 * See cookson_pro_api/docs/api-weather-air.md for the response shape.
 */
export const fetchAirQuality = async (latitude, longitude) => {
  const url = `/api/v1/weather/air/${latitude}/${longitude}`;
  console.log(`[Weather API] Fetching air quality from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    const errorJSON = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Network response was not ok: ${errorJSON.message}`);
  }
  return response.json();
};
