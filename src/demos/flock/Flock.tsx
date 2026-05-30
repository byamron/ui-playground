import { useRef, useEffect, useState, useCallback } from "react";
import { DevPanel, DevSlider, DevButtonGroup, DevButton, DevDivider, DevSectionLabel } from "../../components/DevPanel";
import { setBackButtonHidden } from "../../components/BackToGallery";
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
const SVG_NS = "http://www.w3.org/2000/svg";

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
  burstMin: 4,         // burst count is randomized in [burstMin, burstMax]
  burstMax: 10,
  flapHz: 4.5,
  spawnStaggerMs: 55,
  flightSpeed: 180,    // px/s baseline
  bobAmplitude: 4,     // px perpendicular wobble
  climbAccel: 15,      // upward acceleration over time, px/s²
  birdSize: 24,        // px
  flapJitter: true,    // per-bird flap-rate variation desyncs the flock
  headBob: true,       // small rotation oscillation tied to flap — "alive" cue
  magicEmerge: true,   // birds visually scale-and-lerp out of the spawn point
  pillSpike: true,     // pill brightens at the moment of the burst
  fracture: true,      // thin crack lines flash on the pill at burst — heal after
  lastLook: true,      // 5s straggler pauses mid-flight with a head-turn
  dropShadow: true,    // small drop-shadow grounds birds in 3D space
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

// Spring impulse multiplier at the peak of the perched push — the bird
// briefly accelerates past its cruise speed before settling.
const PERCHED_IMPULSE_PEAK = 1.6;
// How long after launchEnd the impulse decays back to cruise.
const PERCHED_IMPULSE_SETTLE = 0.2;
// Per-bird flap-rate multiplier range when jitter is on — desyncs the flock.
const FLAP_JITTER_MIN = 0.86;
const FLAP_JITTER_MAX = 1.14;
// Head-bob amplitude (degrees) when the head-bob toggle is on.
const HEAD_BOB_DEG = 1.5;
// Magic-emerge: how long birds take to lerp out from the spawn anchor.
// Slightly longer than the standard emerge window so the growth is readable.
const MAGIC_EMERGE_SECONDS = 0.28;
// Pill pressure spike value pushed into glassHighlight at trigger time.
const PILL_SPIKE_AMOUNT = 0.15;
// Last-look easter egg: well into the flight (~2s), the lone bird pauses
// for half a second with a slow head-turn arc before continuing.
const LAST_LOOK_START = 2.0;
const LAST_LOOK_FREEZE = 0.5;
const LAST_LOOK_HEAD_TURN_DEG = 14;
// Subtle drop-shadow rendered as a second SVG path offset behind the bird,
// not as a CSS filter — drop-shadow on a transforming layer forces a full
// re-rasterization every frame on Safari/iOS, which made the flap choppy.
// The viewBox offset is in 0..248 units; 10 units ≈ 1px at the default
// bird size and scales naturally with the bird.
const BIRD_SHADOW_OFFSET_Y = 10;
const BIRD_SHADOW_FILL = "rgba(0, 0, 0, 0.13)";
const BIRD_SHADOW_CLASS = "flock-bird-shadow";

// Shatter physics constants. Tuned so glass shards feel weighty but fast —
// they fly clear of the link area in under 1s, then fade as they fall.
const SHATTER_DURATION_S = 1.25;
const SHATTER_GRAVITY = 1400;   // px/s²
const SHATTER_DRAG_PER_FRAME = 0.985; // horizontal drag (vy untouched — gravity wins)
const SHATTER_FADE_START_S = 0.45;
const SHATTER_INITIAL_SPEED_MIN = 220;
const SHATTER_INITIAL_SPEED_MAX = 420;
const SHATTER_UPWARD_BOOST = 90; // px/s — gives shards a tiny arc before they fall
const SHATTER_ANGULAR_VEL_MAX = 720; // deg/s
// Randomized per fracture — the shards break along these exact lines.
const SHATTER_PERIM_POINTS_MIN = 3;
const SHATTER_PERIM_POINTS_MAX = 5;
// Pill border-radius (matches setupGlassHighlight options below). Used to
// shape the SVG clipPath so cracks don't overshoot the glass corners.
const SHATTER_PILL_BORDER_RADIUS = 7;
// Preview phase: cracks form on the *visible* pill before it breaks, so the
// user sees the glass damage land before the burst.
const FRACTURE_PREVIEW_MS = 500;
const FRACTURE_CRACK_DRAW_MS = 240;
// Delay between hover-enter and the start of the fracture. Gives the
// glass pill (which springs from the previously-hovered link) time to
// settle on the X before any cracks appear.
const FRACTURE_START_DELAY_MS = 200;
// Opacity multiplier applied to the preview crack paths. Tuned so the
// cracks are visibly readable on a first-time hover (so the burst feels
// caused, not random) while still blending into the pill's warm tint.
const FRACTURE_CRACK_OPACITY = 0.70;

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

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
  flapAmp: number;  // vertical squash amplitude
  flapHzMul: number; // per-bird frequency multiplier (applied when jitter is on)
  formOffsetX: number; // formation static offset (in flight-frame coords)
  formOffsetY: number;
  rotJitter: number;
  alive: boolean;
  isPerched: boolean;
  perchX: number;
  perchY: number;
  height: number;   // rendered height in px — used for bottom-anchor crouch offset
  // Spawn anchor (the "opening" point) — bird's render position lerps
  // from this point toward (x,y) during magic-emerge.
  anchorX: number;
  anchorY: number;
  // Final-straggler easter egg: this bird pauses mid-flight and head-turns.
  isLastLook: boolean;
}

interface FlockConfig {
  flapHz: number;
  flightSpeed: number;
  bobAmplitude: number;
  climbAccel: number;
  birdSize: number;
  staggerMs: number;
  flapJitter: boolean;
  headBob: boolean;
  magicEmerge: boolean;
  lastLook: boolean;
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
  spawn: (origin: SpawnOrigin, count: number, opts?: { lastLook?: boolean }) => void;
  cleanup: () => void;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Thin wrapper that gives boolean toggles in the dev panel the same
// two-pill visual as the rest of the controls (instead of switching to
// DevToggle, which renders a switch and would change the panel's look).
function OnOffToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <DevButtonGroup
      label={label}
      value={value ? "on" : "off"}
      onChange={(v) => onChange(v === "on")}
      options={[
        { label: "On", value: "on" },
        { label: "Off", value: "off" },
      ]}
    />
  );
}

// Shared "where does the burst emerge from" dispatch — used by the bird
// swarm (for corner/cursor; perched adds per-bird random on top) and by
// the fracture trigger (for the crack epicenter on all modes).
interface RectLike { left: number; top: number; right: number; bottom: number; width: number; height: number; }
function resolveEpicenter(
  mode: OriginMode,
  rect: RectLike,
  cursor?: { x: number; y: number } | null,
): { x: number; y: number } {
  if (mode === "cursor" && cursor) {
    return { x: rect.right, y: cursor.y };
  }
  if (mode === "perched") {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: rect.right - rect.width * 0.15, y: rect.top + rect.height * 0.25 };
}

function setupBirdSwarm(
  layer: HTMLElement,
  cfgRef: React.MutableRefObject<FlockConfig>,
): BirdSwarmAPI {
  const birds: Bird[] = [];
  let rafId: number | null = null;
  let lastTime = 0;

  // Build the bird SVG once, then cloneNode per bird at spawn time. The
  // shadow is a second path *behind* the bird, offset down — cheap GPU
  // alpha composite instead of a CSS filter rasterization per frame.
  const birdSvgTemplate = document.createElementNS(SVG_NS, "svg");
  birdSvgTemplate.setAttribute("viewBox", "0 0 248 204");
  birdSvgTemplate.setAttribute("width", "100%");
  birdSvgTemplate.setAttribute("height", "100%");
  birdSvgTemplate.style.display = "block";
  birdSvgTemplate.style.overflow = "visible";
  const shadowPathTemplate = document.createElementNS(SVG_NS, "path");
  shadowPathTemplate.setAttribute("d", BIRD_PATH);
  shadowPathTemplate.setAttribute("fill", BIRD_SHADOW_FILL);
  shadowPathTemplate.setAttribute("transform", `translate(0 ${BIRD_SHADOW_OFFSET_Y})`);
  shadowPathTemplate.setAttribute("class", BIRD_SHADOW_CLASS);
  birdSvgTemplate.appendChild(shadowPathTemplate);
  const birdPathTemplate = document.createElementNS(SVG_NS, "path");
  birdPathTemplate.setAttribute("d", BIRD_PATH);
  birdPathTemplate.setAttribute("fill", TWITTER_BLUE);
  birdSvgTemplate.appendChild(birdPathTemplate);

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
    wrap.appendChild(birdSvgTemplate.cloneNode(true));
    // Caller is responsible for inserting into the DOM (we batch via a
    // DocumentFragment in spawn so a 10-bird burst hits the layer once).
    return wrap;
  }

  // Resolve a per-bird spawn point. Corner/cursor modes return the same
  // point for every bird; perched mode scatters across the link rect.
  function resolveOrigin(origin: SpawnOrigin): { x: number; y: number } {
    if (origin.mode === "perched") {
      return {
        x: origin.rect.left + rand(0.1, 0.9) * origin.rect.width,
        y: origin.rect.top + rand(0.15, 0.85) * origin.rect.height,
      };
    }
    const cursor = origin.cursorY != null && origin.cursorX != null
      ? { x: origin.cursorX, y: origin.cursorY }
      : null;
    return resolveEpicenter(origin.mode, origin.rect as RectLike, cursor);
  }

  function spawn(origin: SpawnOrigin, count: number, opts?: { lastLook?: boolean }) {
    const cfg = cfgRef.current;
    const lastLook = !!opts?.lastLook;
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
      ? Math.max(cfg.staggerMs, PERCHED_MIN_STAGGER_MS)
      : cfg.staggerMs;

    // Batch all new wraps into a fragment so a 10-bird burst hits the
    // layer in a single insertion instead of 10 separate appendChilds.
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const size = cfg.birdSize * rand(0.85, 1.05);
      const height = size * (204 / 248);
      const el = createBirdEl(size);
      fragment.appendChild(el);

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
        flapAmp: rand(0.12, 0.18),
        flapHzMul: rand(FLAP_JITTER_MIN, FLAP_JITTER_MAX),
        formOffsetX,
        formOffsetY,
        rotJitter: rand(-0.05, 0.05),
        alive: true,
        isPerched: isPerchedMode,
        perchX: ox + startJitterX,
        perchY: oy + startJitterY,
        height,
        // Spawn-point anchor (independent of position jitter) — birds with
        // magic-emerge lerp from this fixed "opening" out to (x,y).
        anchorX: ox,
        anchorY: oy,
        isLastLook: lastLook,
      };
      birds.push(bird);
    }

    layer.appendChild(fragment);

    if (rafId === null) {
      lastTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  function loop(now: number) {
    rafId = null;
    const cfg = cfgRef.current;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.033) : 0.016;
    lastTime = now;

    const baseFlapTwoPi = cfg.flapHz * Math.PI * 2;
    const vpW = window.innerWidth;
    let anyDied = false;

    for (const b of birds) {
      if (!b.alive) continue;
      b.age += dt;

      // Below spawnDelay: queued. Corner/cursor birds stay hidden; perched
      // birds are visible at their perch in a settled crouch — the whole
      // flock appears at hover, then launches in sequence. Compensate Y
      // so the squashed bird's *bottom* stays planted at perchY (rather
      // than the center, which reads as "smaller bird").
      if (b.age < 0) {
        if (b.isPerched) {
          const restOffsetY = (1 - PERCHED_REST_SCALE_Y) * b.height / 2;
          b.el.style.opacity = "1";
          b.el.style.transform =
            `translate(${b.perchX.toFixed(1)}px, ${(b.perchY + restOffsetY).toFixed(1)}px) ` +
            `rotate(0deg) scale(1, ${PERCHED_REST_SCALE_Y})`;
        } else {
          b.el.style.opacity = "0";
        }
        continue;
      }

      // Emergence: scale up + fade in over the first ~180ms (or longer in
      // magic mode) so they "pop" out of the link rather than appearing
      // pre-formed. Perched birds are already at full opacity from the
      // queue, so they don't fade in. Magic-emerge starts from scale 0
      // (a point at the spawn anchor) and grows out — selling the "they
      // came out of an opening" metaphor as a small magic trick.
      const useMagic = cfg.magicEmerge && !b.isPerched;
      const emergeDur = useMagic ? MAGIC_EMERGE_SECONDS : 0.18;
      const emerge = Math.min(b.age / emergeDur, 1);
      const emergeScale = b.isPerched
        ? 1
        : useMagic
          ? emerge
          : 0.4 + 0.6 * emerge;
      const opacity = b.isPerched ? 1 : Math.min(emerge * 2, 1);

      // Climb-out: gradually accelerate upward (vy more negative). Cap
      // the upward velocity so they don't shoot straight up.
      b.vy -= cfg.climbAccel * dt * (1 - Math.min(b.age / 1.8, 1) * 0.6);
      const maxUp = -cfg.flightSpeed * 1.3;
      if (b.vy < maxUp) b.vy = maxUp;

      // Perched takeoff has two gates:
      //   impulseMul → position integration. 0 during crouch hold, ramps
      //     past 1.0 to PERCHED_IMPULSE_PEAK at push, decays back to 1.0
      //     by launchEnd + settle window. Gives the bird a *leap* moment.
      //   bobEngage  → perpendicular bob amplitude. 0 → 1 linear ramp; no
      //     overshoot (bob shouldn't impulse, just engage smoothly).
      let impulseMul = 1;
      let bobEngage = 1;
      if (b.isPerched) {
        const settleEnd = PERCHED_LAUNCH_END + PERCHED_IMPULSE_SETTLE;
        if (b.age < PERCHED_CROUCH_HOLD) {
          impulseMul = 0;
          bobEngage = 0;
        } else if (b.age < PERCHED_PUSH_PEAK) {
          const k = (b.age - PERCHED_CROUCH_HOLD) / (PERCHED_PUSH_PEAK - PERCHED_CROUCH_HOLD);
          impulseMul = k * PERCHED_IMPULSE_PEAK;
          bobEngage = Math.min(1, (b.age - PERCHED_CROUCH_HOLD) / (PERCHED_LAUNCH_END - PERCHED_CROUCH_HOLD));
        } else if (b.age < settleEnd) {
          const k = (b.age - PERCHED_PUSH_PEAK) / (settleEnd - PERCHED_PUSH_PEAK);
          impulseMul = PERCHED_IMPULSE_PEAK + (1 - PERCHED_IMPULSE_PEAK) * k;
          bobEngage = Math.min(1, (b.age - PERCHED_CROUCH_HOLD) / (PERCHED_LAUNCH_END - PERCHED_CROUCH_HOLD));
        }
      }

      // Last-look easter egg: the lone final straggler pauses mid-flight,
      // turns its head to "check back," then continues. Position freezes
      // during the look window; we add the head-turn arc to rotation below.
      let lookHeadDeg = 0;
      if (cfg.lastLook && b.isLastLook) {
        const lookEnd = LAST_LOOK_START + LAST_LOOK_FREEZE;
        if (b.age >= LAST_LOOK_START && b.age < lookEnd) {
          impulseMul = 0;
          const k = (b.age - LAST_LOOK_START) / LAST_LOOK_FREEZE; // 0..1
          // Single sinusoidal pass: -peak → 0 → +peak → 0 → -peak…
          // We want one back-then-forth, so sin(k * 2π) does -, +, -, +.
          // Use sin(k * π) for a single peak arc: -peak at k=0, 0 at k=0.5, -peak at k=1.
          // Actually a clean "look back" reads as left-twist then settle:
          //   k=0 → 0°, k=0.5 → -peak (looking back), k=1 → 0° (forward)
          lookHeadDeg = -LAST_LOOK_HEAD_TURN_DEG * Math.sin(k * Math.PI);
        }
      }

      // Integrate base position (the leader-frame position of this bird)
      b.x += b.vx * dt * impulseMul;
      b.y += b.vy * dt * impulseMul;

      // Compute heading from velocity (in radians)
      const heading = Math.atan2(b.vy, b.vx);

      // Perpendicular bob: oscillate across the velocity vector. Scaled
      // by `bobEngage` so perched birds don't wobble during their crouch.
      const bobT = b.age * b.bobFreq * Math.PI * 2 + b.bobPhase;
      const bobOffset = Math.sin(bobT) * b.bobAmp * bobEngage;
      const perpX = -Math.sin(heading);
      const perpY = Math.cos(heading);

      // Formation offset relative to the bird's *own* base path. We
      // pre-baked offsets in the spawn frame; they're already in
      // viewport coords, so add directly.
      let renderX = b.x + b.formOffsetX + perpX * bobOffset;
      let renderY = b.y + b.formOffsetY + perpY * bobOffset;

      // Magic-emerge: during the emerge window, lerp the rendered position
      // from the spawn anchor (the "opening") toward where the bird's
      // physics has carried it. Combined with the 0→1 scale ramp, the
      // bird appears to grow OUT of the opening rather than appearing at
      // its physics position at half-size.
      if (useMagic && emerge < 1) {
        renderX = b.anchorX + (renderX - b.anchorX) * emerge;
        renderY = b.anchorY + (renderY - b.anchorY) * emerge;
      }

      // Wing flap — vertical squash relative to the heading frame. Vector
      // logo + small render size = stylized cue beats accurate simulation.
      // Per-bird rate multiplier desyncs the flock when jitter is on.
      const birdFlapTwoPi = baseFlapTwoPi * (cfg.flapJitter ? b.flapHzMul : 1);
      const flapT = b.age * birdFlapTwoPi + b.flapPhase;
      const flap = (Math.sin(flapT) + 1) * 0.5; // 0..1
      let scaleY = 1 + b.flapAmp - b.flapAmp * 2 * flap; // (1+amp)..(1-amp)

      // Perched launch envelope: crouch → spring up → settle. Blends into
      // the wing-flap by the end of the launch window so the wing motion
      // doesn't pop in.
      if (b.isPerched && b.age < PERCHED_LAUNCH_END) {
        let launchScaleY: number;
        if (b.age < PERCHED_CROUCH_HOLD) {
          launchScaleY = PERCHED_CROUCH_SCALE_Y;
        } else if (b.age < PERCHED_PUSH_PEAK) {
          const k = (b.age - PERCHED_CROUCH_HOLD) / (PERCHED_PUSH_PEAK - PERCHED_CROUCH_HOLD);
          const eased = 1 - Math.pow(1 - k, 3);
          launchScaleY = PERCHED_CROUCH_SCALE_Y + (PERCHED_PUSH_SCALE_Y - PERCHED_CROUCH_SCALE_Y) * eased;
        } else {
          const k = (b.age - PERCHED_PUSH_PEAK) / (PERCHED_LAUNCH_END - PERCHED_PUSH_PEAK);
          launchScaleY = PERCHED_PUSH_SCALE_Y + (1 - PERCHED_PUSH_SCALE_Y) * k;
        }
        const blendT = Math.max(0, (b.age - PERCHED_PUSH_PEAK) / (PERCHED_LAUNCH_END - PERCHED_PUSH_PEAK));
        scaleY = launchScaleY * (1 - blendT) + scaleY * blendT;
      }

      // Bottom-anchor compensation for perched birds during the launch
      // envelope: keep the bird's *feet* planted at perchY rather than
      // its center, so the crouch reads as weight on legs (not a smaller
      // bird centered in space). After launchEnd the bird is in flight
      // and uses pure center-anchored transforms.
      let bottomAnchorY = 0;
      if (b.isPerched && b.age < PERCHED_LAUNCH_END) {
        bottomAnchorY = (1 - scaleY) * b.height / 2;
      }

      const headingDeg = (heading * 180) / Math.PI;
      // Head bob: small rotation oscillation tied to flap. Gated by
      // bobEngage so perched/crouching birds don't nod through their
      // takeoff.
      const headBobDeg = cfg.headBob ? HEAD_BOB_DEG * Math.sin(flapT) * bobEngage : 0;
      const rotDeg =
        (headingDeg - BIRD_NATURAL_HEADING_DEG) * BIRD_HEADING_FOLLOW
        + (b.rotJitter * 180) / Math.PI
        + headBobDeg
        + lookHeadDeg;

      b.el.style.opacity = opacity.toFixed(2);
      // Shadow visibility is driven by a single `data-shadow` attribute
      // on the layer (see useEffect in Flock); no per-frame filter write.
      b.el.style.transform =
        `translate(${renderX.toFixed(1)}px, ${(renderY + bottomAnchorY).toFixed(1)}px) ` +
        `rotate(${rotDeg.toFixed(1)}deg) ` +
        `scale(${emergeScale.toFixed(3)}, ${(emergeScale * scaleY).toFixed(3)})`;

      // Despawn when fully off-screen (top or right edges, with margin)
      const M = 80;
      if (renderY < -M || renderX > vpW + M) {
        b.alive = false;
        b.el.remove();
        anyDied = true;
      }
    }

    // Compact the array only when something actually died this frame.
    if (anyDied) {
      for (let i = birds.length - 1; i >= 0; i--) {
        if (!birds[i].alive) birds.splice(i, 1);
      }
    }

    if (birds.length > 0) {
      rafId = requestAnimationFrame(loop);
    }
  }

  return {
    spawn,
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

// ── Shatter system — physical glass break-apart ─────────────────────────────

interface Shard {
  el: SVGGElement;
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
  rot: number;
  angVel: number;
  age: number;
  alive: boolean;
  // Cached opacity string — skip the setAttribute write when unchanged.
  appliedOpacity: string;
}

interface ShatterColors {
  fill: string;
  stroke: string;
  highlight: string;
}

interface FractureOptions {
  previewMs: number;
  onBreak: () => void;
}

interface ShatterAPI {
  fracture: (
    pillRect: { left: number; top: number; width: number; height: number },
    epicenter: { x: number; y: number },
    colors: ShatterColors,
    opts: FractureOptions,
  ) => () => void; // returns a cancel function (valid until break)
  cleanup: () => void;
}

// Build a jagged polyline from start to end with N intermediate points
// jittered perpendicular to the spoke axis. Jitter tapers toward the
// endpoints so the path *anchors* at start/end and only wanders in the
// middle — reads as a single fracture line rather than a zig-zag.
function buildJaggedSpoke(
  start: { x: number; y: number },
  end: { x: number; y: number },
  segments: number,
  maxJitter: number,
): { x: number; y: number }[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1 || segments < 2) return [start, end];
  const px = -dy / len;
  const py = dx / len;
  const pts: { x: number; y: number }[] = [start];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    // Taper jitter via sin — zero at endpoints, max at midpoint.
    const taper = Math.sin(t * Math.PI);
    const baseX = start.x + dx * t;
    const baseY = start.y + dy * t;
    const j = (Math.random() - 0.5) * 2 * maxJitter * taper;
    pts.push({ x: baseX + px * j, y: baseY + py * j });
  }
  pts.push(end);
  return pts;
}

function pointsToPathD(points: { x: number; y: number }[]): string {
  let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  return d;
}

function polylineLength(points: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function setupShatter(svgLayer: SVGSVGElement): ShatterAPI {
  const shards: Shard[] = [];
  let rafId: number | null = null;
  let lastTime = 0;

  // Active preview job — present only between fracture() call and onBreak.
  // Cancelling (via the returned function) only works during this window.
  let activeJob: {
    crackEls: SVGPathElement[];
    defsEl: SVGDefsElement | null;
    breakTimer: number;
    cancelled: boolean;
  } | null = null;

  function clearShards() {
    for (const s of shards) {
      s.alive = false;
      s.el.remove();
    }
    shards.length = 0;
  }

  function generateGeometry(
    pillRect: { left: number; top: number; width: number; height: number },
    epicenter: { x: number; y: number },
  ) {
    const W = pillRect.width;
    const H = pillRect.height;
    const exLocal = epicenter.x - pillRect.left;
    const eyLocal = epicenter.y - pillRect.top;
    const ep = { x: exLocal, y: eyLocal };

    // Walk the pill perimeter clockwise. Slight jitter so shards don't
    // share clean perpendicular edges. Perim point count is randomized
    // per fracture for variation between hovers.
    const perimPointCount = randInt(SHATTER_PERIM_POINTS_MIN, SHATTER_PERIM_POINTS_MAX);
    const perim: { x: number; y: number }[] = [];
    const perimeter = 2 * (W + H);
    const stride = perimeter / perimPointCount;
    for (let i = 0; i < perimPointCount; i++) {
      let d = i * stride + rand(-stride * 0.15, stride * 0.15);
      d = ((d % perimeter) + perimeter) % perimeter;
      let x: number, y: number;
      if (d < W) { x = d; y = 0; }
      else if (d < W + H) { x = W; y = d - W; }
      else if (d < 2 * W + H) { x = W - (d - W - H); y = H; }
      else { x = 0; y = H - (d - 2 * W - H); }
      perim.push({ x, y });
    }

    // Build jagged spokes (in pill-local coords). Each spoke is shared
    // between two adjacent shards — when we walk a shard polygon, we
    // traverse one spoke forward and the next reversed, so adjacent
    // shards' edges align exactly.
    const spokes = perim.map(p => {
      const dist = Math.hypot(p.x - exLocal, p.y - eyLocal);
      const segments = Math.max(3, Math.min(6, Math.round(dist / 6)));
      const maxJitter = Math.min(dist * 0.13, 3.2);
      return buildJaggedSpoke(ep, p, segments, maxJitter);
    });

    return { perim, exLocal, eyLocal, spokes };
  }

  function spawnShards(
    pillRect: { left: number; top: number; width: number; height: number },
    colors: ShatterColors,
    geometry: {
      perim: { x: number; y: number }[];
      exLocal: number;
      eyLocal: number;
      spokes: { x: number; y: number }[][];
    },
  ) {
    const { perim, exLocal, eyLocal, spokes } = geometry;
    // Batch shard SVG nodes into a fragment — single append to the layer
    // after the spawn loop instead of one per shard.
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < perim.length; i++) {
      const j = (i + 1) % perim.length;
      const spokeA = spokes[i];          // [epicenter, jitter..., perim[i]]
      const spokeB = spokes[j];          // [epicenter, jitter..., perim[j]]

      // Walk the polygon: epicenter → spokeA jitters → perim[i] → perim[j]
      // → spokeB jitters reversed → close. The reversed slice excludes
      // both endpoints (epicenter and perim[j]) to avoid duplicates.
      const polyPoints: { x: number; y: number }[] = [
        ...spokeA,                       // includes epicenter and perim[i]
        perim[j],                        // straight perim segment
        ...spokeB.slice(1, -1).reverse(),
      ];

      // Centroid = mean of polygon vertices.
      let cx = 0, cy = 0;
      for (const p of polyPoints) { cx += p.x; cy += p.y; }
      cx /= polyPoints.length;
      cy /= polyPoints.length;

      const relPoints = polyPoints.map(p => ({ x: p.x - cx, y: p.y - cy }));

      // Initial velocity from epicenter to centroid.
      const dx = cx - exLocal;
      const dy = cy - eyLocal;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = rand(SHATTER_INITIAL_SPEED_MIN, SHATTER_INITIAL_SPEED_MAX);
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed - SHATTER_UPWARD_BOOST;

      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("aria-hidden", "true");

      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", pointsToPathD(relPoints) + " Z");
      path.setAttribute("fill", colors.fill);
      path.setAttribute("stroke", colors.stroke);
      path.setAttribute("stroke-width", "0.6");
      path.setAttribute("stroke-linejoin", "round");
      g.appendChild(path);

      // Faint specular along the first crack edge — sells "glass."
      if (relPoints.length >= 2) {
        const highlightLine = document.createElementNS(SVG_NS, "line");
        highlightLine.setAttribute("x1", relPoints[0].x.toFixed(2));
        highlightLine.setAttribute("y1", relPoints[0].y.toFixed(2));
        highlightLine.setAttribute("x2", relPoints[1].x.toFixed(2));
        highlightLine.setAttribute("y2", relPoints[1].y.toFixed(2));
        highlightLine.setAttribute("stroke", colors.highlight);
        highlightLine.setAttribute("stroke-width", "0.8");
        highlightLine.setAttribute("stroke-linecap", "round");
        g.appendChild(highlightLine);
      }

      fragment.appendChild(g);

      shards.push({
        el: g,
        worldX: pillRect.left + cx,
        worldY: pillRect.top + cy,
        vx,
        vy,
        rot: rand(-8, 8),
        angVel: rand(-SHATTER_ANGULAR_VEL_MAX, SHATTER_ANGULAR_VEL_MAX),
        age: 0,
        alive: true,
        appliedOpacity: "",
      });
    }
    svgLayer.appendChild(fragment);
  }

  function fracture(
    pillRect: { left: number; top: number; width: number; height: number },
    epicenter: { x: number; y: number },
    colors: ShatterColors,
    opts: FractureOptions,
  ): () => void {
    // Cancel any in-flight preview before starting a new one.
    if (activeJob && !activeJob.cancelled) {
      activeJob.cancelled = true;
      clearTimeout(activeJob.breakTimer);
      for (const el of activeJob.crackEls) el.remove();
    }

    const geometry = generateGeometry(pillRect, epicenter);

    // Build a clipPath that mirrors the pill's rounded rectangle. Preview
    // cracks are clipped to it so jittered spokes can't overshoot the
    // glass edges. Shards (post-break) are *not* clipped — they fly free.
    const clipId = `flock-clip-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const defsEl = document.createElementNS(SVG_NS, "defs");
    const clipPathEl = document.createElementNS(SVG_NS, "clipPath");
    clipPathEl.setAttribute("id", clipId);
    const clipRect = document.createElementNS(SVG_NS, "rect");
    clipRect.setAttribute("x", pillRect.left.toFixed(1));
    clipRect.setAttribute("y", pillRect.top.toFixed(1));
    clipRect.setAttribute("width", pillRect.width.toFixed(1));
    clipRect.setAttribute("height", pillRect.height.toFixed(1));
    clipRect.setAttribute("rx", String(SHATTER_PILL_BORDER_RADIUS));
    clipRect.setAttribute("ry", String(SHATTER_PILL_BORDER_RADIUS));
    clipPathEl.appendChild(clipRect);
    defsEl.appendChild(clipPathEl);
    svgLayer.appendChild(defsEl);

    // Phase 1 — draw jagged crack spokes on the still-visible pill, using
    // the *same* spoke geometry the shards will tear along.
    const crackEls: SVGPathElement[] = [];
    for (let i = 0; i < geometry.spokes.length; i++) {
      const worldSpoke = geometry.spokes[i].map(p => ({
        x: pillRect.left + p.x,
        y: pillRect.top + p.y,
      }));
      const len = polylineLength(worldSpoke);
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", pointsToPathD(worldSpoke));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", colors.stroke);
      path.setAttribute("stroke-width", "1.0");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-dasharray", len.toFixed(1));
      path.setAttribute("stroke-dashoffset", len.toFixed(1));
      path.setAttribute("clip-path", `url(#${clipId})`);
      path.setAttribute("opacity", String(FRACTURE_CRACK_OPACITY));
      path.style.animation = `flock-crack-draw ${FRACTURE_CRACK_DRAW_MS}ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards`;
      path.style.animationDelay = `${i * 10}ms`;
      svgLayer.appendChild(path);
      crackEls.push(path);
    }

    const job = { crackEls, defsEl, breakTimer: 0, cancelled: false };
    activeJob = job;

    job.breakTimer = window.setTimeout(() => {
      if (job.cancelled) return;
      activeJob = null;
      // Remove the crack spokes — the shard polygon edges replace them.
      // Defs (clipPath) goes too; shards are unclipped so they fly free.
      for (const el of crackEls) el.remove();
      defsEl.remove();
      // Spawn shards using the same geometry so they break along the same lines.
      spawnShards(pillRect, colors, geometry);
      opts.onBreak();
      lastTime = 0;
      if (rafId === null) rafId = requestAnimationFrame(loop);
    }, opts.previewMs);

    return () => {
      if (job.cancelled) return;
      job.cancelled = true;
      clearTimeout(job.breakTimer);
      // Fade cracks out via a brief opacity transition before removal.
      for (const el of crackEls) {
        el.style.transition = "opacity 180ms ease";
        el.style.opacity = "0";
      }
      window.setTimeout(() => {
        for (const el of crackEls) el.remove();
        defsEl.remove();
      }, 220);
      if (activeJob === job) activeJob = null;
    };
  }

  function loop(now: number) {
    rafId = null;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.033) : 0.016;
    lastTime = now;

    let aliveCount = 0;
    let anyDied = false;
    for (const s of shards) {
      if (!s.alive) continue;
      s.age += dt;

      s.vy += SHATTER_GRAVITY * dt;
      s.vx *= SHATTER_DRAG_PER_FRAME;
      s.worldX += s.vx * dt;
      s.worldY += s.vy * dt;
      s.rot += s.angVel * dt;

      let opacity = 1;
      if (s.age > SHATTER_FADE_START_S) {
        const fadeT = (s.age - SHATTER_FADE_START_S) /
                      (SHATTER_DURATION_S - SHATTER_FADE_START_S);
        opacity = Math.max(0, 1 - fadeT);
      }
      // Opacity sits at "1.00" for the first ~450ms of flight; skipping
      // the setAttribute during that window cuts ~5 attribute writes per
      // frame from the shatter window.
      const opacityStr = opacity.toFixed(2);
      if (s.appliedOpacity !== opacityStr) {
        s.el.setAttribute("opacity", opacityStr);
        s.appliedOpacity = opacityStr;
      }
      s.el.setAttribute(
        "transform",
        `translate(${s.worldX.toFixed(1)} ${s.worldY.toFixed(1)}) rotate(${s.rot.toFixed(1)})`,
      );

      if (s.age > SHATTER_DURATION_S) {
        s.alive = false;
        s.el.remove();
        anyDied = true;
      } else {
        aliveCount++;
      }
    }

    if (anyDied) {
      for (let i = shards.length - 1; i >= 0; i--) {
        if (!shards[i].alive) shards.splice(i, 1);
      }
    }

    if (aliveCount > 0) {
      rafId = requestAnimationFrame(loop);
    }
  }

  return {
    fracture,
    cleanup: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      clearShards();
      if (activeJob) {
        activeJob.cancelled = true;
        clearTimeout(activeJob.breakTimer);
        for (const el of activeJob.crackEls) el.remove();
        activeJob.defsEl?.remove();
        activeJob = null;
      }
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
  const [burstMin, setBurstMin] = useState(DEFAULTS.burstMin);
  const [burstMax, setBurstMax] = useState(DEFAULTS.burstMax);
  const [flapHz, setFlapHz] = useState(DEFAULTS.flapHz);
  const [staggerMs, setStaggerMs] = useState(DEFAULTS.spawnStaggerMs);
  const [flightSpeed, setFlightSpeed] = useState(DEFAULTS.flightSpeed);
  const [bobAmplitude, setBobAmplitude] = useState(DEFAULTS.bobAmplitude);
  const [climbAccel, setClimbAccel] = useState(DEFAULTS.climbAccel);
  const [birdSize, setBirdSize] = useState(DEFAULTS.birdSize);
  const [flapJitterOn, setFlapJitterOn] = useState(DEFAULTS.flapJitter);
  const [headBobOn, setHeadBobOn] = useState(DEFAULTS.headBob);
  const [magicEmergeOn, setMagicEmergeOn] = useState(DEFAULTS.magicEmerge);
  const [pillSpikeOn, setPillSpikeOn] = useState(DEFAULTS.pillSpike);
  const [lastLookOn, setLastLookOn] = useState(DEFAULTS.lastLook);
  const [dropShadowOn, setDropShadowOn] = useState(DEFAULTS.dropShadow);
  const [fractureOn, setFractureOn] = useState(DEFAULTS.fracture);
  const [stragglersOn, setStragglersOn] = useState(DEFAULTS.stragglers);
  // View toggles (not tied to a Flock behavior — these affect chrome only).
  const [backButtonOn, setBackButtonOn] = useState(true);

  // Tell the Back-button component to hide itself; it has its own
  // visibility check (pathname + this hidden flag) and re-renders on
  // change. Restore on unmount so leaving the demo brings it back.
  useEffect(() => {
    setBackButtonHidden(!backButtonOn);
    return () => setBackButtonHidden(false);
  }, [backButtonOn]);

  // Shatter layer + API — physics-based glass break-apart at burst time.
  const shatterLayerRef = useRef<SVGSVGElement>(null);
  const shatterApiRef = useRef<ShatterAPI | null>(null);

  useEffect(() => {
    const layer = shatterLayerRef.current;
    if (!layer) return;
    const api = setupShatter(layer);
    shatterApiRef.current = api;
    return () => {
      shatterApiRef.current = null;
      api.cleanup();
    };
  }, []);
  const [straggler1Ms, setStraggler1Ms] = useState(DEFAULTS.straggler1Ms);
  const [straggler2Ms, setStraggler2Ms] = useState(DEFAULTS.straggler2Ms);

  // Stragglers track hover state + pending timers so we can cancel on leave.
  const isHoveringRef = useRef(false);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const stragglerTimersRef = useRef<number[]>([]);
  // Cancel function for an in-flight fracture preview — set while cracks
  // are drawing on the still-visible pill, cleared once the pill breaks.
  const pendingFractureCancelRef = useRef<(() => void) | null>(null);

  const clearStragglerTimers = useCallback(() => {
    for (const t of stragglerTimersRef.current) clearTimeout(t);
    stragglerTimersRef.current = [];
  }, []);

  useEffect(() => () => clearStragglerTimers(), [clearStragglerTimers]);

  // Glass config — initialized once and mutated in-place. We *don't*
  // reassign each render because the pill spike (mutating glassPressure)
  // would otherwise be wiped by the next React render.
  const glassConfigRef = useRef<GlassTunable>({
    ...GLASS_DEFAULTS,
    mode,
  });
  useEffect(() => {
    glassConfigRef.current.mode = mode;
  }, [mode]);

  // Mutate in-place each render — matches glassConfigRef so we don't
  // re-create the object the swarm loop is reading every frame.
  const flockConfigRef = useRef<FlockConfig>({
    flapHz: DEFAULTS.flapHz,
    flightSpeed: DEFAULTS.flightSpeed,
    bobAmplitude: DEFAULTS.bobAmplitude,
    climbAccel: DEFAULTS.climbAccel,
    birdSize: DEFAULTS.birdSize,
    staggerMs: DEFAULTS.spawnStaggerMs,
    flapJitter: DEFAULTS.flapJitter,
    headBob: DEFAULTS.headBob,
    magicEmerge: DEFAULTS.magicEmerge,
    lastLook: DEFAULTS.lastLook,
  });
  flockConfigRef.current.flapHz = flapHz;
  flockConfigRef.current.flightSpeed = flightSpeed;
  flockConfigRef.current.bobAmplitude = bobAmplitude;
  flockConfigRef.current.climbAccel = climbAccel;
  flockConfigRef.current.birdSize = birdSize;
  flockConfigRef.current.staggerMs = staggerMs;
  flockConfigRef.current.flapJitter = flapJitterOn;
  flockConfigRef.current.headBob = headBobOn;
  flockConfigRef.current.magicEmerge = magicEmergeOn;
  flockConfigRef.current.lastLook = lastLookOn;
  // dropShadowOn isn't read by the swarm loop — it drives the layer's
  // data-shadow attribute in the JSX, which controls visibility of the
  // baked-in shadow path via CSS. Zero per-frame work for the toggle.

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
    return () => {
      swarmRef.current = null;
      swarm.cleanup();
    };
  }, []);

  // Spawn a wave of N birds from the X link, using the most recent cursor
  // position (for cursor mode) or the link rect otherwise. Shared between
  // the initial burst and the straggler waves.
  const spawnWave = useCallback((count: number, opts?: { lastLook?: boolean }) => {
    const xEl = xLinkRef.current;
    const swarm = swarmRef.current;
    if (!xEl || !swarm || count <= 0) return;
    const rect = xEl.getBoundingClientRect();
    const cursor = cursorRef.current;
    swarm.spawn(
      { mode: originMode, rect, cursorX: cursor?.x, cursorY: cursor?.y },
      count,
      opts,
    );
  }, [originMode]);

  const triggerFlock = useCallback(() => {
    clearStragglerTimers();

    // The burst is the actual moment the birds emerge. We separate this
    // from the trigger so fracture can run a 500ms preview *before* the
    // burst (cracks form on the visible pill, then it breaks, then birds).
    const fireBurst = () => {
      if (!isHoveringRef.current) return; // user already left during preview
      const lo = Math.min(burstMin, burstMax);
      const hi = Math.max(burstMin, burstMax);
      spawnWave(randInt(lo, hi));
      if (pillSpikeOn) {
        glassApiRef.current?.spikePressure(PILL_SPIKE_AMOUNT);
      }
      if (!stragglersOn) return;
      // Schedule trickle waves *relative to the burst*, so straggler
      // timings stay consistent whether or not the preview is in play.
      const r1Count = randInt(STRAGGLER1_MIN_COUNT, STRAGGLER1_MAX_COUNT);
      stragglerTimersRef.current.push(
        window.setTimeout(() => {
          if (isHoveringRef.current) spawnWave(r1Count);
        }, straggler1Ms),
      );
      stragglerTimersRef.current.push(
        window.setTimeout(() => {
          if (isHoveringRef.current) spawnWave(STRAGGLER2_COUNT, { lastLook: true });
        }, straggler2Ms),
      );
    };

    const glassApi = glassApiRef.current;
    const shatterApi = shatterApiRef.current;
    const xEl = xLinkRef.current;

    if (fractureOn && glassApi && shatterApi && xEl) {
      // Wait FRACTURE_START_DELAY_MS for the pill to settle into the X
      // position (it may be mid-spring from a previously-hovered link)
      // before we compute geometry and draw cracks. Cancel ref initially
      // clears this timer; once the fracture actually starts, it's
      // replaced with the shatter API's own cancel.
      const startTimerId = window.setTimeout(() => {
        if (!isHoveringRef.current) return;
        const liveXEl = xLinkRef.current;
        if (!liveXEl) return;
        const xRect = liveXEl.getBoundingClientRect();
        if (xRect.width < 4) return;

        const epicenter = resolveEpicenter(originMode, xRect, cursorRef.current);
        const isLight = mode === "light";
        const colors: ShatterColors = isLight
          ? {
              fill: "hsla(42, 40%, 28%, 0.30)",
              stroke: "hsla(42, 55%, 20%, 0.62)",
              highlight: "rgba(255, 255, 255, 0.55)",
            }
          : {
              fill: "hsla(42, 25%, 65%, 0.24)",
              stroke: "hsla(42, 30%, 80%, 0.58)",
              highlight: "rgba(255, 255, 255, 0.35)",
            };
        // Stress shake — runs only across the crack-draw window so the
        // pill jiggles *while* the cracks are forming, then holds still
        // during the brief pre-break hold. Bell-curve envelope inside
        // glassHighlight handles the ramp-up/down.
        glassApi.shakeFor(FRACTURE_CRACK_DRAW_MS);
        const fractureCancel = shatterApi.fracture(
          { left: xRect.left, top: xRect.top, width: xRect.width, height: xRect.height },
          epicenter,
          colors,
          {
            previewMs: FRACTURE_PREVIEW_MS,
            onBreak: () => {
              pendingFractureCancelRef.current = null;
              // Pill stays suppressed for the duration of the hover — the
              // glass is broken until the user looks away and comes back.
              glassApi.setPillVisible(false);
              fireBurst();
            },
          },
        );
        // Wrap the cancel so a mid-preview leave also halts the shake.
        pendingFractureCancelRef.current = () => {
          fractureCancel();
          glassApi.cancelShake();
        };
      }, FRACTURE_START_DELAY_MS);
      // While the timer is pending, leaving the link should abort the
      // fracture before it starts. Once the timer fires, the cancel ref
      // is overwritten with the shatter API's own cancel.
      pendingFractureCancelRef.current = () => clearTimeout(startTimerId);
    } else {
      fireBurst();
    }
  }, [burstMin, burstMax, spawnWave, stragglersOn, pillSpikeOn, fractureOn, originMode, mode, straggler1Ms, straggler2Ms, clearStragglerTimers]);

  const onXMouseEnter = useCallback((e: React.MouseEvent) => {
    if (isHoveringRef.current) return; // defensive against duplicate enter events
    isHoveringRef.current = true;
    cursorRef.current = { x: e.clientX, y: e.clientY };
    triggerFlock();
  }, [triggerFlock]);

  const onXMouseMove = useCallback((e: React.MouseEvent) => {
    cursorRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Single "user is no longer hovering X" handler used by mouseLeave,
  // touchEnd/Cancel, and blur. Cancels stragglers + in-flight fracture,
  // restores pill suppression so the next hover gets a fresh pill.
  const endHover = useCallback(() => {
    isHoveringRef.current = false;
    clearStragglerTimers();
    pendingFractureCancelRef.current?.();
    pendingFractureCancelRef.current = null;
    glassApiRef.current?.setPillVisible(true);
  }, [clearStragglerTimers]);

  const onXTouchStart = useCallback((e: React.TouchEvent) => {
    if (isHoveringRef.current) return;
    const t = e.touches[0];
    isHoveringRef.current = true;
    if (t) cursorRef.current = { x: t.clientX, y: t.clientY };
    triggerFlock();
  }, [triggerFlock]);

  // Keyboard parity — tab-to-X-and-focus fires the flock with a synthetic
  // cursor position at the link's right-edge midpoint.
  const onXFocus = useCallback((e: React.FocusEvent<HTMLAnchorElement>) => {
    if (isHoveringRef.current) return;
    isHoveringRef.current = true;
    const r = e.currentTarget.getBoundingClientRect();
    cursorRef.current = { x: r.right, y: r.top + r.height / 2 };
    triggerFlock();
  }, [triggerFlock]);

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
          <OnOffToggle label="Back button" value={backButtonOn} onChange={setBackButtonOn} />
          <DevDivider />
          <DevSectionLabel>Burst</DevSectionLabel>
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
          <DevSlider label="Burst min" value={burstMin} onChange={setBurstMin} min={2} max={14} step={1} />
          <DevSlider label="Burst max" value={burstMax} onChange={setBurstMax} min={2} max={14} step={1} />
          <DevSlider label="Spawn stagger" value={staggerMs} onChange={setStaggerMs} min={20} max={260} step={5} format={(v) => `${Math.round(v)}ms`} />
          <DevDivider />
          <DevSectionLabel>Flight</DevSectionLabel>
          <DevSlider label="Flight speed" value={flightSpeed} onChange={setFlightSpeed} min={140} max={340} step={10} />
          <DevSlider label="Climb" value={climbAccel} onChange={setClimbAccel} min={0} max={180} step={5} />
          <DevSlider label="Bob amount" value={bobAmplitude} onChange={setBobAmplitude} min={0} max={14} step={1} />
          <DevSlider label="Bird size" value={birdSize} onChange={setBirdSize} min={14} max={36} step={1} />
          <DevDivider />
          <DevSectionLabel>Wings</DevSectionLabel>
          <DevSlider label="Flap rate" value={flapHz} onChange={setFlapHz} min={3} max={10} step={0.5} format={(v) => `${v.toFixed(1)}Hz`} />
          <OnOffToggle label="Flap jitter" value={flapJitterOn} onChange={setFlapJitterOn} />
          <OnOffToggle label="Head bob" value={headBobOn} onChange={setHeadBobOn} />
          <DevDivider />
          <DevSectionLabel>Effects</DevSectionLabel>
          <OnOffToggle label="Magic emerge" value={magicEmergeOn} onChange={setMagicEmergeOn} />
          <OnOffToggle label="Pill spike" value={pillSpikeOn} onChange={setPillSpikeOn} />
          <OnOffToggle label="Fracture" value={fractureOn} onChange={setFractureOn} />
          <OnOffToggle label="Last look" value={lastLookOn} onChange={setLastLookOn} />
          <OnOffToggle label="Drop shadow" value={dropShadowOn} onChange={setDropShadowOn} />
          <DevDivider />
          <DevSectionLabel>Stragglers</DevSectionLabel>
          <OnOffToggle label="Stragglers" value={stragglersOn} onChange={setStragglersOn} />
          <DevSlider label="Wave 1 (1–3)" value={straggler1Ms} onChange={setStraggler1Ms} min={800} max={3500} step={50} format={(v) => `${Math.round(v)}ms`} />
          <DevSlider label="Wave 2 (1)" value={straggler2Ms} onChange={setStraggler2Ms} min={3000} max={7000} step={50} format={(v) => `${Math.round(v)}ms`} />
          <DevDivider />
          <DevButton
            label="Reset"
            onClick={() => {
              setOriginMode(DEFAULT_ORIGIN_MODE);
              setBurstMin(DEFAULTS.burstMin);
              setBurstMax(DEFAULTS.burstMax);
              setFlapHz(DEFAULTS.flapHz);
              setStaggerMs(DEFAULTS.spawnStaggerMs);
              setFlightSpeed(DEFAULTS.flightSpeed);
              setClimbAccel(DEFAULTS.climbAccel);
              setBobAmplitude(DEFAULTS.bobAmplitude);
              setBirdSize(DEFAULTS.birdSize);
              setFlapJitterOn(DEFAULTS.flapJitter);
              setHeadBobOn(DEFAULTS.headBob);
              setMagicEmergeOn(DEFAULTS.magicEmerge);
              setPillSpikeOn(DEFAULTS.pillSpike);
              setFractureOn(DEFAULTS.fracture);
              setLastLookOn(DEFAULTS.lastLook);
              setDropShadowOn(DEFAULTS.dropShadow);
              setStragglersOn(DEFAULTS.stragglers);
              setStraggler1Ms(DEFAULTS.straggler1Ms);
              setStraggler2Ms(DEFAULTS.straggler2Ms);
              setBackButtonOn(true);
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
        .flock-bird-layer:not([data-shadow="on"]) .flock-bird-shadow {
          display: none;
        }
        .flock-shatter-layer {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          overflow: visible;
          z-index: 49;
        }
        @keyframes flock-crack-draw {
          to { stroke-dashoffset: 0; }
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
            onMouseLeave={endHover}
            onTouchStart={onXTouchStart}
            onTouchEnd={endHover}
            onTouchCancel={endHover}
            onFocus={onXFocus}
            onBlur={endHover}
          >
            X
          </a>
          .
        </div>
        <div
          ref={birdLayerRef}
          className="flock-bird-layer"
          data-shadow={dropShadowOn ? "on" : "off"}
        />
        <svg ref={shatterLayerRef} className="flock-shatter-layer" aria-hidden="true" />
      </div>
    </DevPanel>
  );
}
