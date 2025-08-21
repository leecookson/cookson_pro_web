import { fetchLocation } from './location.js'

export const fetchWeather = async () => {
  const { lat, lon } = await fetchLocation(true); // coordsOnly
  const response = await fetch(`/api/v1/weather/${lat}/${lon}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};