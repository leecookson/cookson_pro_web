import { useState, useEffect } from 'react';
import geomagnetism from 'geomagnetism';

const RAD = Math.PI / 180;

// True on phones and tablets that could report orientation. Desktop browsers expose the
// API too but have no compass, so they're excluded by their fine pointer.
export const hasDeviceOrientation = () => typeof window !== 'undefined'
  && 'DeviceOrientationEvent' in window
  && window.matchMedia('(pointer: coarse)').matches;

// iOS Safari only sends orientation events after the user grants permission, and the
// request must come from a tap. Elsewhere there's nothing to ask. Resolves true if allowed.
export const requestOrientationPermission = async () => {
  const request = window.DeviceOrientationEvent?.requestPermission;
  if (typeof request !== 'function') return true;
  try {
    return (await request()) === 'granted';
  } catch {
    return false;
  }
};

// Magnetic heading of the back of the device (where the camera points) from absolute
// alpha/beta/gamma, per the W3C Device Orientation spec's worked example. Null when the
// device is lying flat and the back points straight down.
const backHeading = (alpha, beta, gamma) => {
  const cA = Math.cos(alpha * RAD);
  const sA = Math.sin(alpha * RAD);
  const sB = Math.sin(beta * RAD);
  const cG = Math.cos(gamma * RAD);
  const sG = Math.sin(gamma * RAD);
  const x = -cA * sG - sA * sB * cG;
  const y = -sA * sG + cA * sB * cG;
  if (Math.hypot(x, y) < 0.1) return null;
  return ((Math.atan2(x, y) / RAD) + 360) % 360;
};

// Compass needles point to magnetic north; this is how far east of true north that is here
const magneticDeclination = (lat, lon) => {
  try {
    return geomagnetism.model(new Date()).point([lat, lon]).decl;
  } catch {
    return 0;
  }
};

// Smoothing for sensor jitter: each reading moves the heading this fraction of the way
const SMOOTHING = 0.25;

/**
 * True heading (degrees clockwise from true north) the device is pointing, while `enabled`.
 * Uses iOS's webkitCompassHeading, or absolute orientation events on Android/Chrome.
 * Returns { heading, status } where status is 'off', 'waiting' (no reading yet) or 'ok'.
 */
export const useCompassHeading = (enabled, lat, lon) => {
  const [heading, setHeading] = useState(null);

  useEffect(() => {
    setHeading(null);
    if (!enabled) return undefined;
    const declination = magneticDeclination(lat, lon);
    // Android Chrome's plain deviceorientation is relative to an arbitrary start; the
    // absolute variant is north-referenced. iOS only has the plain one, with webkitCompassHeading.
    const type = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';

    const onOrientation = (e) => {
      let magnetic = null;
      if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) {
        magnetic = e.webkitCompassHeading;
      } else if ((type === 'deviceorientationabsolute' || e.absolute) && e.alpha != null) {
        magnetic = backHeading(e.alpha, e.beta ?? 0, e.gamma ?? 0);
      }
      if (magnetic == null) return;
      const target = (magnetic + declination + 360) % 360;
      setHeading((prev) => {
        if (prev == null) return target;
        // Shortest way round, so 359° -> 1° doesn't swing the long way
        const delta = ((target - prev + 540) % 360) - 180;
        return (prev + delta * SMOOTHING + 360) % 360;
      });
    };

    window.addEventListener(type, onOrientation);
    return () => window.removeEventListener(type, onOrientation);
  }, [enabled, lat, lon]);

  const status = !enabled ? 'off' : heading == null ? 'waiting' : 'ok';
  return { heading, status };
};
