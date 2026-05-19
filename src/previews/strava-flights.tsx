import { useEffect, useState } from "react";
import {
  AIRLINE_TOKENS,
  STRAVA_FONT,
  STRAVA_TOKENS,
} from "../demos/strava-flights/StravaFlights";
import type { PreviewProps } from "./_shared";

// The hero moment: a Strava distance pill morphs into an airline miles balance.
// Same color tokens & font as the actual demo.
export default function StravaFlightsPreview({ active, intense }: PreviewProps) {
  const [phase, setPhase] = useState<"strava" | "airline">("strava");

  useEffect(() => {
    if (!active || !intense) {
      setPhase("strava");
      return;
    }
    const PERIOD = 1800;
    const start = performance.now();
    let raf = 0;
    let last: "strava" | "airline" = "strava";
    const tick = (now: number) => {
      const cycle = Math.floor((now - start) / PERIOD);
      const next = cycle % 2 === 0 ? "strava" : "airline";
      if (next !== last) {
        last = next;
        setPhase(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, intense]);

  const isStrava = phase === "strava";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: isStrava ? STRAVA_TOKENS.bg : AIRLINE_TOKENS.purple,
        transition: "background 0.5s",
        fontFamily: STRAVA_FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        pointerEvents: "none",
        padding: "0 24px",
        boxSizing: "border-box",
      }}
    >
      {isStrava ? (
        <>
          <div
            style={{
              fontSize: 10,
              color: STRAVA_TOKENS.textSec,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 2,
            }}
          >
            Distance
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, color: STRAVA_TOKENS.text, lineHeight: 1 }}>
            5.23
            <span style={{ fontSize: 18, fontWeight: 400, color: STRAVA_TOKENS.textSec, marginLeft: 4 }}>
              mi
            </span>
          </div>
          <div style={{ fontSize: 10, color: STRAVA_TOKENS.orange, marginTop: 6, fontWeight: 600, letterSpacing: "0.04em" }}>
            REDEEM →
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Available Miles
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, color: AIRLINE_TOKENS.gold, lineHeight: 1, marginTop: 2 }}>
            5,230
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 6, display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9 5H13L10 8L11 12L7 10L3 12L4 8L1 5H5L7 1Z" fill={STRAVA_TOKENS.orange} />
            </svg>
            Earned via Strava
          </div>
        </>
      )}
    </div>
  );
}
