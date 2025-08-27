import Color from 'color';
import * as THREE from 'three';

export interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

function srgbToLinear01(srgb01: number): number {
  return srgb01 <= 0.04045
    ? srgb01 / 12.92
    : Math.pow((srgb01 + 0.055) / 1.055, 2.4);
}

// Accepts any CSS color string that `color` supports (hex, rgb(a), hsl(a), named)
// Returns linear RGB values in [0..1] suitable for three.js shader uniforms
export function cssColorToLinearRGB(css: string): LinearRgb {
  const c = Color(css).rgb().array();
  const r01 = Math.max(0, Math.min(1, (c[0] || 0) / 255));
  const g01 = Math.max(0, Math.min(1, (c[1] || 0) / 255));
  const b01 = Math.max(0, Math.min(1, (c[2] || 0) / 255));
  return {
    r: srgbToLinear01(r01),
    g: srgbToLinear01(g01),
    b: srgbToLinear01(b01),
  };
}

export function glslVec3(rgb: LinearRgb): string {
  return `vec3(${rgb.r.toFixed(6)}, ${rgb.g.toFixed(6)}, ${rgb.b.toFixed(6)})`;
}

// Normalize any CSS color to a canonical rgba(...) string
export function normalizeCssColor(css: string): string {
  return Color(css).rgb().string();
}

// Convenience: parse CSS and return THREE.Color (linear) and alpha
export function cssToThreeColor(css: string): {
  color: THREE.Color;
  alpha: number;
} {
  const c = Color(css).rgb();
  const [r, g, b] = c.array();
  const a = c.alpha();
  const lin = cssColorToLinearRGB(c.string());
  return {
    color: new THREE.Color(lin.r, lin.g, lin.b),
    alpha: a,
  };
}
