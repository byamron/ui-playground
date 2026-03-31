import { useRef, useState, useEffect, useCallback } from "react";
import { bg, demoPalettes, glass, text, HUES } from "../../palette";

const ITEMS = [
  "Design Systems",
  "Motion Design",
  "Interaction",
  "Prototyping",
  "Visual Design",
  "User Research",
];

const LERP_SPEED = 0.12;
const STRETCH_AMOUNT = 0.06;
const SQUASH_AMOUNT = 0.03;
const PULL_STRENGTH = 0.15;
const EDGE_ZONE = 0.25;

export function GlassPull() {
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const currentRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const targetRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const animate = useCallback(() => {
    if (!pillRef.current || !listRef.current) return;
    const c = currentRef.current;
    const t = targetRef.current;

    c.x = lerp(c.x, t.x, LERP_SPEED);
    c.y = lerp(c.y, t.y, LERP_SPEED);
    c.w = lerp(c.w, t.w, LERP_SPEED);
    c.h = lerp(c.h, t.h, LERP_SPEED);

    // Calculate velocity for stretch
    const dx = t.x - c.x;
    const dy = t.y - c.y;
    const velocity = Math.sqrt(dx * dx + dy * dy);

    // Stretch in direction of movement, squash perpendicular
    const stretchX = 1 + Math.min(velocity * STRETCH_AMOUNT, 0.15);
    const stretchY = 1 / stretchX; // Volume preservation

    // Pull toward cursor at edges
    let pullX = 0;
    if (activeRef.current) {
      const listRect = listRef.current.getBoundingClientRect();
      const mx = mouseRef.current.x - listRect.left;
      const pillCenterX = c.x + c.w / 2;
      const relX = (mx - pillCenterX) / (c.w / 2);
      if (Math.abs(relX) > 1 - EDGE_ZONE) {
        pullX = relX * PULL_STRENGTH * c.w * 0.1;
      }
    }

    pillRef.current.style.transform = `translate(${c.x + pullX}px, ${c.y}px) scaleX(${stretchX}) scaleY(${stretchY})`;
    pillRef.current.style.width = `${c.w}px`;
    pillRef.current.style.height = `${c.h}px`;

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate]);

  const handleMouseEnter = (e: React.MouseEvent, index: number) => {
    const el = e.currentTarget as HTMLElement;
    const listRect = listRef.current!.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    targetRef.current = {
      x: elRect.left - listRect.left - 6,
      y: elRect.top - listRect.top - 4,
      w: elRect.width + 12,
      h: elRect.height + 8,
    };

    if (!activeRef.current) {
      // Snap on first hover (no animation from off-screen)
      Object.assign(currentRef.current, targetRef.current);
      activeRef.current = true;
    }

    setHoveredIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseLeave = () => {
    activeRef.current = false;
    setHoveredIndex(null);
  };

  const BG = bg(demoPalettes["glass-pull"]);
  const g = glass(HUES.violet);

  return (
    <div className="demo-page" style={{ background: BG }}>
      <style>{`
        .glass-pill {
          position: absolute;
          top: 0;
          left: 0;
          border-radius: 10px;
          background: ${g.fill};
          backdrop-filter: blur(8px) saturate(1.2);
          border: 1px solid ${g.border};
          box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.15), inset 0 -0.5px 0 rgba(0,0,0,0.08);
          pointer-events: none;
          transform-origin: center center;
          transition: opacity 0.2s;
        }
        .glass-item {
          padding: 14px 24px;
          font-size: 15px;
          color: ${text.dark.tertiary};
          cursor: default;
          position: relative;
          z-index: 1;
          transition: color 0.15s;
          user-select: none;
        }
        .glass-item[data-hovered="true"] {
          color: ${text.dark.primary};
        }
      `}</style>
      <div
        ref={listRef}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={pillRef}
          className="glass-pill"
          style={{ opacity: activeRef.current || hoveredIndex !== null ? 1 : 0 }}
        />
        {ITEMS.map((item, i) => (
          <div
            key={item}
            className="glass-item"
            data-hovered={hoveredIndex === i}
            onMouseEnter={(e) => handleMouseEnter(e, i)}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
