/**
 * Fetches location data.
 * If an IP address is provided, it will be used for the lookup.
 * Otherwise, the server will attempt to determine location based on the client's IP.
 *
 * @param {string} [ipAddress] - Optional IP address to lookup location for.
 * @returns {Promise<object>} A promise that resolves to the location data.
 */
export const fetchLocation = async (coordsOnly) => {
  if (navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      const { latitude, longitude } = position.coords;
      console.log(`[Location API] Using browser geolocation: Latitude ${latitude}, Longitude ${longitude}`);

      if (coordsOnly) {
        return { lat: latitude, lon: longitude, source: 'browser_geolocation' };
      }

    } catch (geoError) {
      console.warn(`[Location API] Browser geolocation failed: ${geoError.message}. Falling back to IP-based location.`);
      // Fallback to IP-based location if geolocation fails
    }
  }

  // not coordsOnly, or geolocation not available
  let url = '/api/v1/location';
  console.log(`[Location API] Fetching location data from ${url}: 'based on client IP'}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorJSON = await response.json();
      throw new Error(`Network response was not ok: ${errorJSON.message}`);
    }
    const data = await response.json();
    if (coordsOnly) {
      return { lat: data.latitude, lon: data.longitude, source: 'server_ip_geolocation' };
    }
    return data;
  } catch (netErr) {
    throw new Error(`Network error while fetching location: ${netErr.message}`);
  }
};
