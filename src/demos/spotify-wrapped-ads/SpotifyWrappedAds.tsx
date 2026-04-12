import { useState, useRef, useCallback } from "react";

/**
 * Spotify Wrapped for Ads — Unhinged product concept.
 * "Your year in review, but for all the ads you endured."
 * 3-4 swipeable Wrapped-style story cards with ad stats humor.
 *
 * Craft challenge: Must nail Spotify Wrapped's exact visual language —
 * bold gradients, the typography, card-swipe transitions.
 */

// ═══════════════════════════════════════════════════════════════
// Spotify Wrapped Design Tokens
// ═══════════════════════════════════════════════════════════════

const FONT_DISPLAY = "'Nunito', 'Poppins', -apple-system, sans-serif";

interface Card {
  id: number;
  gradient: string;
  stat: string;
  value: string;
  subtitle: string;
  detail?: string;
}

const CARDS: Card[] = [
  {
    id: 0,
    gradient: "linear-gradient(135deg, #1DB954 0%, #148A3C 35%, #0A4720 70%, #191414 100%)",
    stat: "Total Ads Endured",
    value: "2,847",
    subtitle: "That's 23 hours of your life",
    detail: "you're not getting back.",
  },
  {
    id: 1,
    gradient: "linear-gradient(140deg, #E8115B 0%, #B91D73 30%, #6B1F78 65%, #2D1B4E 100%)",
    stat: "Your Top Ad Genre",
    value: "Car Insurance",
    subtitle: "You heard about switching to Geico",
    detail: "347 times. You don't own a car.",
  },
  {
    id: 2,
    gradient: "linear-gradient(130deg, #FF6B35 0%, #F037A5 40%, #B829DD 75%, #6B21C8 100%)",
    stat: "Most-Repeated Line",
    value: "With Spotify Premium...",
    subtitle: "This sentence interrupted your music",
    detail: "1,203 times this year.",
  },
  {
    id: 3,
    gradient: "linear-gradient(145deg, #6B21C8 0%, #3D1E8E 30%, #1DB954 70%, #0A4720 100%)",
    stat: "Longest Ad-Free Streak",
    value: "11 min",
    subtitle: "December 3rd, 2:47 AM",
    detail: "You almost forgot ads existed.",
  },
  {
    id: 4,
    gradient: "linear-gradient(135deg, #0A0A0A 0%, #1A3D2A 30%, #1DB954 55%, #1A3D2A 80%, #0A0A0A 100%)",
    stat: "",
    value: "Go Premium?",
    subtitle: "After 2,847 ads, you've earned it.",
    detail: "Or don't. See you next year.",
  },
];

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function SpotifyWrappedAds() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const lastPointerX = useRef(0);
  const lastPointerTime = useRef(0);
  const velocityRef = useRef(0);

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(Math.max(0, Math.min(CARDS.length - 1, idx)));
    setDragX(0);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    lastPointerX.current = e.clientX;
    lastPointerTime.current = e.timeStamp;
    velocityRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX.current;
      setDragX(dx);

      // Track velocity
      const dt = e.timeStamp - lastPointerTime.current;
      if (dt > 0) {
        velocityRef.current = (e.clientX - lastPointerX.current) / dt * 1000;
      }
      lastPointerX.current = e.clientX;
      lastPointerTime.current = e.timeStamp;
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 60;
    const velocityThreshold = 400; // px/s
    const vel = velocityRef.current;

    // Advance on displacement OR velocity (fast flick)
    if ((dragX < -threshold || vel < -velocityThreshold) && currentIndex < CARDS.length - 1) {
      goTo(currentIndex + 1);
    } else if ((dragX > threshold || vel > velocityThreshold) && currentIndex > 0) {
      goTo(currentIndex - 1);
    } else {
      setDragX(0);
    }
  }, [isDragging, dragX, currentIndex, goTo]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A0A",
        fontFamily: FONT_DISPLAY,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Phone frame */}
      <div
        style={{
          width: 393,
          height: 852,
          borderRadius: 44,
          overflow: "hidden",
          background: "#191414",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          position: "relative",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <style>{`
          @keyframes wrapped-fill {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>

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

        {/* Cards container */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            transform: `translateX(calc(${-currentIndex * 100}% + ${isDragging ? dragX : 0}px))`,
            transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.2, 1, 0.3, 1)",
          }}
        >
          {CARDS.map((card) => (
            <div
              key={card.id}
              style={{
                minWidth: "100%",
                height: "100%",
                background: card.gradient,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "80px 36px 120px",
                position: "relative",
              }}
            >
              {/* Noise texture overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.06,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                  backgroundSize: "128px 128px",
                  pointerEvents: "none",
                }}
              />

              {/* Spotify logo watermark */}
              <div
                style={{
                  position: "absolute",
                  top: 68,
                  left: 28,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: 0.7,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.64 5.801 15.6 6.06 20.04 8.82c.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.379.3z" />
                </svg>
                <span style={{ color: "white", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em" }}>
                  Wrapped
                </span>
              </div>

              {/* Year badge */}
              <div
                style={{
                  position: "absolute",
                  top: 68,
                  right: 28,
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                2025
              </div>

              {/* Content */}
              <div style={{ textAlign: "center", color: "white" }}>
                {card.stat && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      opacity: 0.6,
                      marginBottom: 24,
                    }}
                  >
                    {card.stat}
                  </div>
                )}

                <div
                  style={{
                    fontSize: card.id === 4 ? 40 : 72,
                    fontWeight: 900,
                    lineHeight: 1,
                    marginBottom: 32,
                    fontFamily: FONT_DISPLAY,
                    ...(card.id === 2 ? { fontSize: 36, fontStyle: "italic" } : {}),
                  }}
                >
                  {card.value}
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    opacity: 0.85,
                    maxWidth: 280,
                    margin: "0 auto",
                  }}
                >
                  {card.subtitle}
                </div>

                {card.detail && (
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 400,
                      opacity: 0.5,
                      marginTop: 12,
                      maxWidth: 280,
                      margin: "12px auto 0",
                    }}
                  >
                    {card.detail}
                  </div>
                )}

                {/* Premium CTA on last card */}
                {card.id === 4 && (
                  <div
                    style={{
                      marginTop: 48,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <button
                      style={{
                        background: "#1DB954",
                        color: "#000",
                        border: "none",
                        borderRadius: 500,
                        padding: "16px 48px",
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: FONT_DISPLAY,
                        cursor: "pointer",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Get Premium
                    </button>
                    <button
                      style={{
                        background: "none",
                        color: "rgba(255,255,255,0.5)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: 500,
                        padding: "12px 36px",
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: FONT_DISPLAY,
                        cursor: "pointer",
                      }}
                    >
                      I'll suffer, thanks
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Story-style progress bars at top */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 16,
            right: 16,
            display: "flex",
            gap: 4,
            zIndex: 10,
          }}
        >
          {CARDS.map((_, i) => (
            <div
              key={`bar-${i}-${currentIndex}`}
              style={{
                flex: 1,
                height: 2,
                borderRadius: 1,
                background: "rgba(255,255,255,0.2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: i < currentIndex ? "100%" : "0%",
                  height: "100%",
                  background: "rgba(255,255,255,0.8)",
                  transition: i < currentIndex ? "none" : "width 0.3s ease",
                  ...(i === currentIndex ? {
                    animation: "wrapped-fill 6s linear forwards",
                  } : {}),
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
