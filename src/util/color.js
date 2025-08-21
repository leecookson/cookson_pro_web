/**
 * Lightens or darkens a hex color by a given percentage.
 *
 * @param {string} hex - The hex color string (e.g., "#RRGGBB").
 * @param {number} percent - The percentage to lighten (positive) or darken (negative) the color.
 * @returns {string} The new hex color string, or the original hex if an error occurs or limits are exceeded.
 */
export const adjustHexColor = (hex, percent) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    console.warn(`Invalid hex color format: ${hex}. Returning original.`);
    return hex;
  }

  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    // Handle shorthand hex codes like #FFF
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn(`Invalid shorthand hex color format: ${hex}. Returning original.`);
        return hex;
      }
    } else {
      console.warn(`Error parsing hex color components: ${hex}. Returning original.`);
      return hex;
    }
  }

  const adjustComponent = (comp) => {
    const newComp = comp + Math.floor(255 * (percent / 100));
    return Math.min(255, Math.max(0, newComp));
  };

  r = adjustComponent(r);
  g = adjustComponent(g);
  b = adjustComponent(b);

  const toHex = (c) => {
    const hexComp = c.toString(16);
    return hexComp.length === 1 ? '0' + hexComp : hexComp;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
