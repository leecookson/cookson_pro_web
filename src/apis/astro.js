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
  let jsonData = await response.json();
  if (jsonData?.data?.[0]?.name === 'Sol') {
    jsonData.data = jsonData.data.slice(1); // remove Sun entry
  }
  // Decorate with possible links to reference sites
  jsonData.data = jsonData.data.map(item => {
    if (item.name.startsWith("HIP ")) {
      // for names starting with "HIP ", use this pattern https://hipparcos-tools.cosmos.esa.int/cgi-bin/HIPcatalogueSearch.pl?hipId=37488
      item.link = `https://hipparcos-tools.cosmos.esa.int/cgi-bin/HIPcatalogueSearch.pl?hipId=${item.name.split(' ')[1]}`;
    } else if (item.name.startsWith("HD ")) {
      // if starts with "HD ", use this pattern: https://simbad.u-strasbg.fr/simbad/sim-id?Ident=HD+65755&NbIdent=1&Radius=2&Radius.unit=arcmin&submit=submit+id
      item.link = `https://simbad.u-strasbg.fr/simbad/sim-id?Ident=HD+${item.name.split(' ')[1]}&NbIdent=1&Radius=2&Radius.unit=arcmin&submit=submit+id`;
    } else {
      item.link = `https://science.nasa.gov/?search=${item.name}`;
    }
    return item;
  });
  return jsonData;
};

export const fetchStarChartUrl = async (latitude, longitude) => {
  let url = `/api/v1/astro/zenith/starchart/${latitude}/${longitude}?zoom=9`;
  console.log(`[Astro API] Fetching star chart from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    const errorJSON = await response.json();
    throw new Error(`Network response was not ok: ${errorJSON.error}`);
  }
  return await response.json();
};
