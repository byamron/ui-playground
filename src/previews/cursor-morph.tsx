import { useEffect, useRef, useState } from "react";
import {
  ARROW_FONT_SIZE,
  CIRCLE_SIZE,
  CURSOR_MORPH_SPRINGS as S,
} from "../demos/cursor-morph/CursorMorph";
import type { PreviewProps } from "./_shared";

// Same renderer as the demo (same spring constants, same DOM, same mixBlendMode)
// but container-local + driven by an autoplay loop instead of real mouse.
export default function CursorMorphPreview({ active, intense }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const morphTargetRef = useRef(1); // 1 = circle, 0 = arrow
  const [onCard, setOnCard] = useState(false);

  // Same spring loop as the demo, scaled to use container-local coords.
  useEffect(() => {
    if (!active) return;
    const wrap = wrapRef.current;
    const circle = circleRef.current;
    const arrow = arrowRef.current;
    const container = containerRef.current;
    if (!wrap || !circle || !arrow || !container) return;

    let posX = 0, posY = 0;
    let velX = 0, velY = 0;
    let targetX = 0, targetY = 0;
    let morphScale = 1;
    let morphVel = 0;
    let arrowScale = 0;
    let arrowVel = 0;
    let arrowTarget = 0;
    let lastTime = 0;
    let lastAngle = 0;
    let initialized = false;

    const setTarget = (x: number, y: number) => {
      targetX = x - CIRCLE_SIZE / 2;
      targetY = y - CIRCLE_SIZE / 2;
      if (!initialized) {
        initialized = true;
        posX = targetX;
        posY = targetY;
        wrap.style.opacity = "1";
      }
    };

    let rafId = 0;
    const loop = (now: number) => {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.033) : 0.016;
      lastTime = now;

      if (initialized) {
        const forceX = -S.POS_STIFFNESS * (posX - targetX) - S.POS_DAMPING * velX;
        const forceY = -S.POS_STIFFNESS * (posY - targetY) - S.POS_DAMPING * velY;
        velX += forceX * dt;
        velY += forceY * dt;
        posX += velX * dt;
        posY += velY * dt;

        const morphForce =
          -S.MORPH_STIFFNESS * (morphScale - morphTargetRef.current) -
          S.MORPH_DAMPING * morphVel;
        morphVel += morphForce * dt;
        morphScale += morphVel * dt;

        arrowTarget = morphScale < 0.05 ? 1 : 0;
        const arrowForce =
          -S.ARROW_STIFFNESS * (arrowScale - arrowTarget) -
          S.ARROW_DAMPING * arrowVel;
        arrowVel += arrowForce * dt;
        arrowScale += arrowVel * dt;

        const speed = Math.sqrt(velX * velX + velY * velY);
        const stretchFactor = Math.min(speed * S.VELOCITY_SCALE, 1);
        const scaleAlong = 1 + (S.MAX_STRETCH - 1) * stretchFactor;
        const scalePerp = 1 - (1 - S.MAX_SQUASH) * stretchFactor;

        if (speed > S.SPEED_THRESHOLD) {
          lastAngle = Math.atan2(velY, velX);
        } else {
          lastAngle += (0 - lastAngle) * Math.min(1, 8 * dt);
        }

        wrap.style.transform = `translate(${posX}px, ${posY}px)`;
        const ms = Math.max(0, Math.min(1, morphScale));
        const morphX = Math.pow(ms, 1.8);
        const morphY = Math.pow(ms, 0.7);
        const angleDeg = (lastAngle * 180) / Math.PI;
        circle.style.transform = `rotate(${angleDeg}deg) scale(${scaleAlong * morphX}, ${scalePerp * morphY})`;

        const as = Math.max(0, arrowScale);
        arrow.style.opacity = `${Math.min(1, as)}`;
        arrow.style.transform = `scale(${as})`;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    // Expose setter so the autoplay effect can drive it.
    (container as any).__setCursor = setTarget;
    return () => {
      cancelAnimationFrame(rafId);
      (container as any).__setCursor = null;
    };
  }, [active]);

  // Autoplay: cursor traces a path that enters and exits the card,
  // demonstrating both the velocity stretch and the circle→arrow morph.
  useEffect(() => {
    if (!active || !intense) {
      setOnCard(false);
      morphTargetRef.current = 1;
      return;
    }
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container || !card) return;

    const CYCLE = 2800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = ((now - start) % CYCLE) / CYCLE;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const cardRect = {
        x: card.offsetLeft,
        y: card.offsetTop,
        w: card.offsetWidth,
        h: card.offsetHeight,
      };

      let x: number, y: number, over: boolean;
      // Path: enter card → traverse → exit → swing back
      if (t < 0.18) {
        // approach from left
        const e = t / 0.18;
        x = e * (cardRect.x + 24);
        y = ch * 0.5;
        over = false;
      } else if (t < 0.55) {
        // inside the card, drift across
        const e = (t - 0.18) / 0.37;
        x = cardRect.x + 24 + e * (cardRect.w - 48);
        y = cardRect.y + cardRect.h * (0.45 + Math.sin(e * Math.PI) * 0.15);
        over = true;
      } else if (t < 0.72) {
        // exit right
        const e = (t - 0.55) / 0.17;
        x = cardRect.x + cardRect.w - 24 + e * 80;
        y = ch * 0.5;
        over = false;
      } else {
        // swing back to start
        const e = (t - 0.72) / 0.28;
        x = cardRect.x + cardRect.w + 56 - e * (cardRect.x + cardRect.w + 56);
        y = ch * 0.5;
        over = false;
      }
      const setter = (container as any).__setCursor as
        | ((x: number, y: number) => void)
        | null;
      if (setter) setter(x, y);
      setOnCard(over);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, intense]);

  useEffect(() => {
    morphTargetRef.current = onCard ? 0 : 1;
  }, [onCard]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Card — minimal, same look as demo */}
      <div
        ref={cardRef}
        style={{
          padding: "16px 24px",
          borderRadius: 12,
          border: `1px solid rgba(255,255,255,${onCard ? 0.15 : 0.06})`,
          background: "transparent",
          maxWidth: 200,
          transition: "border-color 0.2s",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.96)" }}>
          Motion Library
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
          Spring physics & easing
        </div>
      </div>

      {/* Cursor — identical DOM structure to the demo, container-local instead of fixed */}
      <div
        ref={wrapRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          pointerEvents: "none",
          opacity: 0,
          willChange: "transform, opacity",
          mixBlendMode: "difference",
        }}
      >
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
          {"→"}
        </div>
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
    </div>
  );
}
