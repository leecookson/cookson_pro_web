import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, IconButton, Slider, Typography } from '@mui/material';
import {
  MOON_DEG_PER_HOUR,
  circleThrough,
  createProjection,
  diurnalPath,
  eclipticPositions,
  pointsPath,
  screenDirection,
  skyPath,
} from '../util/sky';

// The view is a night sky whatever the app theme, so its colors are fixed
const COLORS = {
  ground: '#0d1410',
  horizon: '#5d6b62',
  grid: 'rgba(160, 180, 220, 0.14)',
  gridLabel: 'rgba(160, 180, 220, 0.5)',
  compass: '#9aa79f',
  label: '#d8deea',
  track: 'rgba(216, 222, 234, 0.28)',
  ecliptic: 'rgba(236, 200, 120, 0.35)',
  moonLit: '#f1ecd8',
  moonDark: 'rgba(241, 236, 216, 0.12)',
  iss: '#8fd3ff',
  star: '#e6ecff',
  starLabel: 'rgba(216, 222, 234, 0.6)',
  rising: 'rgba(216, 222, 234, 0.7)',
};

const PLANET_COLOR = {
  venus: '#fffbe8',
  mars: '#ff9a6b',
  jupiter: '#f6e7c8',
  saturn: '#ecd9a0',
};

// Sky background by how far the sun is below the horizon: twilight blue to full dark
const SKY_STOPS = [
  { sunAlt: 0, top: '#21406e', bottom: '#5b7fa8' },
  { sunAlt: -6, top: '#122546', bottom: '#2c4a74' },
  { sunAlt: -12, top: '#080f22', bottom: '#15223f' },
  { sunAlt: -18, top: '#03060f', bottom: '#0a1224' },
];

const mixHex = (a, b, t) => {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${pa.map((c, i) => Math.round(c + (pb[i] - c) * t)).join(',')})`;
};

const skyColors = (sunAlt) => {
  const i = SKY_STOPS.findIndex((s) => sunAlt >= s.sunAlt);
  if (i === 0) return SKY_STOPS[0];
  if (i === -1) return SKY_STOPS[SKY_STOPS.length - 1];
  const hi = SKY_STOPS[i - 1];
  const lo = SKY_STOPS[i];
  const t = (hi.sunAlt - sunAlt) / (hi.sunAlt - lo.sunAlt);
  return { top: mixHex(hi.top, lo.top, t), bottom: mixHex(hi.bottom, lo.bottom, t) };
};

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const COMPASS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const toCompass = (azimuth) => COMPASS_16[Math.round(azimuth / 22.5) % 16];

const MIN_FOV = 20;
const MAX_FOV = 130;
const MIN_ALT = 0;
const MAX_ALT = 85;
const SLIDER_STEP_MS = 5 * 60000;
// A tap that moves less than this is a selection, not a drag
const TAP_SLOP_PX = 6;
const HIT_RADIUS_PX = 24;
// How finely to search ahead for when a body below the horizon rises
const RISE_STEP_MS = 2 * 60000;
// Rising markers: label offset below the horizon, and spacing between stacked label rows.
// Clears the compass letters, which sit just under the horizon.
const RISING_LABEL_DY = 30;
const RISING_ROW_DY = 12;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const formatTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// Brighter (lower magnitude) planets get bigger dots
const planetRadius = (magnitude) => clamp(3.5 - 0.6 * (magnitude ?? 1), 2, 6);
// Stars are smaller than planets of the same magnitude, so planets stand out
const starRadius = (magnitude) => clamp(2.2 - 0.5 * (magnitude ?? 1.5), 1.2, 3);

// Stars come out between civil (-6°) and nautical (-12°) dusk; fade them in over that range
const starOpacity = (sunAlt) => clamp((-6 - sunAlt) / 6, 0, 1);

// Lit part of the moon as an SVG path, bright limb towards +x before rotation.
// The terminator is a half-ellipse whose width depends on the lit fraction.
const moonLitPath = (r, illumination) => {
  const rx = Math.abs(1 - 2 * illumination) * r;
  const sweep = illumination < 0.5 ? 0 : 1;
  return `M0,${-r}A${r},${r} 0 0 1 0,${r}A${rx},${r} 0 0 ${sweep} 0,${-r}Z`;
};

// Everything the view can place, each with a position function over time.
// Planets, moon and sun move on fixed diurnal circles from one sighting; ISS passes
// are interpolated through their start/peak/end.
const buildBodies = (data, latitude, anchorTime) => {
  const objects = data.objects ?? [];
  const planets = objects
    .filter((o) => o.kind === 'planet')
    .map((o) => ({
      id: o.id,
      kind: 'planet',
      name: o.name,
      magnitude: o.magnitude,
      detail: [o.magnitude != null && `mag ${o.magnitude.toFixed(1)}`, o.constellation && `in ${o.constellation}`].filter(Boolean).join(' '),
      at: diurnalPath(o.peak, latitude),
    }));
  const stars = objects
    .filter((o) => o.kind === 'star')
    .map((o) => ({
      id: o.id,
      kind: 'star',
      name: o.name,
      magnitude: o.magnitude,
      detail: [o.magnitude != null && `mag ${o.magnitude.toFixed(1)}`, o.constellation && `in ${o.constellation}`].filter(Boolean).join(' '),
      at: diurnalPath(o.peak, latitude),
    }));
  const passes = objects
    .filter((o) => o.kind === 'satellite')
    .flatMap((o) => (o.passes ?? []).map((p) => ({
      id: `${o.id}-${p.start.time}`,
      kind: 'satellite',
      name: o.id === 'iss' ? 'ISS' : o.name,
      detail: `pass ${formatTime(new Date(p.start.time))}, ${p.endsInShadow ? 'vanishes' : 'sets'}`,
      from: new Date(p.start.time).getTime(),
      to: new Date(p.end.time).getTime(),
      at: pointsPath([p.start, p.peak, p.end]),
    })));
  // sun/moon positions are for the time of the request
  const moon = data.moon?.position && {
    id: 'moon',
    kind: 'moon',
    name: 'Moon',
    detail: `${Math.round(data.moon.phase.illumination * 100)}% lit`,
    illumination: data.moon.phase.illumination,
    at: diurnalPath({ ...data.moon.position, time: anchorTime }, latitude, MOON_DEG_PER_HOUR),
  };
  const sun = data.sun?.position && diurnalPath({ ...data.sun.position, time: anchorTime }, latitude);
  return { planets, stars, passes, moon, sun };
};

// Where a body below the horizon at `time` first comes up before `until`: { azimuth } or null.
// Passes rise at their first visible point; the rest are stepped forward.
const risingAfter = (b, time, until) => {
  if (b.kind === 'satellite') return b.from > time ? b.at(b.from) : null;
  for (let t = time + RISE_STEP_MS; t <= until; t += RISE_STEP_MS) {
    const later = b.at(t);
    if (later.altitude > 0) return later;
  }
  return null;
};

// Everything that can be selected or followed. Stars come first so they draw underneath.
const selectable = (bodies) => [...bodies.stars, ...bodies.planets, ...bodies.passes, ...(bodies.moon ? [bodies.moon] : [])];

// Start facing the brightest planet at `time`, else the equator side of the sky
const initialAzimuth = (bodies, time, latitude) => {
  const up = bodies.planets
    .map((p) => ({ ...p, pos: p.at(time) }))
    .filter((p) => p.pos.altitude > 0)
    .sort((a, b) => (a.magnitude ?? 99) - (b.magnitude ?? 99));
  if (up.length) return up[0].pos.azimuth;
  return latitude >= 0 ? 180 : 0;
};

const useElementSize = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
};

const SkyCanvas = ({ data, latitude, longitude, anchorTime, focusId }) => {
  const [boxRef, { width, height }] = useElementSize();
  const svgRef = useRef(null);
  const viewWindow = data.window;
  const windowStart = new Date(viewWindow.start).getTime();
  const windowEnd = new Date(viewWindow.end).getTime();
  const now = Date.now();
  const nowInWindow = now >= windowStart && now <= windowEnd;

  const bodies = useMemo(() => buildBodies(data, latitude, anchorTime), [data, latitude, anchorTime]);

  const [time, setTime] = useState(() => clamp(now, windowStart, windowEnd));
  const [view, setView] = useState(() => ({
    azimuth: initialAzimuth(bodies, clamp(now, windowStart, windowEnd), latitude),
    altitude: 20,
    fov: null, // set from the viewport shape once measured
  }));
  const [selectedId, setSelectedId] = useState(focusId ?? null);
  // While following, the view stays centred on the selected body as time changes;
  // dragging the view stops it
  const [following, setFollowing] = useState(!!focusId);

  const followed = following && selectable(bodies).find((b) => b.id === selectedId);
  // Below the horizon, face where it will rise (its marker) rather than where it is now
  const followedNow = followed && followed.at(time);
  const followedPos = followedNow?.altitude > 0
    ? followedNow
    : followed && (risingAfter(followed, time, windowEnd) ?? followedNow);
  useEffect(() => {
    if (!followedPos || view.fov === null || !width) return;
    // Centred left-right. A body low in the sky is shown with the horizon in the lower
    // quarter of the view rather than across the middle.
    const halfHeightDeg = (view.fov * height) / width / 2;
    setView((v) => ({
      ...v,
      azimuth: followedPos.azimuth,
      altitude: clamp(Math.max(followedPos.altitude, halfHeightDeg / 2), MIN_ALT, MAX_ALT),
    }));
  }, [followedPos?.azimuth, followedPos?.altitude, view.fov === null, width, height]);

  // Wider field on landscape screens, narrower on portrait so things aren't squeezed.
  // Zoomed in when opened on one object.
  useEffect(() => {
    if (width && view.fov === null) {
      const fov = focusId ? (width > height ? 60 : 45) : (width > height ? 100 : 70);
      setView((v) => ({ ...v, fov }));
    }
  }, [width, height, view.fov, focusId]);

  const ready = width > 0 && height > 0 && view.fov !== null;
  const projection = useMemo(
    () => ready && createProjection({ ...view, width, height }),
    [ready, view, width, height],
  );

  // Drag to look around, pinch or wheel to zoom, tap to select
  const pointers = useRef(new Map());
  const gesture = useRef({ moved: 0 });

  const panBy = (dx, dy) => {
    if (!projection) return;
    setFollowing(false);
    const k = projection.degreesPerPixel;
    setView((v) => ({
      ...v,
      azimuth: (((v.azimuth - dx * k) % 360) + 360) % 360,
      altitude: clamp(v.altitude + dy * k, MIN_ALT, MAX_ALT),
    }));
  };

  const zoomBy = (factor) => setView((v) => ({ ...v, fov: clamp(v.fov * factor, MIN_FOV, MAX_FOV) }));

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    // Native listener so preventDefault works (React's wheel handler is passive)
    const onWheel = (e) => {
      e.preventDefault();
      zoomBy(Math.exp(e.deltaY * 0.0015));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [ready]);

  const onPointerDown = (e) => {
    svgRef.current.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = { moved: 0 };
  };

  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 1) {
      gesture.current.moved += Math.hypot(next.x - prev.x, next.y - prev.y);
      panBy(next.x - prev.x, next.y - prev.y);
    } else if (pointers.current.size === 2) {
      const [other] = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      if (before > 0 && after > 0) zoomBy(before / after);
      gesture.current.moved = Infinity;
    }
    pointers.current.set(e.pointerId, next);
  };

  const onPointerUp = (e) => {
    const wasTap = pointers.current.size === 1 && gesture.current.moved < TAP_SLOP_PX;
    pointers.current.delete(e.pointerId);
    if (!wasTap) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // A rising marker's label hangs below its arrow, so it is hit around the middle of the two
    const markerHits = risingMarkers.map((m) => ({ id: m.id, x: m.x, y: m.y + RISING_LABEL_DY / 2 }));
    const hit = [...placed, ...markerHits]
      .map((b) => ({ id: b.id, d: Math.hypot(b.x - x, b.y - y) }))
      .filter((b) => b.d < HIT_RADIUS_PX)
      .sort((a, b) => a.d - b.d)[0];
    setSelectedId(hit?.id ?? null);
    setFollowing(!!hit);
  };

  const onKeyDown = (e) => {
    const step = 40;
    const actions = {
      ArrowLeft: () => panBy(step, 0),
      ArrowRight: () => panBy(-step, 0),
      ArrowUp: () => panBy(0, step),
      ArrowDown: () => panBy(0, -step),
      '+': () => zoomBy(0.85),
      '=': () => zoomBy(0.85),
      '-': () => zoomBy(1 / 0.85),
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  };

  const sunAlt = bodies.sun ? bodies.sun(time).altitude : -18;
  const sky = skyColors(sunAlt);

  // Bodies above the horizon at `time`, with screen positions (also used for hit-testing)
  const placed = useMemo(() => {
    if (!projection) return [];
    const starsOut = starOpacity(sunAlt) > 0;
    return selectable(bodies)
      .filter((b) => b.kind !== 'star' || starsOut || b.id === selectedId)
      .map((b) => ({ ...b, pos: b.at(time) }))
      .filter((b) => b.pos && b.pos.altitude > 0)
      .map((b) => ({ ...b, ...projection.project(b.pos) }))
      .filter((b) => b.front && b.x > -50 && b.x < width + 50 && b.y > -50 && b.y < height + 50);
  }, [projection, bodies, time, width, height, sunAlt, selectedId]);

  // Bodies below the horizon at `time` that come up later in the window, marked where they will rise
  const risings = useMemo(() => selectable(bodies)
    .map((b) => {
      const pos = b.at(time);
      if (pos && pos.altitude > 0) return null;
      const rise = risingAfter(b, time, windowEnd);
      return rise && { id: b.id, name: b.name, azimuth: rise.azimuth };
    })
    .filter(Boolean), [bodies, time, windowEnd]);

  // Screen positions of the rising markers on the horizon (also used for hit-testing), with
  // labels stacked in rows so neighbours don't overlap
  const risingMarkers = useMemo(() => {
    if (!projection) return [];
    const rowEnds = [];
    return risings
      .map((r) => ({ ...r, ...projection.project({ altitude: 0, azimuth: r.azimuth }) }))
      .filter((m) => m.front && m.x > -20 && m.x < width + 20)
      .sort((a, b) => a.x - b.x)
      .map((m) => {
        const halfWidth = m.name.length * 3 + 4;
        let row = rowEnds.findIndex((end) => m.x - halfWidth > end);
        if (row === -1) row = rowEnds.length;
        rowEnds[row] = m.x + halfWidth;
        return { ...m, row };
      });
  }, [projection, risings, width]);

  // Same outer element either way, so the size observer keeps watching it
  if (!ready) {
    return <><Box ref={boxRef} sx={{ flex: 1, minHeight: 0, position: 'relative' }} /></>;
  }

  const { project } = projection;

  // Ground: the horizon is a circle under this projection. If the zenith falls inside it the
  // sky is inside and the ground is everything else; very large circles are drawn as a line.
  const h = [-90, 0, 90].map((d) => project({ altitude: 0, azimuth: view.azimuth + d }));
  const zenith = project({ altitude: 90, azimuth: 0 });
  const circle = circleThrough(...h);
  const FAR = 1e5;
  let groundPath;
  let horizonLine;
  if (!circle || circle.r > 20 * Math.max(width, height)) {
    const y = h[1].y;
    groundPath = `M${-FAR},${y}H${FAR}V${FAR}H${-FAR}Z`;
    horizonLine = `M${-FAR},${y}H${FAR}`;
  } else {
    const { cx, cy, r } = circle;
    const ring = `M${cx - r},${cy}a${r},${r} 0 1 0 ${2 * r},0a${r},${r} 0 1 0 ${-2 * r},0Z`;
    const skyInside = Math.hypot(zenith.x - cx, zenith.y - cy) < r;
    groundPath = skyInside ? `M${-FAR},${-FAR}H${FAR}V${FAR}H${-FAR}Z${ring}` : ring;
    horizonLine = ring;
  }

  // Faint altitude rings and compass meridians
  const ring = (alt) => skyPath(
    Array.from({ length: 181 }, (_, i) => ({ altitude: alt, azimuth: i * 2 })), project);
  const meridian = (az) => skyPath(
    Array.from({ length: 41 }, (_, i) => ({ altitude: i * 2, azimuth: az })), project);
  const grid = [ring(30), ring(60), ...COMPASS.map((_, i) => meridian(i * 45))].join('');

  const ecliptic = eclipticPositions(time, latitude, longitude);
  const eclipticPath = skyPath(ecliptic, project);
  // Label the ecliptic at its leftmost visible point above the horizon
  const eclipticLabel = ecliptic
    .map((pos) => ({ pos, p: project(pos) }))
    .filter(({ pos, p }) => pos.altitude > 3 && p.front && p.x > 40 && p.x < width - 80 && p.y > 20 && p.y < height - 20)
    .sort((a, b) => a.p.x - b.p.x)[0];

  const compassLabels = COMPASS
    .map((label, i) => ({ label, p: project({ altitude: -3, azimuth: i * 45 }) }))
    .filter(({ p }) => p.front && p.x > -20 && p.x < width + 20);

  const altitudeLabels = [30, 60]
    .map((alt) => ({ alt, p: project({ altitude: alt, azimuth: view.azimuth }) }))
    .filter(({ p }) => p.front && p.y > 0 && p.y < height);

  // Only satellite passes get a track: they move against the background sky. Planets and
  // the moon just turn with it over an evening, which the time slider already shows.
  const tracks = bodies.passes.map((b) => {
    const times = Array.from({ length: 21 }, (_, i) => b.from + ((b.to - b.from) * i) / 20);
    const positions = times.map((t) => b.at(t)).filter(Boolean);
    return { id: b.id, d: skyPath(positions, project, (pos) => pos.altitude > 0) };
  });

  const selected = placed.find((b) => b.id === selectedId)
    ?? selectable(bodies).find((b) => b.id === selectedId);
  const selectedPos = selected?.at(time);

  const sliderMarks = nowInWindow ? [{ value: now, label: 'Now' }] : [];

  return (
    <>
      <Box ref={boxRef} sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Sky facing ${toCompass(view.azimuth)}, ${Math.round(view.altitude)}° up, at ${formatTime(time)}`}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
          onKeyDown={onKeyDown}
          style={{ display: 'block', touchAction: 'none', cursor: 'grab', outline: 'none', userSelect: 'none' }}
        >
          <defs>
            <linearGradient id="sky-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={sky.top} />
              <stop offset="1" stopColor={sky.bottom} />
            </linearGradient>
            <radialGradient id="glow">
              <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={width} height={height} fill="url(#sky-bg)" />
          <path d={grid} fill="none" stroke={COLORS.grid} strokeWidth={1} />
          {altitudeLabels.map(({ alt, p }) => (
            <text key={alt} x={p.x + 4} y={p.y - 4} fontSize={10} fill={COLORS.gridLabel}>{alt}°</text>
          ))}

          <path d={eclipticPath} fill="none" stroke={COLORS.ecliptic} strokeWidth={1} />
          {eclipticLabel && (
            <text x={eclipticLabel.p.x + 4} y={eclipticLabel.p.y - 5} fontSize={10} fill={COLORS.ecliptic}>Ecliptic</text>
          )}

          {tracks.map(({ id, d }) => (
            <path key={id} d={d} fill="none" stroke={id === selectedId ? COLORS.label : COLORS.track}
              strokeWidth={id === selectedId ? 1.5 : 1} strokeDasharray="3 4" />
          ))}

          {placed.map((b) => {
            if (b.kind === 'moon') {
              const r = 9;
              const sunPos = bodies.sun?.(time);
              const angle = sunPos ? screenDirection(b.pos, sunPos, project) * (180 / Math.PI) : 0;
              return (
                <g key={b.id} transform={`translate(${b.x},${b.y})`}>
                  <circle r={r * 2.6} fill="url(#glow)" opacity={0.2 + 0.6 * b.illumination} />
                  <circle r={r} fill={COLORS.moonDark} />
                  <path d={moonLitPath(r, b.illumination)} fill={COLORS.moonLit} transform={`rotate(${angle})`} />
                  <text x={r + 5} y={4} fontSize={12} fill={COLORS.label}>Moon</text>
                </g>
              );
            }
            if (b.kind === 'star') {
              const r = starRadius(b.magnitude);
              const opacity = b.id === selectedId ? 1 : starOpacity(sunAlt);
              if (opacity === 0) return null;
              return (
                <g key={b.id} transform={`translate(${b.x},${b.y})`} opacity={opacity}>
                  <circle r={r} fill={COLORS.star} />
                  {b.id === selectedId && <circle r={r + 6} fill="none" stroke={COLORS.label} strokeWidth={1} />}
                  <text x={r + 4} y={3} fontSize={10} fill={COLORS.starLabel}>{b.name}</text>
                </g>
              );
            }
            const r = b.kind === 'satellite' ? 3 : planetRadius(b.magnitude);
            const color = b.kind === 'satellite' ? COLORS.iss : PLANET_COLOR[b.id] ?? COLORS.label;
            return (
              <g key={b.id} transform={`translate(${b.x},${b.y})`}>
                <circle r={r * 3} fill="url(#glow)" />
                <circle r={r} fill={color} />
                {b.id === selectedId && <circle r={r + 6} fill="none" stroke={COLORS.label} strokeWidth={1} />}
                <text x={r + 5} y={4} fontSize={12} fill={COLORS.label}>{b.name}</text>
              </g>
            );
          })}

          <path d={groundPath} fill={COLORS.ground} fillRule="evenodd" />
          <path d={horizonLine} fill="none" stroke={COLORS.horizon} strokeWidth={1} />
          {compassLabels.map(({ label, p }) => (
            <text key={label} x={p.x} y={p.y + 12} fontSize={label.length === 1 ? 14 : 11}
              fontWeight={label.length === 1 ? 600 : 400} textAnchor="middle" fill={COLORS.compass}>{label}</text>
          ))}

          {risingMarkers.map((m) => {
            const color = m.id === selectedId ? COLORS.label : COLORS.rising;
            return (
              <g key={`rising-${m.id}`} transform={`translate(${m.x},${m.y})`}>
                <path d="M-4,-10L4,-10L0,-2Z" fill={color} />
                <text y={RISING_LABEL_DY + m.row * RISING_ROW_DY} fontSize={10} textAnchor="middle" fill={color}>{m.name}</text>
              </g>
            );
          })}
        </svg>

        <Typography variant="caption" sx={{ position: 'absolute', left: 12, bottom: 8, color: COLORS.compass, pointerEvents: 'none' }}>
          Facing {toCompass(view.azimuth)} {Math.round(view.azimuth)}° · {Math.round(view.altitude)}° up
        </Typography>
        {selected && selectedPos && (
          <Typography variant="body2" sx={{ position: 'absolute', left: 12, top: 8, color: COLORS.label, pointerEvents: 'none' }}>
            {selected.name} · {selected.detail} ·{' '}
            {selectedPos.altitude > 0
              ? `${Math.round(selectedPos.altitude)}° ${toCompass(selectedPos.azimuth)}`
              : 'below the horizon'}
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 3, pt: 1, pb: 2, bgcolor: COLORS.ground, color: COLORS.label }}>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>{formatTime(time)}</Typography>
        <Slider
          value={time}
          min={windowStart}
          max={windowEnd}
          step={SLIDER_STEP_MS}
          marks={sliderMarks}
          onChange={(_, v) => setTime(v)}
          valueLabelDisplay="auto"
          valueLabelFormat={formatTime}
          getAriaValueText={formatTime}
          aria-label="Time tonight"
          sx={{ color: COLORS.label, '& .MuiSlider-markLabel': { color: COLORS.compass } }}
        />
      </Box>
    </>
  );
};

// Full-screen horizon view of tonight's sky: drag to look around, pinch or scroll to zoom,
// slide through the evening. `anchorTime` is when `data` was fetched, since its sun and moon
// positions are for that moment.
// `focusId` (an object id, e.g. "saturn") starts the view centred on that object.
const SkyView = ({ open, onClose, data, latitude, longitude, anchorTime, focusId }) => (
  <Dialog fullScreen open={open} onClose={onClose}
    slotProps={{ paper: { sx: { bgcolor: COLORS.ground, display: 'flex', flexDirection: 'column' } } }}>
    <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, color: COLORS.label }}>
      <IconButton aria-label="close" onClick={onClose} sx={{ color: COLORS.label }}>
        <CloseIcon />
      </IconButton>
      <Typography variant="h6" sx={{ ml: 1 }}>Tonight&apos;s sky</Typography>
    </Box>
    {open && data?.window && <SkyCanvas data={data} latitude={latitude} longitude={longitude} anchorTime={anchorTime} focusId={focusId} />}
  </Dialog>
);

export default SkyView;
