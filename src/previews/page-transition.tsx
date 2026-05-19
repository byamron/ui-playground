import { useEffect, useState } from "react";
import {
  PAGE_TRANSITION_ARROW_MS,
  PtArrowGlyph,
  PtKeyframes,
} from "../demos/page-transition/PageTransition";
import type { PreviewProps } from "./_shared";

// Real card row from the demo. On hover the arrow plays its 500ms wind-up→fly
// keyframe (same animation the demo runs on real navigation), then resets.
export default function PageTransitionPreview({ active, intense }: PreviewProps) {
  const [sliding, setSliding] = useState(false);

  useEffect(() => {
    if (!active || !intense) {
      setSliding(false);
      return;
    }
    let raf = 0;
    const PERIOD = PAGE_TRANSITION_ARROW_MS + 800;
    const start = performance.now();
    let last = -1;
    const tick = (now: number) => {
      const c = Math.floor((now - start) / PERIOD);
      if (c !== last) {
        last = c;
        setSliding(true);
        setTimeout(() => setSliding(false), PAGE_TRANSITION_ARROW_MS - 20);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, intense]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "hsl(34, 30%, 94%)",
        fontFamily: "'Onest', -apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      <PtKeyframes />
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 4px",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 400, color: "hsl(0, 0%, 7%)", lineHeight: 1.25 }}>
              Something I built
            </div>
            <div style={{ fontSize: 11, color: "hsl(0, 0%, 40%)", marginTop: 2 }}>
              Some company, 2026
            </div>
          </div>
          <span style={{ paddingRight: 4 }}>
            <PtArrowGlyph direction="right" sliding={sliding} hover={intense && !sliding} color="hsl(0, 0%, 7%)" />
          </span>
        </div>
      </div>
    </div>
  );
}
