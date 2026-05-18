import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  animate as fmAnimate,
} from "framer-motion";

/**
 * Color Hold Pick — Trio/Priority-style Settings page where the "custom color"
 * swatch is a press-and-hold gesture. Holding turns the settings card itself
 * into a full HSB spectrum canvas; the rainbow swatch becomes a draggable
 * handle. The app surface color tracks the handle live, and the f2f2f2/90%
 * card tint lets some of that color bleed back through the chrome.
 */

const FONT =
  "-apple-system, 'SF Pro Text', 'SF Pro Display', 'Inter', 'Helvetica Neue', sans-serif";

const SWATCH = 40;
const SWATCH_R = SWATCH / 2;
const MOVE_THRESHOLD = 4; // px of motion before a press becomes a commit

const PRESETS = [
  { id: "blue", color: "hsl(210, 65%, 82%)" },
  { id: "peach", color: "hsl(22, 68%, 84%)" },
  { id: "sage", color: "hsl(150, 32%, 80%)" },
] as const;

type Selected = (typeof PRESETS)[number]["id"] | "custom";

// Conic rainbow for the custom-color swatch — same OKLCH path as the canvas
// so it reads as a "preview" of the spectrum, with no perceptual banding.
const RAINBOW = `conic-gradient(from 90deg in oklch longer hue,
  oklch(0.72 0.18 0deg) 0%,
  oklch(0.72 0.18 360deg) 100%)`;

// Perceptually-uniform light-mode spectrum.
//
// OKLCH base row — every hue at the same L,C reads as the same perceived
// brightness, so there are no "bands" where yellow looks brighter than blue.
// CSS interpolates `in oklch longer hue` for buttery smooth transitions
// between two endpoints around the full hue wheel. Sampling does the same
// oklch→sRGB conversion + the same white overlay mix so the pick matches.
const L_BASE = 0.76; // OKLCH lightness for the saturated base row
const C_BASE = 0.13; // OKLCH chroma — kept tasteful, well inside sRGB gamut
const OVERLAY_TOP = 0.92; // alpha of the white wash at y=0

const SPECTRUM = `
  linear-gradient(to bottom, rgba(255,255,255,${OVERLAY_TOP}) 0%, rgba(255,255,255,0) 100%),
  linear-gradient(to right in oklch longer hue,
    oklch(${L_BASE} ${C_BASE} 0deg) 0%,
    oklch(${L_BASE} ${C_BASE} 360deg) 100%)
`;

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

function colorFromPos(x: number, y: number, w: number, h: number): string {
  const hue = Math.max(0, Math.min(360, (x / w) * 360));
  const t = Math.max(0, Math.min(1, y / h));
  const [br, bg, bb] = oklchToRgb(L_BASE, C_BASE, hue);
  const ov = OVERLAY_TOP * (1 - t); // CSS overlay alpha at this y
  const r = Math.round(255 * ov + br * (1 - ov));
  const g = Math.round(255 * ov + bg * (1 - ov));
  const b = Math.round(255 * ov + bb * (1 - ov));
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

// ── Preset swatch ─────────────────────────────────────────────────────────

function PresetSwatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Color ${color}`}
      style={{
        width: SWATCH,
        height: SWATCH,
        borderRadius: SWATCH_R,
        background: color,
        border: "none",
        padding: 0,
        cursor: "pointer",
        boxShadow: selected
          ? `0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3.5px ${color}`
          : "inset 0 0 0 1px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s ease",
      }}
    />
  );
}

// ── Font swatch ───────────────────────────────────────────────────────────

function FontSwatch({
  family,
  selected,
  accent,
}: {
  family: string;
  selected: boolean;
  accent: string;
}) {
  return (
    <div
      style={{
        width: SWATCH,
        height: SWATCH,
        borderRadius: SWATCH_R,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: family,
        fontSize: 17,
        color: "#1a1a1a",
        border: selected
          ? `1.5px solid ${accent}`
          : "1px solid rgba(0,0,0,0.12)",
        background: "transparent",
      }}
    >
      Aa
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════

export function ColorHoldPick() {
  const [appColor, setAppColor] = useState<string>(PRESETS[0].color);
  const [selected, setSelected] = useState<Selected>("blue");
  const [picking, setPicking] = useState(false);
  const [measured, setMeasured] = useState(false);

  const phoneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const slotPosRef = useRef({ x: 0, y: 0 });

  // Handle x/y are in phone-surface coordinates (so the handle renders as a
  // sibling of the card and isn't clipped by the card's overflow:hidden).
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Radial-wipe reveal — spectrum blooms out from the press point with a
  // shadow-like feathered edge. Inner 45% of the mask radius is fully
  // opaque; outer 55% fades smoothly to transparent. To keep the card
  // corners fully colored at peak, the animated radius reaches 2.2× the
  // card diagonal — so the opaque zone (45% of that) ≈ the diagonal.
  const revealR = useMotionValue(0);
  const revealCX = useMotionValue(0);
  const revealCY = useMotionValue(0);
  const revealMask = useMotionTemplate`radial-gradient(circle ${revealR}px at ${revealCX}px ${revealCY}px, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)`;

  // Card offset within the phone surface — used to translate between the
  // card-relative coords (for color sampling) and phone-relative coords
  // (for handle positioning).
  const cardOffsetRef = useRef({ x: 0, y: 0 });

  // Tap-vs-drag bookkeeping — a press with no movement reverts on release.
  const pressOrigin = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const prevStateRef = useRef<{ color: string; selected: Selected }>({
    color: PRESETS[0].color,
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

  // Pointer-down on the rainbow swatch begins the hold gesture.
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
      const cx = Math.max(0, Math.min(card.width, e.clientX - card.left));
      const cy = Math.max(0, Math.min(card.height, e.clientY - card.top));

      // Snapshot prior state so a tap-without-drag can revert cleanly.
      prevStateRef.current = { color: appColor, selected };
      pressOrigin.current = { x: e.clientX, y: e.clientY };
      movedRef.current = false;

      // Radial-wipe reveal originates at the press point.
      revealCX.set(cx);
      revealCY.set(cy);
      fmAnimate(revealR, Math.hypot(card.width, card.height) * 2.2, {
        duration: 0.29,
        ease: [0.32, 0.72, 0, 1],
      });

      x.set(cx + cardOffsetRef.current.x - SWATCH_R);
      y.set(cy + cardOffsetRef.current.y - SWATCH_R);
      setAppColor(colorFromPos(cx, cy, card.width, card.height));
      setSelected("custom");
      setPicking(true);
    },
    [x, y, appColor, selected, revealR, revealCX, revealCY]
  );

  // While holding: move + recolor surface; release returns swatch to slot.
  useEffect(() => {
    if (!picking) return;
    const onMove = (e: PointerEvent) => {
      if (!cardRef.current) return;
      const card = cardRef.current.getBoundingClientRect();
      const dx = e.clientX - pressOrigin.current.x;
      const dy = e.clientY - pressOrigin.current.y;
      if (!movedRef.current && Math.hypot(dx, dy) > MOVE_THRESHOLD) {
        movedRef.current = true;
      }
      const cx = Math.max(0, Math.min(card.width, e.clientX - card.left));
      const cy = Math.max(0, Math.min(card.height, e.clientY - card.top));
      x.set(cx + cardOffsetRef.current.x - SWATCH_R);
      y.set(cy + cardOffsetRef.current.y - SWATCH_R);
      setAppColor(colorFromPos(cx, cy, card.width, card.height));
    };
    const onUp = () => {
      setPicking(false);
      // Tap without drag → restore previous selection + color.
      if (!movedRef.current) {
        setAppColor(prevStateRef.current.color);
        setSelected(prevStateRef.current.selected);
      }
      // Spectrum retreats back to the swatch.
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
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [picking, x, y, revealR]);

  const cardTint = "rgba(242,242,242,0.9)";

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
      <div
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
        }}
      >
        <StatusBar tint="#1a1a1a" />

        {/* Settings card — fills bottom, top-rounded only. */}
        <div
          ref={cardRef}
          style={{
            flex: 1,
            margin: "44px 12px 12px",
            borderRadius: 32,
            position: "relative",
            overflow: "hidden",
            background: cardTint,
            // Crisp top edge highlight when frosted.
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.5), 0 -2px 12px rgba(0,0,0,0.03)",
          }}
        >
          {/* HSB spectrum layer — radial-mask blooms out from the press
              point with a soft feathered edge. The spectrum is always
              painted; only the mask radius animates. */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background: SPECTRUM,
              pointerEvents: "none",
              maskImage: revealMask,
              WebkitMaskImage: revealMask,
            }}
          />

          {/* Card content — fades to ghosting during pick. */}
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
                fontFamily: "'Figtree', " + FONT,
                fontSize: 30,
                fontWeight: 600,
                color: "#0a0a0a",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Settings
            </h1>

            <section style={{ marginTop: 36 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  color: "rgba(0,0,0,0.4)",
                  marginBottom: 14,
                }}
              >
                COLOR
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {PRESETS.map((p) => (
                  <PresetSwatch
                    key={p.id}
                    color={p.color}
                    selected={selected === p.id}
                    onClick={() => {
                      setSelected(p.id);
                      setAppColor(p.color);
                    }}
                  />
                ))}
                {/* Reserved slot for the floating rainbow handle. */}
                <div
                  ref={slotRef}
                  style={{ width: SWATCH, height: SWATCH, flexShrink: 0 }}
                />
              </div>
            </section>

            <section style={{ marginTop: 34 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  color: "rgba(0,0,0,0.4)",
                  marginBottom: 14,
                }}
              >
                FONT
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <FontSwatch
                  family="-apple-system, 'SF Pro Text', sans-serif"
                  selected
                  accent={appColor}
                />
                <FontSwatch
                  family="Georgia, 'Times New Roman', serif"
                  selected={false}
                  accent={appColor}
                />
                <FontSwatch
                  family="'Iowan Old Style', 'Palatino', serif"
                  selected={false}
                  accent={appColor}
                />
              </div>
            </section>
          </motion.div>
        </div>

        {/* Rainbow handle — rendered as a sibling of the card so it isn't
            clipped by the card's overflow:hidden when the handle nears the
            card edge. Position is still clamped to card bounds via the
            offset translation in the pointer handlers. */}
        <motion.div
          onPointerDown={startPick}
          initial={false}
          animate={{
            scale: picking ? 1.18 : 1,
            boxShadow: picking
              ? "0 0 0 2.5px rgba(255,255,255,0.95), 0 10px 26px rgba(0,0,0,0.28)"
              : selected === "custom"
                ? `0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3.5px ${appColor}`
                : "inset 0 0 0 1px rgba(0,0,0,0.06)",
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
            borderRadius: SWATCH_R,
            background: RAINBOW,
            cursor: picking ? "grabbing" : "grab",
            x,
            y,
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

      </div>
    </div>
  );
}

