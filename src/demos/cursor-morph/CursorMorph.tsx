import { useEffect, useRef, useState } from "react";
import { bg, demoPalettes, text } from "../../palette";

/**
 * Cursor Morph — spring-physics driven custom cursor.
 * A circle follows the cursor with inertia, deforms based on velocity
 * (stretches in movement direction, squashes perpendicular), and morphs
 * into an arrow on card hover via spring-driven scale.
 */

const BG = bg(demoPalettes["cursor-morph"]);
export const CIRCLE_SIZE = 80;
export const ARROW_FONT_SIZE = 36;
const DEBOUNCE_MS = 60;

// Spring params
export const CURSOR_MORPH_SPRINGS = {
  POS_STIFFNESS: 180,
  POS_DAMPING: 18,
  MORPH_STIFFNESS: 400,
  MORPH_DAMPING: 28,
  ARROW_STIFFNESS: 300,
  ARROW_DAMPING: 15,
  MAX_STRETCH: 1.35,
  MAX_SQUASH: 0.75,
  VELOCITY_SCALE: 0.0008,
  SPEED_THRESHOLD: 20,
};
const POS_STIFFNESS = CURSOR_MORPH_SPRINGS.POS_STIFFNESS;
const POS_DAMPING = CURSOR_MORPH_SPRINGS.POS_DAMPING;
const MORPH_STIFFNESS = CURSOR_MORPH_SPRINGS.MORPH_STIFFNESS;
const MORPH_DAMPING = CURSOR_MORPH_SPRINGS.MORPH_DAMPING;
const MAX_STRETCH = CURSOR_MORPH_SPRINGS.MAX_STRETCH;
const MAX_SQUASH = CURSOR_MORPH_SPRINGS.MAX_SQUASH;
const VELOCITY_SCALE = CURSOR_MORPH_SPRINGS.VELOCITY_SCALE;

const CARDS = [
  { title: "Craft Portfolio", subtitle: "Design systems and interaction" },
  { title: "Motion Library", subtitle: "Spring physics and easing curves" },
  { title: "Component Toolkit", subtitle: "Reusable UI primitives" },
  { title: "Brand Guidelines", subtitle: "Typography and color systems" },
];

export function CursorMorph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const [onCard, setOnCard] = useState(false);
  const morphTargetRef = useRef(1); // 1 = circle, 0 = arrow
  const morphTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const circle = circleRef.current;
    const arrow = arrowRef.current;
    if (!wrap || !circle || !arrow) return;

    // Spring state
    let posX = 0, posY = 0;
    let velX = 0, velY = 0;
    let targetX = 0, targetY = 0;
    let morphScale = 1; // 1 = circle visible, 0 = collapsed
    let morphVel = 0;
    let initialized = false;
    let lastTime = 0;
    let lastAngle = 0;
    const SPEED_THRESHOLD = 20;

    // Arrow entrance spring
    const ARROW_STIFFNESS = 300;
    const ARROW_DAMPING = 15;
    let arrowScale = 0;
    let arrowVel = 0;
    let arrowTarget = 0;

    // Inject cursor:none
    const style = document.createElement("style");
    style.textContent = "* { cursor: none !important; }";
    document.head.appendChild(style);

    const handleMove = (e: MouseEvent) => {
      targetX = e.clientX - CIRCLE_SIZE / 2;
      targetY = e.clientY - CIRCLE_SIZE / 2;
      if (!initialized) {
        initialized = true;
        posX = targetX;
        posY = targetY;
        wrap.style.opacity = "1";
      }
    };

    let rafId: number;
    const loop = (now: number) => {
      // Real dt for consistent feel across refresh rates
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.033) : 0.016;
      lastTime = now;

      if (initialized) {
        // Position springs
        const forceX = -POS_STIFFNESS * (posX - targetX) - POS_DAMPING * velX;
        const forceY = -POS_STIFFNESS * (posY - targetY) - POS_DAMPING * velY;
        velX += forceX * dt;
        velY += forceY * dt;
        posX += velX * dt;
        posY += velY * dt;

        // Morph spring (circle scale) — reads from ref directly
        const morphForce = -MORPH_STIFFNESS * (morphScale - morphTargetRef.current) - MORPH_DAMPING * morphVel;
        morphVel += morphForce * dt;
        morphScale += morphVel * dt;

        // Arrow entrance spring (triggers when circle fully collapsed)
        arrowTarget = morphScale < 0.05 ? 1 : 0;
        const arrowForce = -ARROW_STIFFNESS * (arrowScale - arrowTarget) - ARROW_DAMPING * arrowVel;
        arrowVel += arrowForce * dt;
        arrowScale += arrowVel * dt;

        // Velocity-aware deformation
        const speed = Math.sqrt(velX * velX + velY * velY);
        const stretchFactor = Math.min(speed * VELOCITY_SCALE, 1);
        const scaleAlong = 1 + (MAX_STRETCH - 1) * stretchFactor;
        const scalePerp = 1 - (1 - MAX_SQUASH) * stretchFactor;

        // Stable rotation angle — blend to 0 at low speed to avoid flicker
        if (speed > SPEED_THRESHOLD) {
          lastAngle = Math.atan2(velY, velX);
        } else {
          lastAngle += (0 - lastAngle) * Math.min(1, 8 * dt);
        }

        // Apply transforms
        wrap.style.transform = `translate(${posX}px, ${posY}px)`;

        // Circle: asymmetric morph (X collapses faster → narrows into line)
        const ms = Math.max(0, Math.min(1, morphScale));
        const morphX = Math.pow(ms, 1.8);
        const morphY = Math.pow(ms, 0.7);
        const angleDeg = (lastAngle * 180) / Math.PI;
        circle.style.transform = `rotate(${angleDeg}deg) scale(${scaleAlong * morphX}, ${scalePerp * morphY})`;

        // Arrow: spring-driven entrance with overshoot
        const as = Math.max(0, arrowScale);
        arrow.style.opacity = `${Math.min(1, as)}`;
        arrow.style.transform = `scale(${as})`;
      }

      rafId = requestAnimationFrame(loop);
    };

    document.addEventListener("mousemove", handleMove);
    rafId = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafId);
      style.remove();
    };
  }, []);

  // Sync onCard state directly to the mutable ref (no DOM roundtrip)
  useEffect(() => {
    morphTargetRef.current = onCard ? 0 : 1;
  }, [onCard]);

  // Card hover detection
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

      {/* Spring-driven custom cursor */}
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
        {/* Arrow layer */}
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
          }}
        >
          {"\u2192"}
        </div>

        {/* Circle layer — deforms with velocity */}
        <div
          ref={circleRef}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "white",
            transformOrigin: "center center",
          }}
        />
      </div>

      {/* Cards */}
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
