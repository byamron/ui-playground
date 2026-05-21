// Physics + geometry helpers for the arcade coin-insertion choreography.

export interface SlotGeometry {
  centerX: number;
  slitY: number;
  topY: number;
  height: number;
}

// Measure a cabinet's slot in viewport coordinates. Returns null if the slot
// element isn't mounted (e.g. cabinet is mid-credit and slot has unmounted).
export function measureSlot(path: string): SlotGeometry | null {
  const el = document.querySelector(
    `[data-cabinet-slot="${path}"] [data-slot-icon]`,
  ) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    centerX: r.left + r.width / 2,
    slitY: r.top + r.height / 2,
    topY: r.top,
    height: r.height,
  };
}

export interface CoinVariance {
  peakOffset: number; // ±60 — varies arc apex height
  midOffsetX: number; // ±80 — varies horizontal curve shape
  apexPhase: number; // 0.4..0.6 — fraction of approach where coin peaks
  flightScale: number; // 0.88..1.12 — per-coin flight duration multiplier
  spinTurns: number; // integer (1, 2, or 3) — guarantees clean 360° land
  wobbleSign: 1 | -1;
}

export const DEFAULT_VARIANCE: CoinVariance = {
  peakOffset: 0,
  midOffsetX: 0,
  apexPhase: 0.5,
  flightScale: 1,
  spinTurns: 2,
  wobbleSign: 1,
};

// Deterministic per-coin variance so a given jackpot looks the same each
// time and adjacent coins don't trace identical arcs. Wider ranges than
// before give the jackpot a "spilled handful" feel rather than 16 copies
// of one trajectory.
export function seedVariance(index: number): CoinVariance {
  const rng = mulberry32(index * 2654435761 + 0x9e3779b9);
  // spinTurns is forced integer so each coin lands at a clean multiple
  // of 360° → face is always square to camera at slot arrival (no
  // half-spin angled landing).
  const spinTurns = 1 + Math.floor(rng() * 3); // 1, 2, or 3
  return {
    peakOffset: (rng() - 0.5) * 120, // ±60
    midOffsetX: (rng() - 0.5) * 160, // ±80
    apexPhase: 0.4 + rng() * 0.2, // 0.4 .. 0.6
    flightScale: 0.88 + rng() * 0.24, // 0.88 .. 1.12
    spinTurns,
    wobbleSign: index % 2 === 0 ? 1 : -1,
  };
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Phase durations (seconds). Approach varies per-insertion (drag vs. jackpot);
// alignment + insertion are constants tuned to the physics.
export const PHASE_ALIGN = 0.09;
export const PHASE_INSERT = 0.18;

export const FLIGHT_DRAG = 0.22; // drop position → slot top
export const FLIGHT_JACKPOT = 0.55; // coin bag → slot top
export const COIN_STAGGER = 0.07; // s between jackpot coin launches

// How high above the slot the coin pauses before tipping into it.
export const SLOT_HOVER_GAP = 14;
// How far past the slit the coin's center descends during insertion.
export const SLOT_DESCENT = 8;
// Coin diameter for the in-flight coin (used for descent geometry).
export const COIN_DIAMETER = 36;
