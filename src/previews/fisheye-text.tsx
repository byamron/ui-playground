import { useEffect, useState } from "react";
import { useFisheyeSprings } from "../demos/fisheye-text/FisheyeText";
import type { PreviewProps } from "./_shared";

const WORD = "proximity";
const PREVIEW_FONT_SIZE = 30;

export default function FisheyeTextPreview({ active, intense }: PreviewProps) {
  const [hoveredChar, setHoveredChar] = useState<number | null>(null);
  const registerChar = useFisheyeSprings(WORD, hoveredChar, {
    fontSize: PREVIEW_FONT_SIZE,
  });

  // Autoplay sweep: cycle the lens across letters on hover.
  useEffect(() => {
    if (!active || !intense) {
      setHoveredChar(null);
      return;
    }
    const start = performance.now();
    const PER_CHAR = 280; // ms per char
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const idx = Math.floor(elapsed / PER_CHAR) % (WORD.length + 2);
      setHoveredChar(idx < WORD.length ? idx : null);
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        fontFamily: "'Recursive', 'SF Mono', monospace",
        fontSize: PREVIEW_FONT_SIZE,
        fontWeight: 400,
        color: "rgba(255,255,255,0.92)",
        fontVariationSettings: "'wdth' 100",
        lineHeight: 1.4,
        userSelect: "none",
      }}
    >
      {WORD.split("").map((char, i) => (
        <span
          key={i}
          ref={registerChar(i)}
          style={{
            display: "inline-block",
            transformOrigin: "center bottom",
            willChange: "transform, font-variation-settings",
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
