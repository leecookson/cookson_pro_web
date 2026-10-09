// Trailing place-type words, from the Census Bureau's LSAD codes for places and county
// subdivisions (https://www2.census.gov/geo/pdfs/reference/LSADCodes.pdf), plus common
// abbreviations. Longest first so "charter township" wins over "township".
const PLACE_TYPE_SUFFIX = new RegExp(
  ' (' + [
    'city and borough',
    'charter township',
    'township',
    'twp',
    'municipality',
    'plantation',
    'borough',
    'boro',
    'village',
    'city',
    'town',
    'cdp',
  ].join('|') + ')$'
);

// "Burlington Twp." -> "burlington", "São Paulo" -> "sao paulo". Prefix variants
// ("Mt." vs "Mount") are not handled.
const normalizePlaceName = (name) => {
  const plain = name.normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return plain.replace(PLACE_TYPE_SUFFIX, '') || plain;
};

// True when two place names likely refer to the same town. Missing names never match.
export const isSamePlace = (a, b) =>
  !!a && !!b && normalizePlaceName(a) === normalizePlaceName(b);
