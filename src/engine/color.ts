import type { Rgb } from '../types';

/** Color helpers: hex <-> RGB, sRGB -> CIELAB, perceptual distance, plain-language naming. */

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a #rrggbb color: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const labF = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

/** sRGB -> linear -> XYZ (D65) -> CIELAB. */
export function rgbToLab({ r, g, b }: Rgb): Lab {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** Squared Euclidean distance in Lab (CIE76). Good enough for 2–8 yarn colors. */
export function labDistanceSq(a: Lab, b: Lab): number {
  const dl = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return dl * dl + da * da + db * db;
}

/** Plain-language name such as "warm brown", "soft grey", "cream". One or two words. */
export function nameColor(rgb: Rgb): string {
  const { l, a, b } = rgbToLab(rgb);
  const chroma = Math.hypot(a, b);
  const hue = (Math.atan2(b, a) * 180) / Math.PI + (b < 0 || (b === 0 && a < 0) ? 360 : 0);
  const warm = hue >= 20 && hue < 100;

  // Warm, low-chroma lights: cream / beige / tan.
  if (warm && chroma >= 6 && chroma < 40 && l >= 55) {
    if (l > 85) return 'cream';
    if (l > 70) return 'beige';
    return 'tan';
  }
  // Greys.
  if (chroma < 8) {
    if (l > 92) return 'white';
    if (l > 72) return 'light grey';
    if (l > 45) return 'grey';
    if (l > 20) return 'charcoal';
    return 'black';
  }
  // Browns: dark or muted warm colors.
  if (warm && l < 60 && chroma < 55) {
    if (l < 28) return 'dark brown';
    if (hue < 45 && chroma > 30) return 'chestnut';
    return 'warm brown';
  }

  let base: string;
  if (hue >= 20 && hue < 50) base = 'red';
  else if (hue >= 50 && hue < 72) base = 'orange';
  else if (hue >= 72 && hue < 110) base = 'yellow';
  else if (hue >= 110 && hue < 170) base = 'green';
  else if (hue >= 170 && hue < 230) base = 'teal';
  else if (hue >= 230 && hue < 300) base = 'blue';
  else if (hue >= 300 && hue < 340) base = 'purple';
  else base = l < 45 ? 'red' : 'pink';
  if (base === 'red' && l > 68) base = 'pink';

  const modifier = l > 78 ? 'light' : l < 35 ? 'dark' : chroma < 30 ? 'soft' : '';
  if (base === 'yellow' && !modifier) return 'golden yellow';
  return modifier ? `${modifier} ${base}` : base;
}

/**
 * Makes palette names distinct. Duplicates are told apart by lightness
 * ("light grey" / "dark grey") when `lightness` is given and there are two of them,
 * otherwise numbered ("grey 2", "grey 3").
 */
export function uniqueNames(names: string[], lightness?: number[]): string[] {
  const out = [...names];
  const groups = new Map<string, number[]>();
  names.forEach((n, i) => groups.set(n, [...(groups.get(n) ?? []), i]));
  for (const [name, idx] of groups) {
    if (idx.length < 2) continue;
    const base = name.replace(/^(light|dark|soft) /, '');
    if (idx.length === 2 && lightness) {
      const [i, j] = lightness[idx[0]] >= lightness[idx[1]] ? idx : [idx[1], idx[0]];
      const light = `light ${base}`;
      const dark = `dark ${base}`;
      if (!out.includes(light) && !out.includes(dark)) {
        out[i] = light;
        out[j] = dark;
        continue;
      }
    }
    idx.forEach((i, k) => {
      if (k > 0) out[i] = `${name} ${k + 1}`;
    });
  }
  // A rename could collide with an existing name; fall back to numbering until unique.
  const seen = new Map<string, number>();
  return out.map((n) => {
    const c = (seen.get(n) ?? 0) + 1;
    seen.set(n, c);
    return c === 1 ? n : `${n} ${c}`;
  });
}
