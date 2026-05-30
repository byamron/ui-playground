import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import { resetBackTint, setBackTint } from "../../components/chromeControl";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
  useTransform,
  useVelocity,
  useSpring,
  animate as fmAnimate,
} from "framer-motion";

/**
 * Color Hold Pick — Trio/Priority-style Settings page where the "custom color"
 * swatch is a press-and-hold gesture. Holding turns the settings card into a
 * perceptually-uniform OKLCH spectrum canvas; the rainbow swatch becomes a
 * draggable handle that brushes the app surface with the live pick.
 *
 * Fully themed: light + dark each have their own preset palette, spectrum
 * range (light-mode pastels vs dark-mode dim-saturated colors), card tint,
 * and text tokens. Corners toggle swaps between fully-rounded and sharp
 * radii across every swatch and the card itself. Font selector swaps the
 * Settings title typeface.
 */

const FONT =
  "-apple-system, 'SF Pro Text', 'SF Pro Display', 'Inter', 'Helvetica Neue', sans-serif";

const SWATCH = 40;
const SWATCH_R = SWATCH / 2;
const SHARP_SWATCH = 8;
const SHARP_CARD = 10;
const ROUNDED_CARD = 32;
// iPhone 14 Pro / 15 / 16 family screen corner radius is ~55.5pt. With a
// 16px margin between card and screen edge, the concentric inner radius
// is ~40px so the card's curve traces parallel to the phone's curve.
const ROUNDED_CARD_MOBILE = 40;
const MOVE_THRESHOLD = 4; // px of motion before a press becomes a commit
const HOLD_DELAY = 200; // ms before a press commits to "picker mode"
const RING_OFFSET = 3.5;

// Brush trail thresholds — emit a fading color ghost behind the handle when
// the user is dragging fast. Speed is measured in px/s on the smoothed
// velocity signal; throttled so we never emit more than once per frame-pair.
const TRAIL_SPEED_THRESHOLD = 700;
const TRAIL_EMIT_INTERVAL_MS = 50;
const TRAIL_LIFE_MS = 320;

// ── Theme tokens ──────────────────────────────────────────────────────────

type Appearance = "light" | "dark";

interface Tokens {
  L_BASE: number;
  C_BASE: number;
  overlayRGB: string;
  overlayAlpha: number;
  /**
   * In light mode the wash sits at the TOP (white → transparent going down),
   * so the lightest, most washed colors are at the top of the canvas and the
   * fully-saturated pastels at the bottom. In dark mode we want the same
   * mental model: top = lightest of the dark range (saturated dim), bottom
   * = darkest (near-black). So the overlay flips to the bottom.
   */
  overlayAtBottom: boolean;
  cardTint: string;
  /** Opaque version of the card surface color — used as the "gap" color in
   *  selection rings so the bright white halo is replaced with something that
   *  reads as the card surface continuing through.
   */
  gapColor: string;
  text: string;
  sectionLabel: string;
  statusTint: string;
  cardEdge: string;
  swatchInset: string;
  iconStroke: string;
}

const TOKENS: Record<Appearance, Tokens> = {
  light: {
    L_BASE: 0.76,
    C_BASE: 0.13,
    overlayRGB: "255,255,255",
    overlayAlpha: 0.92,
    overlayAtBottom: false,
    cardTint: "rgba(242,242,242,0.9)",
    gapColor: "rgb(242,242,242)",
    text: "#0a0a0a",
    sectionLabel: "rgba(0,0,0,0.4)",
    statusTint: "#1a1a1a",
    cardEdge:
      "inset 0 1px 0 rgba(255,255,255,0.5), 0 -2px 12px rgba(0,0,0,0.03)",
    swatchInset: "inset 0 0 0 1px rgba(0,0,0,0.05)",
    iconStroke: "#1a1a1a",
  },
  dark: {
    L_BASE: 0.46,
    C_BASE: 0.12,
    overlayRGB: "12,12,14",
    overlayAlpha: 0.9,
    overlayAtBottom: true,
    cardTint: "rgba(34,34,36,0.86)",
    gapColor: "rgb(34,34,36)",
    text: "#f5f5f7",
    sectionLabel: "rgba(255,255,255,0.45)",
    statusTint: "#f5f5f7",
    cardEdge:
      "inset 0 1px 0 rgba(255,255,255,0.05), 0 -2px 12px rgba(0,0,0,0.2)",
    swatchInset: "inset 0 0 0 1px rgba(255,255,255,0.10)",
    iconStroke: "#f5f5f7",
  },
};

// ── Presets ───────────────────────────────────────────────────────────────

type PresetId = "blue" | "peach" | "sage";
type Selected = PresetId | "custom";

const PRESETS: Record<Appearance, { id: PresetId; color: string }[]> = {
  light: [
    { id: "blue", color: "hsl(210, 65%, 82%)" },
    { id: "peach", color: "hsl(22, 68%, 84%)" },
    { id: "sage", color: "hsl(150, 32%, 80%)" },
  ],
  dark: [
    { id: "blue", color: "hsl(210, 28%, 22%)" },
    { id: "peach", color: "hsl(22, 30%, 22%)" },
    { id: "sage", color: "hsl(150, 22%, 20%)" },
  ],
};

// ── Fonts ─────────────────────────────────────────────────────────────────

// dy: per-font optical correction so each "Aa" sits visually centered in
// its swatch. Serif/slab faces draw their baseline higher relative to the
// em-box, so they need a downward nudge to optically match the sans.
const FONTS = [
  { label: "Sans", family: `'Figtree', ${FONT}`, dy: 0 },
  {
    label: "Serif",
    family: "'Iowan Old Style', Georgia, 'Times New Roman', serif",
    dy: 1,
  },
  { label: "Slab", family: "'Bookman Old Style', 'Palatino', serif", dy: 1 },
] as const;

// ── Rainbow + Spectrum ────────────────────────────────────────────────────

const RAINBOW = `conic-gradient(from 90deg in oklch longer hue,
  oklch(0.72 0.18 0deg) 0%,
  oklch(0.72 0.18 360deg) 100%)`;

function makeSpectrum(t: Tokens): string {
  const topAlpha = t.overlayAtBottom ? 0 : t.overlayAlpha;
  const botAlpha = t.overlayAtBottom ? t.overlayAlpha : 0;
  return `
    linear-gradient(to bottom, rgba(${t.overlayRGB},${topAlpha}) 0%, rgba(${t.overlayRGB},${botAlpha}) 100%),
    linear-gradient(to right in oklch longer hue,
      oklch(${t.L_BASE} ${t.C_BASE} 0deg) 0%,
      oklch(${t.L_BASE} ${t.C_BASE} 360deg) 100%)
  `;
}

// OKLCH → sRGB (Björn Ottosson's M matrices).
function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;
  const lr = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const lg = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const lb = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;
  const toSRGB = (c: number) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  return [
    Math.round(toSRGB(lr) * 255),
    Math.round(toSRGB(lg) * 255),
    Math.round(toSRGB(lb) * 255),
  ];
}

// Sample the spectrum at normalized (hue, t) — both 0..1. Used both for
// the live pick (via colorFromPos which wraps this with pixel coords)
// and for transposing a custom color across an appearance toggle.
function sampleSpectrum(huN: number, tN: number, t: Tokens): string {
  const hueDeg = Math.max(0, Math.min(1, huN)) * 360;
  const tv = Math.max(0, Math.min(1, tN));
  const [br, bg, bb] = oklchToRgb(t.L_BASE, t.C_BASE, hueDeg);
  const [or, og, ob] = t.overlayRGB.split(",").map(Number);
  const ov = t.overlayAlpha * (t.overlayAtBottom ? tv : 1 - tv);
  const r = Math.round(or * ov + br * (1 - ov));
  const g = Math.round(og * ov + bg * (1 - ov));
  const b = Math.round(ob * ov + bb * (1 - ov));
  return `rgb(${r}, ${g}, ${b})`;
}

function colorFromPos(
  x: number,
  y: number,
  w: number,
  h: number,
  t: Tokens
): string {
  return sampleSpectrum(x / w, y / h, t);
}

// ── Status bar ────────────────────────────────────────────────────────────

function StatusBar({ tint }: { tint: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "22px 32px 0",
        fontFamily: FONT,
        fontSize: 17,
        fontWeight: 600,
        color: tint,
        flexShrink: 0,
      }}
    >
      <span style={{ fontVariantNumeric: "tabular-nums" }}>9:41</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width="17" height="11" viewBox="0 0 17 11">
          <rect x="0" y="8" width="3" height="3" rx="0.5" fill={tint} />
          <rect x="4.5" y="5.5" width="3" height="5.5" rx="0.5" fill={tint} />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill={tint} />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={tint} />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill={tint}>
          <path d="M8 8a1.4 1.4 0 110 2.8A1.4 1.4 0 018 8z" />
          <path
            d="M4.7 5.4a4.6 4.6 0 016.6 0"
            stroke={tint}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M1.9 2.5a8.5 8.5 0 0112.2 0"
            stroke={tint}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <svg width="26" height="11" viewBox="0 0 26 11">
          <rect
            x="0"
            y="0.5"
            width="22"
            height="10"
            rx="2.5"
            stroke={tint}
            strokeOpacity="0.5"
            fill="none"
          />
          <rect x="23" y="3.5" width="1.8" height="4" rx="0.5" fill={tint} opacity="0.4" />
          <rect x="1.5" y="2" width="19" height="7" rx="1.5" fill={tint} />
        </svg>
      </div>
    </div>
  );
}

// ── Generic swatch button (preset + icon swatches share this style) ──────

function Swatch({
  selected,
  selectedColor,
  background,
  swatchRadius,
  inset,
  gapColor,
  onClick,
  ariaLabel,
  children,
}: {
  selected: boolean;
  selectedColor: string;
  background: string;
  swatchRadius: number;
  inset: string;
  gapColor: string;
  onClick: () => void;
  ariaLabel: string;
  children?: React.ReactNode;
}) {
  const controls = useAnimationControls();
  const wasSelected = useRef(selected);
  const tapPulseRef = useRef(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (selected && !wasSelected.current) {
      if (tapPulseRef.current) {
        // Tap already fired the visible pulse; skip the claim pulse so we
        // don't stack two animations on the same swatch.
        tapPulseRef.current = false;
      } else if (reducedMotion) {
        controls.start({
          scale: 1,
          transition: { type: "spring", stiffness: 480, damping: 30 },
        });
      } else {
        // Backout path — the previously-selected preset wasn't tapped but
        // it's claiming itself again. Quiet beat.
        controls.start({
          scale: [1, 1.04, 1],
          transition: {
            duration: 0.32,
            times: [0, 0.4, 1],
            ease: [0.2, 0.8, 0.2, 1],
          },
        });
      }
    }
    wasSelected.current = selected;
  }, [selected, controls, reducedMotion]);

  const handleClick = () => {
    if (!reducedMotion) {
      tapPulseRef.current = true;
      // Click-driven pulse — plays to completion regardless of press
      // duration, so even an instant tap shows a clear scale-up beat.
      controls.start({
        scale: [1, 1.12, 1],
        transition: {
          duration: 0.22,
          times: [0, 0.45, 1],
          ease: [0.2, 0.8, 0.2, 1],
        },
      });
    }
    onClick();
  };

  return (
    <motion.button
      animate={controls}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      style={{
        width: SWATCH,
        height: SWATCH,
        borderRadius: swatchRadius,
        background,
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // The 2px gap renders as the opaque card-surface color (gapColor),
        // so it visually reads as the tab surface continuing through the
        // selection ring rather than a bright white halo.
        boxShadow: selected
          ? `0 0 0 2px ${gapColor}, 0 0 0 3.5px ${selectedColor}`
          : inset,
        transition: "box-shadow 0.2s ease, border-radius 0.25s ease",
      }}
    >
      {children}
    </motion.button>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────

function SunIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="3.6" stroke={stroke} strokeWidth="1.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 10 + Math.cos(rad) * 5.6;
        const y1 = 10 + Math.sin(rad) * 5.6;
        const x2 = 10 + Math.cos(rad) * 7.5;
        const y2 = 10 + Math.sin(rad) * 7.5;
        return (
          <line
            key={a}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function MoonIcon({ stroke }: { stroke: string }) {
  // The crescent's body bulges lower-left and the bite removes upper-right
  // mass, so the optical center sits lower-left of geometric center.
  // Translate up-and-right to compensate.
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        transform="translate(1.1 -0.8)"
        d="M14.2 11.8a5.2 5.2 0 01-6-6 5.4 5.4 0 106 6z"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RoundedIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="4" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

function SharpIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="4" width="12" height="12" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════

// Match iPhone screen aspect (~19.5:9, i.e. 393:852) so the "phone" frame
// looks right on desktop. On a real mobile viewport this is ignored and the
// surface fills the screen edge-to-edge.
const PHONE_W = 393;
const PHONE_H = 760;
const MOBILE_BREAKPOINT = 540;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export function ColorHoldPick() {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(!!reducedMotion);
  reducedMotionRef.current = !!reducedMotion;
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [corners, setCorners] = useState<"rounded" | "sharp">("rounded");
  const [fontIdx, setFontIdx] = useState<0 | 1 | 2>(0);
  const [appColor, setAppColor] = useState<string>(PRESETS.light[0].color);
  const [selected, setSelected] = useState<Selected>("blue");
  const [picking, setPicking] = useState(false);
  const pickingRef = useRef(picking);
  pickingRef.current = picking;
  const [measured, setMeasured] = useState(false);

  const tokens = TOKENS[appearance];
  const presets = PRESETS[appearance];
  const spectrumBG = makeSpectrum(tokens);
  const swatchRadius = corners === "rounded" ? SWATCH_R : SHARP_SWATCH;
  const cardRadius =
    corners === "rounded"
      ? isMobile
        ? ROUNDED_CARD_MOBILE
        : ROUNDED_CARD
      : SHARP_CARD;
  const titleFamily = FONTS[fontIdx].family;

  const phoneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const slotPosRef = useRef({ x: 0, y: 0 });
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  // Handle x/y are in phone-surface coordinates (so the handle renders as a
  // sibling of the card and isn't clipped by the card's overflow:hidden).
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Radial-wipe reveal — spectrum blooms out from the press point with a
  // shadow-like feathered edge.
  const revealR = useMotionValue(0);
  const revealCX = useMotionValue(0);
  const revealCY = useMotionValue(0);
  const revealMask = useMotionTemplate`radial-gradient(circle ${revealR}px at ${revealCX}px ${revealCY}px, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)`;

  // Commit bloom — soft radial light pulse on the phone surface where the
  // handle lands at release-with-drag. Reads as "the surface received the
  // color." Position is in phone-surface coordinates.
  const bloomCX = useMotionValue(0);
  const bloomCY = useMotionValue(0);
  const bloomOpacity = useMotionValue(0);
  const bloomBg = useMotionTemplate`radial-gradient(circle 220px at ${bloomCX}px ${bloomCY}px, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 38%, rgba(255,255,255,0) 72%)`;

  // Velocity-aware brush shadow.
  const pickingMV = useMotionValue(0);
  const xVel = useVelocity(x);
  const yVel = useVelocity(y);
  const speed = useTransform([xVel, yVel] as const, (v) =>
    Math.min(2200, Math.hypot(v[0] as number, v[1] as number))
  );
  const smoothSpeed = useSpring(speed, { stiffness: 160, damping: 22 });
  const shadowOffsetY = useTransform(
    [pickingMV, smoothSpeed] as const,
    (v) => (v[0] as number) * (9 + ((v[1] as number) / 2200) * 9)
  );
  const shadowBlur = useTransform(
    [pickingMV, smoothSpeed] as const,
    (v) => (v[0] as number) * (16 + ((v[1] as number) / 2200) * 18)
  );
  const shadowAlpha = useTransform(pickingMV, [0, 1], [0, 0.26]);
  const shadowFilter = useMotionTemplate`blur(${shadowBlur}px)`;
  const shadowBg = useMotionTemplate`rgba(0,0,0,${shadowAlpha})`;
  const shadowY = useTransform(
    [y, shadowOffsetY] as const,
    (v) => (v[0] as number) + (v[1] as number)
  );

  useEffect(() => {
    fmAnimate(pickingMV, picking ? 1 : 0, {
      type: "spring",
      stiffness: 360,
      damping: 28,
    });
  }, [picking, pickingMV]);

  // Rainbow selection ring — sits behind the handle, centered on it.
  const ringX = useTransform(x, (v) => v - RING_OFFSET);
  const ringY = useTransform(y, (v) => v - RING_OFFSET);

  // Tap-jiggle — quick rotational wiggle when the rainbow swatch is tapped
  // without being held long enough to enter picker mode. Visibly spins the
  // conic gradient for a beat, inviting the user to hold instead of tap.
  const jiggleRotate = useMotionValue(0);

  // Handle scale — driven imperatively so press-down squish, picker entrance,
  // and commit pulse all share the same scale channel without fighting an
  // animate-prop target.
  const handleScale = useMotionValue(1);

  // Brush trail — fading color ghosts emitted behind the handle during fast
  // drags. Throttled by TRAIL_EMIT_INTERVAL_MS and gated on smoothSpeed.
  type TrailNode = { id: number; x: number; y: number; color: string };
  const [trail, setTrail] = useState<TrailNode[]>([]);
  const lastTrailEmitRef = useRef(0);
  const trailIdRef = useRef(0);
  const trailTimersRef = useRef<Set<number>>(new Set());

  // Clean up any in-flight trail removal timers on unmount.
  useEffect(() => {
    return () => {
      trailTimersRef.current.forEach((t) => window.clearTimeout(t));
      trailTimersRef.current.clear();
    };
  }, []);

  // iOS 26+ Safari samples toolbar tint from position:fixed elements near
  // the viewport edges; WebKit's live observer re-tints as those colors
  // change. The observer is most reliable when it sees a DIRECT change to
  // body.style.backgroundColor (CSS variable cascades alone don't always
  // trigger re-sampling). Hit every signal: body inline style, the tint
  // strips' inline style via refs, the --safari-tint variable, and the
  // legacy theme-color meta (for iOS 15-25 and Android Chrome).
  const tintTopRef = useRef<HTMLDivElement | null>(null);
  const tintBottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setBackTint(tokens.text);
  }, [tokens.text]);
  useEffect(() => {
    return () => {
      resetBackTint();
    };
  }, []);

  // Capture whatever the host page had set before we mounted so we can
  // restore those exact values on unmount, instead of clobbering them.
  const priorBodyBgRef = useRef<string>("");
  const priorSafariTintRef = useRef<string>("");
  const priorThemeColorRef = useRef<string>("");
  useEffect(() => {
    priorBodyBgRef.current = document.body.style.backgroundColor;
    priorSafariTintRef.current =
      document.documentElement.style.getPropertyValue("--safari-tint");
    const meta = document.querySelector('meta[name="theme-color"]');
    priorThemeColorRef.current = meta?.getAttribute("content") ?? "";
    return () => {
      // Restore — not removeProperty, which would clobber any inherited bg
      // the host gallery shell had inline.
      document.body.style.backgroundColor = priorBodyBgRef.current;
      if (priorSafariTintRef.current) {
        document.documentElement.style.setProperty(
          "--safari-tint",
          priorSafariTintRef.current
        );
      } else {
        document.documentElement.style.removeProperty("--safari-tint");
      }
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", priorThemeColorRef.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--safari-tint", appColor);
    document.body.style.backgroundColor = appColor;
    if (tintTopRef.current) tintTopRef.current.style.backgroundColor = appColor;
    if (tintBottomRef.current)
      tintBottomRef.current.style.backgroundColor = appColor;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", appColor);
  }, [appColor]);

  // Card offset within the phone surface.
  const cardOffsetRef = useRef({ x: 0, y: 0 });

  // Tap-vs-drag bookkeeping.
  const pressOrigin = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const prevStateRef = useRef<{ color: string; selected: Selected }>({
    color: PRESETS.light[0].color,
    selected: "blue",
  });

  // Most recent custom pick position, normalized 0..1 in (hue, t). Stored
  // so we can transpose a custom color to its equivalent in the other
  // appearance when the user toggles light/dark.
  const customPickRef = useRef<{ hu: number; t: number } | null>(null);

  // Track the in-flight gesture so we can tear it down on unmount —
  // otherwise the hold timer can fire on a dead component.
  const activeGestureRef = useRef<{
    timer: number | null;
    onMove: ((e: PointerEvent) => void) | null;
    onUp: (() => void) | null;
  }>({ timer: null, onMove: null, onUp: null });

  useEffect(() => {
    return () => {
      const g = activeGestureRef.current;
      if (g.timer !== null) window.clearTimeout(g.timer);
      if (g.onMove) window.removeEventListener("pointermove", g.onMove);
      if (g.onUp) {
        window.removeEventListener("pointerup", g.onUp);
        window.removeEventListener("pointercancel", g.onUp);
      }
    };
  }, []);

  const measure = useCallback(() => {
    if (!slotRef.current || !phoneRef.current || !cardRef.current) return;
    const slot = slotRef.current.getBoundingClientRect();
    const phone = phoneRef.current.getBoundingClientRect();
    const card = cardRef.current.getBoundingClientRect();
    const sx = slot.left - phone.left + slot.width / 2;
    const sy = slot.top - phone.top + slot.height / 2;
    slotPosRef.current = { x: sx, y: sy };
    cardOffsetRef.current = { x: card.left - phone.left, y: card.top - phone.top };
    // Only snap the handle to slot when idle. During an active pick the
    // user owns the position — re-measuring would yank the handle.
    if (!pickingRef.current) {
      x.set(sx - SWATCH_R);
      y.set(sy - SWATCH_R);
    }
    setMeasured(true);
  }, [x, y]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Invitation pulse — once, ~2.5s after mount, breathe the handle
  // gently to teach the press-and-hold affordance without forcing the
  // user to fail-tap first. Cancels if the user engages first or if
  // reduced motion is on.
  useEffect(() => {
    if (reducedMotionRef.current) return;
    const timer = window.setTimeout(() => {
      if (pickingRef.current) return;
      if (handleScale.get() !== 1) return;
      fmAnimate(handleScale, [1, 1.04, 1], {
        duration: 0.9,
        times: [0, 0.45, 1],
        ease: [0.32, 0.72, 0, 1],
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [handleScale]);

  useEffect(() => {
    if (!phoneRef.current) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(phoneRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Pointer-down on the rainbow swatch. Doesn't enter picker mode immediately
  // — waits for either HOLD_DELAY ms or MOVE_THRESHOLD px of motion. A quick
  // tap that releases before either threshold instead triggers a jiggle.
  const startPick = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (!cardRef.current || !phoneRef.current) return;
      const card = cardRef.current.getBoundingClientRect();
      const phone = phoneRef.current.getBoundingClientRect();
      cardOffsetRef.current = {
        x: card.left - phone.left,
        y: card.top - phone.top,
      };

      prevStateRef.current = { color: appColor, selected };
      pressOrigin.current = { x: e.clientX, y: e.clientY };
      movedRef.current = false;

      // Press-down squish — matches the swatch idiom so the handle feels
      // like the same family of control as the presets. Softer spring so
      // the press eases in rather than snapping.
      fmAnimate(handleScale, 1.08, {
        type: "spring",
        stiffness: 380,
        damping: 26,
      });

      let entered = false;
      let holdTimer: number | null = null;

      const enterPicker = (clientX: number, clientY: number) => {
        if (entered) return;
        entered = true;
        if (holdTimer !== null) window.clearTimeout(holdTimer);
        const cx = Math.max(0, Math.min(card.width, clientX - card.left));
        const cy = Math.max(0, Math.min(card.height, clientY - card.top));
        revealCX.set(cx);
        revealCY.set(cy);
        x.set(cx + cardOffsetRef.current.x - SWATCH_R);
        y.set(cy + cardOffsetRef.current.y - SWATCH_R);
        setAppColor(
          colorFromPos(cx, cy, card.width, card.height, tokensRef.current)
        );
        customPickRef.current = {
          hu: cx / card.width,
          t: cy / card.height,
        };
        setSelected("custom");
        setPicking(true);
        // Handle pops FIRST — cause. Then the spectrum reveal expands —
        // effect. Decoupling them by ~70ms gives the choreography a
        // beat structure instead of a single simultaneous snap.
        const reduced = reducedMotionRef.current;
        if (reduced) {
          handleScale.set(1.18);
          revealR.set(Math.hypot(card.width, card.height) * 2.2);
        } else {
          const current = handleScale.get();
          fmAnimate(handleScale, [current, 1.22, 1.18], {
            duration: 0.26,
            times: [0, 0.5, 1],
            ease: [0.2, 0.8, 0.2, 1],
          });
          window.setTimeout(() => {
            fmAnimate(revealR, Math.hypot(card.width, card.height) * 2.2, {
              duration: 0.29,
              ease: [0.32, 0.72, 0, 1],
            });
          }, 70);
        }
      };

      holdTimer = window.setTimeout(() => {
        enterPicker(e.clientX, e.clientY);
      }, HOLD_DELAY);
      activeGestureRef.current.timer = holdTimer;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - pressOrigin.current.x;
        const dy = ev.clientY - pressOrigin.current.y;
        if (!entered) {
          if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
            movedRef.current = true;
            enterPicker(ev.clientX, ev.clientY);
          }
          return;
        }
        if (!movedRef.current && Math.hypot(dx, dy) > MOVE_THRESHOLD) {
          movedRef.current = true;
        }
        const cx = Math.max(0, Math.min(card.width, ev.clientX - card.left));
        const cy = Math.max(0, Math.min(card.height, ev.clientY - card.top));
        const hx = cx + cardOffsetRef.current.x - SWATCH_R;
        const hy = cy + cardOffsetRef.current.y - SWATCH_R;
        x.set(hx);
        y.set(hy);
        const sampled = colorFromPos(
          cx,
          cy,
          card.width,
          card.height,
          tokensRef.current
        );
        setAppColor(sampled);
        customPickRef.current = {
          hu: cx / card.width,
          t: cy / card.height,
        };

        // Emit a fading brush ghost on fast drags. Throttled so we don't
        // flood state during a single sweep. Skip entirely under reduced
        // motion — the trail is decorative and motion-heavy.
        const tNow = performance.now();
        if (
          !reducedMotionRef.current &&
          smoothSpeed.get() > TRAIL_SPEED_THRESHOLD &&
          tNow - lastTrailEmitRef.current > TRAIL_EMIT_INTERVAL_MS
        ) {
          lastTrailEmitRef.current = tNow;
          const id = ++trailIdRef.current;
          setTrail((arr) => [...arr, { id, x: hx, y: hy, color: sampled }]);
          const timer = window.setTimeout(() => {
            trailTimersRef.current.delete(timer);
            setTrail((arr) => arr.filter((g) => g.id !== id));
          }, TRAIL_LIFE_MS);
          trailTimersRef.current.add(timer);
        }
      };

      const onUp = () => {
        if (holdTimer !== null) window.clearTimeout(holdTimer);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        activeGestureRef.current = { timer: null, onMove: null, onUp: null };

        const reduced = reducedMotionRef.current;

        if (!entered) {
          // Tap below hold threshold → playful spin, no state change.
          // Settle scale back from press-squish.
          fmAnimate(handleScale, 1, {
            type: "spring",
            stiffness: 520,
            damping: 30,
          });
          if (!reduced) {
            fmAnimate(jiggleRotate, [0, -16, 12, -7, 3, 0], {
              duration: 0.46,
              times: [0, 0.18, 0.38, 0.58, 0.78, 1],
              ease: [0.2, 0.8, 0.2, 1],
            });
          }
          return;
        }

        setPicking(false);
        if (!movedRef.current) {
          // Backed out of picker without committing. Restore prior selection
          // (which fires the preset's commit pulse for free via the
          // selected:false→true effect in Swatch) and recoil the handle
          // so the moment doesn't read as silent/lossy.
          setAppColor(prevStateRef.current.color);
          setSelected(prevStateRef.current.selected);
          fmAnimate(handleScale, 1, {
            type: "spring",
            stiffness: 380,
            damping: 26,
          });
        } else {
          // Commit bloom — radial light pulse on the phone surface, centered
          // on the handle's landing position. Reads as "surface received it."
          bloomCX.set(x.get() + SWATCH_R);
          bloomCY.set(y.get() + SWATCH_R);
          if (!reduced) {
            fmAnimate(bloomOpacity, [0, 1, 0], {
              duration: 0.5,
              times: [0, 0.3, 1],
              ease: [0.2, 0, 0, 1],
            });
          }
          // Commit pulse — gentle settle from picker scale through a
          // small overshoot. Matches the swatch idiom: subtle life on
          // landing, no exaggerated rebound.
          if (reduced) {
            fmAnimate(handleScale, 1, {
              type: "spring",
              stiffness: 480,
              damping: 30,
            });
          } else {
            // No keyframe overshoot — smooth spring settle from picker
            // scale straight back to 1.
            fmAnimate(handleScale, 1, {
              type: "spring",
              stiffness: 320,
              damping: 30,
            });
          }
        }
        fmAnimate(revealR, 0, { duration: 0.29, ease: [0.32, 0.72, 0, 1] });
        const { x: sx, y: sy } = slotPosRef.current;
        // Tiny overshoot back into the slot — just enough life that the
        // landing isn't dead, not a visible rebound.
        fmAnimate(x, sx - SWATCH_R, {
          type: "spring",
          stiffness: 400,
          damping: 30,
        });
        fmAnimate(y, sy - SWATCH_R, {
          type: "spring",
          stiffness: 400,
          damping: 30,
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      activeGestureRef.current.onMove = onMove;
      activeGestureRef.current.onUp = onUp;
    },
    [
      x,
      y,
      appColor,
      selected,
      revealR,
      revealCX,
      revealCY,
      bloomCX,
      bloomCY,
      bloomOpacity,
      jiggleRotate,
      handleScale,
      smoothSpeed,
    ]
  );

  // Toggle appearance — swap selected preset to its counterpart in the new
  // mode so the surface doesn't suddenly become unreadable. For a custom
  // pick, transpose at the same hue: the overlay flips between modes
  // (light wash at top vs dark wash at bottom), so we flip t to preserve
  // the perceptual position — a saturated pick stays saturated.
  const toggleAppearance = (next: Appearance) => {
    if (next === appearance) return;
    setAppearance(next);
    if (selected === "custom") {
      const pick = customPickRef.current;
      if (pick) {
        const flipped =
          TOKENS[next].overlayAtBottom !== TOKENS[appearance].overlayAtBottom;
        const newT = flipped ? 1 - pick.t : pick.t;
        setAppColor(sampleSpectrum(pick.hu, newT, TOKENS[next]));
        customPickRef.current = { hu: pick.hu, t: newT };
      }
    } else {
      const idx = PRESETS[appearance].findIndex((p) => p.id === selected);
      if (idx >= 0) {
        setAppColor(PRESETS[next][idx].color);
      }
    }
  };

  return (
    <div
      style={{
        position: isMobile ? "fixed" : "relative",
        inset: isMobile ? 0 : "auto",
        width: isMobile ? "auto" : "100vw",
        height: isMobile ? "auto" : "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isMobile ? appColor : "#121214",
        fontFamily: FONT,
        overflow: "hidden",
        transition: isMobile && !picking ? "background 0.25s ease" : "none",
      }}
    >
      {isMobile && (
        <>
          <div
            ref={tintTopRef}
            className="safari-tint-strip safari-tint-strip--top"
          />
          <div
            ref={tintBottomRef}
            className="safari-tint-strip safari-tint-strip--bottom"
          />
        </>
      )}
      {/* Phone surface — background is the live picked color. On desktop this
          is a floating phone frame; on mobile it fills the viewport so the
          real device chrome (notch, home indicator) is what the user sees. */}
      <motion.div
        ref={phoneRef}
        style={{
          width: isMobile ? "100%" : PHONE_W,
          height: isMobile ? "100%" : PHONE_H,
          borderRadius: isMobile ? 0 : 44,
          overflow: "hidden",
          background: appColor,
          boxShadow: isMobile
            ? "none"
            : "0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          userSelect: "none",
          touchAction: "none",
          transition: picking ? "none" : "background 0.25s ease",
          // Wrapper extends behind safe areas via body's 100vw/100vh so the
          // picked color tints status bar + URL bar / home indicator. Top
          // is padded by safe-area-inset-top so the card sits below the iOS
          // status bar. Bottom has NO padding — card extends to 16px from
          // physical screen edge for a consistent margin matching the
          // sides. In PWA the thin home-indicator bar overlays just the
          // 16px margin. In Safari the URL bar will cover the bottom of
          // the card; use PWA (Add to Home Screen) for the polished view.
          paddingTop: isMobile ? "env(safe-area-inset-top)" : 0,
        }}
      >
        {!isMobile && <StatusBar tint={tokens.statusTint} />}

        {/* Settings card */}
        <div
          ref={cardRef}
          style={{
            flex: 1,
            margin: isMobile ? "56px 16px 16px" : "44px 12px 12px",
            borderRadius: cardRadius,
            position: "relative",
            overflow: "hidden",
            background: tokens.cardTint,
            boxShadow: tokens.cardEdge,
            transition: "background 0.3s ease, border-radius 0.3s ease, box-shadow 0.3s ease",
          }}
        >
          {/* HSB spectrum layer */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background: spectrumBG,
              pointerEvents: "none",
              maskImage: revealMask,
              WebkitMaskImage: revealMask,
            }}
          />

          {/* Card content — fades out during pick */}
          <motion.div
            initial={false}
            animate={{ opacity: picking ? 0 : 1 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            style={{
              position: "relative",
              padding: "32px 28px",
              pointerEvents: picking ? "none" : "auto",
            }}
          >
            <h1
              style={{
                fontFamily: titleFamily,
                fontSize: 30,
                fontWeight: 600,
                color: tokens.text,
                margin: 0,
                height: 40,
                lineHeight: "40px",
                letterSpacing: "-0.01em",
                transition: "color 0.3s ease, font-family 0s",
              }}
            >
              Settings
            </h1>

            {/* COLOR */}
            <section style={{ marginTop: 32 }}>
              <SectionLabel color={tokens.sectionLabel}>COLOR</SectionLabel>
              <div style={{ display: "flex", gap: 12 }}>
                {presets.map((p) => (
                  <Swatch
                    key={p.id}
                    selected={selected === p.id}
                    selectedColor={p.color}
                    background={p.color}
                    swatchRadius={swatchRadius}
                    inset={tokens.swatchInset}
                    gapColor={tokens.gapColor}
                    onClick={() => {
                      setSelected(p.id);
                      setAppColor(p.color);
                    }}
                    ariaLabel={`Color ${p.id}`}
                  />
                ))}
                {/* Reserved slot for the floating rainbow handle. */}
                <div
                  ref={slotRef}
                  style={{ width: SWATCH, height: SWATCH, flexShrink: 0 }}
                />
              </div>
            </section>

            {/* FONT */}
            <section style={{ marginTop: 28 }}>
              <SectionLabel color={tokens.sectionLabel}>FONT</SectionLabel>
              <div style={{ display: "flex", gap: 12 }}>
                {FONTS.map((f, i) => (
                  <Swatch
                    key={f.label}
                    selected={fontIdx === i}
                    selectedColor={appColor}
                    background="transparent"
                    swatchRadius={swatchRadius}
                    inset={tokens.swatchInset}
                    gapColor={tokens.gapColor}
                    onClick={() => setFontIdx(i as 0 | 1 | 2)}
                    ariaLabel={`Font ${f.label}`}
                  >
                    <span
                      style={{
                        fontFamily: f.family,
                        fontSize: 17,
                        lineHeight: 1,
                        color: tokens.text,
                        // Per-font optical baseline correction — serif and
                        // slab faces sit slightly higher in their em-box.
                        transform: f.dy ? `translateY(${f.dy}px)` : undefined,
                        transition: "color 0.3s ease",
                      }}
                    >
                      Aa
                    </span>
                  </Swatch>
                ))}
              </div>
            </section>

            {/* APPEARANCE */}
            <section style={{ marginTop: 28 }}>
              <SectionLabel color={tokens.sectionLabel}>APPEARANCE</SectionLabel>
              <div style={{ display: "flex", gap: 12 }}>
                <Swatch
                  selected={appearance === "light"}
                  selectedColor={appColor}
                  background="transparent"
                  swatchRadius={swatchRadius}
                  inset={tokens.swatchInset}
                  gapColor={tokens.gapColor}
                  onClick={() => toggleAppearance("light")}
                  ariaLabel="Light appearance"
                >
                  <SunIcon stroke={tokens.iconStroke} />
                </Swatch>
                <Swatch
                  selected={appearance === "dark"}
                  selectedColor={appColor}
                  background="transparent"
                  swatchRadius={swatchRadius}
                  inset={tokens.swatchInset}
                  gapColor={tokens.gapColor}
                  onClick={() => toggleAppearance("dark")}
                  ariaLabel="Dark appearance"
                >
                  <MoonIcon stroke={tokens.iconStroke} />
                </Swatch>
              </div>
            </section>

            {/* CORNERS */}
            <section style={{ marginTop: 28 }}>
              <SectionLabel color={tokens.sectionLabel}>CORNERS</SectionLabel>
              <div style={{ display: "flex", gap: 12 }}>
                <Swatch
                  selected={corners === "rounded"}
                  selectedColor={appColor}
                  background="transparent"
                  swatchRadius={swatchRadius}
                  inset={tokens.swatchInset}
                  gapColor={tokens.gapColor}
                  onClick={() => setCorners("rounded")}
                  ariaLabel="Rounded corners"
                >
                  <RoundedIcon stroke={tokens.iconStroke} />
                </Swatch>
                <Swatch
                  selected={corners === "sharp"}
                  selectedColor={appColor}
                  background="transparent"
                  swatchRadius={swatchRadius}
                  inset={tokens.swatchInset}
                  gapColor={tokens.gapColor}
                  onClick={() => setCorners("sharp")}
                  ariaLabel="Sharp corners"
                >
                  <SharpIcon stroke={tokens.iconStroke} />
                </Swatch>
              </div>
            </section>
          </motion.div>
        </div>

        {/* Rainbow selection ring — sits behind the handle. */}
        <motion.div
          initial={false}
          animate={{
            opacity: selected === "custom" && !picking ? 1 : 0,
          }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: SWATCH + RING_OFFSET * 2,
            height: SWATCH + RING_OFFSET * 2,
            borderRadius:
              corners === "rounded"
                ? (SWATCH + RING_OFFSET * 2) / 2
                : SHARP_SWATCH + RING_OFFSET,
            background: RAINBOW,
            x: ringX,
            y: ringY,
            pointerEvents: "none",
            visibility: measured ? "visible" : "hidden",
            zIndex: 3,
            transition: "border-radius 0.25s ease",
          }}
        />

        {/* Velocity-aware brush shadow */}
        <motion.div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: SWATCH,
            height: SWATCH,
            borderRadius: swatchRadius,
            background: shadowBg,
            filter: shadowFilter,
            x,
            y: shadowY,
            pointerEvents: "none",
            visibility: measured ? "visible" : "hidden",
            zIndex: 4,
            transition: "border-radius 0.25s ease",
          }}
        />

        {/* Brush trail — fading color ghosts during fast drags */}
        <AnimatePresence>
          {trail.map((node) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0.55, scale: 1 }}
              animate={{ opacity: 0, scale: 0.82 }}
              transition={{ duration: TRAIL_LIFE_MS / 1000, ease: [0.2, 0, 0, 1] }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                x: node.x,
                y: node.y,
                width: SWATCH,
                height: SWATCH,
                borderRadius: swatchRadius,
                background: node.color,
                pointerEvents: "none",
                zIndex: 4,
              }}
            />
          ))}
        </AnimatePresence>

        {/* Rainbow handle */}
        <motion.div
          onPointerDown={startPick}
          initial={false}
          animate={{
            boxShadow: picking
              ? "0 0 0 2.5px rgba(255,255,255,0.95)"
              : selected === "custom"
                ? `0 0 0 2px ${tokens.gapColor}, 0 1.5px 4px rgba(0,0,0,0.10)`
                : tokens.swatchInset,
          }}
          transition={{
            boxShadow: { duration: 0.2 },
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: SWATCH,
            height: SWATCH,
            borderRadius: swatchRadius,
            background: RAINBOW,
            cursor: picking ? "grabbing" : "grab",
            x,
            y,
            scale: handleScale,
            rotate: jiggleRotate,
            touchAction: "none",
            visibility: measured ? "visible" : "hidden",
            zIndex: 5,
            overflow: "hidden",
            transition: "border-radius 0.25s ease",
          }}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: picking || selected === "custom" ? 1 : 0,
            }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              background: appColor,
              pointerEvents: "none",
            }}
          />
        </motion.div>

        {/* Commit bloom — soft radial light pulse on release-with-drag */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            background: bloomBg,
            opacity: bloomOpacity,
            pointerEvents: "none",
            zIndex: 6,
          }}
        />
      </motion.div>
    </div>
  );
}

// ── Section label ────────────────────────────────────────────────────────

function SectionLabel({ color, children }: { color: string; children: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.1em",
        color,
        marginBottom: 12,
        transition: "color 0.3s ease",
      }}
    >
      {children}
    </div>
  );
}
