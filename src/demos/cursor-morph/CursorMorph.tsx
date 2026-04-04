import { useEffect, useRef, useState } from "react";
import { bg, demoPalettes, text } from "../../palette";

/**
 * Cursor Circle→Arrow — ported from portfolio's CustomCursor.tsx (invert mode).
 * An 80px white circle with mix-blend-mode: difference follows the cursor.
 * On card hover, the circle collapses to reveal an arrow underneath.
 * Between-card debounce prevents flicker.
 */

const BG = bg(demoPalettes["cursor-morph"]);
const CIRCLE_SIZE = 80;
const ARROW_FONT_SIZE = 36;
const DEBOUNCE_MS = 200;

const CARDS = [
  { title: "Craft Portfolio", subtitle: "Design systems and interaction" },
  { title: "Motion Library", subtitle: "Spring physics and easing curves" },
  { title: "Component Toolkit", subtitle: "Reusable UI primitives" },
  { title: "Brand Guidelines", subtitle: "Typography and color systems" },
];

export function CursorMorph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [onCard, setOnCard] = useState(false);
  const morphTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const circle = circleRef.current;
    const arrow = arrowRef.current;
    if (!wrap || !circle || !arrow) return;

    let initialized = false;

    // Inject global cursor:none
    const style = document.createElement("style");
    style.textContent = "* { cursor: none !important; }";
    document.head.appendChild(style);

    const handleMove = (e: MouseEvent) => {
      const x = e.clientX - CIRCLE_SIZE / 2;
      const y = e.clientY - CIRCLE_SIZE / 2;
      wrap.style.transform = `translate(${x}px, ${y}px)`;
      if (!initialized) {
        initialized = true;
        wrap.style.opacity = "1";
      }
    };

    document.addEventListener("mousemove", handleMove);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      style.remove();
    };
  }, []);

  // Card hover → morph circle to arrow with debounce
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleOver = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest("[data-morph-card]");
      if (card) {
        if (morphTimer.current) {
          clearTimeout(morphTimer.current);
          morphTimer.current = null;
        }
        setOnCard(true);
      }
    };

    const handleOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest?.("[data-morph-card]")) return;

      morphTimer.current = setTimeout(() => {
        setOnCard(false);
        morphTimer.current = null;
      }, DEBOUNCE_MS);
    };

    container.addEventListener("mouseover", handleOver);
    container.addEventListener("mouseout", handleOut);

    return () => {
      container.removeEventListener("mouseover", handleOver);
      container.removeEventListener("mouseout", handleOut);
      if (morphTimer.current) clearTimeout(morphTimer.current);
    };
  }, []);

  // Apply morph styles imperatively for snappiness
  useEffect(() => {
    const circle = circleRef.current;
    const arrow = arrowRef.current;
    if (!circle || !arrow) return;

    if (onCard) {
      circle.style.transform = "scale(0)";
      arrow.style.opacity = "1";
    } else {
      circle.style.transform = "scale(1)";
      arrow.style.opacity = "0";
    }
  }, [onCard]);

  return (
    <div className="demo-page" style={{ background: BG }}>
      <style>{`
        .morph-card {
          padding: 24px 32px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 0.2s;
          user-select: none;
        }
        .morph-card:hover {
          border-color: rgba(255,255,255,0.15);
        }
        .morph-title {
          font-size: 16px;
          font-weight: 600;
          color: ${text.dark.primary};
          margin-bottom: 4px;
        }
        .morph-sub {
          font-size: 13px;
          color: ${text.dark.tertiary};
        }
      `}</style>

      {/* Custom cursor */}
      <div
        ref={wrapRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          pointerEvents: "none",
          zIndex: 9999,
          opacity: 0,
          willChange: "transform",
          mixBlendMode: "difference",
        }}
      >
        {/* Arrow layer (behind circle) */}
        <div
          ref={arrowRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: ARROW_FONT_SIZE,
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 400,
            lineHeight: 1,
            opacity: 0,
            transition: "opacity 200ms ease",
          }}
        >
          {"\u2192"}
        </div>

        {/* Circle layer (on top) */}
        <div
          ref={circleRef}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "white",
            transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            transform: "scale(1)",
          }}
        />
      </div>

      {/* Card list */}
      <div
        ref={containerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 400,
        }}
      >
        {CARDS.map((card) => (
          <div key={card.title} className="morph-card" data-morph-card>
            <div className="morph-title">{card.title}</div>
            <div className="morph-sub">{card.subtitle}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
