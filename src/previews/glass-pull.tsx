import { useEffect, useRef } from "react";
import {
  GLASS_PULL_DEFAULTS,
  glassPullCSS,
  setupGlassHighlight,
  type TunableConfig,
} from "../demos/glass-pull/GlassPull";
import type { PreviewProps } from "./_shared";

// Real glass-pull system, two cards. Idle: no pill. Hover: synthetic cursor
// cycles between the cards, driving the actual spring + pull-target system.
export default function GlassPullPreview({ active, intense }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<TunableConfig>({ ...GLASS_PULL_DEFAULTS });

  // Mount the real highlight system whenever the tile is in view.
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    return setupGlassHighlight(container, configRef);
  }, [active]);

  // Autoplay loop — only runs while hovered.
  useEffect(() => {
    if (!intense || !active) return;
    const container = containerRef.current;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll<HTMLElement>("[data-link-card]"),
    );
    if (items.length < 2) return;

    const CYCLE = 2400; // ms — full round trip
    const start = performance.now();

    const fire = (target: EventTarget, type: string, x: number, y: number) => {
      target.dispatchEvent(
        new MouseEvent(type, {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
    };

    let lastTarget: HTMLElement | null = null;
    let raf = 0;

    const tick = (now: number) => {
      const t = ((now - start) % CYCLE) / CYCLE;
      // 0..0.5 = on item 0, 0.5..1 = on item 1; within each, sweep L→R then R→L
      const onFirst = t < 0.5;
      const local = onFirst ? t * 2 : (t - 0.5) * 2; // 0..1 within each half
      // Cursor traces a horizontal arc with a touch of vertical wobble so the
      // pull (top/bottom edge) gets exercised.
      const target = items[onFirst ? 0 : 1];
      const rect = target.getBoundingClientRect();
      const x = rect.left + 12 + (rect.width - 24) * local;
      const wobble = Math.sin(local * Math.PI * 2) * (rect.height * 0.18);
      const y = rect.top + rect.height / 2 + wobble;

      if (lastTarget !== target) {
        fire(target, "mouseover", x, y);
        lastTarget = target;
      }
      fire(container, "mousemove", x, y);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // Fade the pill out cleanly when hover ends.
      container.dispatchEvent(
        new MouseEvent("mouseleave", {
          bubbles: false,
          relatedTarget: document.body,
        }),
      );
      lastTarget = null;
    };
  }, [intense, active]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      <style>{glassPullCSS()}</style>
      <div
        ref={containerRef}
        className="glass-list"
        style={{ width: "100%" }}
      >
        <div className="glass-item" data-link-card>
          Projects
        </div>
        <div className="glass-item" data-link-card>
          Settings
        </div>
      </div>
    </div>
  );
}
