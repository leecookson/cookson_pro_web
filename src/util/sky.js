// Sky geometry for the horizon view: alt/az <-> hour angle/declination, diurnal motion,
// and a stereographic projection centred on the viewing direction. Angles are degrees,
// azimuth clockwise from true north, hour angle positive to the west.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Hour angle advances by this much per hour (sidereal rate). The moon drifts east
// against the stars by about half a degree an hour, so it's slower.
export const SIDEREAL_DEG_PER_HOUR = 15.041;
export const MOON_DEG_PER_HOUR = 14.49;

const HOUR_MS = 3600000;

const normalizeAzimuth = (az) => ((az % 360) + 360) % 360;

// Horizontal -> equatorial (hour angle, declination) for an observer at latitude `lat`
export const toEquatorial = ({ altitude, azimuth }, lat) => {
  const a = altitude * RAD;
  const A = azimuth * RAD;
  const phi = lat * RAD;
  const dec = Math.asin(Math.sin(phi) * Math.sin(a) + Math.cos(phi) * Math.cos(a) * Math.cos(A));
  const ha = Math.atan2(-Math.cos(a) * Math.sin(A), Math.sin(a) * Math.cos(phi) - Math.cos(a) * Math.sin(phi) * Math.cos(A));
  return { hourAngle: ha * DEG, declination: dec * DEG };
};

// Equatorial (hour angle, declination) -> horizontal for an observer at latitude `lat`
export const toHorizontal = ({ hourAngle, declination }, lat) => {
  const H = hourAngle * RAD;
  const d = declination * RAD;
  const phi = lat * RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H));
  const az = Math.atan2(-Math.cos(d) * Math.sin(H), Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.sin(phi) * Math.cos(H));
  return { altitude: alt * DEG, azimuth: normalizeAzimuth(az * DEG) };
};

// Position over time of an object fixed on the celestial sphere (a star or planet over one
// night), from a single sighting { time, altitude, azimuth }. Declination stays put and the
// hour angle advances at `degPerHour`. Returns t (ms) -> { altitude, azimuth }.
export const diurnalPath = (sighting, lat, degPerHour = SIDEREAL_DEG_PER_HOUR) => {
  const anchor = toEquatorial(sighting, lat);
  const t0 = new Date(sighting.time).getTime();
  return (t) => toHorizontal({
    hourAngle: anchor.hourAngle + ((t - t0) / HOUR_MS) * degPerHour,
    declination: anchor.declination,
  }, lat);
};

// Unit vector (east, north, up)
const toVector = ({ altitude, azimuth }) => {
  const a = altitude * RAD;
  const A = azimuth * RAD;
  return [Math.cos(a) * Math.sin(A), Math.cos(a) * Math.cos(A), Math.sin(a)];
};

const fromVector = ([e, n, u]) => {
  const len = Math.hypot(e, n, u);
  return { altitude: Math.asin(u / len) * DEG, azimuth: normalizeAzimuth(Math.atan2(e, n) * DEG) };
};

// Position over time of an object that isn't fixed on the sphere (an ISS pass), through its
// start/peak/end points. Interpolates the direction vectors in time (quadratic through three
// distinct points, linear through two), so it's smooth through the zenith. Returns
// t (ms) -> { altitude, azimuth }, or null outside the first..last point.
export const pointsPath = (points) => {
  const samples = points
    .map((p) => ({ t: new Date(p.time).getTime(), v: toVector(p) }))
    .filter((s, i, all) => all.findIndex((o) => o.t === s.t) === i)
    .sort((a, b) => a.t - b.t);
  const first = samples[0].t;
  const last = samples[samples.length - 1].t;

  return (t) => {
    if (t < first || t > last) return null;
    if (samples.length === 1) return fromVector(samples[0].v);
    // Lagrange basis weights
    const weights = samples.map((s, i) => samples.reduce(
      (w, o, j) => (i === j ? w : w * (t - o.t) / (s.t - o.t)), 1));
    const v = [0, 1, 2].map((k) => samples.reduce((sum, s, i) => sum + weights[i] * s.v[k], 0));
    return fromVector(v);
  };
};

// Stereographic projection centred on { azimuth, altitude } with horizontal field of view
// `fov`, onto a width x height viewport. Stereographic keeps shapes true and maps circles on
// the sky (horizon, altitude rings) to circles, like a planetarium app.
export const createProjection = ({ azimuth, altitude, fov, width, height }) => {
  const A = azimuth * RAD;
  const a = altitude * RAD;
  const right = [Math.cos(A), -Math.sin(A), 0];
  const up = [-Math.sin(a) * Math.sin(A), -Math.sin(a) * Math.cos(A), Math.cos(a)];
  const forward = [Math.cos(a) * Math.sin(A), Math.cos(a) * Math.cos(A), Math.sin(a)];
  const scale = (width / 2) / (2 * Math.tan((fov / 4) * RAD));
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];

  // { x, y, front } where front is false for points more than 90° from the view centre
  // (never on screen for the field of view this view allows)
  const project = (pos) => {
    const p = toVector(pos);
    const z = dot(p, forward);
    const k = 2 / (1 + Math.max(z, -0.999));
    return {
      x: width / 2 + k * dot(p, right) * scale,
      y: height / 2 - k * dot(p, up) * scale,
      front: z > 0,
    };
  };

  return { project, scale, degreesPerPixel: fov / width };
};

// SVG path through samples of sky positions, broken wherever a sample is behind the viewer
// or `keep` rejects it
export const skyPath = (positions, project, keep = () => true) => {
  let d = '';
  let pen = false;
  for (const pos of positions) {
    const p = keep(pos) && project(pos);
    if (!p || !p.front) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
};

// Circle through three points, or null if they're (nearly) in a line
export const circleThrough = (p1, p2, p3) => {
  const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  if (Math.abs(d) < 1e-6) return null;
  const s1 = p1.x ** 2 + p1.y ** 2;
  const s2 = p2.x ** 2 + p2.y ** 2;
  const s3 = p3.x ** 2 + p3.y ** 2;
  const cx = (s1 * (p2.y - p3.y) + s2 * (p3.y - p1.y) + s3 * (p1.y - p2.y)) / d;
  const cy = (s1 * (p3.x - p2.x) + s2 * (p1.x - p3.x) + s3 * (p2.x - p1.x)) / d;
  return { cx, cy, r: Math.hypot(p1.x - cx, p1.y - cy) };
};

// Screen angle (radians, SVG coordinates) from `from` towards `to` along the sky, measured at
// `from`. Used to turn the moon's lit limb towards the sun.
export const screenDirection = (from, to, project) => {
  const f = toVector(from);
  const t = toVector(to);
  const along = f[0] * t[0] + f[1] * t[1] + f[2] * t[2];
  const tangent = t.map((c, i) => c - along * f[i]);
  const len = Math.hypot(...tangent) || 1;
  const nudged = fromVector(f.map((c, i) => c + 0.01 * tangent[i] / len));
  const p0 = project(from);
  const p1 = project(nudged);
  return Math.atan2(p1.y - p0.y, p1.x - p0.x);
};

const OBLIQUITY = 23.4393;

// Local sidereal time in degrees at `t` (ms) and east longitude `lon`
const localSiderealTime = (t, lon) => {
  const daysSinceJ2000 = t / 86400000 + 2440587.5 - 2451545.0;
  return normalizeAzimuth(280.46061837 + 360.98564736629 * daysSinceJ2000 + lon);
};

// Points along the ecliptic (the sun's yearly path, which the moon and planets stay close to)
// as horizontal positions at `t` (ms) for an observer at lat/lon, every `step` degrees
export const eclipticPositions = (t, lat, lon, step = 2) => {
  const lst = localSiderealTime(t, lon);
  const e = OBLIQUITY * RAD;
  return Array.from({ length: Math.round(360 / step) + 1 }, (_, i) => {
    const l = i * step * RAD;
    const ra = Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) * DEG;
    const dec = Math.asin(Math.sin(e) * Math.sin(l)) * DEG;
    return toHorizontal({ hourAngle: lst - ra, declination: dec }, lat);
  });
};
