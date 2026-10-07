const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorJSON = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Network response was not ok: ${errorJSON.message}`);
  }
  return response.json();
};

const browserPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Geolocation is not available'));
    return;
  }
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  });
});

/**
 * Fetches the user's location: { lat, lon, city, regionName, country, countryCode, timezone, source, ... }.
 *
 * Prefers the browser's geolocation, named by the server's reverse geocoding
 * (/api/v1/location/:lat/:lon). Falls back to the server's lookup of the client's IP
 * (/api/v1/location) when geolocation is denied, times out or isn't available.
 * Both server responses use the same field names.
 *
 * @returns {Promise<object>} A promise that resolves to the location data.
 */
export const fetchLocation = async () => {
  let coords;
  try {
    const position = await browserPosition();
    coords = { lat: position.coords.latitude, lon: position.coords.longitude };
    console.log(`[Location API] Using browser geolocation: Latitude ${coords.lat}, Longitude ${coords.lon}`);
  } catch (geoError) {
    console.warn(`[Location API] Browser geolocation failed: ${geoError.message}. Falling back to IP-based location.`);
  }

  if (coords) {
    // The device's own zone, which is what the astro cards' local times are for
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const place = await getJson(`/api/v1/location/${coords.lat}/${coords.lon}`);
      return { ...place, ...coords, timezone, source: 'browser_geolocation' };
    } catch (placeError) {
      // The coordinates are still right even if they can't be named
      console.warn(`[Location API] Reverse geocoding failed: ${placeError.message}`);
      return { ...coords, timezone, source: 'browser_geolocation' };
    }
  }

  console.log('[Location API] Fetching location data from /api/v1/location based on client IP');
  try {
    const data = await getJson('/api/v1/location');
    return { ...data, source: 'server_ip_geolocation' };
  } catch (netErr) {
    throw new Error(`Network error while fetching location: ${netErr.message}`);
  }
};
