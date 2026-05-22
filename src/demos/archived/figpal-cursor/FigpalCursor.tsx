import { useEffect, useRef } from "react";
import { bg, demoPalettes } from "../../../palette";

/**
 * Figpal Cursor — ported from portfolio's CustomCursor.tsx (figpal mode).
 * A companion character trails the cursor with lerp inertia.
 * Since we don't have the original figpal.png, we use an inline SVG character.
 */

const BG = bg(demoPalettes["figpal-cursor"]);
const OFFSET_X = 24;
const OFFSET_Y = 24;
const LERP_RATE = 0.12;
const SIZE = 64;

export function FigpalCursor() {
  const companionRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: -200, y: -200 });
  const initializedRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const companion = companionRef.current;
    if (!companion) return;

    const handleMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      if (!initializedRef.current) {
        initializedRef.current = true;
        posRef.current.x = e.clientX + OFFSET_X;
        posRef.current.y = e.clientY + OFFSET_Y;
        companion.style.opacity = "1";
      }
    };

    const loop = () => {
      if (initializedRef.current) {
        const targetX = mouseRef.current.x + OFFSET_X;
        const targetY = mouseRef.current.y + OFFSET_Y;

        posRef.current.x += (targetX - posRef.current.x) * LERP_RATE;
        posRef.current.y += (targetY - posRef.current.y) * LERP_RATE;

        companion.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    document.addEventListener("mousemove", handleMove);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="demo-page" style={{ background: BG }}>
      <style>{`
        .figpal-hint {
          font-size: 14px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.03em;
          user-select: none;
        }
      `}</style>

      <p className="figpal-hint">Move your cursor around</p>

      {/* The companion — fixed position, follows cursor with delay */}
      <div
        ref={companionRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          pointerEvents: "none",
          zIndex: 9999,
          opacity: 0,
          willChange: "transform",
          transition: "opacity 200ms ease",
        }}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Simple Figpal-inspired companion: rounded body with eyes */}
          <rect x="8" y="12" width="48" height="40" rx="20" fill="white" />
          {/* Left eye */}
          <circle cx="24" cy="30" r="4" fill="#1a1a1a" />
          <circle cx="25.5" cy="28.5" r="1.5" fill="white" />
          {/* Right eye */}
          <circle cx="40" cy="30" r="4" fill="#1a1a1a" />
          <circle cx="41.5" cy="28.5" r="1.5" fill="white" />
          {/* Smile */}
          <path
            d="M26 38 Q32 43 38 38"
            stroke="#1a1a1a"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
