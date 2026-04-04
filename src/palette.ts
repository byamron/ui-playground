/**
 * Color palette system derived from the portfolio site's design language.
 *
 * Core DNA:
 *  - HSL-based with controlled saturation (never garish)
 *  - Dark mode backgrounds: very low lightness (7-14%), moderate saturation (15-25%)
 *  - Light mode backgrounds: very high lightness (91-96%), low saturation (17-30%)
 *  - Accent hues inspired by portfolio: warm (15, 34, 47) and cool (204)
 *  - Text colors respect the portfolio's neutral-with-subtle-tint approach
 *
 * The original 4 accent hues and their relationships:
 *   table:    34  (warm gold)
 *   portrait: 47  (muted amber)
 *   sky:      204 (cool blue)
 *   pizza:    15  (warm coral)
 */

// --- Core palette hues (portfolio originals + extended family) ---

export const HUES = {
  // Portfolio originals
  table: 34,
  portrait: 47,
  sky: 204,
  pizza: 15,
  // Extended family (same DNA — either warm analogues or cool complements)
  slate: 220,
  violet: 260,
  sage: 150,
  rose: 350,
  ember: 25,
  midnight: 235,
  forest: 165,
  dusk: 280,
} as const;

export type HueName = keyof typeof HUES;

// --- Background generation ---

interface BgConfig {
  hue: number;
  mode: "dark" | "light";
  intensity?: 0 | 1 | 2 | 3; // 0=Whisper, 1=Subtle, 2=Tinted, 3=Warm
}

const INTENSITY_SCALES = {
  dark: {
    satMult: [1.0, 1.5, 2.0, 2.8],
    lShift: [0, 1, 1.5, 2],
  },
  light: {
    satMult: [1.0, 1.5, 2.0, 2.8],
    lShift: [0, -3, -6, -10],
  },
};

export function bg({ hue, mode, intensity = 1 }: BgConfig = { hue: 220, mode: "dark" }): string {
  const baseSat = mode === "dark" ? 20 : 22;
  const baseL = mode === "dark" ? 8 : 94;

  const scale = INTENSITY_SCALES[mode];
  const sat = baseSat * scale.satMult[intensity];
  const l = baseL + scale.lShift[intensity];

  return `hsl(${hue}, ${Math.round(sat)}%, ${Math.round(l)}%)`;
}

// --- Text colors (from portfolio theme.css) ---

export const text = {
  dark: {
    primary: "hsl(0, 0%, 99%)",
    secondary: "hsl(0, 0%, 90%)",
    tertiary: "hsl(240, 2%, 75%)",
    muted: "hsl(0, 0%, 40%)",
    inverse: "hsl(0, 0%, 7%)",
  },
  light: {
    primary: "hsl(0, 0%, 7%)",
    secondary: "hsl(0, 0%, 20%)",
    tertiary: "hsl(240, 2%, 45%)",
    muted: "hsl(0, 0%, 70%)",
    inverse: "hsl(0, 0%, 100%)",
  },
} as const;

// --- Accent / swatch color for a given hue ---

export function accent(hue: number, saturation = 50, lightness = 65): string {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// --- Glass overlay (from portfolio glass system) ---

export function glass(hue: number): {
  fill: string;
  border: string;
  highlight: string;
} {
  return {
    fill: `hsla(${hue}, 10%, 45%, 0.05)`,
    border: `hsla(${hue}, 20%, 50%, 0.15)`,
    highlight:
      "radial-gradient(ellipse 150% 120% at 50% 10%, rgba(255,255,255,0.19), rgba(255,255,255,0.076) 50%, rgba(255,255,255,0.019) 85%, transparent 120%)",
  };
}

// --- Pre-assigned demo palettes ---
// Each demo gets a distinct hue, keeping the collection visually cohesive.

export const demoPalettes = {
  "water-ripple": { hue: HUES.sky, mode: "dark" as const, intensity: 1 as const },
  "glass-pull": { hue: HUES.violet, mode: "dark" as const, intensity: 1 as const },
  "magnetic-button": { hue: HUES.midnight, mode: "dark" as const, intensity: 1 as const },
  "text-scramble": { hue: HUES.ember, mode: "dark" as const, intensity: 1 as const },
  "elastic-toggle": { hue: HUES.slate, mode: "dark" as const, intensity: 1 as const },
  "fisheye-text": { hue: HUES.portrait, mode: "dark" as const, intensity: 1 as const },
  "figpal-cursor": { hue: HUES.sage, mode: "dark" as const, intensity: 1 as const },
  "cursor-morph": { hue: HUES.forest, mode: "dark" as const, intensity: 1 as const },
  "theme-sidebar": { hue: HUES.table, mode: "dark" as const, intensity: 1 as const },
  "task-ranking": { hue: HUES.rose, mode: "dark" as const, intensity: 1 as const },
  "dvd-bounce": { hue: HUES.pizza, mode: "dark" as const, intensity: 0 as const },
} as const;
