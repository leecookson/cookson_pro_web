/**
 * Fetches astro data.
 * If an IP address is provided, it will be used for the lookup.
 * Otherwise, the server will attempt to determine astronomical entities based on the lat/long/time.
 *
 * @param {string} [ipAddress] - Optional IP address to lookup astronomical objects for.
 * @returns {Promise<object>} A promise that resolves to the astro data.
 */
export const fetchAstroData = async (latitude, longitude) => {
  let url = `/api/v1/astro/zenith/${latitude}/${longitude}`;
  console.log(`[Astro API] Fetching astro data from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    const errorJSON = await response.json();
    throw new Error(`Network response was not ok: ${errorJSON.error}`);
  }
  return response.json();
};

