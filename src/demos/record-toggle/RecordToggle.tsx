import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DevPanel,
  DevButtonGroup,
  DevSlider,
  DevDivider,
  DevSectionLabel,
} from "../../components/DevPanel";

/**
 * Record Toggle — a switch that turns on smooth jazz.
 *
 * Off: a plain switch. On: the knob inks into a record as it slides over,
 * the track warms into a walnut plinth, a tonearm swings in and drops the
 * needle. Speed is one number (`s`, 0..1) that drives both the platter's
 * rotation and the audio's playbackRate, so the spin-up / wind-down you see
 * is exactly the pitch bend you hear.
 *
 * Audio is CC0 (public domain dedication) except "Smooth Lovin'", which is
 * CC BY 3.0 (Kevin MacLeod) and is marked as such in the picker.
 */

// ═══════════════════════════════════════════════════════════════
// Tracks
// ═══════════════════════════════════════════════════════════════

type TrackId = "martini" | "lovin" | "venice";

const TRACKS: Record<TrackId, {
  label: string;
  fullTitle: string;
  artist: string;
  src: string;
}> = {
  // CC0 (FreePD) — no attribution required
  martini: {
    label: "Martini Sunset",
    fullTitle: "Martini Sunset",
    artist: "Kevin MacLeod",
    src: "/audio/record-toggle/martini-sunset.mp3",
  },
  // CC BY 3.0 — needs credit (title, author, source, licence) if used on camera
  lovin: {
    label: "Smooth Lovin' (CC BY)",
    fullTitle: "Smooth Lovin'",
    artist: "Kevin MacLeod",
    src: "/audio/record-toggle/smooth-lovin.mp3",
  },
  // CC0 (FreePD)
  venice: {
    label: "Night in Venice",
    fullTitle: "Night in Venice",
    artist: "Kevin MacLeod",
    src: "/audio/record-toggle/night-in-venice.mp3",
  },
};

// ═══════════════════════════════════════════════════════════════
// Tokens
// ═══════════════════════════════════════════════════════════════

type Appearance = "light" | "dark";

const THEME = {
  // Light mode gets a lighter walnut so it doesn't punch a hole in the page
  light: { bg: "#f4f4f4", trackOff: "#e6e6e6", plinth: "#6e4427", title: "#3b3734", artist: "#6e6a67" },
  dark: { bg: "#121110", trackOff: "#3a3938", plinth: "#52301a", title: "#d8d2cc", artist: "#8f8a86" },
} as const;

const C = {
  knob: "#ffffff",
  vinyl: "#130b07",
  label: "#a3403a",
  arm: "#d9d9d9",
  armDark: "#a9a9a9",
};

const INK = "#ffece0"; // label print colour

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', sans-serif";

// Geometry, as fractions of track height (matches the sketch: 236×144, 108 knob)
const G = {
  aspect: 236 / 144,
  pad: 18 / 144,
  labelR: 0.17, // label radius / knob diameter
  needleR: 0.27, // needle distance from spindle / knob diameter
  pivotX: 0.25, // pivot x / track width
  restDeg: -34, // arm parked angle (tip up, off the record)
};

// Tonearm proportions (× track height), relative to the pivot
const ARM = {
  weightEnd: 0.2, // counterweight far edge, behind the pivot
  weightLen: 0.085,
  weightH: 0.082,
  tube: 0.028,
  pivotR: 0.056,
  capR: 0.032,
};

type GlowMode = "spectrum" | "breath" | "off";

/**
 * Off-state switch:
 *  clean   — flat modern switch; the knob floats on a soft shadow.
 *  tactile — a physical switch that foreshadows the record: recessed track,
 *            lit domed knob with faint lathe rings and a spindle dimple.
 */
type OffStyle = "clean" | "tactile";

// Knob shadow at rest, per style × appearance: [contact, ambient] as
// [y, blur, alpha] at size 1 (scaled with the toggle).
const KNOB_REST: Record<OffStyle, Record<"light" | "dark", [number, number, number][]>> = {
  clean: {
    light: [[1, 2, 0.08], [3, 10, 0.07]],
    dark: [[1, 2, 0.3], [3, 10, 0.22]],
  },
  tactile: {
    light: [[1, 1, 0.22], [4, 10, 0.16]],
    dark: [[1, 1, 0.5], [4, 10, 0.38]],
  },
};
// The record's own shadow on the plinth: [y, blur, alpha]
const RECORD_SHADOW: [number, number, number] = [2, 5, 0.36];

/** auto = iOS only, first play only · always = every platform (for review) */
type SoundHint = "auto" | "always" | "off";
const HINT_SEEN_KEY = "record-toggle:sound-hint-seen";
const HINT_MS = 3800;
/**
 * Lead-in: the blank groove between the needle landing and the music. Real
 * records give it a second or two; here it's a beat of crackle so the drop
 * reads, without making the switch feel slow.
 */
const LEAD_IN_MS = 100;

const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/**
 * Haptic tick on iOS 18+ Safari, which has no Vibration API: toggling a
 * native `<input type="checkbox" switch>` plays the system switch haptic,
 * and clicking a label for one does so programmatically. Undocumented
 * behaviour — a no-op everywhere else.
 */
function iosHaptic() {
  if (!IS_IOS) return;
  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
}

// Breath: four broad bands (centres around the rim, bottom → top). Treble
// carries less energy, so each band gets a fixed lift to sit level.
const BREATH_BANDS: [number, number][] = [[40, 160], [160, 600], [600, 2500], [2500, 8000]];
const BREATH_TILT = [1, 1.1, 1.45, 2.1];
// Breath "Layers": one full-rim ring per band, lows deep and wide, highs pale
// and tight to the edge. [hue, lightness dark, lightness light, width, offset]
const BREATH_LAYERS: [number, number, number, number, number][] = [
  [18, 42, 32, 0.16, 0.02],
  [28, 52, 36, 0.12, 0.015],
  [38, 64, 42, 0.085, 0.01],
  [46, 82, 50, 0.055, 0.005],
];

type BreathStyle = "blend" | "layers";

interface Params {
  spinUp: number;
  spinDown: number;
  offDelay: number;
  rpm: number;
  glow: GlowMode;
  glowDark: number;
  glowLight: number;
  /** Light-mode glow lightness (%): lower = deeper, more visible tint */
  glowToneLight: number;
  glowFadeIn: number;
  breathDetail: number;
  /** Lifts the upper bands so the top of the rim answers the highs */
  trebleBoost: number;
  breathStyle: BreathStyle;
  armScaleMin: number;
  grain: number;
  // Vinyl texture reads differently against a dark vs light page
  vinylDark: number;
  vinylLight: number;
  haptics: boolean;
  offStyle: OffStyle;
  soundHint: SoundHint;
  crackle: number;
  appearance: Appearance;
}

// ═══════════════════════════════════════════════════════════════
// Math helpers
// ═══════════════════════════════════════════════════════════════

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Spin-up: motor torque — pitch climbs quickly out of the mud, then settles.
const upCurve = (p: number) => 1 - Math.pow(1 - clamp01(p), 2.2);
// Wind-down: close to linear, like a platter coasting against friction — the
// classic long pitch glide down.
const downCurve = (p: number) => 1 - Math.pow(clamp01(p), 1.15);

/** Find p in [0,1] where curve(p) ≈ target (curve monotonic). */
function invert(curve: (p: number) => number, target: number, increasing: boolean) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const v = curve(mid);
    if (increasing ? v < target : v > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Arm reach from the knob's position: 0 parked, 1 over the record. The arm is
 * tied to where the record is — not to taps, drags or state — so it swings in
 * and out identically every way the toggle can move.
 */
const armReach = (knobX: number) => {
  // Only the last ~20% of the handle's travel: the arm arrives as the record
  // lands, and is gone within the first few pixels of it leaving.
  const t = clamp01((knobX - 0.78) / 0.2);
  return t * t * (3 - 2 * t);
};


interface Spring {
  x: number;
  v: number;
}
function stepSpring(s: Spring, target: number, k: number, c: number, dt: number) {
  const a = -k * (s.x - target) - c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

// Mix in OKLab so the grey → walnut transition stays even instead of muddy
const toLin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const toSrgb = (v: number) =>
  Math.round(255 * clamp01(v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
function toOklab([r8, g8, b8]: [number, number, number]) {
  const r = toLin(r8), g = toLin(g8), b = toLin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const oklabCache = new Map<string, number[]>();
const oklabOf = (hex: string) => {
  let v = oklabCache.get(hex);
  if (!v) oklabCache.set(hex, (v = toOklab(hexToRgb(hex))));
  return v;
};
function mixOklab(a: string, b: string, t: number) {
  const A = oklabOf(a);
  const B = oklabOf(b);
  const u = clamp01(t);
  const [L, aa, bb] = A.map((v, i) => v + (B[i] - v) * u);
  const l = Math.pow(L + 0.3963377774 * aa + 0.2158037573 * bb, 3);
  const m = Math.pow(L - 0.1055613458 * aa - 0.0638541728 * bb, 3);
  const s = Math.pow(L - 0.0894841775 * aa - 1.291485548 * bb, 3);
  return `rgb(${toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)},${toSrgb(
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
  )},${toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)})`;
}

/**
 * Wood grain as a static SVG texture: long horizontal fibres (stretched
 * turbulence) warped by a low-frequency field so the figure drifts like real
 * walnut. Output is neutral grey, applied with soft-light so it only
 * modulates the plinth colour.
 */
function woodGrainURI(w: number, h: number) {
  // Rendered oversize: displacement pulls transparent pixels in at the
  // filter edges, so the visible tile is cropped from the middle.
  const m = Math.round(h * 0.25);
  const W = w + 2 * m;
  const H = h + 2 * m;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>
<filter id='f' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>
<feTurbulence type='fractalNoise' baseFrequency='${(1.1 / w).toFixed(5)} ${(2.2 / h).toFixed(5)}' numOctaves='2' seed='4' result='warp'/>
<feTurbulence type='fractalNoise' baseFrequency='${(1.6 / w).toFixed(5)} ${(52 / h).toFixed(5)}' numOctaves='2' seed='11' result='grain'/>
<feDisplacementMap in='grain' in2='warp' scale='${(h * 0.16).toFixed(1)}' xChannelSelector='R' yChannelSelector='G'/>
<feColorMatrix type='matrix' values='1.5 0 0 0 -0.25  1.5 0 0 0 -0.25  1.5 0 0 0 -0.25  0 0 0 0 1'/>
</filter>
<rect width='100%' height='100%' filter='url(#f)'/>
</svg>`;
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, m };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// ═══════════════════════════════════════════════════════════════
// Synthesized foley (no extra assets): needle drop, lift click, crackle
// ═══════════════════════════════════════════════════════════════

function makeNeedleDrop(ctx: BaseAudioContext) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.35);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const thump = Math.sin(2 * Math.PI * (46 + 30 * Math.exp(-t / 0.02)) * t) * Math.exp(-t / 0.06) * 0.55;
    const tick = (Math.random() * 2 - 1) * Math.exp(-t / 0.0025) * 0.35;
    d[i] = thump + tick;
  }
  return buf;
}

function makeLiftClick(ctx: BaseAudioContext) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.06);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    d[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.0035) * 0.18;
  }
  return buf;
}

function makeCrackle(ctx: BaseAudioContext) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 4);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    let pop = 0;
    for (let i = 0; i < len; i++) {
      // Surface hiss: filtered white noise, very quiet
      lp += 0.25 * ((Math.random() * 2 - 1) - lp);
      // Sparse pops (~14/s) with the odd louder one
      if (Math.random() < 14 / sr) {
        pop = (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.45);
        if (Math.random() < 0.06) pop *= 2.2;
      }
      d[i] = lp * 0.02 + pop;
      pop *= 0.82;
    }
  }
  return buf;
}

// ═══════════════════════════════════════════════════════════════
// Glow perimeter — capsule outline sampled by arclength.
// u = 0 at bottom-centre (bass), 1 at top-centre (treble), mirrored L/R.
// ═══════════════════════════════════════════════════════════════

interface PerimeterPt {
  x: number;
  y: number;
  u: number;
}

function capsulePerimeter(W: number, H: number, offset: number, n: number): PerimeterPt[] {
  const r = H / 2;
  const R = r + offset;
  const S = W - H; // straight length
  const total = 2 * S + 2 * Math.PI * R;
  const pts: PerimeterPt[] = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * total; // distance from bottom-centre, going right (clockwise on screen: right → up)
    const along = d <= total / 2 ? d : total - d;
    const u = along / (total / 2);
    let x: number;
    let y: number;
    if (d < S / 2) {
      x = W / 2 + d;
      y = H + offset;
    } else if ((d -= S / 2) < Math.PI * R) {
      const a = Math.PI / 2 - d / R; // from bottom (π/2) sweeping to top (−π/2)
      x = W - r + R * Math.cos(a);
      y = r + R * Math.sin(a);
    } else if ((d -= Math.PI * R) < S) {
      x = W - r - d;
      y = -offset;
    } else if ((d -= S) < Math.PI * R) {
      const a = -Math.PI / 2 - d / R; // top → left → bottom
      x = r + R * Math.cos(a);
      y = r + R * Math.sin(a);
    } else {
      d -= Math.PI * R;
      x = r + d;
      y = H + offset;
    }
    pts.push({ x, y, u });
  }
  return pts;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function RecordToggle() {
  const [on, setOn] = useState(false);
  const [trackId, setTrackId] = useState<TrackId>("martini");
  const [size, setSize] = useState(0.6);
  const [params, setParams] = useState<Params>({
    // Short enough that the platter is almost at speed when the needle
    // lands: the music comes in with just a believable settle into tempo
    spinUp: 0.6,
    spinDown: 0.8,
    offDelay: 0.04,
    rpm: 100 / 3,
    glow: "breath",
    glowDark: 0.4,
    // Light mode multiplies a warm tint into a pale page, so it needs far
    // more weight than dark mode's additive light to read at all.
    glowLight: 2,
    glowToneLight: 32,
    glowFadeIn: 2,
    breathDetail: 0.6,
    trebleBoost: 1.4,
    breathStyle: "blend",
    armScaleMin: 0.9,
    grain: 0.2,
    vinylDark: 0.4,
    vinylLight: 0.55,
    haptics: true,
    offStyle: "tactile",
    soundHint: "auto",
    crackle: 0.35,
    appearance: "dark",
  });
  const set = <K extends keyof Params>(k: K, v: Params[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  const theme = THEME[params.appearance];
  const labelId = "rt" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // ── Geometry ────────────────────────────────────────────────
  // Never wider than the viewport (phones): cap the effective scale
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const fitSize = Math.min(size, (vw - 64) / (96 * G.aspect));
  const H = Math.round(96 * Math.max(0.6, fitSize));
  const W = Math.round(H * G.aspect);
  const pad = H * G.pad;
  const K = H - 2 * pad;
  const travel = W - 2 * pad - K;
  const recordCx = W - pad - K / 2;
  const pivot = { x: W * G.pivotX, y: H / 2 };
  const needleX = recordCx - K * G.needleR;
  const armLen = needleX - pivot.x;
  const glowMargin = Math.round(H * 0.6);

  const geom = useMemo(
    () => ({ H, W, K, travel, glowMargin, needleX }),
    [H, W, K, travel, glowMargin, needleX],
  );

  // ── Live refs for the rAF loop ──────────────────────────────
  const onRef = useRef(on);
  const paramsRef = useRef(params);
  const geomRef = useRef(geom);
  const themeRef = useRef(theme);
  onRef.current = on;
  paramsRef.current = params;
  geomRef.current = geom;
  themeRef.current = theme;

  const trackEl = useRef<HTMLButtonElement>(null);
  const knobEl = useRef<HTMLDivElement>(null);
  const faceEl = useRef<HTMLDivElement>(null);
  const recordEl = useRef<HTMLDivElement>(null);
  const spinEl = useRef<HTMLDivElement>(null);
  const sheenEl = useRef<HTMLDivElement>(null);
  const faceLightEl = useRef<HTMLDivElement>(null);
  const grainEl = useRef<HTMLDivElement>(null);
  const nowPlayingEl = useRef<HTMLDivElement>(null);
  const hintEl = useRef<HTMLDivElement>(null);
  const lacquerEl = useRef<HTMLDivElement>(null);
  const pressRef = useRef(false);
  const skipOffDelay = useRef(false);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => (reducedMotion.current = mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  // Drag: the knob follows the finger both ways. Dragging a playing record
  // off also brakes the platter, like a hand on a real one.
  const dragRef = useRef<{
    id: number;
    startX: number;
    fromOn: boolean;
    moved: boolean;
    pos: number;
    pull: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const armEl = useRef<SVGGElement>(null);
  const armBodyEl = useRef<SVGGElement>(null);
  const armShadowEl = useRef<SVGGElement>(null);
  const canvasEl = useRef<HTMLCanvasElement>(null);

  // ── Audio ───────────────────────────────────────────────────
  const audio = useRef<{
    ctx: AudioContext;
    master: GainNode;
    musicGain: GainNode;
    analyser: AnalyserNode;
    crackleGain: GainNode;
    crackleIn: AudioNode;
    drop: AudioBuffer;
    lift: AudioBuffer;
    crackle: AudioBuffer;
    music: AudioBuffer | null;
    src: AudioBufferSourceNode | null;
    crackleSrc: AudioBufferSourceNode | null;
  } | null>(null);
  const playhead = useRef(0); // seconds into the current track

  useEffect(() => {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    // iOS mutes Web Audio under the silent switch unless the session says
    // this is media playback (Safari 16.4+; no-op elsewhere).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.78;
    analyser.minDecibels = -88;
    analyser.maxDecibels = -22;

    const musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(analyser);
    analyser.connect(master);

    const crackleHp = ctx.createBiquadFilter();
    crackleHp.type = "highpass";
    crackleHp.frequency.value = 600;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;
    crackleHp.connect(crackleGain);
    crackleGain.connect(master);

    audio.current = {
      ctx,
      master,
      musicGain,
      analyser,
      crackleGain,
      crackleIn: crackleHp,
      drop: makeNeedleDrop(ctx),
      lift: makeLiftClick(ctx),
      crackle: makeCrackle(ctx),
      music: null,
      src: null,
      crackleSrc: null,
    };
    // rAF stops in a hidden tab but audio wouldn't, leaving the music stuck
    // at whatever pitch it had — so pause the whole context with the tab.
    const onVisibility = () => {
      if (document.hidden) ctx.suspend();
      else if (onRef.current) ctx.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      audio.current = null;
      ctx.close();
    };
  }, []);

  // Load / swap the track. Swapping mid-play restarts from the top.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const ctrl = new AbortController();
    a.music = null;
    playhead.current = 0;
    if (a.src) {
      // Fade the old track out rather than cutting it (no click)
      const old = a.src;
      a.src = null;
      a.musicGain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.015);
      setTimeout(() => {
        try {
          old.stop();
        } catch {
          /* already stopped */
        }
      }, 80);
    }
    fetch(TRACKS[trackId].src, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((ab) => a.ctx.decodeAudioData(ab))
      .then((buf) => {
        if (!ctrl.signal.aborted && audio.current === a) a.music = buf;
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) console.warn("record-toggle: failed to load track", e);
      });
    return () => ctrl.abort();
  }, [trackId]);

  // ── The loop ────────────────────────────────────────────────
  useEffect(() => {
    // Mechanical state
    const knob: Spring = { x: 0, v: 0 };
    const morph: Spring = { x: 0, v: 0 };
    const armAng: Spring = { x: G.restDeg, v: 0 };
    const armLift: Spring = { x: 1, v: 0 };
    const press: Spring = { x: 0, v: 0 };
    const nowPlaying: Spring = { x: 0, v: 0 };
    const hint: Spring = { x: 0, v: 0 };
    let armOpacity = 0;
    let speed = 0; // 0..1 platter speed (drives audio playbackRate)
    let motorOn = false;
    let motorP = 1; // progress through the current up/down curve
    let needleDown = false;
    let offAt = 0; // when the motor was last switched off (ms)
    let needleAt = 0; // when the needle last landed (ms)
    let hintUntil = 0; // iOS sound-check hint visible until (ms)
    let spin = 0; // degrees
    let brake = 0; // 0..1, hand on the record
    let glowRamp = 0; // 0..1, light warming up as the music starts
    let last = performance.now();
    let raf = 0;

    const freq = new Uint8Array(audio.current?.analyser.frequencyBinCount ?? 512);
    const smooth = new Float32Array(96);
    const bands = new Float32Array(BREATH_BANDS.length);
    const layerSmooth = new Float32Array(BREATH_BANDS.length);
    let perimeterKey = "";
    let ctx2d: CanvasRenderingContext2D | null = null;
    let glowDrewLast = true;
    let perimeter: PerimeterPt[] = [];

    const playOneShot = (buf: AudioBuffer, gain: number) => {
      const a = audio.current;
      if (!a) return;
      const s = a.ctx.createBufferSource();
      s.buffer = buf;
      const g = a.ctx.createGain();
      g.gain.value = gain;
      s.connect(g);
      g.connect(a.master);
      s.start();
    };

    // Like a real turntable: the platter spins up silently, and the music
    // only starts once the needle is in the groove (after a beat of lead-in),
    // so you hear the last of the spin-up settle into tempo. Stopping is the
    // reverse of real-life etiquette on purpose: the music keeps playing as
    // the platter coasts down — the wind-down is the signature moment. Gain
    // tracks platter speed (a cartridge's output follows groove velocity).
    const startMusic = () => {
      const a = audio.current;
      if (!a || !a.music || a.src) return;
      const src = a.ctx.createBufferSource();
      src.buffer = a.music;
      src.loop = true;
      src.playbackRate.value = Math.max(0.001, speed);
      src.connect(a.musicGain);
      // Always swell in from silence (matters if the track finished
      // decoding after the platter was already up to speed)
      a.musicGain.gain.cancelScheduledValues(a.ctx.currentTime);
      a.musicGain.gain.setValueAtTime(0, a.ctx.currentTime);
      src.start(0, playhead.current % a.music.duration);
      a.src = src;
    };

    const stopMusic = () => {
      const a = audio.current;
      if (!a || !a.src) return;
      const src = a.src;
      a.src = null;
      a.musicGain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.015);
      setTimeout(() => {
        try {
          src.stop();
        } catch {
          /* noop */
        }
      }, 120);
    };

    // The needle is foley + surface noise only: drop thump and crackle on,
    // a lift tick and crackle off.
    const onNeedleDown = () => {
      const a = audio.current;
      if (!a) return;
      playOneShot(a.drop, 0.5);
      needleAt = performance.now();
      // Feel the needle land (may be ignored outside a user gesture)
      if (paramsRef.current.haptics) iosHaptic();
      // iOS: the needle drop doubles as a sound check — say so, once
      const mode = paramsRef.current.soundHint;
      let seen = false;
      try {
        seen = localStorage.getItem(HINT_SEEN_KEY) === "1";
      } catch {
        /* storage blocked */
      }
      if (mode === "always" || (mode === "auto" && IS_IOS && !seen)) {
        hintUntil = performance.now() + HINT_MS;
        try {
          localStorage.setItem(HINT_SEEN_KEY, "1");
        } catch {
          /* storage blocked */
        }
      }
      const cs = a.ctx.createBufferSource();
      cs.buffer = a.crackle;
      cs.loop = true;
      cs.playbackRate.value = Math.max(0.001, speed);
      cs.connect(a.crackleIn);
      cs.start();
      a.crackleSrc = cs;
    };

    const onNeedleUp = () => {
      const a = audio.current;
      if (!a) return;
      playOneShot(a.lift, 0.45);
      a.crackleGain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.015);
      const cs = a.crackleSrc;
      a.crackleSrc = null;
      setTimeout(() => {
        try {
          cs?.stop();
        } catch {
          /* noop */
        }
      }, 150);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const P = paramsRef.current;
      const g = geomRef.current;
      const th = themeRef.current;
      const wantOn = onRef.current;
      const frameDt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // ── Motor ────────────────────────────────────────────
      if (wantOn !== motorOn) {
        motorOn = wantOn;
        // A drag that commits off already lifted the needle — no beat needed
        if (!motorOn) offAt = skipOffDelay.current ? -Infinity : now;
        skipOffDelay.current = false;
        motorP = motorOn ? invert(upCurve, speed, true) : invert(downCurve, speed, false);
      }
      motorP = Math.min(1, motorP + frameDt / (motorOn ? P.spinUp : P.spinDown));
      speed = motorOn ? upCurve(motorP) : downCurve(motorP);
      const drag = dragRef.current?.moved ? dragRef.current : null;
      brake += ((drag?.fromOn ? drag.pull : 0) - brake) * Math.min(1, frameDt * 18);
      // Your hand on the record: the further you drag it off, the slower it
      // turns, so the pitch drop is in your fingers.
      speed *= 1 - 0.85 * brake;

      // ── Choreography ─────────────────────────────────────
      // Handle: goes where the state (or finger) says. Off waits one short
      // beat so the needle can lift before the record slides out from under it.
      let knobT = wantOn ? 1 : now - offAt < P.offDelay * 1000 ? 1 : 0;
      if (drag) knobT = drag.pos;
      // Arm: follows the handle's position, both ways, tap or drag.
      const armAngT = G.restDeg * (1 - armReach(knob.x));
      // Needle: only on a committed, settled record. Lifts the moment the
      // state flips or a hand takes the record.
      const settled = wantOn && !drag && knob.x > 0.95 && Math.abs(armAng.x) < 6;
      const armLiftT = settled ? 0 : 1;
      if (!needleDown && settled && armLift.x < 0.15) {
        needleDown = true;
        onNeedleDown();
      } else if (needleDown && armLift.x > 0.5) {
        needleDown = false;
        onNeedleUp();
      }

      // ── Springs (sub-stepped) ────────────────────────────
      let rem = frameDt;
      while (rem > 0) {
        const dt = Math.min(rem, 1 / 240);
        rem -= dt;
        // In: heavy-ish with a hair of overshoot. Out: starts at once but
        // glides home (no rush), so the wind-down has room to play out.
        // Under the finger: stiff, so it tracks.
        const homing = !drag && knobT === 0;
        if (drag) stepSpring(knob, knobT, 1400, 75, dt);
        else if (homing) stepSpring(knob, knobT, 95, 19, dt);
        else stepSpring(knob, knobT, 260, 27, dt);
        if (homing) stepSpring(morph, knobT, 95, 19, dt);
        else stepSpring(morph, knobT, 200, 26, dt);
        stepSpring(armAng, armAngT, 900, 60, dt);
        stepSpring(armLift, armLiftT, 950, 60, dt); // quick, decisive cue-lever drop
        stepSpring(press, pressRef.current ? 1 : 0, 700, 42, dt);
        stepSpring(nowPlaying, needleDown && !!audio.current?.src ? 1 : 0, 110, 21, dt);
        stepSpring(hint, needleDown && now < hintUntil ? 1 : 0, 90, 19, dt);
        // Reduced motion: no spring travel — state changes land instantly.
        // The platter still turns (it *is* the content, like a playing video).
        if (reducedMotion.current) {
          for (const [sp, target] of [
            [knob, knobT],
            [morph, knobT],
            [armAng, armAngT],
            [armLift, armLiftT],
          ] as [Spring, number][]) {
            sp.x = target;
            sp.v = 0;
          }
        }
      }
      // Arm opacity is keyed straight to the handle's position (no spring
      // lag), inside the last ~12% of travel: the arm is only ever seen over a
      // record that's home. Same curve in and out.
      const armW = clamp01((knob.x - 0.86) / 0.12);
      armOpacity = armW * armW * (3 - 2 * armW);

      // ── Audio follows the platter ────────────────────────
      const a = audio.current;
      if (a) {
        const t = a.ctx.currentTime;
        const rate = Math.max(0.001, speed);
        const inGroove = needleDown && now - needleAt >= LEAD_IN_MS;
        if (motorOn && inGroove && !a.src) startMusic();
        else if (!motorOn && speed <= 0.004 && a.src) stopMusic();
        if (a.src) {
          playhead.current += speed * frameDt;
          a.src.playbackRate.setTargetAtTime(rate, t, 0.012);
          a.musicGain.gain.setTargetAtTime(Math.pow(speed, 0.8), t, 0.02);
        }
        if (needleDown) {
          a.crackleSrc?.playbackRate.setTargetAtTime(rate, t, 0.012);
          a.crackleGain.gain.setTargetAtTime(P.crackle * 0.35 * Math.min(1, speed * 1.5), t, 0.03);
        }
      }

      // ── Render ───────────────────────────────────────────
      spin = (spin + speed * (P.rpm / 60) * 360 * frameDt) % 360;
      const m = clamp01(morph.x);
      const kx = knob.x * g.travel;

      if (trackEl.current) {
        trackEl.current.style.background = mixOklab(th.trackOff, th.plinth, knob.x);
        // Tactile: the off track is a recess in the surface; it lifts out
        // into the plinth (which has its own lacquered edge) as it turns on.
        if (P.offStyle === "tactile") {
          const r = 1 - clamp01((knob.x - 0.1) / 0.6);
          const k = g.H / 96;
          trackEl.current.style.boxShadow =
            P.appearance === "dark"
              ? `inset 0 ${1 * k}px ${2.5 * k}px rgba(0,0,0,${0.55 * r}), inset 0 ${-1 * k}px 0 rgba(255,255,255,${0.06 * r})`
              : `inset 0 ${1 * k}px ${2.5 * k}px rgba(0,0,0,${0.16 * r}), inset 0 ${-1 * k}px 0 rgba(255,255,255,${0.75 * r})`;
        } else {
          trackEl.current.style.boxShadow = "none";
        }
      }
      // Grain and lacquer arrive with the colour, not before it
      const wood = clamp01((knob.x - 0.2) / 0.8);
      if (grainEl.current) grainEl.current.style.opacity = String(wood * wood * P.grain);
      if (lacquerEl.current) lacquerEl.current.style.opacity = String(wood * wood);
      if (knobEl.current) {
        // Press: the knob gives a little under the finger
        knobEl.current.style.transform = `translate3d(${kx}px,0,0) scale(${1 - 0.035 * press.x})`;
      }
      // The knob is already spinning; the record fades in across the whole
      // face. On the way out it stays a record for as long as it's still
      // turning, then dissolves into the handle as it comes to rest.
      const fade = Math.max(m * m * (3 - 2 * m), Math.pow(speed, 1.2));
      if (knobEl.current) {
        // Rest shadow for the chosen off style hands over to the record's
        // shadow as the record fades in: contact fades out, ambient morphs.
        const [cs, as] = KNOB_REST[P.offStyle][P.appearance];
        const k = g.H / 96;
        const mixv = (a: number, b: number) => a + (b - a) * fade;
        knobEl.current.style.boxShadow =
          `0 ${cs[0] * k}px ${cs[1] * k}px rgba(0,0,0,${(cs[2] * (1 - fade)).toFixed(3)}), ` +
          `0 ${mixv(as[0], RECORD_SHADOW[0]) * k}px ${mixv(as[1], RECORD_SHADOW[1]) * k}px rgba(0,0,0,${mixv(as[2], RECORD_SHADOW[2]).toFixed(3)})`;
      }
      if (faceEl.current) faceEl.current.style.opacity = fade > 0.995 ? "0" : "1";
      if (recordEl.current) recordEl.current.style.opacity = String(fade);
      if (sheenEl.current) sheenEl.current.style.opacity = String(fade);
      // Tactile only: the knob's top light doesn't turn with it, and gives way
      // to the vinyl's own sheen
      if (faceLightEl.current) faceLightEl.current.style.opacity = P.offStyle === "tactile" ? String(1 - fade) : "0";
      if (spinEl.current) spinEl.current.style.transform = `rotate(${spin}deg)`;
      if (nowPlayingEl.current) {
        // Credits arrive with the needle, leave with it
        const np = clamp01(nowPlaying.x);
        nowPlayingEl.current.style.opacity = String(np);
        nowPlayingEl.current.style.transform = `translate(-50%, ${(1 - np) * 4}px)`;
      }
      if (hintEl.current) {
        const hv = clamp01(hint.x);
        hintEl.current.style.opacity = String(hv);
        hintEl.current.style.transform = `translate(-50%, ${(1 - hv) * 4}px)`;
      }
      if (armEl.current) {
        const vis = armOpacity;
        const px = g.W * G.pivotX;
        const py = g.H / 2;
        const armMid = (g.needleX - px - g.H * ARM.weightEnd) / 2; // counterweight → headshell
        armEl.current.setAttribute(
          "transform",
          // Subtle grow/shrink about the arm's own middle as it fades in/out
          `translate(${px} ${py}) rotate(${armAng.x}) translate(${armMid} 0) scale(${P.armScaleMin + (1 - P.armScaleMin) * vis}) translate(${-armMid} 0) translate(${-px} ${-py})`,
        );
        armEl.current.style.opacity = String(vis);
        // A pressed record is never perfectly flat: the arm rides a faint
        // once-per-revolution warp while the needle is down.
        const warp = needleDown ? Math.sin((spin * Math.PI) / 180) * 0.09 * speed : 0;
        const lift = clamp01(armLift.x) + warp;
        armShadowEl.current?.setAttribute(
          "transform",
          `translate(${g.H * (0.012 + 0.03 * lift)} ${g.H * (0.02 + 0.05 * lift)})`,
        );
        if (armShadowEl.current) armShadowEl.current.style.opacity = String(0.4 - 0.18 * lift);
        armBodyEl.current?.setAttribute(
          "transform",
          `translate(${px} ${py}) scale(${1 + 0.035 * lift}) translate(${-px} ${-py})`,
        );
      }

      // ── Ambient glow ─────────────────────────────────────
      const cv = canvasEl.current;
      if (cv && a) {
        const dpr = window.devicePixelRatio || 1;
        const cw = g.W + 2 * g.glowMargin;
        const ch = g.H + 2 * g.glowMargin;
        const key = `${cw}x${ch}@${dpr}`;
        if (key !== perimeterKey) {
          perimeterKey = key;
          cv.width = Math.round(cw * dpr);
          cv.height = Math.round(ch * dpr);
          perimeter = capsulePerimeter(g.W, g.H, g.H * 0.015, smooth.length);
        }
        if (!ctx2d) ctx2d = cv.getContext("2d");
        const c2 = ctx2d;
        // Idle (nothing drawn last frame, nothing to draw now): leave the
        // canvas untouched so its CSS blur isn't recomputed every frame.
        const glowLive = P.glow !== "off" && ((!!a.src && motorOn) || glowRamp > 0);
        if (c2 && (glowLive || glowDrewLast)) {
          glowDrewLast = glowLive;
          c2.setTransform(dpr, 0, 0, dpr, 0, 0);
          c2.clearRect(0, 0, cw, ch);
          // Light follows the music (which follows the platter): it warms up
          // over glowFadeIn when the music starts and cools quicker on stop.
          const playing = !!a.src && motorOn;
          glowRamp = clamp01(glowRamp + (playing ? frameDt / Math.max(0.01, P.glowFadeIn) : -frameDt / 0.5));
          if (P.glow !== "off" && (playing || glowRamp > 0)) {
            a.analyser.getByteFrequencyData(freq);
            const binHz = a.ctx.sampleRate / a.analyser.fftSize;

            // Bass envelope: the original breath, one cohesive glow
            let bassSum = 0;
            let bassN = 0;
            for (let hz = 40; hz < 320; hz += binHz) {
              bassSum += freq[Math.round(hz / binHz)] / 255;
              bassN++;
            }
            const bass = Math.pow(bassSum / Math.max(1, bassN), 2.2);
            if (P.glow === "breath") {
              for (let bi = 0; bi < BREATH_BANDS.length; bi++) {
                const [lo, hi] = BREATH_BANDS[bi];
                let sum = 0;
                let n = 0;
                for (let hz = lo; hz < hi; hz += binHz) {
                  sum += freq[Math.min(freq.length - 1, Math.round(hz / binHz))] / 255;
                  n++;
                }
                // Treble boost: a gentler curve (quiet highs still register)
                // and more gain, scaling up the band ladder
                const lift = (bi / (BREATH_BANDS.length - 1)) * P.trebleBoost;
                bands[bi] = Math.pow(sum / Math.max(1, n), 2.2 - 0.6 * lift) * BREATH_TILT[bi] * (1 + 0.5 * lift);
              }
            }

            const ox = g.glowMargin;
            const oy = g.glowMargin;
            // Warm light barely registers on a light page, so there it's
            // multiplied in (reads as a warm cast) and given more weight.
            const warm = glowRamp * glowRamp * (3 - 2 * glowRamp);
            const amt = (P.appearance === "dark" ? P.glowDark : P.glowLight) * warm;

            if (P.glow === "breath" && P.breathStyle === "layers") {
              // Four independent full-border rings, overlaid
              c2.globalCompositeOperation = P.appearance === "dark" ? "lighter" : "source-over";
              for (let bi = 0; bi < BREATH_LAYERS.length; bi++) {
                const prev = layerSmooth[bi];
                const v = bands[bi];
                layerSmooth[bi] = v > prev ? prev + (v - prev) * 0.5 : prev + (v - prev) * 0.08;
                const alpha = clamp01(layerSmooth[bi] * amt);
                if (alpha < 0.01) continue;
                const [hue, lDark, lLight, width, offset] = BREATH_LAYERS[bi];
                const o = g.H * offset;
                c2.lineWidth = g.H * width;
                c2.strokeStyle = `hsla(${hue}, 95%, ${P.appearance === "dark" ? lDark : lLight + P.glowToneLight - 36}%, ${alpha})`;
                c2.beginPath();
                c2.roundRect(ox - o, oy - o, g.W + 2 * o, g.H + 2 * o, g.H / 2 + o);
                c2.stroke();
              }
              c2.globalCompositeOperation = "source-over";
              smooth.fill(0);
            } else {
              layerSmooth.fill(0);
              for (let i = 0; i < perimeter.length; i++) {
                const u = perimeter[i].u;
                let v: number;
                if (P.glow === "spectrum") {
                  const hz = 55 * Math.pow(7000 / 55, u);
                  const bin = Math.min(freq.length - 1, Math.round(hz / binHz));
                  // Tilt: treble is quieter, give it a gentle lift
                  const lift = u * P.trebleBoost;
                  v = Math.pow(freq[bin] / 255, 2.4 - 0.6 * lift) * (0.85 + 0.6 * u) * (1 + 0.4 * lift);
                } else {
                  // Detail blends in the broad bands, cosine-interpolated between
                  // their centres so the glow shifts shape without breaking up.
                  const f = u * (BREATH_BANDS.length - 1);
                  const i0 = Math.min(BREATH_BANDS.length - 2, Math.floor(f));
                  const t = f - i0;
                  const w = 0.5 - 0.5 * Math.cos(Math.PI * t);
                  const broad = bands[i0] + (bands[i0 + 1] - bands[i0]) * w;
                  const d = P.breathDetail;
                  // Treble boost also flattens the bottom-heavy falloff
                  const fall = 1 - 0.6 * Math.min(1, P.trebleBoost);
                  v = (1 - d) * bass * (1.05 - 0.55 * u * fall) + d * broad * (1.05 - 0.35 * u * fall);
                }
                // Fast attack, slow release — reads as light, not as a meter.
                // Reduced motion: a slow, near-steady glow instead of pulsing.
                const prev = smooth[i];
                const [atk, rel] = reducedMotion.current ? [0.02, 0.02] : [0.5, 0.08];
                smooth[i] = v > prev ? prev + (v - prev) * atk : prev + (v - prev) * rel;
              }
              c2.lineCap = "round";
              c2.lineWidth = g.H * 0.09;
              for (let i = 0; i < perimeter.length; i++) {
                const p0 = perimeter[i];
                const p1 = perimeter[(i + 1) % perimeter.length];
                const v = (smooth[i] + smooth[(i + 1) % perimeter.length]) / 2;
                const alpha = clamp01(v * amt);
                if (alpha < 0.01) continue;
                const hue = 22 + 20 * p0.u; // warm amber bass → golden treble
                c2.strokeStyle = `hsla(${hue}, ${P.appearance === "dark" ? 100 : 85}%, ${P.appearance === "dark" ? 58 : P.glowToneLight}%, ${alpha})`;
                c2.beginPath();
                c2.moveTo(ox + p0.x, oy + p0.y);
                c2.lineTo(ox + p1.x, oy + p1.y);
                c2.stroke();
              }
            }
          } else {
            smooth.fill(0);
            layerSmooth.fill(0);
          }
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = () => {
    audio.current?.ctx.resume();
    if (params.haptics) iosHaptic();
    setOn((v) => !v);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || dragRef.current) return; // primary button, one pointer
    // Unlock audio here (mouse) and again on release (touch only counts the
    // lift as a gesture) — a drag swallows the click that would otherwise.
    audio.current?.ctx.resume();
    pressRef.current = true;
    suppressClick.current = false;
    // Capture up front so a release outside the switch still ends the drag
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: e.pointerId, startX: e.clientX, fromOn: on, moved: false, pos: on ? 1 : 0, pull: 0 };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    if (e.pointerType === "mouse" && e.buttons === 0) {
      // Button released somewhere we didn't hear about: drop the drag
      dragRef.current = null;
      pressRef.current = false;
      return;
    }
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      if (Math.abs(dx) < 4) return;
      d.moved = true;
    }
    if (d.fromOn) {
      // Same as dragging on: the record follows the finger all the way
      d.pos = clamp01(1 + dx / travel);
      d.pull = 1 - d.pos;
    } else {
      d.pos = clamp01(dx / travel);
    }
  };
  const endDrag = (e: React.PointerEvent<HTMLButtonElement>, commit: boolean) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    pressRef.current = false;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d.moved) {
      // A tap toggles via the click handler — unless the press was carried off
      // the switch, which (like any button) cancels. Capture would otherwise
      // still deliver that click to us.
      const r = e.currentTarget.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) suppressClick.current = true;
      return;
    }
    audio.current?.ctx.resume();
    suppressClick.current = true; // the click that follows a drag isn't a tap
    if (!commit) return;
    if (d.fromOn ? d.pos < 0.5 : d.pos > 0.5) {
      if (d.fromOn) skipOffDelay.current = true;
      if (params.haptics) iosHaptic();
      setOn(!d.fromOn);
    }
  };

  // ── Record artwork (static; the loop only rotates it) ───────
  // Vinyl detail: one multiplier on every texture highlight (grooves, gaps,
  // edge, run-out, sheen). 1 = the high-contrast pass.
  const vd = params.appearance === "dark" ? params.vinylDark : params.vinylLight;
  const wa = (a: number) => `rgba(255,255,255,${(a * vd).toFixed(3)})`;
  const runOut = mixOklab(C.vinyl, "#ffffff", 0.045 * vd); // opaque: no grooves show through
  const grooves = `repeating-radial-gradient(circle at 50% 50%, ${wa(0.07)} 0 0.6px, transparent 0.6px ${Math.max(2, K * 0.022)}px)`;
  const labelR = K * G.labelR;
  const creditSize = Math.min(16, Math.max(12, 9 + H * 0.045));
  // Label type is set in a 100-unit box; long names shrink to fit their line
  const track = TRACKS[trackId];
  const artistSize = Math.min(7.6, 90 / (track.artist.length * 0.86));
  const titleSize = Math.min(9.5, 56 / (track.fullTitle.length * 0.5));
  const deadR = K * 0.215; // run-out ("dead wax") between label and grooves
  const gapW = Math.max(1, K * 0.006);
  const gaps = [0.3, 0.39].map((f) => K * f);
  const vinylArt = [
    // Lathe-cut edge catching the light
    `radial-gradient(circle at 50% 50%, transparent ${K / 2 - 2.2}px, ${wa(0.22)} ${K / 2 - 1.2}px, transparent ${K / 2 - 0.2}px)`,
    // Gaps between tracks: smooth, so they catch a little more light
    `radial-gradient(circle at 50% 50%, ${gaps
      .map((r) => `transparent ${r}px, ${wa(0.09)} ${r}px, ${wa(0.09)} ${r + gapW * 1.6}px, transparent ${r + gapW * 1.6}px`)
      .join(", ")})`,
    // Smooth run-out with a single lighter locked groove at its edge
    `radial-gradient(circle at 50% 50%, transparent ${labelR}px, ${runOut} ${labelR}px, ${runOut} ${deadR - 1}px, ${wa(0.18)} ${deadR - 0.5}px, transparent ${deadR}px)`,
    grooves,
    C.vinyl,
  ].join(", ");
  const woodGrain = useMemo(() => woodGrainURI(W, H), [W, H]);

  return (
    <DevPanel
      label="Record Toggle"
      background={theme.bg}
      defaultOpen={false}
      controls={
        <>
          <DevSectionLabel>Track</DevSectionLabel>
          <DevButtonGroup
            value={trackId}
            onChange={setTrackId}
            options={(Object.keys(TRACKS) as TrackId[]).map((id) => ({
              label: TRACKS[id].label,
              value: id,
            }))}
          />
          <DevDivider />
          <DevSectionLabel>Motor</DevSectionLabel>
          <DevSlider
            label="Wind-up"
            value={params.spinUp}
            // 0.55 s: the platter is at speed when the needle lands (music in
            // at ~99%, just a settle) · 1.0 s: music in at ~84%, an audible lift
            min={0.55}
            max={1}
            step={0.05}
            format={(v) => (v <= 0.55 ? "real" : `${v.toFixed(2)}s`)}
            onChange={(v) => set("spinUp", v)}
          />
          <DevSlider label="Wind down (s)" value={params.spinDown} min={0.15} max={3} step={0.05} onChange={(v) => set("spinDown", v)} />
          <DevSlider label="Off delay (s)" value={params.offDelay} min={0} max={0.6} step={0.02} onChange={(v) => set("offDelay", v)} />
          <DevButtonGroup
            label="Speed"
            value={params.rpm}
            onChange={(v) => set("rpm", v)}
            options={[
              { label: "33⅓", value: 100 / 3 },
              { label: "45", value: 45 },
            ]}
          />
          <DevSlider label="Crackle" value={params.crackle} min={0} max={1} step={0.05} onChange={(v) => set("crackle", v)} />
          <DevSlider
            label="Arm fade size"
            value={params.armScaleMin}
            min={0.8}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => set("armScaleMin", v)}
          />
          <DevDivider />
          <DevSectionLabel>Ambient light</DevSectionLabel>
          <DevButtonGroup
            value={params.glow}
            onChange={(v) => set("glow", v)}
            options={[
              { label: "Spectrum", value: "spectrum" },
              { label: "Breath", value: "breath" },
              { label: "Off", value: "off" },
            ]}
          />
          {params.glow === "breath" && (
            <DevButtonGroup
              label="Breath"
              value={params.breathStyle}
              onChange={(v) => set("breathStyle", v)}
              options={[
                { label: "Blend", value: "blend" },
                { label: "Layers", value: "layers" },
              ]}
            />
          )}
          {params.glow === "breath" && params.breathStyle === "blend" && (
            <DevSlider label="Breath detail" value={params.breathDetail} min={0} max={1} step={0.05} onChange={(v) => set("breathDetail", v)} />
          )}
          <DevSlider label="Treble sensitivity" value={params.trebleBoost} min={0} max={2} step={0.05} onChange={(v) => set("trebleBoost", v)} />
          <DevSlider label="Fade in (s)" value={params.glowFadeIn} min={0} max={4} step={0.1} onChange={(v) => set("glowFadeIn", v)} />
          <DevSlider label="Intensity · dark" value={params.glowDark} min={0} max={1.6} step={0.05} onChange={(v) => set("glowDark", v)} />
          <DevSlider label="Intensity · light" value={params.glowLight} min={0} max={6} step={0.1} onChange={(v) => set("glowLight", v)} />
          <DevSlider
            label="Glow tone · light"
            value={params.glowToneLight}
            min={15}
            max={60}
            step={1}
            format={(v) => `${v}%`}
            onChange={(v) => set("glowToneLight", v)}
          />
          <DevDivider />
          <DevSectionLabel>Surface</DevSectionLabel>
          <DevButtonGroup
            label="Off style"
            value={params.offStyle}
            onChange={(v) => set("offStyle", v)}
            options={[
              { label: "Clean", value: "clean" },
              { label: "Tactile", value: "tactile" },
            ]}
          />
          <DevButtonGroup
            label="Appearance"
            value={params.appearance}
            onChange={(v) => set("appearance", v)}
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ]}
          />
          <DevSlider label="Vinyl detail · dark" value={params.vinylDark} min={0} max={1.5} step={0.05} onChange={(v) => set("vinylDark", v)} />
          <DevSlider label="Vinyl detail · light" value={params.vinylLight} min={0} max={1.5} step={0.05} onChange={(v) => set("vinylLight", v)} />
          <DevSlider label="Wood grain" value={params.grain} min={0} max={1} step={0.05} onChange={(v) => set("grain", v)} />
          <DevSlider label="Size" value={size} min={0.6} max={3} step={0.05} onChange={setSize} />
          <DevSectionLabel>iOS</DevSectionLabel>
          <DevButtonGroup
            label="Haptics"
            value={params.haptics ? "on" : "off"}
            onChange={(v) => set("haptics", v === "on")}
            options={[
              { label: "On", value: "on" },
              { label: "Off", value: "off" },
            ]}
          />
          <DevButtonGroup
            label="Sound hint"
            value={params.soundHint}
            onChange={(v) => set("soundHint", v)}
            options={[
              { label: "Auto", value: "auto" },
              { label: "Always", value: "always" },
              { label: "Off", value: "off" },
            ]}
          />
        </>
      }
    >
      <div>
        <div style={{ position: "relative", width: W, height: H }}>
          {/* Ambient light spills from under the plinth */}
          <canvas
            ref={canvasEl}
            aria-hidden
            style={{
              position: "absolute",
              left: -glowMargin,
              top: -glowMargin,
              width: W + 2 * glowMargin,
              height: H + 2 * glowMargin,
              filter: `blur(${H * 0.1}px)`,
              pointerEvents: "none",
              mixBlendMode: params.appearance === "dark" ? "normal" : "multiply",
            }}
          />

          <button
            ref={trackEl}
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Smooth jazz"
            onClick={(e) => {
              // detail 0 = keyboard (Space/Enter): never treat as a drag tail
              if (suppressClick.current && e.detail !== 0) {
                suppressClick.current = false;
                return;
              }
              toggle();
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, true)}
            onPointerCancel={(e) => endDrag(e, false)}
            aria-describedby={on ? `${labelId}-now-playing` : undefined}
            className="record-toggle"
            style={{
              position: "absolute",
              inset: 0,
              width: W,
              height: H,
              borderRadius: H / 2,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: theme.trackOff,
              WebkitTapHighlightColor: "transparent",
              touchAction: "none",
            }}
          >
            {/* Walnut: grain + a lacquered edge, only in the on state */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: H / 2,
                pointerEvents: "none",
                overflow: "hidden",
              }}
            >
              {/* No opacity on this wrapper: it would isolate the soft-light
                  layer from the plinth and flash it grey while fading in. */}
              <div
                ref={grainEl}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: woodGrain.url,
                  backgroundSize: `${W + 2 * woodGrain.m}px ${H + 2 * woodGrain.m}px`,
                  backgroundPosition: `${-woodGrain.m}px ${-woodGrain.m}px`,
                  mixBlendMode: "soft-light",
                  opacity: 0,
                }}
              />
              {/* Lacquer: a soft top-lit gloss + lit top edge */}
              <div
                ref={lacquerEl}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: H / 2,
                  opacity: 0,
                  boxShadow: `inset 0 ${Math.max(1, H * 0.006)}px 0 rgba(255,225,190,0.10), inset 0 -${Math.max(1, H * 0.01)}px ${H * 0.03}px rgba(0,0,0,0.28)`,
                  background:
                    "linear-gradient(180deg, rgba(255,230,200,0.07) 0%, rgba(255,230,200,0) 45%, rgba(0,0,0,0.10) 100%)",
                }}
              />
            </div>

            {/* Knob → record */}
            <div
              ref={knobEl}
              style={{
                position: "absolute",
                left: pad,
                top: pad,
                width: K,
                height: K,
                borderRadius: "50%",
                willChange: "transform",
              }}
            >
              {/* Rotating: the knob itself spins, and the record fades in on it */}
              <div
                ref={spinEl}
                style={{ position: "absolute", inset: 0, borderRadius: "50%", willChange: "transform" }}
              >
                <div
                  ref={faceEl}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background:
                      params.offStyle === "tactile"
                        ? // spindle dimple · lathe rings (the record, foreshadowed) · base
                          `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.10) 0 ${K * 0.016}px, rgba(0,0,0,0.03) ${K * 0.03}px, transparent ${K * 0.045}px), ` +
                          `repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.022) 0 0.6px, transparent 0.6px ${Math.max(2, K * 0.03)}px), ` +
                          "#f4f3f1"
                        : C.knob,
                  }}
                />
                <div
                  ref={recordEl}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    opacity: 0,
                    background: vinylArt,
                  }}
                >
                  {/* Label */}
                  <div
                    style={{
                      position: "absolute",
                      left: K / 2 - labelR,
                      top: K / 2 - labelR,
                      width: labelR * 2,
                      height: labelR * 2,
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 50% 50%, ${C.label} 0 68%, #8e3631 100%)`,
                    }}
                  >
                    {/* Printed label: rule, curved caps, title — sized in a 100-unit box */}
                    <svg
                      viewBox="0 0 100 100"
                      width="100%"
                      height="100%"
                      aria-hidden
                      style={{ position: "absolute", inset: 0 }}
                    >
                      <defs>
                        <path id={`${labelId}-arc-top`} d="M 17 50 A 33 33 0 0 1 83 50" />
                        <path id={`${labelId}-arc-bottom`} d="M 13 50 A 37 37 0 0 0 87 50" />
                      </defs>
                      <circle cx="50" cy="50" r="44.5" fill="none" stroke={INK} strokeOpacity={0.36} strokeWidth={1.2} />
                      {/* Artist, curved across the top */}
                      <text
                        fill={INK}
                        fillOpacity={0.92}
                        fontFamily={FONT}
                        fontWeight={600}
                        fontSize={artistSize}
                        letterSpacing={artistSize * 0.18}
                      >
                        <textPath href={`#${labelId}-arc-top`} startOffset="50%" textAnchor="middle">
                          {track.artist.toUpperCase()}
                        </textPath>
                      </text>
                      {/* Title under the spindle */}
                      <text
                        x="50"
                        y={68}
                        textAnchor="middle"
                        fill={INK}
                        fontFamily="'Iowan Old Style', 'Palatino', Georgia, serif"
                        fontStyle="italic"
                        fontSize={titleSize}
                      >
                        {track.fullTitle}
                      </text>
                      <text fill={INK} fillOpacity={0.72} fontFamily={FONT} fontSize={5} letterSpacing={0.8}>
                        <textPath href={`#${labelId}-arc-bottom`} startOffset="50%" textAnchor="middle">
                          {`SIDE A · ${params.rpm === 45 ? "45" : "33⅓"} RPM`}
                        </textPath>
                      </text>
                    </svg>
                    {/* Spindle */}
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: Math.max(2, K * 0.03),
                        height: Math.max(2, K * 0.03),
                        marginLeft: -Math.max(2, K * 0.03) / 2,
                        marginTop: -Math.max(2, K * 0.03) / 2,
                        borderRadius: "50%",
                        background: "radial-gradient(circle at 35% 35%, #ffffff, #c9c3bd 55%, #857f79)",
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Tactile knob: dome lit from above + bevelled rim. Fixed, so it
                  doesn't turn with the knob; fades as the record takes over. */}
              <div
                ref={faceLightEl}
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  opacity: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(circle at 50% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 38%, rgba(255,255,255,0) 60%), " +
                    "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.07) 100%)",
                  boxShadow: `inset 0 ${Math.max(1, H * 0.01)}px 0 rgba(255,255,255,0.9), inset 0 -${Math.max(1, H * 0.01)}px ${H * 0.02}px rgba(0,0,0,0.08)`,
                }}
              />
              {/* Fixed sheen — reflections on vinyl don't rotate with it */}
              <div
                ref={sheenEl}
                style={{
                  opacity: 0,
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background:
                    `conic-gradient(from 0deg, transparent 0deg, ${wa(0.14)} 28deg, transparent 56deg, transparent 180deg, ${wa(0.1)} 208deg, transparent 236deg, transparent 360deg)`,
                  WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent ${labelR + 1}px, #000 ${labelR + K * 0.06}px, #000 ${K / 2 - 1}px, transparent ${K / 2}px)`,
                  maskImage: `radial-gradient(circle at 50% 50%, transparent ${labelR + 1}px, #000 ${labelR + K * 0.06}px, #000 ${K / 2 - 1}px, transparent ${K / 2}px)`,
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Tonearm */}
            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              aria-hidden
              style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
            >
              <defs>
                <filter id={`${labelId}-armshadow`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation={H * 0.012} />
                </filter>
                {/* Cylinder shading: dark edges, a bright specular line above centre */}
                <linearGradient id={`${labelId}-tube`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#8f8f8f" />
                  <stop offset="0.32" stopColor="#f8f8f8" />
                  <stop offset="0.58" stopColor="#d4d4d4" />
                  <stop offset="1" stopColor="#7c7c7c" />
                </linearGradient>
                <linearGradient id={`${labelId}-weight`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#6c6c6c" />
                  <stop offset="0.3" stopColor="#dedede" />
                  <stop offset="0.6" stopColor="#a8a8a8" />
                  <stop offset="1" stopColor="#5a5a5a" />
                </linearGradient>
                <radialGradient id={`${labelId}-metal`} cx="0.36" cy="0.32" r="0.75">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="0.55" stopColor={C.arm} />
                  <stop offset="1" stopColor={C.armDark} />
                </radialGradient>
              </defs>
              <g ref={armEl} style={{ opacity: 0 }}>
                <g ref={armShadowEl} filter={`url(#${labelId}-armshadow)`} style={{ opacity: 0.4 }}>
                  <ArmShape pivot={pivot} len={armLen} H={H} />
                </g>
                <g ref={armBodyEl}>
                  <ArmShape pivot={pivot} len={armLen} H={H} ids={labelId} />
                </g>
              </g>
            </svg>
          </button>

          {/* Now playing — sits under the plinth, out of the layout flow */}
          <div
            ref={nowPlayingEl}
            id={`${labelId}-now-playing`}
            aria-hidden={!on}
            style={{
              position: "absolute",
              left: "50%",
              top: H + Math.max(20, H * 0.3),
              transform: "translate(-50%, 4px)",
              opacity: 0,
              width: "max-content",
              maxWidth: Math.max(160, vw - 32),
              textAlign: "center",
              textWrap: "balance",
              fontFamily: FONT,
              fontSize: creditSize,
              letterSpacing: "-0.005em",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {/* Always rendered so it can fade out; hidden from AT while off */}
            <span style={{ color: theme.title }}>{track.fullTitle}</span>
            <span style={{ color: theme.artist }}> · {track.artist}</span>
          </div>

          {/* iOS sound check: rides in under the credit at the first needle
              drop. If you can hear the crackle, you're set; if not, this is why. */}
          <div
            ref={hintEl}
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: H + Math.max(20, H * 0.3) + creditSize * 1.9,
              transform: "translate(-50%, 4px)",
              opacity: 0,
              display: "flex",
              alignItems: "center",
              gap: creditSize * 0.4,
              whiteSpace: "nowrap",
              fontFamily: FONT,
              fontSize: creditSize * 0.86,
              color: theme.artist,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <svg width={creditSize} height={creditSize} viewBox="0 0 16 16" aria-hidden>
              <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
              <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.5 6.5 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Ringer on for the full effect
          </div>
        </div>
      </div>
      <style>{`
        .record-toggle:focus { outline: none; }
        .record-toggle:focus-visible { outline: 2px solid ${params.appearance === "dark" ? "#8ab4ff" : "#2f6fed"}; outline-offset: 4px; }
      `}</style>
    </DevPanel>
  );
}

function ArmShape({
  pivot,
  len,
  H,
  ids,
}: {
  pivot: { x: number; y: number };
  len: number;
  H: number;
  /** Gradient id prefix; omit to render the flat silhouette used for the shadow */
  ids?: string;
}) {
  const paint = (name: string, fallback: string) => (ids ? `url(#${ids}-${name})` : fallback);
  const flat = ids ? undefined : "#000";
  const { x, y } = pivot;
  const tipX = x + len;
  const t = H * ARM.tube;
  // Headshell: tapers out from the tube to a wider, squared-off nose
  const hs = { join: tipX - H * 0.075, nose: tipX + H * 0.03, narrow: H * 0.032, wide: H * 0.048 };
  const shell = `M ${hs.join} ${y - hs.narrow / 2} L ${hs.nose} ${y - hs.wide / 2} L ${hs.nose} ${y + hs.wide / 2} L ${hs.join} ${y + hs.narrow / 2} Z`;
  return (
    <>
      {/* Counterweight */}
      <rect
        x={x - H * ARM.weightEnd}
        y={y - (H * ARM.weightH) / 2}
        width={H * ARM.weightLen}
        height={H * ARM.weightH}
        rx={H * 0.018}
        fill={flat ?? paint("weight", "")}
      />
      {/* Tube */}
      <rect
        x={x - H * (ARM.weightEnd - ARM.weightLen)}
        y={y - t / 2}
        width={hs.join - (x - H * (ARM.weightEnd - ARM.weightLen)) + t / 2}
        height={t}
        rx={t / 2}
        fill={flat ?? paint("tube", "")}
      />
      {/* Headshell + finger lift */}
      <path d={shell} fill={flat ?? paint("tube", "")} stroke={flat ?? "#bdbdbd"} strokeWidth={H * 0.008} strokeLinejoin="round" />
      <line
        x1={tipX + H * 0.005}
        y1={y - hs.wide / 2}
        x2={tipX + H * 0.022}
        y2={y - hs.wide / 2 - H * 0.026}
        stroke={flat ?? "#cfcfcf"}
        strokeWidth={H * 0.009}
        strokeLinecap="round"
      />
      {/* Pivot: bearing housing + cap */}
      <circle cx={x} cy={y} r={H * ARM.pivotR} fill={flat ?? paint("metal", "")} />
      {!flat && (
        <>
          <circle cx={x} cy={y} r={H * ARM.capR} fill={C.armDark} opacity={0.55} />
          <circle cx={x} cy={y} r={H * (ARM.capR - 0.008)} fill={paint("metal", "")} />
          <circle cx={x} cy={y} r={H * 0.009} fill="#8a8a8a" />
        </>
      )}
    </>
  );
}
