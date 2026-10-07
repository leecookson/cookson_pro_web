export const fetchWeather = async (latitude, longitude) => {
  const response = await fetch(`/api/v1/weather/${latitude}/${longitude}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};
