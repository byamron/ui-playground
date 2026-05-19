import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

// ═══════════════════════════════════════════════════════════════
// FigJam UI tokens (matched from screenshots)
// ═══════════════════════════════════════════════════════════════

const C = {
  purple: "#7B61FF",
  blue: "#0C8CE9",
  green: "#0ACF83",
  red: "#F24E1E",

  text: "#333333",
  textSec: "#666666",
  textMuted: "#AFAFAF",

  white: "#FFFFFF",
  canvas: "#F5F5F5",
  hover: "#F2F2F2",
  border: "#E5E5E5",

  stickyPink: "#FFB8D0",
  infoBg: "#EBF5FF",
  overlay: "rgba(0,0,0,0.35)",
  toast: "#2C2C2C",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// ═══════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════

const STICKIES = [
  ["Walter", "Bernard", "Margot", "Reginald", "Judith"],
  ["Cashew", "Brioche", "Brisket", "Fig"],
  ["Marsha Mellow", "Chris P. Bacon", "Mary Christmas", "Salvador Dogi"],
  ["Landlord", "Wednesday", "Subpoena", "Mortgage"],
];

type PermOption = { value: string; label: string; destructive?: boolean };

const PERMS: PermOption[] = [
  { value: "owner", label: "owner" },
  { value: "can edit", label: "can edit" },
  { value: "can high-five", label: "can high-five" },
  { value: "can view", label: "can view" },
];

const PERM_DESTRUCTIVE: PermOption = {
  value: "remove",
  label: "Remove",
  destructive: true,
};

// ═══════════════════════════════════════════════════════════════
// Modal / UI Icons
// ═══════════════════════════════════════════════════════════════

const GlobeIcon = ({ size = 16, color = C.textSec }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.2">
    <circle cx="8" cy="8" r="6.5" />
    <ellipse cx="8" cy="8" rx="3" ry="6.5" />
    <line x1="1.5" y1="8" x2="14.5" y2="8" />
  </svg>
);

const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2.5 4L5 6.5L7.5 4" />
  </svg>
);

const ChevronRight = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round">
    <path d="M3 1.5L6 4L3 6.5" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={C.textSec} strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 2L10 10M10 2L2 10" />
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7.5" fill={C.blue} opacity="0.12" />
    <circle cx="8" cy="5.5" r="1" fill={C.blue} />
    <rect x="7" y="7.5" width="2" height="4" rx="1" fill={C.blue} />
  </svg>
);

const LinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke={C.blue} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 8.5L8.5 5.5" />
    <path d="M9.5 6.5l1-1a2.12 2.12 0 00-3-3l-1 1" />
    <path d="M4.5 7.5l-1 1a2.12 2.12 0 003 3l1-1" />
  </svg>
);

const SlidesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.textSec} strokeWidth="1.2">
    <rect x="2" y="3" width="12" height="9" rx="1.5" />
    <line x1="8" y1="12" x2="8" y2="14" />
    <line x1="5.5" y1="14" x2="10.5" y2="14" />
  </svg>
);

const CommunityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.textSec} strokeWidth="1.2">
    <circle cx="8" cy="6" r="2.5" />
    <path d="M3.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
  </svg>
);

const CastIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.textSec} strokeWidth="1.2" strokeLinecap="round">
    <path d="M2 11a4 4 0 014 4" />
    <path d="M2 8a7 7 0 017 7" />
    <circle cx="2" cy="14.5" r="0.8" fill={C.textSec} stroke="none" />
    <path d="M14 5V3.5A1.5 1.5 0 0012.5 2h-9A1.5 1.5 0 002 3.5V5" />
    <path d="M14 5v7.5a1.5 1.5 0 01-1.5 1.5H10" />
  </svg>
);

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.textSec} strokeWidth="1.2" strokeLinecap="round">
    <path d="M5 4.5L2 8L5 11.5" />
    <path d="M11 4.5L14 8L11 11.5" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// Shared sub-components
// ═══════════════════════════════════════════════════════════════

function Avatar({ initials, bg, size = 24 }: { initials: string; bg: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: "#fff",
      fontSize: size * 0.4, fontWeight: 600, fontFamily: FONT,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, lineHeight: 1,
    }}>
      {initials}
    </div>
  );
}

function Toast({ message, visible, cta }: { message: string; visible: boolean; cta?: string }) {
  return (
    <div style={{
      position: "fixed",
      bottom: visible ? 86 : -80,
      left: "50%",
      transform: "translateX(-50%)",
      background: C.toast,
      color: "#fff",
      padding: "10px 16px",
      borderRadius: 8,
      fontSize: 12.5,
      fontFamily: FONT,
      fontWeight: 400,
      letterSpacing: 0.1,
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      transition: "bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      zIndex: 300,
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: 6,
      pointerEvents: visible ? "auto" : "none",
    }}>
      <span style={{ color: "rgba(255,255,255,0.85)" }}>{message}</span>
      {cta && (
        <span style={{
          color: "#fff", fontWeight: 400, cursor: "pointer",
          textDecoration: "underline", textUnderlineOffset: 2,
        }}>
          {cta}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Shake detection hook
// ═══════════════════════════════════════════════════════════════

function useShakeDetection(enabled: boolean, onShake: () => void) {
  const history = useRef<{ x: number; t: number }[]>([]);
  const cooldown = useRef(false);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    if (!enabled) {
      history.current = [];
      return;
    }

    const handler = (e: MouseEvent) => {
      if (cooldown.current) return;
      const now = Date.now();
      history.current.push({ x: e.clientX, t: now });
      // Keep last 500ms
      history.current = history.current.filter((p) => now - p.t < 500);
      if (history.current.length < 6) return;

      let reversals = 0;
      for (let i = 2; i < history.current.length; i++) {
        const dx1 = history.current[i - 1].x - history.current[i - 2].x;
        const dx2 = history.current[i].x - history.current[i - 1].x;
        if (
          Math.sign(dx1) !== Math.sign(dx2) &&
          Math.abs(dx1) > 4 &&
          Math.abs(dx2) > 4
        ) {
          reversals++;
        }
      }
      if (reversals >= 2) {
        onShakeRef.current();
        history.current = [];
        cooldown.current = true;
        setTimeout(() => { cooldown.current = false; }, 4000);
      }
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [enabled]);
}

// ═══════════════════════════════════════════════════════════════
// Access row (with optional permission dropdown)
// ═══════════════════════════════════════════════════════════════

export { Avatar as FigmaAvatar };
export const FIGMA_PERMS = PERMS;

export function FigmaAccessRow(props: Parameters<typeof AccessRow>[0]) {
  return <AccessRow {...props} />;
}

function AccessRow({
  icon, name, nameExtra, permission, isDropdown,
  dropdownOpen, onToggle, onSelect, hoveredPerm, onHoverPerm,
}: {
  icon: ReactNode;
  name: string;
  nameExtra?: string;
  permission: string;
  isDropdown?: boolean;
  dropdownOpen?: boolean;
  onToggle?: () => void;
  onSelect?: (v: string) => void;
  hoveredPerm?: string | null;
  onHoverPerm?: (v: string | null) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      height: 40, padding: "0 8px", borderRadius: 6,
    }}>
      <div style={{
        flexShrink: 0, width: 24,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{
        marginLeft: 10, flex: 1,
        fontSize: 13, color: C.text, fontFamily: FONT,
      }}>
        {name}
        {nameExtra && <span style={{ color: C.textSec }}>{nameExtra}</span>}
      </div>
      <div style={{ position: "relative" }} data-dropdown>
        {isDropdown ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.textSec, fontSize: 12, fontFamily: FONT,
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 6px", borderRadius: 4,
            }}
          >
            {permission}
            <ChevronDown />
          </button>
        ) : (
          <span style={{ fontSize: 12, color: C.textSec, padding: "4px 6px", fontFamily: FONT }}>
            {permission}
          </span>
        )}

        {dropdownOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0,
            width: 176, background: "#383838", borderRadius: 10,
            boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
            padding: "6px 0", zIndex: 20,
          }}>
            {PERMS.map((p) => (
              <div
                key={p.value}
                onClick={(e) => { e.stopPropagation(); onSelect?.(p.value); }}
                onMouseEnter={() => onHoverPerm?.(p.value)}
                onMouseLeave={() => onHoverPerm?.(null)}
                style={{
                  padding: "9px 16px", fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  background: hoveredPerm === p.value ? "rgba(255,255,255,0.08)" : "transparent",
                  color: permission === p.value ? "#fff" : "rgba(255,255,255,0.75)",
                  fontWeight: permission === p.value ? 500 : 400,
                  fontFamily: FONT,
                }}
              >
                <span style={{ width: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {permission === p.value && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 7.5L5 10.5L12 3.5" />
                    </svg>
                  )}
                </span>
                {p.label}
              </div>
            ))}
            {/* Separator + Remove */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "4px 12px" }} />
            <div
              onClick={(e) => { e.stopPropagation(); onSelect?.(PERM_DESTRUCTIVE.value); }}
              onMouseEnter={() => onHoverPerm?.(PERM_DESTRUCTIVE.value)}
              onMouseLeave={() => onHoverPerm?.(null)}
              style={{
                padding: "9px 16px 9px 40px", fontSize: 14, cursor: "pointer",
                background: hoveredPerm === PERM_DESTRUCTIVE.value ? "rgba(255,255,255,0.08)" : "transparent",
                color: "rgba(255,255,255,0.75)", fontFamily: FONT,
              }}
            >
              {PERM_DESTRUCTIVE.label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Option row (additional share modal options)
// ═══════════════════════════════════════════════════════════════

function OptionRow({ icon, label, disabled }: { icon: ReactNode; label: string; disabled?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      height: 36, padding: "0 8px", borderRadius: 6,
      cursor: disabled ? "default" : "pointer",
      fontSize: 13, color: disabled ? C.textMuted : C.text, fontFamily: FONT,
    }}>
      <div style={{ width: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: disabled ? 0.4 : 1 }}>
        {icon}
      </div>
      <span style={{ marginLeft: 10, flex: 1 }}>{label}</span>
      {disabled ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={C.textMuted} strokeWidth="1.2">
          <circle cx="7" cy="7" r="5.5" />
          <circle cx="7" cy="5.5" r="0.7" fill={C.textMuted} stroke="none" />
          <rect x="6.3" y="7" width="1.4" height="3" rx="0.7" fill={C.textMuted} stroke="none" />
        </svg>
      ) : (
        <ChevronRight />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FigJam top chrome (tab bar + toolbar)
// ═══════════════════════════════════════════════════════════════

function TopChrome() {
  return (
    <div style={{ flexShrink: 0 }}>
      {/* Tab bar */}
      <div style={{
        height: 40, background: "#EBEBEB",
        display: "flex", alignItems: "flex-end", padding: "0 8px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        {/* Home icon — aligned with the + tab button */}
        <div style={{
          width: 28, height: 30, marginBottom: -1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#666" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.5L8 2L13.5 6.5V13a1 1 0 01-1 1h-9a1 1 0 01-1-1V6.5z" />
            <path d="M6 14V9h4v5" />
          </svg>
        </div>

        {/* Active tab */}
        <div style={{
          height: 30, background: C.white, borderRadius: "6px 6px 0 0",
          padding: "0 14px", display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, color: C.text, fontFamily: FONT, fontWeight: 400,
          borderTop: `1px solid ${C.border}`,
          borderLeft: `1px solid ${C.border}`,
          borderRight: `1px solid ${C.border}`,
          marginBottom: -1,
        }}>
          Dog Names
          <span style={{ color: C.textMuted, fontSize: 11, cursor: "pointer", lineHeight: 1 }}>&times;</span>
        </div>

        {/* New tab */}
        <div style={{
          height: 30, marginBottom: -1,
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, color: C.textMuted, fontSize: 16,
        }}>+</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Floating controls (FigJam UI3 style — pills on the canvas)
// ═══════════════════════════════════════════════════════════════

function FloatingControlsLeft() {
  return (
    <img
      src="/images/figjam-left-corner.png"
      alt=""
      draggable={false}
      style={{
        position: "absolute", zIndex: 20,
        top: 12, left: 16, height: 48,
        borderRadius: 12,
        boxShadow: "0 1px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
        userSelect: "none",
      }}
    />
  );
}

function FloatingControlsRight({ currentUser, onAvatarClick }: { currentUser: "ben" | "alex"; onAvatarClick: () => void }) {
  const isBen = currentUser === "ben";
  return (
    <div style={{ position: "absolute", zIndex: 20, top: 12, right: 16 }}>
      <img
        src="/images/figjam-right-corner.png"
        alt=""
        draggable={false}
        style={{
          height: 48,
          borderRadius: 12,
          boxShadow: "0 1px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
          userSelect: "none",
        }}
      />
      {/* Dynamic avatar overlaid on top of the screenshot's avatar */}
      <div
        onClick={onAvatarClick}
        style={{
          position: "absolute", top: 11, left: 12,
          cursor: "pointer",
        }}
      >
        <Avatar initials={isBen ? "BY" : "AR"} bg={isBen ? C.purple : C.green} size={26} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Canvas background (dot grid + sticky notes)
// ═══════════════════════════════════════════════════════════════

function CanvasBg({ zoom, pan }: { zoom: number; pan: { x: number; y: number } }) {
  const gridSize = 24 * zoom;

  return (
    <>
      {/* Dot grid — scales and pans with canvas */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle, #d5d5d5 ${Math.max(0.5, zoom)}px, transparent ${Math.max(0.5, zoom)}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }} />

      {/* Canvas content — transforms with zoom/pan */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 24, fontFamily: FONT,
        willChange: "transform",
      }}>
        <h2 style={{
          fontSize: 22, fontWeight: 700, color: C.text,
          fontFamily: FONT, whiteSpace: "nowrap",
        }}>
          Dog Name Brainstorm
        </h2>
        <div style={{ display: "flex", gap: 12 }}>
          {STICKIES.map((items, i) => (
            <div key={i} style={{
              width: 155, background: C.stickyPink, borderRadius: 3,
              padding: "14px 14px", fontSize: 11.5, lineHeight: 1.9,
              color: "#3a3a3a", fontFamily: FONT,
              boxShadow: "1px 2px 6px rgba(0,0,0,0.06)",
            }}>
              {items.map((item, j) => (
                <div key={j}><span style={{ marginRight: 6 }}>&bull;</span>{item}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Figma-style multiplayer cursor
// ═══════════════════════════════════════════════════════════════

const CURSOR_WAYPOINTS = [
  { x: 35, y: 30 },
  { x: 45, y: 35 },
  { x: 55, y: 28 },
  { x: 60, y: 40 },
  { x: 40, y: 45 },
  { x: 30, y: 38 },
  { x: 50, y: 50 },
  { x: 65, y: 32 },
  { x: 38, y: 55 },
  { x: 52, y: 42 },
];

function FigmaCursor({ visible }: { visible: boolean }) {
  const [pos, setPos] = useState({ x: CURSOR_WAYPOINTS[0].x, y: CURSOR_WAYPOINTS[0].y });
  const waypointIdx = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) return;

    let start: number | null = null;
    const fromRef = { x: pos.x, y: pos.y };
    let toRef = CURSOR_WAYPOINTS[(waypointIdx.current + 1) % CURSOR_WAYPOINTS.length];
    const duration = 1800;
    const pause = 600;

    const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;

      if (elapsed < duration) {
        const t = ease(elapsed / duration);
        setPos({
          x: fromRef.x + (toRef.x - fromRef.x) * t,
          y: fromRef.y + (toRef.y - fromRef.y) * t,
        });
        animRef.current = requestAnimationFrame(tick);
      } else {
        setPos({ x: toRef.x, y: toRef.y });
        // Pause, then move to next waypoint
        setTimeout(() => {
          waypointIdx.current = (waypointIdx.current + 1) % CURSOR_WAYPOINTS.length;
          fromRef.x = toRef.x;
          fromRef.y = toRef.y;
          toRef = CURSOR_WAYPOINTS[(waypointIdx.current + 1) % CURSOR_WAYPOINTS.length];
          start = null;
          animRef.current = requestAnimationFrame(tick);
        }, pause);
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      {/* Cursor arrow — Figma SVG, colored to match Ben's profile */}
      <svg width="22" height="24" viewBox="0 0 396 433" fill="none" style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}>
        <path
          d="M39.97 31.88C38.22 23.48 47.2 16.95 54.64 21.22L351.11 191.13C358.65 195.45 357.4 206.69 349.09 209.25L205.2 253.51C202.97 254.2 201.05 255.64 199.79 257.6L127.77 368.53C122.94 375.97 111.52 373.84 109.71 365.16L39.97 31.88Z"
          fill={C.purple}
        />
        <path
          d="M346.17 199.75L202.28 244.01C197.82 245.38 193.99 248.28 191.45 252.19L119.43 363.12L49.7 29.84L346.17 199.75Z"
          stroke="white"
          strokeWidth="19.88"
        />
      </svg>
      {/* Name label — detached, below-right of cursor */}
      <div style={{
        position: "absolute",
        top: 22,
        left: 14,
        background: C.purple,
        color: "#fff",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: FONT,
        padding: "3px 8px",
        borderRadius: 4,
        whiteSpace: "nowrap",
        lineHeight: 1.3,
        boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
      }}>
        Ben
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Bottom toolbar (FigJam tool icons from screenshot)
// ═══════════════════════════════════════════════════════════════

function BottomBar({ onHandClick }: { onHandClick: () => void }) {
  return (
    <div style={{
      position: "absolute", bottom: 14, left: "50%",
      transform: "translateX(-50%)",
      zIndex: 10,
    }}>
      <img
        src="/images/figjam-toolbar.png"
        alt=""
        draggable={false}
        style={{
          height: 48,
          borderRadius: 14,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
          userSelect: "none",
        }}
      />
      {/* Invisible hit target over hand tool (2nd icon from left) */}
      <div
        onClick={onHandClick}
        style={{
          position: "absolute", top: 0, left: 42,
          width: 36, height: "100%",
          cursor: "pointer",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

type Target = "anyone" | "alex";

export function FigmaHighfive() {
  const [currentUser, setCurrentUser] = useState<"ben" | "alex">("ben");
  const modalOpen = currentUser === "ben";
  const [dropdownFor, setDropdownFor] = useState<Target | null>(null);
  const [perms, setPerms] = useState<Record<Target, string>>({
    anyone: "can view",
    alex: "can high-five",
  });
  const [hoveredPerm, setHoveredPerm] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load Inter font
  useEffect(() => {
    const id = "inter-font-link";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  // Canvas zoom (ctrl/cmd+wheel or pinch) and pan (scroll)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = 1 - e.deltaY * 0.003;
        setZoom((prev) => Math.min(Math.max(prev * factor, 0.15), 5));
      } else {
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) setDropdownFor(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Shake detection (active when Alex is viewing)
  const handleShake = useCallback(() => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  }, []);

  useShakeDetection(currentUser === "alex", handleShake);

  const toggleDropdown = (target: Target) => {
    setDropdownFor((prev) => (prev === target ? null : target));
    setHoveredPerm(null);
  };

  const selectPermission = (target: Target, value: string) => {
    if (value === "remove") {
      // For the demo, just reset to "can view"
      setPerms((prev) => ({ ...prev, [target]: "can view" }));
    } else {
      setPerms((prev) => ({ ...prev, [target]: value }));
    }
    setDropdownFor(null);
    setHoveredPerm(null);
  };

  const toggleUser = () => {
    setCurrentUser((prev) => (prev === "ben" ? "alex" : "ben"));
    setDropdownFor(null);
  };

  return (
    <div style={{
      width: "100%", height: "100%", position: "relative", overflow: "hidden",
      fontFamily: FONT,
      background: C.canvas,
      cursor: "url(/images/figma-cursor-black.svg) 3 1, auto",
    }}>
      {/* ── Background: FigJam UI ── */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopChrome />
        <div
          ref={canvasRef}
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            background: C.canvas,
          }}
        >
          <CanvasBg zoom={zoom} pan={pan} />
          <FloatingControlsLeft />
          <FloatingControlsRight currentUser={currentUser} onAvatarClick={toggleUser} />
          <FigmaCursor visible={!modalOpen} />
        </div>
      </div>

      <BottomBar onHandClick={() => {
        if (!modalOpen) handleShake();
      }} />

      {/* ── Overlay + Share Modal ── */}
      {modalOpen && (
        <div
          onClick={toggleUser}
          style={{
            position: "absolute", inset: 0, background: C.overlay,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            zIndex: 100,
          }}
        >
          {/* ── Card 1: Share / Access ── */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              const target = e.target as HTMLElement;
              if (!target.closest("[data-dropdown]")) setDropdownFor(null);
            }}
            style={{
              width: 440, background: C.white, borderRadius: 12,
              boxShadow: "0 8px 40px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", padding: "16px 20px 12px",
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONT }}>
                Share this board
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  color: C.blue, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: FONT,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <LinkIcon />
                  Copy link
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleUser(); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 4, borderRadius: 4, display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Info banner */}
            <div style={{
              margin: "0 16px 12px", background: C.infoBg,
              borderRadius: 6, padding: "8px 10px",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: C.textSec, lineHeight: 1.4, fontFamily: FONT,
              whiteSpace: "nowrap",
            }}>
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}><InfoIcon /></div>
              <span>
                To invite people to edit, move this draft into your projects.{" "}
                <span style={{ color: C.blue, fontWeight: 500, cursor: "pointer" }}>Move file</span>
              </span>
            </div>

            {/* Invite input */}
            <div style={{ margin: "0 16px 16px", display: "flex", gap: 8 }}>
              <div style={{
                flex: 1, border: `1px solid ${C.border}`, borderRadius: 6,
                padding: "8px 12px", fontSize: 13, color: C.textMuted, fontFamily: FONT,
              }}>
                Add comma separated emails to invite
              </div>
              <button style={{
                background: C.hover, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "8px 14px", fontSize: 13,
                fontWeight: 500, color: C.textMuted, cursor: "default", fontFamily: FONT,
              }}>
                Invite
              </button>
            </div>

            {/* Who has access */}
            <div style={{
              padding: "0 20px", marginBottom: 4,
              fontSize: 11, fontWeight: 500, color: C.textSec, fontFamily: FONT,
            }}>
              Who has access
            </div>

            {/* Access list */}
            <div style={{ padding: "4px 12px 12px" }}>
              <AccessRow
                icon={<GlobeIcon />}
                name="Anyone"
                permission={perms.anyone}
                isDropdown
                dropdownOpen={dropdownFor === "anyone"}
                onToggle={() => toggleDropdown("anyone")}
                onSelect={(v) => selectPermission("anyone", v)}
                hoveredPerm={hoveredPerm}
                onHoverPerm={setHoveredPerm}
              />
              <AccessRow
                icon={<Avatar initials="AR" bg={C.green} />}
                name="Alex Rivera"
                permission={perms.alex}
                isDropdown
                dropdownOpen={dropdownFor === "alex"}
                onToggle={() => toggleDropdown("alex")}
                onSelect={(v) => selectPermission("alex", v)}
                hoveredPerm={hoveredPerm}
                onHoverPerm={setHoveredPerm}
              />
              <AccessRow
                icon={<Avatar initials="BY" bg={C.purple} />}
                name="Ben"
                nameExtra=" (you)"
                permission="owner"
              />
            </div>
          </div>

          {/* ── Card 2: Additional options ── */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 440, background: C.white, borderRadius: 12,
              boxShadow: "0 8px 40px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)",
              padding: "4px 12px 8px",
            }}
          >
            <OptionRow icon={<SlidesIcon />} label="Create Figma Slides outline" />
            <OptionRow icon={<CommunityIcon />} label="Publish to Community" />
            <OptionRow icon={<CastIcon />} label="Cast to a Google Meet device" disabled />
            <OptionRow icon={<CodeIcon />} label="Get embed code" />
          </div>
        </div>
      )}

      {/* ── Toast (shake denial) ── */}
      <Toast
        visible={toastVisible}
        message="You don't have permission to high-five."
        cta="Request access"
      />
    </div>
  );
}
