import { useRef, useEffect, useState, useCallback } from "react";
import { DevPanel, DevSlider, DevButtonGroup, DevButton, DevDivider } from "../../components/DevPanel";
import { bg, HUES } from "../../palette";
import {
  setupGlassHighlight,
  GLASS_DEFAULTS,
  type GlassMode,
  type GlassTunable,
} from "../../utils/glassHighlight";

/**
 * Flock — hover the "X" link and a flock of classic Twitter birds peels out,
 * flapping its way off the top-right of the screen. LinkedIn and GitHub get
 * the glass-pull treatment but no payoff; the bird flight is the punchline.
 */

const TWITTER_BLUE = "#1DA1F2";

// Canonical Twitter bird path on a 248×204 viewBox — drawn at any size as
// an inline SVG so we can recolor and transform freely without managing
// external assets.
const BIRD_PATH = "M221.95,51.29c0.15,2.17,0.15,4.34,0.15,6.53c0,66.73-50.8,143.69-143.69,143.69v-0.04C50.97,201.51,24.1,193.65,1,178.83c3.99,0.48,8,0.72,12.02,0.73c22.74,0.02,44.83-7.61,62.72-21.66c-21.61-0.41-40.56-14.5-47.18-35.07c7.57,1.46,15.37,1.16,22.8-0.87C27.8,117.2,10.85,96.5,10.85,72.46c0-0.22,0-0.43,0-0.64c7.02,3.91,14.88,6.08,22.92,6.32C11.58,63.31,4.74,33.79,18.14,10.71c25.64,31.55,63.47,50.73,104.08,52.76c-4.07-17.54,1.49-35.92,14.61-48.25c20.34-19.12,52.33-18.14,71.45,2.19c11.31-2.23,22.15-6.38,32.07-12.26c-3.77,11.69-11.66,21.62-22.2,27.93c10.01-1.18,19.79-3.86,29-7.95C240.37,35.29,231.83,44.14,221.95,51.29z";

// The bird is already drawn facing up-right (~-45° from +x), so we subtract
// that natural facing. We only apply a fraction of the heading delta — the
// sprite already reads as "in flight up-right," so fully aligning it with
// velocity over-rotates.
const BIRD_NATURAL_HEADING_DEG = -45;
const BIRD_HEADING_FOLLOW = 0.5;
// Target zone for the flock's exit — just below the top-right corner of
// the viewport. Determines baseAngle at spawn so the flock leaves the
// right edge rather than climbing out the top.
const EXIT_TARGET_X_MARGIN = 80;   // px past the right edge
const EXIT_TARGET_Y_FRAC = 0.12;   // fraction of viewport height from top

// ── Tunable defaults ─────────────────────────────────────────────────────────

const DEFAULTS = {
  birdCount: 7,
  flapHz: 6.0,
  spawnStaggerMs: 55,
  flightSpeed: 200,    // px/s baseline
  bobAmplitude: 5,     // px perpendicular wobble
  climbAccel: 15,      // upward acceleration over time, px/s²
  birdSize: 24,        // px
  stragglers: true,    // easter-egg trickle for sustained hovers
  straggler1Ms: 2000,  // first straggler wave after burst
  straggler2Ms: 5000,  // final straggler — a lone bird
};
// First straggler wave is randomized at trigger time (1–3 birds) so
// repeat hovers don't look identical. The final wave is always one bird —
// a lone latecomer punctuating the silence.
const STRAGGLER1_MIN_COUNT = 1;
const STRAGGLER1_MAX_COUNT = 3;
const STRAGGLER2_COUNT = 1;
const DEFAULT_ORIGIN_MODE: OriginMode = "cursor";

// ── Bird state ───────────────────────────────────────────────────────────────

interface Bird {
  el: HTMLDivElement;
  x: number;        // viewport-relative px
  y: number;
  vx: number;       // px/s
  vy: number;
  spawnDelay: number; // s — relative to flock spawn
  age: number;      // s — time since spawn (negative until past delay)
  baseSpeed: number;
  bobAmp: number;
  bobFreq: number;
  bobPhase: number;
  flapPhase: number;
  flapAmp: number;  // 0–1 vertical squash range
  formOffsetX: number; // formation static offset (in flight-frame coords)
  formOffsetY: number;
  rotJitter: number;
  alive: boolean;
  isPerched: boolean;
  perchX: number;
  perchY: number;
}

interface FlockConfig {
  flapHz: number;
  flightSpeed: number;
  bobAmplitude: number;
  climbAccel: number;
  birdSize: number;
}

export type OriginMode = "corner" | "cursor" | "perched";

// Perched birds sit visibly on the X until they launch — too short a
// stagger collapses the "sequence" into a single beat, so we floor it.
const PERCHED_MIN_STAGGER_MS = 130;
// Crouch → push → settle envelope, in seconds from age 0.
const PERCHED_CROUCH_HOLD = 0.05;
const PERCHED_PUSH_PEAK = 0.12;
const PERCHED_LAUNCH_END = 0.20;
const PERCHED_CROUCH_SCALE_Y = 0.62;
const PERCHED_PUSH_SCALE_Y = 1.18;
// Settled pose while perched (waiting to launch).
const PERCHED_REST_SCALE_Y = 0.78;

export interface SpawnOrigin {
  mode: OriginMode;
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  cursorX?: number;
  cursorY?: number;
}

interface BirdSwarmAPI {
  spawn: (origin: SpawnOrigin, count: number) => void;
  cleanup: () => void;
  setStagger: (ms: number) => void;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function setupBirdSwarm(
  layer: HTMLElement,
  cfgRef: React.MutableRefObject<FlockConfig>,
): BirdSwarmAPI {
  const birds: Bird[] = [];
  let rafId: number | null = null;
  let lastTime = 0;

  function createBirdEl(size: number): HTMLDivElement {
    const h = size * (204 / 248);
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    // Negative margins center the element on its translate(x,y) origin —
    // so a translate(linkCenterX, linkCenterY) lands the bird's center there.
    Object.assign(wrap.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: `${size}px`,
      height: `${h}px`,
      marginLeft: `${-size / 2}px`,
      marginTop: `${-h / 2}px`,
      pointerEvents: "none",
      willChange: "transform, opacity",
      transformOrigin: "50% 50%",
      opacity: "0",
    });
    wrap.innerHTML = `<svg viewBox="0 0 248 204" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block;overflow:visible"><path d="${BIRD_PATH}" fill="${TWITTER_BLUE}"/></svg>`;
    layer.appendChild(wrap);
    return wrap;
  }

  // Resolve a per-bird spawn point given the origin descriptor. Each mode
  // has its own physical metaphor:
  //   corner   — single point at the top-right of the X; clean takeoff
  //   cursor   — single point at the cursor (falls back to corner)
  //   perched  — each bird gets its own random point inside the link rect,
  //              like a row of birds that were sitting on the letter
  function resolveOrigin(origin: SpawnOrigin): { x: number; y: number } {
    const { mode, rect } = origin;
    if (mode === "cursor") {
      // X is locked to the link's right edge so birds never spawn left
      // of the cursor (which breaks the "emerging from the link" read).
      // Y tracks the cursor so the flock launches from wherever you're
      // pointing along the X.
      const x = rect.right;
      if (origin.cursorY != null) {
        return { x, y: origin.cursorY };
      }
      return { x, y: rect.top + rect.height / 2 };
    }
    if (mode === "perched") {
      return {
        x: rect.left + rand(0.1, 0.9) * rect.width,
        y: rect.top + rand(0.15, 0.85) * rect.height,
      };
    }
    // corner (default)
    return { x: rect.right - rect.width * 0.15, y: rect.top + rect.height * 0.25 };
  }

  function spawn(origin: SpawnOrigin, count: number) {
    const cfg = cfgRef.current;
    // Aim the flock at a point just below the top-right corner of the
    // viewport. The baseAngle is computed from the *rect* anchor (corner)
    // so every bird heads in roughly the same direction, even in modes
    // (perched) where each bird's own spawn point varies.
    const anchorX = origin.rect.right;
    const anchorY = origin.rect.top + origin.rect.height / 2;
    const targetX = window.innerWidth + EXIT_TARGET_X_MARGIN;
    const targetY = window.innerHeight * EXIT_TARGET_Y_FRAC;
    const baseAngle = Math.atan2(targetY - anchorY, targetX - anchorX);

    // Perched birds were already spatially distributed, so layering a
    // formation trail on top would feel like a second pattern competing
    // with the natural scatter. Skip it.
    const isPerchedMode = origin.mode === "perched";
    const useFormation = !isPerchedMode;
    // Floor stagger in perched mode so the sequential takeoff reads.
    const effectiveStaggerMs = isPerchedMode
      ? Math.max(staggerMs, PERCHED_MIN_STAGGER_MS)
      : staggerMs;

    for (let i = 0; i < count; i++) {
      const size = cfg.birdSize * rand(0.85, 1.05);
      const el = createBirdEl(size);

      const angle = baseAngle + rand(-0.18, 0.18);
      const speed = cfg.flightSpeed * rand(0.92, 1.10);

      let formOffsetX = 0;
      let formOffsetY = 0;
      if (useFormation) {
        const rank = Math.floor(i / 2);
        const lateral = (i % 2 === 0 ? -1 : 1) * rank * 6 * rand(0.85, 1.15);
        const trail = -rank * 8 * rand(0.85, 1.15);
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        formOffsetX = trail * ca - lateral * sa;
        formOffsetY = trail * sa + lateral * ca;
      }

      const startJitterX = rand(-3, 3);
      const startJitterY = rand(-2, 2);

      const { x: ox, y: oy } = resolveOrigin(origin);

      const stagger = effectiveStaggerMs / 1000;
      const bird: Bird = {
        el,
        x: ox + startJitterX,
        y: oy + startJitterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        spawnDelay: i * stagger,
        age: -i * stagger,
        baseSpeed: speed,
        bobAmp: cfg.bobAmplitude * rand(0.7, 1.3),
        bobFreq: rand(1.2, 1.9),
        bobPhase: rand(0, Math.PI * 2),
        flapPhase: rand(0, Math.PI * 2),
        flapAmp: rand(0.20, 0.30),
        formOffsetX,
        formOffsetY,
        rotJitter: rand(-0.05, 0.05),
        alive: true,
        isPerched: isPerchedMode,
        perchX: ox + startJitterX,
        perchY: oy + startJitterY,
      };
      birds.push(bird);
    }

    if (rafId === null) {
      lastTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  // Stagger only matters at spawn, so it lives outside the per-frame config.
  let staggerMs = DEFAULTS.spawnStaggerMs;
  function setStagger(v: number) { staggerMs = v; }

  function loop(now: number) {
    rafId = null;
    const cfg = cfgRef.current;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.033) : 0.016;
    lastTime = now;

    const flapTwoPiHz = cfg.flapHz * Math.PI * 2;
    const vpW = window.innerWidth;

    for (const b of birds) {
      if (!b.alive) continue;
      b.age += dt;

      // Below spawnDelay: queued. Corner/cursor birds stay hidden; perched
      // birds are visible at their perch in a settled crouch — the whole
      // flock appears at hover, then launches in sequence.
      if (b.age < 0) {
        if (b.isPerched) {
          b.el.style.opacity = "1";
          b.el.style.transform =
            `translate(${b.perchX.toFixed(1)}px, ${b.perchY.toFixed(1)}px) ` +
            `rotate(0deg) scale(1, ${PERCHED_REST_SCALE_Y})`;
        } else {
          b.el.style.opacity = "0";
        }
        continue;
      }

      // Emergence: scale up + fade in over the first ~180ms so they "pop"
      // out of the link rather than appearing pre-formed. Perched birds
      // are already at full opacity from the queue, so they don't fade in.
      const emerge = Math.min(b.age / 0.18, 1);
      const emergeScale = b.isPerched ? 1 : 0.4 + 0.6 * emerge;
      const opacity = b.isPerched ? 1 : emerge;

      // Climb-out: gradually accelerate upward (vy more negative). Cap
      // the upward velocity so they don't shoot straight up.
      b.vy -= cfg.climbAccel * dt * (1 - Math.min(b.age / 1.8, 1) * 0.6);
      const maxUp = -cfg.flightSpeed * 1.3;
      if (b.vy < maxUp) b.vy = maxUp;

      // Perched birds need to hold position during the crouch hold, then
      // ramp velocity up across the push phase. One engagement factor
      // gates both translation and bob amplitude.
      let engage = 1;
      if (b.isPerched && b.age < PERCHED_LAUNCH_END) {
        if (b.age < PERCHED_CROUCH_HOLD) {
          engage = 0;
        } else {
          const k = (b.age - PERCHED_CROUCH_HOLD) / (PERCHED_LAUNCH_END - PERCHED_CROUCH_HOLD);
          engage = Math.min(1, k);
        }
      }

      // Integrate base position (the leader-frame position of this bird)
      b.x += b.vx * dt * engage;
      b.y += b.vy * dt * engage;

      // Compute heading from velocity (in radians)
      const heading = Math.atan2(b.vy, b.vx);

      // Perpendicular bob: oscillate across the velocity vector. Scaled
      // by `engage` so perched birds don't wobble during their crouch.
      const bobT = b.age * b.bobFreq * Math.PI * 2 + b.bobPhase;
      const bobOffset = Math.sin(bobT) * b.bobAmp * engage;
      const perpX = -Math.sin(heading);
      const perpY = Math.cos(heading);

      // Formation offset relative to the bird's *own* base path. We
      // pre-baked offsets in the spawn frame; they're already in
      // viewport coords, so add directly.
      const renderX = b.x + b.formOffsetX + perpX * bobOffset;
      const renderY = b.y + b.formOffsetY + perpY * bobOffset;

      // Wing flap — vertical squash relative to the heading frame
      const flapT = b.age * flapTwoPiHz + b.flapPhase;
      const flap = (Math.sin(flapT) + 1) * 0.5; // 0..1
      let scaleY = 1 + b.flapAmp - b.flapAmp * 2 * flap; // (1+amp)..(1-amp)

      // Perched launch envelope: crouch → spring up → settle. Blends into
      // the wing-flap by the end of the launch window so the transition
      // is smooth rather than a hard handoff.
      if (b.isPerched && b.age < PERCHED_LAUNCH_END) {
        let launchScaleY: number;
        if (b.age < PERCHED_CROUCH_HOLD) {
          launchScaleY = PERCHED_CROUCH_SCALE_Y;
        } else if (b.age < PERCHED_PUSH_PEAK) {
          const k = (b.age - PERCHED_CROUCH_HOLD) / (PERCHED_PUSH_PEAK - PERCHED_CROUCH_HOLD);
          // Ease-out cubic for the push: fast spring up
          const eased = 1 - Math.pow(1 - k, 3);
          launchScaleY = PERCHED_CROUCH_SCALE_Y + (PERCHED_PUSH_SCALE_Y - PERCHED_CROUCH_SCALE_Y) * eased;
        } else {
          const k = (b.age - PERCHED_PUSH_PEAK) / (PERCHED_LAUNCH_END - PERCHED_PUSH_PEAK);
          launchScaleY = PERCHED_PUSH_SCALE_Y + (1 - PERCHED_PUSH_SCALE_Y) * k;
        }
        // Blend the launch envelope toward the flap in the final third
        // of the window so the wing motion doesn't pop in.
        const blendT = Math.max(0, (b.age - PERCHED_PUSH_PEAK) / (PERCHED_LAUNCH_END - PERCHED_PUSH_PEAK));
        scaleY = launchScaleY * (1 - blendT) + scaleY * blendT;
      }

      const headingDeg = (heading * 180) / Math.PI;
      const rotDeg =
        (headingDeg - BIRD_NATURAL_HEADING_DEG) * BIRD_HEADING_FOLLOW
        + (b.rotJitter * 180) / Math.PI;

      b.el.style.opacity = opacity.toFixed(2);
      b.el.style.transform =
        `translate(${renderX.toFixed(1)}px, ${renderY.toFixed(1)}px) ` +
        `rotate(${rotDeg.toFixed(1)}deg) ` +
        `scale(${emergeScale.toFixed(3)}, ${(emergeScale * scaleY).toFixed(3)})`;

      // Despawn when fully off-screen (top or right edges, with margin)
      const M = 80;
      if (renderY < -M || renderX > vpW + M) {
        b.alive = false;
        b.el.remove();
      }
    }

    // Compact the array occasionally
    for (let i = birds.length - 1; i >= 0; i--) {
      if (!birds[i].alive) birds.splice(i, 1);
    }

    if (birds.length > 0) {
      rafId = requestAnimationFrame(loop);
    }
  }

  return {
    spawn,
    setStagger,
    cleanup: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      for (const b of birds) {
        b.alive = false;
        b.el.remove();
      }
      birds.length = 0;
    },
  };
}

// ── Component ────────────────────────────────────────────────────────────────

// Mirrors the portfolio's "table" theme — warm cream in light mode,
// dark warm earth in dark — so the glass pill reads as a soft warm
// tint instead of a hard blue chip against off-white.
const FLOCK_HUE = HUES.gold; // 42 — same family as portfolio's table accent
const PAGE_BG: Record<GlassMode, string> = {
  light: bg({ hue: FLOCK_HUE, mode: "light", intensity: 0 }),
  dark: bg({ hue: FLOCK_HUE, mode: "dark", intensity: 1 }),
};

const TEXT_COLOR: Record<GlassMode, { primary: string; muted: string }> = {
  // Mirrors the portfolio's `--text-grey` — text is the only thing on the
  // page, but the birds are the event, so the sentence reads quietly.
  light: { primary: "#5A5A62", muted: "#9A9AA2" },
  dark: { primary: "#A8A8B0", muted: "#6E6E76" },
};

export function Flock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const xLinkRef = useRef<HTMLAnchorElement>(null);
  const birdLayerRef = useRef<HTMLDivElement>(null);
  const swarmRef = useRef<BirdSwarmAPI | null>(null);

  // Glass-pull controls (kept minimal — the demo isn't about pull tuning)
  const [mode, setMode] = useState<GlassMode>("light");

  // Flock controls
  const [originMode, setOriginMode] = useState<OriginMode>(DEFAULT_ORIGIN_MODE);
  const [birdCount, setBirdCount] = useState(DEFAULTS.birdCount);
  const [flapHz, setFlapHz] = useState(DEFAULTS.flapHz);
  const [staggerMs, setStaggerMs] = useState(DEFAULTS.spawnStaggerMs);
  const [flightSpeed, setFlightSpeed] = useState(DEFAULTS.flightSpeed);
  const [bobAmplitude, setBobAmplitude] = useState(DEFAULTS.bobAmplitude);
  const [climbAccel, setClimbAccel] = useState(DEFAULTS.climbAccel);
  const [birdSize, setBirdSize] = useState(DEFAULTS.birdSize);
  const [stragglersOn, setStragglersOn] = useState(DEFAULTS.stragglers);
  const [straggler1Ms, setStraggler1Ms] = useState(DEFAULTS.straggler1Ms);
  const [straggler2Ms, setStraggler2Ms] = useState(DEFAULTS.straggler2Ms);

  // Stragglers track hover state + pending timers so we can cancel on leave.
  const isHoveringRef = useRef(false);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const stragglerTimersRef = useRef<number[]>([]);

  const clearStragglerTimers = useCallback(() => {
    for (const t of stragglerTimersRef.current) clearTimeout(t);
    stragglerTimersRef.current = [];
  }, []);

  useEffect(() => () => clearStragglerTimers(), [clearStragglerTimers]);

  // Glass config — static defaults, only mode is reactive
  const glassConfigRef = useRef<GlassTunable>({
    ...GLASS_DEFAULTS,
    mode,
  });
  glassConfigRef.current = {
    ...GLASS_DEFAULTS,
    mode,
  };

  const flockConfigRef = useRef<FlockConfig>({
    flapHz,
    flightSpeed,
    bobAmplitude,
    climbAccel,
    birdSize,
  });
  flockConfigRef.current = {
    flapHz,
    flightSpeed,
    bobAmplitude,
    climbAccel,
    birdSize,
  };

  // Glass-pull setup
  const glassApiRef = useRef<ReturnType<typeof setupGlassHighlight> | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = setupGlassHighlight(container, glassConfigRef, {
      hue: FLOCK_HUE,
      borderRadius: 7,
    });
    glassApiRef.current = api;
    return () => {
      glassApiRef.current = null;
      api.cleanup();
    };
  }, []);

  useEffect(() => {
    glassApiRef.current?.redraw();
  }, [mode]);

  // Bird swarm setup
  useEffect(() => {
    const layer = birdLayerRef.current;
    if (!layer) return;
    const swarm = setupBirdSwarm(layer, flockConfigRef);
    swarmRef.current = swarm;
    swarm.setStagger(staggerMs);
    return () => {
      swarmRef.current = null;
      swarm.cleanup();
    };
  }, []);

  // Push stagger updates into the swarm without re-creating it
  useEffect(() => {
    swarmRef.current?.setStagger(staggerMs);
  }, [staggerMs]);

  // Spawn a wave of N birds from the X link, using the most recent cursor
  // position (for cursor mode) or the link rect otherwise. Shared between
  // the initial burst and the straggler waves.
  const spawnWave = useCallback((count: number) => {
    const xEl = xLinkRef.current;
    const swarm = swarmRef.current;
    if (!xEl || !swarm || count <= 0) return;
    const rect = xEl.getBoundingClientRect();
    const cursor = cursorRef.current;
    swarm.spawn(
      { mode: originMode, rect, cursorX: cursor?.x, cursorY: cursor?.y },
      count,
    );
  }, [originMode]);

  const triggerFlock = useCallback(() => {
    spawnWave(birdCount);
    clearStragglerTimers();
    if (!stragglersOn) return;
    // Schedule trickle waves. Each fires only if the cursor is still on
    // the X — leaving cancels the rest, so it's a true sustained-hover
    // easter egg. The first wave's count is randomized so repeat hovers
    // never look identical; the final wave is always a single bird.
    const r1Count =
      STRAGGLER1_MIN_COUNT +
      Math.floor(Math.random() * (STRAGGLER1_MAX_COUNT - STRAGGLER1_MIN_COUNT + 1));
    stragglerTimersRef.current.push(
      window.setTimeout(() => {
        if (isHoveringRef.current) spawnWave(r1Count);
      }, straggler1Ms),
    );
    stragglerTimersRef.current.push(
      window.setTimeout(() => {
        if (isHoveringRef.current) spawnWave(STRAGGLER2_COUNT);
      }, straggler2Ms),
    );
  }, [birdCount, spawnWave, stragglersOn, straggler1Ms, straggler2Ms, clearStragglerTimers]);

  const onXMouseEnter = useCallback((e: React.MouseEvent) => {
    isHoveringRef.current = true;
    cursorRef.current = { x: e.clientX, y: e.clientY };
    triggerFlock();
  }, [triggerFlock]);

  const onXMouseMove = useCallback((e: React.MouseEvent) => {
    cursorRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onXMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    clearStragglerTimers();
  }, [clearStragglerTimers]);

  const onXTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    isHoveringRef.current = true;
    if (t) cursorRef.current = { x: t.clientX, y: t.clientY };
    triggerFlock();
  }, [triggerFlock]);

  const onXTouchEnd = useCallback(() => {
    isHoveringRef.current = false;
    clearStragglerTimers();
  }, [clearStragglerTimers]);

  const palette = TEXT_COLOR[mode];

  return (
    <DevPanel
      label="Flock"
      background={PAGE_BG[mode]}
      defaultOpen={false}
      controls={
        <>
          <DevButtonGroup
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ]}
          />
          <DevButtonGroup
            label="Origin"
            value={originMode}
            onChange={setOriginMode}
            options={[
              { label: "Corner", value: "corner" },
              { label: "Cursor", value: "cursor" },
              { label: "Perched", value: "perched" },
            ]}
          />
          <DevSlider label="Birds" value={birdCount} onChange={setBirdCount} min={4} max={14} step={1} />
          <DevSlider label="Flap rate" value={flapHz} onChange={setFlapHz} min={3} max={10} step={0.5} format={(v) => `${v.toFixed(1)}Hz`} />
          <DevSlider label="Spawn stagger" value={staggerMs} onChange={setStaggerMs} min={20} max={260} step={5} format={(v) => `${Math.round(v)}ms`} />
          <DevSlider label="Flight speed" value={flightSpeed} onChange={setFlightSpeed} min={140} max={340} step={10} />
          <DevSlider label="Climb" value={climbAccel} onChange={setClimbAccel} min={0} max={180} step={5} />
          <DevSlider label="Bob amount" value={bobAmplitude} onChange={setBobAmplitude} min={0} max={14} step={1} />
          <DevSlider label="Bird size" value={birdSize} onChange={setBirdSize} min={14} max={36} step={1} />
          <DevDivider />
          <DevButtonGroup
            label="Stragglers"
            value={stragglersOn ? "on" : "off"}
            onChange={(v) => setStragglersOn(v === "on")}
            options={[
              { label: "On", value: "on" },
              { label: "Off", value: "off" },
            ]}
          />
          <DevSlider label="Wave 1 (1–3)" value={straggler1Ms} onChange={setStraggler1Ms} min={800} max={3500} step={50} format={(v) => `${Math.round(v)}ms`} />
          <DevSlider label="Wave 2 (1)" value={straggler2Ms} onChange={setStraggler2Ms} min={3000} max={7000} step={50} format={(v) => `${Math.round(v)}ms`} />
          <DevDivider />
          <DevButton
            label="Reset"
            onClick={() => {
              setOriginMode(DEFAULT_ORIGIN_MODE);
              setBirdCount(DEFAULTS.birdCount);
              setFlapHz(DEFAULTS.flapHz);
              setStaggerMs(DEFAULTS.spawnStaggerMs);
              setFlightSpeed(DEFAULTS.flightSpeed);
              setClimbAccel(DEFAULTS.climbAccel);
              setBobAmplitude(DEFAULTS.bobAmplitude);
              setBirdSize(DEFAULTS.birdSize);
              setStragglersOn(DEFAULTS.stragglers);
              setStraggler1Ms(DEFAULTS.straggler1Ms);
              setStraggler2Ms(DEFAULTS.straggler2Ms);
            }}
          />
        </>
      }
    >
      <style>{`
        .flock-stage {
          position: relative;
          min-height: 100dvh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
        }
        .flock-sentence {
          position: relative;
          max-width: 520px;
          font-family: 'Onest', system-ui, -apple-system, sans-serif;
          font-size: 18px;
          font-weight: 400;
          line-height: 1.4;
          color: ${palette.primary};
          text-align: center;
          user-select: none;
        }
        .flock-link {
          color: inherit;
          text-decoration: underline;
          text-decoration-color: ${mode === "light" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.22)"};
          text-underline-offset: 4px;
          padding: 3px 6px;
          margin: 0 -2px;
          border-radius: 8px;
          position: relative;
          z-index: 1;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .flock-bird-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 50;
        }
      `}</style>

      <div className="flock-stage">
        <div ref={containerRef} className="flock-sentence">
          You can find me on{" "}
          <a
            href="https://www.linkedin.com/in/benyamron"
            target="_blank"
            rel="noopener noreferrer"
            className="flock-link"
            data-link-card
          >
            LinkedIn
          </a>
          ,{" "}
          <a
            href="https://github.com/byamron"
            target="_blank"
            rel="noopener noreferrer"
            className="flock-link"
            data-link-card
          >
            GitHub
          </a>
          , or{" "}
          <a
            ref={xLinkRef}
            href="https://x.com/BenYamron"
            target="_blank"
            rel="noopener noreferrer"
            className="flock-link"
            data-link-card
            onMouseEnter={onXMouseEnter}
            onMouseMove={onXMouseMove}
            onMouseLeave={onXMouseLeave}
            onTouchStart={onXTouchStart}
            onTouchEnd={onXTouchEnd}
            onTouchCancel={onXTouchEnd}
          >
            X
          </a>
          .
        </div>
        <div ref={birdLayerRef} className="flock-bird-layer" />
      </div>
    </DevPanel>
  );
}
