/**
 * Fetches everyone in space right now, grouped by station.
 * See cookson_pro_api/docs/api-space-people.md for the response shape.
 */
export const fetchPeopleInSpace = async () => {
  const url = '/api/v1/space/people';
  console.log(`[Space API] Fetching people in space from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    const errorJSON = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Network response was not ok: ${errorJSON.message}`);
  }
  return response.json();
};
