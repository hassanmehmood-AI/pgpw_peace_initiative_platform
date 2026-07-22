// WCAG 2 contrast-ratio math, used to computationally verify the community
// affiliation-chip colors defined in webapp/src/app/globals.css (Phase A1)
// meet accessibility requirements, per Phase A9's accessibility-check task.

export type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function channelLuminance(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG 2 contrast ratio between two colors, from 1 (no contrast) to 21 (max). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Alpha-composites `hex` at `opacityPercent`% over a solid `overHex` backdrop
 * (white by default). Mirrors the `color-mix(in srgb, <color> N%, transparent)`
 * tint formula globals.css uses for affiliation-chip backgrounds.
 */
export function mixOver(hex: string, opacityPercent: number, overHex = "#ffffff"): string {
  const fg = hexToRgb(hex);
  const bg = hexToRgb(overHex);
  const alpha = opacityPercent / 100;
  const blend = (a: number, b: number) => Math.round(a * alpha + b * (1 - alpha));
  const r = blend(fg.r, bg.r);
  const g = blend(fg.g, bg.g);
  const b = blend(fg.b, bg.b);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

// WCAG 2.1 AA thresholds
export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_UI_COMPONENT = 3.0;
