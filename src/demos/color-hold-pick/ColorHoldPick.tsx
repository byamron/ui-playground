import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
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
const MOVE_THRESHOLD = 4; // px of motion before a press becomes a commit
const HOLD_DELAY = 200; // ms before a press commits to "picker mode"
const RING_OFFSET = 3.5;

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

const FONTS = [
  { label: "Sans", family: `'Figtree', ${FONT}` },
  { label: "Serif", family: "'Iowan Old Style', Georgia, 'Times New Roman', serif" },
  { label: "Slab", family: "'Bookman Old Style', 'Palatino', serif" },
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

function colorFromPos(
  x: number,
  y: number,
  w: number,
  h: number,
  t: Tokens
): string {
  const hue = Math.max(0, Math.min(360, (x / w) * 360));
  const tv = Math.max(0, Math.min(1, y / h));
  const [br, bg, bb] = oklchToRgb(t.L_BASE, t.C_BASE, hue);
  const [or, og, ob] = t.overlayRGB.split(",").map(Number);
  const ov = t.overlayAlpha * (t.overlayAtBottom ? tv : 1 - tv);
  const r = Math.round(or * ov + br * (1 - ov));
  const g = Math.round(og * ov + bg * (1 - ov));
  const b = Math.round(ob * ov + bb * (1 - ov));
  return `rgb(${r}, ${g}, ${b})`;
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
  return (
    <button
      onClick={onClick}
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
    </button>
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
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
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

export function ColorHoldPick() {
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [corners, setCorners] = useState<"rounded" | "sharp">("rounded");
  const [fontIdx, setFontIdx] = useState<0 | 1 | 2>(0);
  const [appColor, setAppColor] = useState<string>(PRESETS.light[0].color);
  const [selected, setSelected] = useState<Selected>("blue");
  const [picking, setPicking] = useState(false);
  const [measured, setMeasured] = useState(false);

  const tokens = TOKENS[appearance];
  const presets = PRESETS[appearance];
  const spectrumBG = makeSpectrum(tokens);
  const swatchRadius = corners === "rounded" ? SWATCH_R : SHARP_SWATCH;
  const cardRadius = corners === "rounded" ? ROUNDED_CARD : SHARP_CARD;
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

  // Phone-surface commit pulse — tiny scale beat on release-with-drag.
  const phoneScale = useMotionValue(1);

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
    fmAnimate(pickingMV, picking ? 1 : 0, { duration: 0.2 });
  }, [picking, pickingMV]);

  // Rainbow selection ring — sits behind the handle, centered on it.
  const ringX = useTransform(x, (v) => v - RING_OFFSET);
  const ringY = useTransform(y, (v) => v - RING_OFFSET);

  // Tap-jiggle — quick rotational wiggle when the rainbow swatch is tapped
  // without being held long enough to enter picker mode. Visibly spins the
  // conic gradient for a beat, inviting the user to hold instead of tap.
  const jiggleRotate = useMotionValue(0);

  // Card offset within the phone surface.
  const cardOffsetRef = useRef({ x: 0, y: 0 });

  // Tap-vs-drag bookkeeping.
  const pressOrigin = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const prevStateRef = useRef<{ color: string; selected: Selected }>({
    color: PRESETS.light[0].color,
    selected: "blue",
  });

  useLayoutEffect(() => {
    if (!slotRef.current || !phoneRef.current || !cardRef.current) return;
    const slot = slotRef.current.getBoundingClientRect();
    const phone = phoneRef.current.getBoundingClientRect();
    const card = cardRef.current.getBoundingClientRect();
    const sx = slot.left - phone.left + slot.width / 2;
    const sy = slot.top - phone.top + slot.height / 2;
    slotPosRef.current = { x: sx, y: sy };
    cardOffsetRef.current = { x: card.left - phone.left, y: card.top - phone.top };
    x.set(sx - SWATCH_R);
    y.set(sy - SWATCH_R);
    setMeasured(true);
  }, [x, y]);

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
        fmAnimate(revealR, Math.hypot(card.width, card.height) * 2.2, {
          duration: 0.29,
          ease: [0.32, 0.72, 0, 1],
        });
        x.set(cx + cardOffsetRef.current.x - SWATCH_R);
        y.set(cy + cardOffsetRef.current.y - SWATCH_R);
        setAppColor(
          colorFromPos(cx, cy, card.width, card.height, tokensRef.current)
        );
        setSelected("custom");
        setPicking(true);
      };

      holdTimer = window.setTimeout(() => {
        enterPicker(e.clientX, e.clientY);
      }, HOLD_DELAY);

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
        x.set(cx + cardOffsetRef.current.x - SWATCH_R);
        y.set(cy + cardOffsetRef.current.y - SWATCH_R);
        setAppColor(
          colorFromPos(cx, cy, card.width, card.height, tokensRef.current)
        );
      };

      const onUp = () => {
        if (holdTimer !== null) window.clearTimeout(holdTimer);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        if (!entered) {
          // Tap below hold threshold → playful spin, no state change.
          fmAnimate(jiggleRotate, [0, -16, 12, -7, 3, 0], {
            duration: 0.46,
            times: [0, 0.18, 0.38, 0.58, 0.78, 1],
            ease: [0.2, 0.8, 0.2, 1],
          });
          return;
        }

        setPicking(false);
        if (!movedRef.current) {
          setAppColor(prevStateRef.current.color);
          setSelected(prevStateRef.current.selected);
        } else {
          fmAnimate(phoneScale, [1, 1.005, 1], {
            duration: 0.22,
            times: [0, 0.45, 1],
            ease: [0.2, 0, 0, 1],
          });
        }
        fmAnimate(revealR, 0, { duration: 0.29, ease: [0.32, 0.72, 0, 1] });
        const { x: sx, y: sy } = slotPosRef.current;
        fmAnimate(x, sx - SWATCH_R, {
          type: "spring",
          stiffness: 380,
          damping: 32,
        });
        fmAnimate(y, sy - SWATCH_R, {
          type: "spring",
          stiffness: 380,
          damping: 32,
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [x, y, appColor, selected, revealR, revealCX, revealCY, phoneScale, jiggleRotate]
  );

  // Toggle appearance — swap selected preset to its counterpart in the new
  // mode so the surface doesn't suddenly become unreadable.
  const toggleAppearance = (next: Appearance) => {
    if (next === appearance) return;
    setAppearance(next);
    if (selected !== "custom") {
      const idx = PRESETS[appearance].findIndex((p) => p.id === selected);
      if (idx >= 0) {
        setAppColor(PRESETS[next][idx].color);
      }
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#121214",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* Phone surface — background is the live picked color. */}
      <motion.div
        ref={phoneRef}
        style={{
          width: 393,
          height: 760,
          borderRadius: 44,
          overflow: "hidden",
          background: appColor,
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          userSelect: "none",
          touchAction: "none",
          transition: picking ? "none" : "background 0.25s ease",
          scale: phoneScale,
        }}
      >
        <StatusBar tint={tokens.statusTint} />

        {/* Settings card */}
        <div
          ref={cardRef}
          style={{
            flex: 1,
            margin: "44px 12px 12px",
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
                        color: tokens.text,
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

        {/* Rainbow handle */}
        <motion.div
          onPointerDown={startPick}
          initial={false}
          animate={{
            scale: picking ? 1.18 : 1,
            boxShadow: picking
              ? "0 0 0 2.5px rgba(255,255,255,0.95)"
              : selected === "custom"
                ? `0 0 0 2px ${tokens.gapColor}, 0 1.5px 4px rgba(0,0,0,0.10)`
                : tokens.swatchInset,
          }}
          transition={{
            scale: { type: "spring", stiffness: 420, damping: 28 },
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
            rotate: jiggleRotate,
            touchAction: "none",
            visibility: measured ? "visible" : "hidden",
            zIndex: 5,
            overflow: "hidden",
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
