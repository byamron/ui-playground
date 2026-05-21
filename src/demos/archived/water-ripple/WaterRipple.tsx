import { useRef, useCallback } from "react";
import { bg, demoPalettes, HUES, accent } from "../../palette";

const palette = demoPalettes["water-ripple"];
const BG = bg(palette);
const RING_COLOR = accent(HUES.sky, 45, 70);

export function WaterRipple() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<HTMLDivElement>(null);

  const spawn = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || !ripplesRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const el = document.createElement("div");
    el.className = "ripple-ring";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    ripplesRef.current.appendChild(el);

    setTimeout(() => {
      if (!ripplesRef.current) return;
      const el2 = document.createElement("div");
      el2.className = "ripple-ring ripple-ring-delayed";
      el2.style.left = `${x}px`;
      el2.style.top = `${y}px`;
      ripplesRef.current.appendChild(el2);
      el2.addEventListener("animationend", () => el2.remove());
    }, 120);

    setTimeout(() => {
      if (!ripplesRef.current) return;
      const el3 = document.createElement("div");
      el3.className = "ripple-ring ripple-ring-third";
      el3.style.left = `${x}px`;
      el3.style.top = `${y}px`;
      ripplesRef.current.appendChild(el3);
      el3.addEventListener("animationend", () => el3.remove());
    }, 240);

    el.addEventListener("animationend", () => el.remove());
  }, []);

  return (
    <div
      ref={containerRef}
      className="demo-page"
      style={{ background: BG, cursor: "pointer" }}
      onClick={(e) => spawn(e.clientX, e.clientY)}
    >
      <style>{`
        .ripple-ring {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid hsla(${HUES.sky}, 45%, 70%, 0.6);
          transform: translate(-50%, -50%) scale(0);
          animation: ripple-expand 1.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
          pointer-events: none;
        }
        .ripple-ring-delayed {
          border-color: hsla(${HUES.sky}, 45%, 70%, 0.35);
          animation-duration: 1.6s;
        }
        .ripple-ring-third {
          border-color: hsla(${HUES.sky}, 45%, 70%, 0.15);
          animation-duration: 1.8s;
        }
        @keyframes ripple-expand {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          70% {
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(40);
            opacity: 0;
          }
        }

        .water-hint {
          position: absolute;
          bottom: 60px;
          font-size: 13px;
          color: hsla(${HUES.sky}, 45%, 70%, 0.3);
          letter-spacing: 0.05em;
          pointer-events: none;
          animation: hint-fade 3s ease-in-out infinite;
        }
        @keyframes hint-fade {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <div ref={ripplesRef} style={{ position: "absolute", inset: 0 }} />
      <p className="water-hint">click anywhere</p>
    </div>
  );
}
