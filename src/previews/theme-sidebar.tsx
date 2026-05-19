import { useEffect, useRef } from "react";
import {
  THEME_ACCENTS,
  setupThemePill,
} from "../demos/theme-sidebar/ThemeSidebar";
import type { PreviewProps } from "./_shared";

// Real glass pill from the demo cycling between real color swatches.
export default function ThemeSidebarPreview({ active, intense }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    return setupThemePill(container);
  }, [active]);

  // Autoplay: cycle synthetic cursor across the swatches
  useEffect(() => {
    if (!active || !intense) return;
    const container = containerRef.current;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll<HTMLElement>("[data-sidebar-control]"),
    );
    if (!items.length) return;

    const PER = 700; // ms per swatch
    const start = performance.now();
    let raf = 0;
    let lastIdx = -1;

    const fire = (target: EventTarget, type: string, x: number, y: number) => {
      target.dispatchEvent(
        new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, view: window }),
      );
    };

    const tick = (now: number) => {
      const idx = Math.floor((now - start) / PER) % items.length;
      const target = items[idx];
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (idx !== lastIdx) {
        fire(target, "mouseover", x, y);
        lastIdx = idx;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      container.dispatchEvent(
        new MouseEvent("mouseleave", { bubbles: false, relatedTarget: document.body }),
      );
    };
  }, [active, intense]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 18,
          padding: "12px 18px",
        }}
      >
        {THEME_ACCENTS.map((item) => (
          <button
            key={item.color}
            data-sidebar-control
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: item.swatch,
              border: "none",
              padding: 0,
              cursor: "default",
            }}
          />
        ))}
      </div>
    </div>
  );
}
