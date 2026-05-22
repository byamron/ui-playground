import { useRef, useState, useCallback, useEffect } from "react";
import { bg, demoPalettes, HUES } from "../../../palette";

const BG = bg(demoPalettes["magnetic-button"]);

export function MagneticButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const animRef = useRef<number>(0);
  const posRef = useRef({ bx: 0, by: 0, tx: 0, ty: 0 });
  const targetRef = useRef({ bx: 0, by: 0, tx: 0, ty: 0 });

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const animate = useCallback(() => {
    const p = posRef.current;
    const t = targetRef.current;
    const speed = 0.1;

    p.bx = lerp(p.bx, t.bx, speed);
    p.by = lerp(p.by, t.by, speed);
    p.tx = lerp(p.tx, t.tx, speed * 1.3);
    p.ty = lerp(p.ty, t.ty, speed * 1.3);

    if (buttonRef.current) {
      buttonRef.current.style.transform = `translate(${p.bx}px, ${p.by}px)`;
    }
    if (textRef.current) {
      textRef.current.style.transform = `translate(${p.tx}px, ${p.ty}px)`;
    }

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // Button moves toward cursor (dampened)
    targetRef.current.bx = dx * 0.3;
    targetRef.current.by = dy * 0.3;
    // Text moves more (parallax)
    targetRef.current.tx = dx * 0.15;
    targetRef.current.ty = dy * 0.15;
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    targetRef.current = { bx: 0, by: 0, tx: 0, ty: 0 };
  };

  return (
    <div
      className="demo-page"
      style={{ background: BG }}
      onMouseMove={handleMouseMove}
    >
      <style>{`
        .magnetic-zone {
          padding: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .magnetic-btn {
          padding: 18px 48px;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.03em;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          will-change: transform;
          transition: background 0.3s, border-color 0.3s;
        }
        .magnetic-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .magnetic-btn::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: radial-gradient(
            circle at var(--glow-x, 50%) var(--glow-y, 50%),
            hsla(${HUES.midnight}, 50%, 70%, 0.15) 0%,
            transparent 60%
          );
          opacity: 0;
          transition: opacity 0.3s;
        }
        .magnetic-btn:hover::before {
          opacity: 1;
        }
        .magnetic-btn span {
          position: relative;
          z-index: 1;
          display: inline-block;
          will-change: transform;
        }
      `}</style>
      <div
        className="magnetic-zone"
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setIsHovering(true)}
      >
        <button
          ref={buttonRef}
          className="magnetic-btn"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            e.currentTarget.style.setProperty("--glow-x", `${x}%`);
            e.currentTarget.style.setProperty("--glow-y", `${y}%`);
          }}
        >
          <span ref={textRef}>Get in touch</span>
        </button>
      </div>
    </div>
  );
}
