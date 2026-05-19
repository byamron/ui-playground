import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Strava → Flight Redemption — Unhinged product concept.
 * "Redeem your running/cycling miles as airline miles."
 *
 * Flow: Strava activity summary with "Redeem Miles" CTA →
 * tap → app-switch animation to airline app showing Strava miles as balance.
 * The app-switch moment IS the joke — two worlds colliding.
 */

// ═══════════════════════════════════════════════════════════════
// Design tokens
// ═══════════════════════════════════════════════════════════════

const FONT = "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif";

export const STRAVA_TOKENS = {
  orange: "#FC4C02",
  orangeLight: "#FF6B35",
  bg: "#FFFFFF",
  text: "#242428",
  textSec: "#6D6D78",
  border: "#E8E8E8",
  cardBg: "#F7F7FA",
};

export const AIRLINE_TOKENS = {
  purple: "#003A70",
  purpleDark: "#00234A",
  gold: "#C8A951",
  bg: "#F5F5F5",
  text: "#1A1A2E",
  textSec: "#6B6B7B",
  red: "#C41230",
  white: "#FFFFFF",
};

export const STRAVA_FONT = "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif";

const STRAVA = STRAVA_TOKENS;
const AIRLINE = AIRLINE_TOKENS;

// ═══════════════════════════════════════════════════════════════
// App switch animation states
// ═══════════════════════════════════════════════════════════════

type AppState = "strava" | "switching" | "airline";

function StatusBar({ dark = false }: { dark?: boolean }) {
  const color = dark ? "#fff" : "#000";
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(" ", "");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 24px 8px",
        fontFamily: FONT,
        fontSize: 15,
        fontWeight: 600,
        color,
      }}
    >
      <span>{time}</span>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <rect x="0" y="9" width="3" height="3" rx="0.5" fill={color} />
          <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill={color} />
          <rect x="9" y="3" width="3" height="9" rx="0.5" fill={color} />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill={color} />
        </svg>
        <svg width="27" height="12" viewBox="0 0 27 12">
          <rect x="0" y="1" width="23" height="10" rx="2.5" stroke={color} strokeWidth="1" fill="none" />
          <rect x="1.5" y="2.5" width="20" height="7" rx="1.5" fill={color} opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Strava screen
// ═══════════════════════════════════════════════════════════════

function StravaScreen({ onRedeem }: { onRedeem: () => void }) {
  return (
    <div style={{ background: STRAVA.bg, height: "100%", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Nav */}
      <div style={{ padding: "4px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
          <path d="M10 2L2 10L10 18" stroke={STRAVA.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 600, color: STRAVA.text }}>Morning Run</span>
        <div style={{ width: 12 }} />
      </div>

      {/* Map placeholder */}
      <div
        style={{
          margin: "0 16px",
          height: 240,
          borderRadius: 12,
          background: "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Route line */}
        <svg width="100%" height="100%" viewBox="0 0 360 200" fill="none" style={{ position: "absolute" }}>
          <path
            d="M40 160 C80 140, 100 60, 140 80 S200 30, 240 70 S300 50, 320 40"
            stroke={STRAVA.orange}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="40" cy="160" r="5" fill={STRAVA.orange} />
          <circle cx="320" cy="40" r="5" fill={STRAVA.orange} />
        </svg>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          margin: "20px 16px 0",
          borderBottom: `1px solid ${STRAVA.border}`,
        }}
      >
        {[
          { label: "Distance", value: "5.23", unit: "mi", primary: true },
          { label: "Pace", value: "8:42", unit: "/mi", primary: false },
          { label: "Time", value: "45:32", unit: "", primary: false },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: "16px 0",
              textAlign: "center",
              borderRight: i < 2 ? `1px solid ${STRAVA.border}` : "none",
              fontFamily: FONT,
            }}
          >
            <div style={{ fontSize: 11, color: STRAVA.textSec, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{stat.label}</div>
            <div style={{ fontSize: stat.primary ? 36 : 26, fontWeight: stat.primary ? 800 : 700, color: STRAVA.text }}>
              {stat.value}
              {stat.unit && <span style={{ fontSize: stat.primary ? 16 : 13, fontWeight: 400, color: STRAVA.textSec, marginLeft: 2 }}>{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Additional stats */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { label: "Elevation Gain", value: "142 ft" },
          { label: "Calories", value: "387" },
          { label: "Avg Heart Rate", value: "156 bpm" },
        ].map((stat) => (
          <div key={stat.label} style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT }}>
            <span style={{ fontSize: 15, color: STRAVA.textSec }}>{stat.label}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: STRAVA.text }}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Promotion banner — looks like a native Strava feature */}
      <div style={{ padding: "0 16px 32px" }}>
        <div
          onClick={onRedeem}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            background: "#FFF5EB",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: FONT,
            gap: 12,
            border: "1px solid rgba(252, 76, 2, 0.1)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: STRAVA.orange,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <path d="M14 8c0-.2-.1-.4-.2-.5l-2-2c-.3-.3-.7-.3-1 0s-.3.7 0 1l.6.5H3c-.4 0-.7.3-.7.7s.3.7.7.7h8.4l-.6.6c-.3.3-.3.7 0 1 .1.1.3.2.5.2s.4-.1.5-.2l2-2c.1-.2.2-.4.2-.6z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: STRAVA.text }}>
              New: Redeem Miles
            </div>
            <div style={{ fontSize: 12, color: STRAVA.textSec, marginTop: 1 }}>
              Convert your run into airline rewards
            </div>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M1 1L6 6L1 11" stroke={STRAVA.textSec} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Airline screen
// ═══════════════════════════════════════════════════════════════

function AirlineScreen() {
  return (
    <div style={{ background: AIRLINE.bg, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ background: AIRLINE.purple, paddingBottom: 24 }}>
        <StatusBar dark />
        {/* Airline header */}
        <div style={{ padding: "8px 20px 0", fontFamily: FONT }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: AIRLINE.white }}>SkyMiles</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Welcome back, Runner</div>
        </div>

        {/* Miles balance */}
        <div
          style={{
            margin: "20px 20px 0",
            padding: "20px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Available Miles
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, color: AIRLINE.gold, fontFamily: FONT, marginTop: 4 }}>
            5,230
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: FONT, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9 5H13L10 8L11 12L7 10L3 12L4 8L1 5H5L7 1Z" fill={STRAVA.orange} />
            </svg>
            Earned via Strava
          </div>
        </div>
      </div>

      {/* Flight option */}
      <div style={{ padding: 20, fontFamily: FONT }}>
        <div style={{ fontSize: 13, color: AIRLINE.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Available Reward Flight
        </div>

        <div
          style={{
            background: AIRLINE.white,
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid #E0E0E0`,
          }}
        >
          {/* Flight card */}
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: AIRLINE.text }}>LAX</div>
                <div style={{ fontSize: 12, color: AIRLINE.textSec }}>Los Angeles</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 40, height: 1, background: AIRLINE.textSec, opacity: 0.3 }} />
                <svg width="20" height="20" viewBox="0 0 20 20" fill={AIRLINE.purple}>
                  <path d="M18 10.5l-5-3v2H2v2h11v2l5-3z" />
                </svg>
                <div style={{ width: 40, height: 1, background: AIRLINE.textSec, opacity: 0.3 }} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: AIRLINE.text }}>LAS</div>
                <div style={{ fontSize: 12, color: AIRLINE.textSec }}>Las Vegas</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: `1px solid #F0F0F0` }}>
              <div>
                <div style={{ fontSize: 12, color: AIRLINE.textSec }}>Date</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: AIRLINE.text }}>Jun 8, 2026</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: AIRLINE.textSec }}>Class</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: AIRLINE.text }}>Basic Economy</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: AIRLINE.textSec }}>Miles Required</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: AIRLINE.text }}>5,000</div>
              </div>
            </div>
          </div>

          {/* Book button */}
          <button
            style={{
              width: "100%",
              padding: "14px",
              background: AIRLINE.purple,
              color: AIRLINE.white,
              border: "none",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: FONT,
              cursor: "pointer",
            }}
          >
            Book with Strava Miles
          </button>
        </div>

        {/* Spirit-style upsell — the secondary punchline */}
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            background: "#FFF8E1",
            borderRadius: 8,
            border: "1px solid #FFE082",
            fontSize: 13,
            color: "#5D4037",
            fontFamily: FONT,
          }}
        >
          Upgrade to a window seat for just 2 more miles (one lap around your block).
        </div>

        {/* Fine print */}
        <div style={{ marginTop: 12, fontSize: 11, color: AIRLINE.textSec, lineHeight: 1.4 }}>
          230 surplus miles will be applied to your next booking.
          1 running mile = 1,000 airline miles.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function StravaFlights() {
  const [appState, setAppState] = useState<AppState>("strava");
  const [switchProgress, setSwitchProgress] = useState(0);
  const animRef = useRef<number>(0);

  const triggerSwitch = useCallback(() => {
    setAppState("switching");
    const start = performance.now();
    const TOTAL = 900; // longer for the joke to register
    const PHASE1 = 400; // Strava shrinks back
    const HOLD = 50;   // brief dark gap
    const PHASE2 = TOTAL - PHASE1 - HOLD; // airline zooms up

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / TOTAL, 1);

      if (elapsed < PHASE1) {
        // Phase 1: Strava shrinks and blurs
        const p = elapsed / PHASE1;
        const eased = 1 - Math.pow(1 - p, 2); // ease-out
        setSwitchProgress(eased * 0.5); // 0 → 0.5
      } else if (elapsed < PHASE1 + HOLD) {
        // Hold: brief dark gap
        setSwitchProgress(0.5);
      } else {
        // Phase 2: airline zooms up
        const p = (elapsed - PHASE1 - HOLD) / PHASE2;
        const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
        setSwitchProgress(0.5 + eased * 0.5); // 0.5 → 1.0
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setAppState("airline");
        setSwitchProgress(0);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Multi-phase: 0–0.5 = Strava shrinks, 0.5 = hold, 0.5–1.0 = airline arrives
  const p = switchProgress;
  const stravaPhase = Math.min(p / 0.5, 1); // 0→1 during first half
  const airlinePhase = Math.max((p - 0.5) / 0.5, 0); // 0→1 during second half

  const stravaScale = appState === "switching" ? 1 - stravaPhase * 0.3 : appState === "airline" ? 0 : 1;
  const stravaOpacity = appState === "switching" ? 1 - stravaPhase : appState === "airline" ? 0 : 1;
  const airlineScale = appState === "switching" ? 0.8 + airlinePhase * 0.2 : appState === "airline" ? 1 : 0;
  const airlineOpacity = appState === "switching" ? airlinePhase : appState === "airline" ? 1 : 0;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1C1C1E",
        fontFamily: FONT,
      }}
    >
      {/* Phone frame */}
      <div
        style={{
          width: 393,
          height: 852,
          borderRadius: 44,
          overflow: "hidden",
          background: "#000",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 11,
            left: "50%",
            transform: "translateX(-50%)",
            width: 126,
            height: 37,
            borderRadius: 20,
            background: "#000",
            zIndex: 30,
          }}
        />

        {/* Strava layer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${stravaScale}) translateY(${appState === "switching" ? stravaPhase * 20 : 0}px)`,
            opacity: stravaOpacity,
            borderRadius: appState === "switching" ? 8 + stravaPhase * 22 : 0,
            overflow: "hidden",
            pointerEvents: appState === "strava" ? "auto" : "none",
            zIndex: 2,
          }}
        >
          <StravaScreen onRedeem={triggerSwitch} />
        </div>

        {/* Airline layer — zooms up from below */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${airlineScale}) translateY(${appState === "switching" ? (1 - airlinePhase) * 40 : 0}px)`,
            opacity: airlineOpacity,
            borderRadius: appState === "switching" ? (1 - airlinePhase) * 20 : 0,
            overflow: "hidden",
            pointerEvents: appState === "airline" ? "auto" : "none",
            zIndex: appState === "airline" ? 2 : 1,
          }}
        >
          <AirlineScreen />
        </div>

        {/* Tap to restart */}
        {appState === "airline" && (
          <div
            onClick={() => setAppState("strava")}
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 20px",
              background: "rgba(0,0,0,0.5)",
              borderRadius: 20,
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontFamily: FONT,
              cursor: "pointer",
              zIndex: 10,
              backdropFilter: "blur(10px)",
            }}
          >
            Tap to restart
          </div>
        )}
      </div>
    </div>
  );
}
