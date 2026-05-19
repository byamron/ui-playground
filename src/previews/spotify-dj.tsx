import { useEffect, useState } from "react";
import {
  SPOTIFY_DJ_LINES,
  SPOTIFY_FONT,
  SPOTIFY_TOKENS,
} from "../demos/spotify-dj/SpotifyDJ";
import type { PreviewProps } from "./_shared";

// Compact call-screen — same avatar (gradient + glow), same DJ line, same colors.
export default function SpotifyDjPreview({ active, intense }: PreviewProps) {
  const [phase, setPhase] = useState<"ringing" | "connected">("ringing");
  const [dots, setDots] = useState("");
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    if (!active || !intense) {
      setPhase("ringing");
      setDots("");
      return;
    }
    setPhase("ringing");
    const ringDots = setInterval(
      () => setDots((d) => (d.length >= 3 ? "" : d + ".")),
      400,
    );
    const connect = setTimeout(() => {
      setPhase("connected");
      setLineIdx((i) => (i + 1) % SPOTIFY_DJ_LINES.length);
    }, 1400);
    const reset = setInterval(() => {
      setPhase("ringing");
      setDots("");
      setTimeout(() => {
        setPhase("connected");
        setLineIdx((i) => (i + 1) % SPOTIFY_DJ_LINES.length);
      }, 1200);
    }, 4500);
    return () => {
      clearInterval(ringDots);
      clearTimeout(connect);
      clearInterval(reset);
    };
  }, [active, intense]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(180deg, #0a1a12 0%, #0a0a15 40%, #0a1510 100%)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        padding: "0 18px",
        gap: 14,
        fontFamily: SPOTIFY_FONT,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1DB954 0%, #191414 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: phase === "connected" ? "0 0 24px rgba(29,185,84,0.45)" : "none",
          transition: "box-shadow 0.5s ease",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 28 }}>🎧</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 300, color: "#fff", marginBottom: 1, letterSpacing: "0.2px" }}>
          Spotify DJ
        </div>
        <div
          style={{
            fontSize: 11,
            color: phase === "connected" ? SPOTIFY_TOKENS.green : "rgba(255,255,255,0.5)",
            marginBottom: 6,
          }}
        >
          {phase === "ringing" ? `Ringing${dots}` : "0:04"}
        </div>
        {phase === "connected" && (
          <div
            style={{
              padding: "6px 10px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 10,
              borderTopLeftRadius: 3,
              fontSize: 10,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.35,
            }}
          >
            "{SPOTIFY_DJ_LINES[lineIdx]}"
          </div>
        )}
      </div>
    </div>
  );
}
