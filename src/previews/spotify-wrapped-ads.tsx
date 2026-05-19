import { useEffect, useState } from "react";
import {
  WRAPPED_CARDS,
  WRAPPED_FONT,
} from "../demos/spotify-wrapped-ads/SpotifyWrappedAds";
import type { PreviewProps } from "./_shared";

// One real wrapped story card at preview scale, cycling on hover.
export default function SpotifyWrappedAdsPreview({ active, intense }: PreviewProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active || !intense) return;
    const PERIOD = 2200;
    let raf = 0;
    const start = performance.now();
    let lastI = -1;
    const tick = (now: number) => {
      const i = Math.floor((now - start) / PERIOD) % (WRAPPED_CARDS.length - 1);
      if (i !== lastI) {
        lastI = i;
        setIdx(i);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, intense]);

  const card = WRAPPED_CARDS[idx];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        position: "relative",
        background: card.gradient,
        transition: "background 0.4s",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        color: "white",
        fontFamily: WRAPPED_FONT,
        padding: "8px 14px",
        boxSizing: "border-box",
      }}
    >
      {card.stat && (
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            opacity: 0.7,
            marginBottom: 6,
          }}
        >
          {card.stat}
        </div>
      )}
      <div
        style={{
          fontSize: card.value.length > 8 ? 22 : 36,
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {card.value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          opacity: 0.85,
          lineHeight: 1.3,
        }}
      >
        {card.subtitle}
      </div>
    </div>
  );
}
