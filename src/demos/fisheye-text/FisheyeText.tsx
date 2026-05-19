import { useState, useRef, useEffect, useCallback } from "react";
import { bg, demoPalettes, text as textColors } from "../../palette";

/**
 * Fisheye Text — "Words that feel your presence."
 * Per-character spring physics with variable font width interpolation.
 * Characters widen toward the cursor and compress away, using the font's
 * native `wdth` axis for optically correct distortion.
 *
 * Uses Recursive Variable font (wdth axis: 75–125)
 */

export const FISHEYE_FONT_SIZE = 52;
const BG = bg(demoPalettes["fisheye-text"]);
const PLACEHOLDER = "hover over me";
const INITIAL_TEXT = "proximity";
const SPRING_STIFFNESS = 320;
const SPRING_DAMPING = 34;
export const FISHEYE_MAX_WIDTH = 125; // max variable font width
const MIN_WIDTH = 75; // min variable font width
const REST_WIDTH = 100; // normal width
const MAX_LIFT = -6; // pixels to lift toward cursor
const PUSH_RANGE = 4;
const FONT_SIZE = FISHEYE_FONT_SIZE;
const MAX_WIDTH = FISHEYE_MAX_WIDTH;

// Reusable spring system shared by the demo and preview.
// Owns charRefs + springsRef. Caller passes hoveredChar + text;
// hook returns a ref-registrar to attach to each char span.
export function useFisheyeSprings(
  text: string,
  hoveredChar: number | null,
  opts?: { fontSize?: number },
): (i: number) => (el: HTMLSpanElement | null) => void {
  const fontSize = opts?.fontSize ?? FONT_SIZE;
  const charRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const springsRef = useRef<Map<number, {
    wdth: number; x: number; y: number;
    targetWdth: number; targetX: number; targetY: number;
    velWdth: number; velX: number; velY: number;
  }>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const step = () => {
      const dt = 1 / 60;
      springsRef.current.forEach((spring, idx) => {
        const forceW = -SPRING_STIFFNESS * (spring.wdth - spring.targetWdth) - SPRING_DAMPING * spring.velWdth;
        spring.velWdth += forceW * dt;
        spring.wdth += spring.velWdth * dt;
        const forceX = -SPRING_STIFFNESS * (spring.x - spring.targetX) - SPRING_DAMPING * spring.velX;
        spring.velX += forceX * dt;
        spring.x += spring.velX * dt;
        const forceY = -SPRING_STIFFNESS * (spring.y - spring.targetY) - SPRING_DAMPING * spring.velY;
        spring.velY += forceY * dt;
        spring.y += spring.velY * dt;
        const el = charRefs.current.get(idx);
        if (el) {
          el.style.fontVariationSettings = `'wdth' ${spring.wdth}`;
          el.style.transform = `translate(${spring.x}px, ${spring.y}px)`;
        }
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    for (let i = 0; i < text.length; i++) {
      if (!springsRef.current.has(i)) {
        springsRef.current.set(i, {
          wdth: REST_WIDTH, x: 0, y: 0,
          targetWdth: REST_WIDTH, targetX: 0, targetY: 0,
          velWdth: 0, velX: 0, velY: 0,
        });
      }
    }
    springsRef.current.forEach((_, key) => {
      if (key >= text.length) springsRef.current.delete(key);
    });

    for (let i = 0; i < text.length; i++) {
      const spring = springsRef.current.get(i)!;
      if (hoveredChar === null) {
        spring.targetWdth = REST_WIDTH;
        spring.targetX = 0;
        spring.targetY = 0;
      } else {
        const distance = Math.abs(i - hoveredChar);
        if (i === hoveredChar) {
          spring.targetWdth = MAX_WIDTH;
          spring.targetX = 0;
          spring.targetY = MAX_LIFT;
        } else if (distance <= PUSH_RANGE) {
          const direction = Math.sign(i - hoveredChar);
          const falloff = 1 - distance / (PUSH_RANGE + 1);
          const pushPx = fontSize * 0.35 * falloff * direction;
          spring.targetWdth = REST_WIDTH - (REST_WIDTH - MIN_WIDTH) * 0.4 * falloff;
          spring.targetX = pushPx;
          spring.targetY = MAX_LIFT * 0.4 * falloff;
        } else {
          spring.targetWdth = REST_WIDTH;
          spring.targetX = 0;
          spring.targetY = 0;
        }
      }
    }
  }, [hoveredChar, text.length, text, fontSize]);

  return (i: number) => (el: HTMLSpanElement | null) => {
    if (el) charRefs.current.set(i, el);
    else charRefs.current.delete(i);
  };
}

// Recursive Variable font is loaded from index.html

export function FisheyeText() {
  const [text, setText] = useState(INITIAL_TEXT);
  const [cursorPos, setCursorPos] = useState(0);
  const [hoveredChar, setHoveredChar] = useState<number | null>(null);
  const hiddenRef = useRef<HTMLTextAreaElement>(null);
  const registerChar = useFisheyeSprings(text, hoveredChar);

  const focusInput = useCallback(() => {
    hiddenRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  const handleInput = () => {
    const el = hiddenRef.current;
    if (!el) return;
    setText(el.value);
    setCursorPos(el.selectionStart ?? el.value.length);
  };

  const syncCursor = () => {
    const el = hiddenRef.current;
    if (!el) return;
    setCursorPos(el.selectionStart ?? el.value.length);
  };

  const handleCharClick = (globalIndex: number) => {
    setCursorPos(globalIndex);
    if (hiddenRef.current) {
      hiddenRef.current.selectionStart = globalIndex;
      hiddenRef.current.selectionEnd = globalIndex;
      hiddenRef.current.focus();
    }
  };

  const chars = text.split("");

  return (
    <div
      className="demo-page"
      style={{ background: BG, cursor: "text", flexDirection: "column", gap: 0 }}
      onClick={focusInput}
    >
      <style>{`
        @keyframes caret-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>

      {/* Concept frame */}
      <div
        style={{
          marginBottom: 48,
          textAlign: "center",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: textColors.dark.tertiary,
            fontFamily: "'Recursive', monospace",
            marginBottom: 6,
          }}
        >
          Proximity Typography
        </div>
      </div>

      <textarea
        ref={hiddenRef}
        value={text}
        onChange={handleInput}
        onKeyUp={syncCursor}
        onMouseUp={syncCursor}
        onSelect={syncCursor}
        autoFocus
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          opacity: 0,
          width: 1,
          height: 1,
        }}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          fontFamily: "'Recursive', 'SF Mono', 'Fira Code', monospace",
          fontSize: "clamp(40px, 5vw, 72px)",
          fontWeight: 400,
          fontVariationSettings: `'wdth' ${REST_WIDTH}`,
          color: "rgba(255,255,255,0.92)",
          lineHeight: 1.6,
          maxWidth: "min(740px, 80vw)",
          minHeight: "1.6em",
          position: "relative",
        }}
      >
        {text.length === 0 && (
          <span style={{ color: "rgba(255,255,255,0.12)", position: "relative", display: "inline-flex" }}>
            <Caret />
            {PLACEHOLDER}
          </span>
        )}

        {chars.map((char, i) => {
          const isSpace = char === " ";
          return (
            <span
              key={i}
              style={{ position: "relative", display: "inline-block" }}
            >
              {cursorPos === i && <Caret />}
              <span
                ref={registerChar(i)}
                onMouseEnter={() => setHoveredChar(i)}
                onMouseLeave={() => setHoveredChar(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCharClick(i);
                }}
                style={{
                  display: "inline-block",
                  transformOrigin: "center bottom",
                  cursor: "text",
                  width: isSpace ? "0.6ch" : undefined,
                  willChange: "transform, font-variation-settings",
                }}
              >
                {isSpace ? "\u00A0" : char}
              </span>
            </span>
          );
        })}

        {text.length > 0 && cursorPos === text.length && (
          <span style={{ position: "relative", display: "inline-block", width: 2 }}>
            <Caret />
          </span>
        )}
      </div>

      {/* Subtle hint */}
      <div
        style={{
          marginTop: 40,
          fontSize: 12,
          color: textColors.dark.muted,
          userSelect: "none",
          pointerEvents: "none",
          opacity: text.length === 0 ? 0.6 : 0.3,
          transition: "opacity 0.3s",
        }}
      >
        type, then hover
      </div>
    </div>
  );
}

function Caret() {
  return (
    <span
      style={{
        position: "absolute",
        left: -1,
        top: "0.15em",
        width: 2,
        height: "0.75em",
        background: "#fff",
        borderRadius: 1,
        zIndex: 10,
        pointerEvents: "none",
        animation: "caret-blink 1s steps(1) infinite",
      }}
    />
  );
}
