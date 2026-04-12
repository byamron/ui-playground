import { useEffect, useRef, useState, useCallback } from "react";
import { bg, demoPalettes, text } from "../../palette";

/**
 * Software Companion Zoo — a zoo for software companion animals through the ages.
 * Each companion behaves authentically to its original context.
 *
 * Companions:
 * - Clippy (Office '97) — taps on window, parks at bottom-right
 * - Figpal (Figma) — follows cursor with lerp, smooth and friendly
 * - Classic Mac Finder — eyes follow cursor
 * - Bonzi Buddy — sits on edge, waves occasionally
 */

const BG = bg(demoPalettes["companion-zoo"]);

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface CompanionDef {
  id: string;
  name: string;
  era: string;
  description: string;
}

const COMPANIONS: CompanionDef[] = [
  { id: "clippy", name: "Clippy", era: "1997", description: "It looks like you're trying to browse. Would you like help?" },
  { id: "figpal", name: "Figpal", era: "2024", description: "Your friendly design companion" },
  { id: "finder", name: "Happy Mac", era: "1984", description: "The original face of personal computing" },
  { id: "bonzi", name: "Bonzi Buddy", era: "1999", description: "Your internet friend (not malware, we promise)" },
];

// ═══════════════════════════════════════════════════════════════
// Clippy companion
// ═══════════════════════════════════════════════════════════════

function Clippy() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [tapping, setTapping] = useState(false);

  const messages = [
    "It looks like you're writing a letter. Would you like help?",
    "I see you're procrastinating. Want me to open Solitaire?",
    "You've been staring at the screen for 10 minutes. Are you okay?",
    "It looks like you're ignoring me. That's fine. I'll just wait here.",
  ];

  useEffect(() => {
    // Clippy appears after a delay, taps, then shows a message
    const showTimer = setTimeout(() => {
      setTapping(true);
      setTimeout(() => {
        setTapping(false);
        setVisible(true);
        setMessage(messages[0]);
      }, 800);
    }, 1500);

    return () => clearTimeout(showTimer);
  }, []);

  // Clippy cycles through messages unprompted — authentically annoying
  useEffect(() => {
    if (!visible) return;
    let msgIdx = 0;
    const interval = setInterval(() => {
      setTapping(true);
      setTimeout(() => {
        setTapping(false);
        msgIdx = (msgIdx + 1) % messages.length;
        setMessage(messages[msgIdx]);
      }, 500);
    }, 4000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Clippy body — parked at bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          transition: "transform 0.3s ease",
          transform: tapping ? "translateY(-5px)" : "translateY(0)",
        }}
        onClick={() => {
          const idx = messages.indexOf(message);
          setMessage(messages[(idx + 1) % messages.length]);
        }}
      >
        {/* Speech bubble */}
        {visible && (
          <div
            style={{
              background: "#FFFDE7",
              border: "2px solid #333",
              borderRadius: 8,
              padding: "10px 14px",
              maxWidth: 200,
              fontSize: 12,
              fontFamily: "'MS Sans Serif', 'Tahoma', sans-serif",
              color: "#333",
              marginBottom: 8,
              position: "relative",
              lineHeight: 1.4,
              boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
            }}
          >
            {message}
            {/* Triangle pointer */}
            <div
              style={{
                position: "absolute",
                bottom: -10,
                left: "50%",
                marginLeft: -5,
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "10px solid #333",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -7,
                left: "50%",
                marginLeft: -4,
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "8px solid #FFFDE7",
              }}
            />
          </div>
        )}

        {/* Clippy SVG — paperclip character */}
        <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
          {/* Wire body */}
          <path
            d="M30 75 C30 75, 20 65, 20 50 C20 35, 40 35, 40 45 C40 55, 25 55, 25 45 C25 35, 35 30, 35 20"
            stroke="#8B8B8B"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Eyes */}
          <ellipse cx="23" cy="18" rx="6" ry="8" fill="white" stroke="#666" strokeWidth="1.5" />
          <ellipse cx="37" cy="18" rx="6" ry="8" fill="white" stroke="#666" strokeWidth="1.5" />
          <circle cx="24" cy="18" r="3" fill="#333" />
          <circle cx="38" cy="18" r="3" fill="#333" />
          <circle cx="25" cy="17" r="1" fill="white" />
          <circle cx="39" cy="17" r="1" fill="white" />
          {/* Eyebrows */}
          <path d="M18 10 Q23 7, 28 10" stroke="#666" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M32 10 Q37 7, 42 10" stroke="#666" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Figpal companion
// ═══════════════════════════════════════════════════════════════

function Figpal({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const posRef = useRef({ x: 150, y: 150 });
  const mouseRef = useRef({ x: 150, y: 150 });
  const figpalRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const loop = () => {
      const lerp = 0.08;
      posRef.current.x += (mouseRef.current.x - posRef.current.x) * lerp;
      posRef.current.y += (mouseRef.current.y - posRef.current.y) * lerp;

      if (figpalRef.current) {
        figpalRef.current.style.transform = `translate(${posRef.current.x - 28}px, ${posRef.current.y - 28}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    container.addEventListener("mousemove", handleMove);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      container.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  return (
    <div
      ref={figpalRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 56,
        height: 56,
        pointerEvents: "none",
        willChange: "transform",
      }}
    >
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="12" width="48" height="40" rx="20" fill="white" />
        <circle cx="24" cy="30" r="4" fill="#1a1a1a" />
        <circle cx="25.5" cy="28.5" r="1.5" fill="white" />
        <circle cx="40" cy="30" r="4" fill="#1a1a1a" />
        <circle cx="41.5" cy="28.5" r="1.5" fill="white" />
        <path d="M26 38 Q32 43 38 38" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Happy Mac (Finder) companion — eyes follow cursor
// ═══════════════════════════════════════════════════════════════

function HappyMac({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const faceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent) => {
      if (!faceRef.current) return;
      const rect = faceRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = 7;
      const scale = Math.min(maxOffset / dist, 1);
      setEyeOffset({ x: dx * scale, y: dy * scale });
    };

    container.addEventListener("mousemove", handleMove);
    return () => container.removeEventListener("mousemove", handleMove);
  }, [containerRef]);

  return (
    <div
      ref={faceRef}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      {/* Classic Mac shape */}
      <svg width="120" height="140" viewBox="0 0 120 140" fill="none">
        {/* Monitor body */}
        <rect x="10" y="5" width="100" height="100" rx="8" fill="#C5B9A8" stroke="#8B7D6B" strokeWidth="2" />
        {/* Screen */}
        <rect x="18" y="13" width="84" height="72" rx="4" fill="#4A7C4F" />
        {/* Face on screen */}
        {/* Eyes */}
        <ellipse cx="42" cy="40" rx="6" ry="7" fill="#2A5A2E" />
        <circle cx={42 + eyeOffset.x} cy={40 + eyeOffset.y} r="3" fill="#1a3a1e" />
        <ellipse cx="78" cy="40" rx="6" ry="7" fill="#2A5A2E" />
        <circle cx={78 + eyeOffset.x} cy={40 + eyeOffset.y} r="3" fill="#1a3a1e" />
        {/* Nose */}
        <path d="M58 50 L60 55 L62 50" stroke="#2A5A2E" strokeWidth="1.5" fill="none" />
        {/* Smile */}
        <path d="M45 58 Q60 70 75 58" stroke="#2A5A2E" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Floppy slot */}
        <rect x="40" y="92" width="40" height="4" rx="2" fill="#8B7D6B" />
        {/* Stand */}
        <rect x="45" y="105" width="30" height="8" rx="2" fill="#8B7D6B" />
        <rect x="35" y="113" width="50" height="6" rx="3" fill="#A89880" />
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Bonzi Buddy companion
// ═══════════════════════════════════════════════════════════════

function BonziBuddy() {
  const [waving, setWaving] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaving(true);
      setTimeout(() => setWaving(false), 1000);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <svg width="100" height="120" viewBox="0 0 100 120" fill="none">
        {/* Body */}
        <ellipse cx="50" cy="70" rx="30" ry="35" fill="#7B2D8E" />
        {/* Belly */}
        <ellipse cx="50" cy="75" rx="18" ry="22" fill="#9B4DAE" />
        {/* Head */}
        <circle cx="50" cy="35" r="22" fill="#7B2D8E" />
        {/* Face */}
        <ellipse cx="50" cy="38" rx="16" ry="14" fill="#C4A882" />
        {/* Eyes */}
        <ellipse cx="43" cy="34" rx="5" ry="6" fill="white" />
        <ellipse cx="57" cy="34" rx="5" ry="6" fill="white" />
        <circle cx="44" cy="34" r="3" fill="#1a1a1a" />
        <circle cx="58" cy="34" r="3" fill="#1a1a1a" />
        <circle cx="44.5" cy="33" r="1" fill="white" />
        <circle cx="58.5" cy="33" r="1" fill="white" />
        {/* Mouth */}
        <path d="M43 44 Q50 50 57 44" stroke="#5A3A2A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Left arm — uses transform for Safari compat */}
        <g
          style={{
            transformOrigin: "22px 60px",
            transform: waving ? "rotate(60deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <path d="M22 60 Q12 65, 15 80" stroke="#7B2D8E" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>
        {/* Right arm */}
        <path d="M78 60 Q88 65, 85 80" stroke="#7B2D8E" strokeWidth="8" strokeLinecap="round" fill="none" />
        {/* Feet */}
        <ellipse cx="38" cy="103" rx="10" ry="5" fill="#7B2D8E" />
        <ellipse cx="62" cy="103" rx="10" ry="5" fill="#7B2D8E" />
      </svg>
      {waving && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            fontStyle: "italic",
          }}
        >
          *waves*
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

const HABITAT_BG: Record<string, string> = {
  clippy: "rgba(0, 128, 128, 0.06)", // Windows teal
  figpal: "rgba(162, 89, 255, 0.04)", // Figma purple tint
  finder: "rgba(180, 170, 155, 0.06)", // System 7 platinum
  bonzi: "rgba(0, 128, 128, 0.08)", // Windows 98 teal
};

export function CompanionZoo() {

  // Create stable refs for each companion
  const clippyRef = useRef<HTMLDivElement>(null);
  const figpalRef = useRef<HTMLDivElement>(null);
  const finderRef = useRef<HTMLDivElement>(null);
  const bonziRef = useRef<HTMLDivElement>(null);

  const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
    clippy: clippyRef,
    figpal: figpalRef,
    finder: finderRef,
    bonzi: bonziRef,
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, 'Inter', sans-serif",
        padding: 40,
        gap: 32,
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: text.dark.tertiary,
            marginBottom: 8,
          }}
        >
          The Software Companion Zoo
        </h1>
        <p style={{ fontSize: 13, color: text.dark.muted, maxWidth: 360, lineHeight: 1.5 }}>
          Through the ages, software has tried to befriend us. Some succeeded. Most didn't. All are here.
        </p>
      </div>

      {/* Companion grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          width: "100%",
          maxWidth: 640,
        }}
      >
        {COMPANIONS.map((comp) => (
          <div
            key={comp.id}
            ref={(el) => {
              // @ts-ignore
              refMap[comp.id].current = el;
            }}
            style={{
              background: HABITAT_BG[comp.id] || "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: 20,
              height: 260,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Companion habitat */}
            <div style={{ height: "100%", position: "relative" }}>
              {comp.id === "clippy" && <Clippy />}
              {comp.id === "figpal" && <Figpal containerRef={refMap.figpal} />}
              {comp.id === "finder" && <HappyMac containerRef={refMap.finder} />}
              {comp.id === "bonzi" && <BonziBuddy />}
            </div>

            {/* Label */}
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                right: 16,
              }}
            >
              {/* Museum plaque */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: text.dark.primary }}>
                  {comp.name}
                  <span style={{ fontSize: 10, fontWeight: 500, color: text.dark.muted, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>
                    {comp.era}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: text.dark.tertiary,
                    marginTop: 3,
                    lineHeight: 1.4,
                    fontStyle: "italic",
                  }}
                >
                  {comp.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
