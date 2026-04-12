import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/**
 * Spotify DJ Call-In — Unhinged product concept.
 * "Call in to the AI DJ like a radio station."
 *
 * Flow: Spotify player with "Call DJ" button → tap →
 * iOS call screen (ringing → DJ picks up with a one-liner about your taste).
 * The call screen crossover is the punchline.
 */

// ═══════════════════════════════════════════════════════════════
// Design tokens
// ═══════════════════════════════════════════════════════════════

const FONT = "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif";

const SPOTIFY = {
  black: "#121212",
  darkGray: "#1A1A1A",
  cardGray: "#282828",
  green: "#1DB954",
  white: "#FFFFFF",
  textSec: "rgba(255,255,255,0.6)",
  textMuted: "rgba(255,255,255,0.3)",
};

type Phase = "player" | "ringing" | "connected";

const DJ_LINES = [
  "I'm not gonna play it again.",
  "47 plays of 'drivers license' last month. You okay?",
  "You skipped 12 songs in 3 seconds each. What are we looking for?",
  "Your taste? Chaotic neutral.",
  "You need to move on. Musically and emotionally.",
];

// ═══════════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════════

function StatusBar({ dark = true }: { dark?: boolean }) {
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

function SpotifyPlayer({ onCallDJ }: { onCallDJ: () => void }) {
  const progress = 0.35;
  const waveHeights = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => 15 + Math.sin(i * 0.5) * 15 + (((i * 7 + 13) * 37) % 10)),
  []);

  return (
    <div style={{ background: SPOTIFY.black, height: "100%", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Nav bar */}
      <div style={{ padding: "8px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
          <path d="M10 2L2 10L10 18" stroke={SPOTIFY.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontFamily: FONT, fontSize: 12, color: SPOTIFY.textSec, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Playing from DJ
        </span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="4" cy="10" r="1.5" fill={SPOTIFY.white} />
          <circle cx="10" cy="10" r="1.5" fill={SPOTIFY.white} />
          <circle cx="16" cy="10" r="1.5" fill={SPOTIFY.white} />
        </svg>
      </div>

      {/* Album art */}
      <div style={{ padding: "0 32px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "1",
            borderRadius: 8,
            background: "linear-gradient(135deg, #1a3a2a 0%, #0a1a12 50%, #2a4a3a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* DJ avatar */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1DB954 0%, #191414 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 60px rgba(29,185,84,0.3)",
            }}
          >
            <svg width="50" height="50" viewBox="0 0 50 50" fill="white" opacity="0.9">
              <path d="M25 5C14 5 5 14 5 25s9 20 20 20 20-9 20-20S36 5 25 5zm9.2 28.8c-.4.6-1 .8-1.6.4-4.4-2.7-10-3.3-16.6-1.8-.6.2-1.2-.2-1.4-.8-.2-.6.2-1.2.8-1.4 7.2-1.6 13.4-.9 18.4 2 .6.3.7 1 .4 1.6zm2.4-5.4c-.5.7-1.3 1-2 .5-5-3.1-12.8-4-18.8-2.2-.8.2-1.6-.2-1.8-1-.2-.8.2-1.6 1-1.8 6.8-2 15.4-1 21.2 2.5.6.4.8 1.3.4 2zm.2-5.6c-6-3.6-16-3.9-21.8-2.2-.9.3-1.8-.3-2-1.1-.3-.9.3-1.8 1.1-2C20.6 15.7 31.6 16 38.4 20c.8.5 1 1.5.6 2.3-.5.7-1.5 1-2.2.5z" />
            </svg>
          </div>

          {/* Waveform decoration */}
          <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", alignItems: "end", gap: 2, height: 40 }}>
            {waveHeights.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}px`,
                  background: SPOTIFY.green,
                  opacity: 0.3,
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
        </div>

        {/* Track info */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: SPOTIFY.white, fontFamily: FONT }}>
            DJ's Pick for You
          </div>
          <div style={{ fontSize: 15, color: SPOTIFY.textSec, fontFamily: FONT, marginTop: 4 }}>
            Spotify AI DJ
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, position: "relative" }}>
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                background: SPOTIFY.white,
                borderRadius: 2,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: FONT, fontSize: 11, color: SPOTIFY.textMuted }}>
            <span>1:12</span>
            <span>3:24</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginTop: 16 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill={SPOTIFY.white}>
            <path d="M6 6h12v12H6z" opacity="0" />
            <path d="M19 12L5 20V4l14 8z" transform="rotate(180 12 12)" />
          </svg>
          {/* Play/Pause */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: SPOTIFY.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={SPOTIFY.black}>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill={SPOTIFY.white}>
            <path d="M5 12l14-8v16L5 12z" />
          </svg>
        </div>

        <div style={{ flex: 1 }} />

        {/* CALL DJ BUTTON — THE JOKE TRIGGER */}
        <button
          onClick={onCallDJ}
          style={{
            width: "100%",
            padding: "16px",
            background: SPOTIFY.green,
            color: SPOTIFY.black,
            border: "none",
            borderRadius: 500,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: FONT,
            cursor: "pointer",
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill={SPOTIFY.black}>
            <path d="M3.6 7.8c1.2 2.4 3.2 4.3 5.6 5.6l1.9-1.9c.2-.2.5-.3.8-.2 1 .3 2 .5 3.1.5.4 0 .8.4.8.8V16c0 .4-.4.8-.8.8C7.2 16.8 1.2 10.8 1.2 3.8c0-.4.4-.8.8-.8h3.4c.4 0 .8.4.8.8 0 1.1.2 2.1.5 3.1.1.3 0 .6-.2.8L3.6 7.8z" />
          </svg>
          Call DJ
        </button>
      </div>
    </div>
  );
}

function CallScreen({ phase, djLine, onEnd }: { phase: "ringing" | "connected"; djLine: string; onEnd: () => void }) {
  const [dots, setDots] = useState("");
  const [timer, setTimer] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (phase === "ringing") {
      setShowMessage(false);
      const interval = setInterval(() => {
        setDots((d) => (d.length >= 3 ? "" : d + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Delay the DJ message for comedic beat
  useEffect(() => {
    if (phase === "connected") {
      const msgTimer = setTimeout(() => setShowMessage(true), 1200);
      return () => clearTimeout(msgTimer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "connected") {
      const interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #0a1a12 0%, #0a0a15 40%, #0a1510 100%)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      <StatusBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
        {/* Avatar */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1DB954 0%, #191414 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            boxShadow: phase === "connected" ? "0 0 40px rgba(29,185,84,0.4)" : "none",
            transition: "box-shadow 0.5s ease",
          }}
        >
          <span style={{ fontSize: 48 }}>🎧</span>
        </div>

        <div style={{ fontSize: 34, fontWeight: 300, color: "#fff", marginBottom: 4, letterSpacing: "0.2px" }}>
          Spotify DJ
        </div>

        {phase === "ringing" ? (
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>
            Ringing{dots}
          </div>
        ) : (
          <div style={{ fontSize: 16, color: SPOTIFY.green }}>
            {formatTime(timer)}
          </div>
        )}

        {/* DJ message bubble — delayed for comedic beat */}
        {showMessage && (
          <div
            style={{
              marginTop: 40,
              padding: "16px 20px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 16,
              borderTopLeftRadius: 4,
              maxWidth: 300,
              fontSize: 15,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
              animation: "fadeSlideIn 0.4s ease",
            }}
          >
            "{djLine}"
          </div>
        )}
      </div>

      {/* Call controls */}
      <div style={{ padding: "0 40px 60px", display: "flex", justifyContent: "center", gap: 48 }}>
        {phase === "connected" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 24 }}>🔇</span>
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Mute</span>
          </div>
        )}

        {/* End call */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <button
            onClick={onEnd}
            style={{
              width: 72,
              height: 56,
              borderRadius: 28,
              background: "#FF3B30",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08C.11 12.9 0 12.65 0 12.38c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>End</span>
        </div>

        {phase === "connected" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 24 }}>🔊</span>
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Speaker</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function SpotifyDJ() {
  const [screen, setScreen] = useState<"player" | "call">("player");
  const [callPhase, setCallPhase] = useState<"ringing" | "connected">("ringing");
  const [djLine, setDjLine] = useState("");
  const ringTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startCall = useCallback(() => {
    setScreen("call");
    setCallPhase("ringing");
    setDjLine(DJ_LINES[Math.floor(Math.random() * DJ_LINES.length)]);

    // Auto-connect after ringing
    ringTimeout.current = setTimeout(() => {
      setCallPhase("connected");
    }, 2500);
  }, []);

  const endCall = useCallback(() => {
    if (ringTimeout.current) clearTimeout(ringTimeout.current);
    setScreen("player");
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A0A",
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
          background: SPOTIFY.black,
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
            zIndex: 20,
          }}
        />

        {screen === "player" ? (
          <SpotifyPlayer onCallDJ={startCall} />
        ) : (
          <CallScreen phase={callPhase} djLine={djLine} onEnd={endCall} />
        )}
      </div>
    </div>
  );
}
