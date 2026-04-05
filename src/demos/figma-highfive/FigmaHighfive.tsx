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

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={C.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7.5L5.5 10L11 4" />
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

const FigmaLogoIcon = () => (
  <svg width="12" height="18" viewBox="0 0 200 300">
    <path d="M50 300c27.6 0 50-22.4 50-50v-50H50c-27.6 0-50 22.4-50 50s22.4 50 50 50z" fill="#0acf83"/>
    <path d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z" fill="#a259ff"/>
    <path d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z" fill="#f24e1e"/>
    <path d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z" fill="#ff7262"/>
    <path d="M200 150c0 27.6-22.4 50-50 50s-50-22.4-50-50 22.4-50 50-50 50 22.4 50 50z" fill="#1abcfe"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#333" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="7" height="7" rx="1.5" />
    <path d="M9 5V3.5A1.5 1.5 0 007.5 2h-4A1.5 1.5 0 002 3.5v4A1.5 1.5 0 003.5 9H5" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// High-five hand SVG (line art, white fill, dark outlines)
// ═══════════════════════════════════════════════════════════════

const HighFiveHandSvg = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size * 1.1} viewBox="0 0 32 36" fill="none">
    <defs>
      <filter id="hand-shadow" x="-4" y="-2" width="40" height="44" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.18" />
      </filter>
    </defs>
    <g filter="url(#hand-shadow)" fill="white" stroke="#333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="5.5" height="15" rx="2.75" />
      <rect x="10.5" y="4" width="5.5" height="19" rx="2.75" />
      <rect x="17" y="6" width="5.5" height="17" rx="2.75" />
      <rect x="23" y="10" width="5" height="13" rx="2.5" />
      <rect x="2" y="18" width="28" height="14" rx="6" />
    </g>
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
      bottom: visible ? 72 : -80,
      left: "50%",
      transform: "translateX(-50%)",
      background: C.toast,
      color: "#fff",
      padding: "10px 16px",
      borderRadius: 8,
      fontSize: 13,
      fontFamily: FONT,
      fontWeight: 400,
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      transition: "bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      zIndex: 300,
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: 12,
      pointerEvents: visible ? "auto" : "none",
    }}>
      {message}
      {cta && (
        <span style={{
          color: "#fff", fontWeight: 500, cursor: "pointer",
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
      if (reversals >= 3) {
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
      {/* Purple gradient strip */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #C4B5FD, #A78BFA, #C4B5FD)" }} />

      {/* Tab bar */}
      <div style={{
        height: 40, background: "#EBEBEB",
        display: "flex", alignItems: "flex-end", padding: "0 8px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        {/* FigJam icon */}
        <div style={{
          width: 28, height: 30, marginBottom: -1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <rect x="2" y="2" width="10" height="10" rx="2" fill={C.purple} opacity="0.8" />
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

const floatingPill: React.CSSProperties = {
  position: "absolute",
  zIndex: 20,
  background: C.white,
  borderRadius: 12,
  padding: "8px 14px",
  display: "flex",
  alignItems: "center",
  boxShadow: "0 1px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
  fontFamily: FONT,
  height: 48,
};

const SmallChevron = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 3L4 5.5L6 3" />
  </svg>
);

function FloatingControlsLeft() {
  return (
    <div style={{ ...floatingPill, top: 12, left: 16, gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
        <FigmaLogoIcon />
        <SmallChevron />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1 }}>Dog Names</span>
      <span style={{
        fontSize: 11, fontWeight: 600, color: C.purple, lineHeight: 1,
        padding: "3px 7px", borderRadius: 4,
        background: "rgba(123, 97, 255, 0.08)",
      }}>
        Free
      </span>
      <div style={{ width: 1, height: 20, background: C.border, margin: "0 2px" }} />
      <div style={{ cursor: "pointer", opacity: 0.5, display: "flex", alignItems: "center" }}>
        <CopyIcon />
      </div>
    </div>
  );
}

function FloatingControlsRight({ currentUser, onAvatarClick }: { currentUser: "ben" | "alex"; onAvatarClick: () => void }) {
  const isBen = currentUser === "ben";
  return (
    <div style={{ ...floatingPill, top: 12, right: 16, gap: 12 }}>
      {/* Avatar — click to switch user (hidden toggle for recording) */}
      <div
        onClick={onAvatarClick}
        style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}
      >
        <Avatar initials={isBen ? "BY" : "AR"} bg={isBen ? C.purple : C.green} size={30} />
        <SmallChevron />
      </div>

      {/* Grid/layout icon */}
      <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#888" strokeWidth="1.4">
          <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1" />
          <rect x="10" y="2.5" width="5.5" height="5.5" rx="1" />
          <rect x="2.5" y="10" width="5.5" height="5.5" rx="1" />
          <rect x="10" y="10" width="5.5" height="5.5" rx="1" />
        </svg>
      </div>

      {/* Timer widget */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 20, height: 32,
        border: `1px solid ${C.border}`, fontSize: 13, color: C.textSec,
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.3">
          <circle cx="8" cy="9" r="5.5" />
          <path d="M8 6.5V9l2 1.5" strokeLinecap="round" />
          <line x1="7" y1="2" x2="9" y2="2" />
          <line x1="8" y1="2" x2="8" y2="3.5" />
        </svg>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.3" strokeLinejoin="round">
          <path d="M8 2.5l1.6 3.2 3.6.5-2.6 2.5.6 3.6L8 10.5 4.8 12.3l.6-3.6L2.8 6.2l3.6-.5z" />
        </svg>
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500, fontSize: 14 }}>03:00</span>
      </div>

      {/* Share button */}
      <button style={{
        background: C.purple, color: C.white,
        border: "none", borderRadius: 12, height: 36,
        padding: "8px 22px", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: FONT,
      }}>
        Share
      </button>
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
// Bottom toolbar (FigJam tool icons from screenshot)
// ═══════════════════════════════════════════════════════════════

function BottomBar({ onHandClick }: { onHandClick: () => void }) {
  const S = 20;
  const sw = "1.5";
  const sc = "#333";

  const cell: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  const divider = (
    <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px", flexShrink: 0 }} />
  );

  return (
    <div style={{
      position: "absolute", bottom: 14, left: "50%",
      transform: "translateX(-50%)",
      background: C.white, borderRadius: 14,
      padding: "6px 6px", display: "flex", alignItems: "center", gap: 2,
      boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      zIndex: 10,
    }}>
      {/* ── Navigation ── */}
      {/* Cursor (active) */}
      <div style={{ ...cell, background: C.purple }}>
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path d="M0.573545 1.87033C0.24895 1.04553 1.07874 0.237002 1.89483 0.583223L16.1175 6.6174C16.956 6.97311 16.9214 8.17321 16.0638 8.47971L10.4759 10.4758L8.04034 16.1574C7.6884 16.9786 6.5182 16.9614 6.19073 16.1301L0.573545 1.87033Z" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>
      {/* Hand — open palm (SVG recreation of macOS openhand cursor) */}
      <div style={{ ...cell, cursor: "pointer" }} onClick={onHandClick}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Index */}
          <path d="M8.5 11V4.5C8.5 3.67 9.17 3 10 3s1.5.67 1.5 1.5V11" />
          {/* Middle */}
          <path d="M11.5 11V3.5C11.5 2.67 12.17 2 13 2s1.5.67 1.5 1.5V11" />
          {/* Ring */}
          <path d="M14.5 11V4.5C14.5 3.67 15.17 3 16 3s1.5.67 1.5 1.5V11" />
          {/* Pinky + palm right + base */}
          <path d="M17.5 11V7.5C17.5 6.67 18.17 6 19 6s1.5.67 1.5 1.5V14c0 4-3 7-7 7h-2c-3.3 0-6-2.7-6-6v-3c0-.83.67-1.5 1.5-1.5S8.5 11.17 8.5 12" />
        </svg>
      </div>

      {divider}

      {/* ── Objects ── */}
      {/* Marker — tip pointing UP */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth="1.3" strokeLinejoin="round">
          <path d="M7 17V12L10 2L13 12V17H7Z" stroke={sc} fill="none" />
          <path d="M7 12H13" />
          <path d="M8.5 5L10 2L11.5 5Z" fill="#333" stroke="none" />
        </svg>
      </div>
      {/* Shapes (colored) */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" strokeWidth="1.3" strokeLinejoin="round">
          <polygon points="8,3 15,13 1,13" fill="#C4B5FD" stroke="#9F8FD8" />
          <rect x="8" y="9" width="9" height="8" rx="1.5" fill="#BFDBFE" stroke="#7BAFD4" />
        </svg>
      </div>
      {/* Sticky (yellow) */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" strokeWidth="1.3">
          <rect x="3" y="3" width="14" height="14" rx="2" fill="#FDE68A" stroke="#D4A843" />
          <path d="M13 17H17V13" fill="#ECD06B" stroke="#D4A843" strokeLinejoin="round" />
        </svg>
      </div>
      {/* Square */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw}>
          <rect x="4" y="4" width="12" height="12" rx="1" />
        </svg>
      </div>
      {/* Connector */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round">
          <path d="M4 16Q4 6 14 4" />
          <path d="M11 2L15 4L11 6" />
        </svg>
      </div>
      {/* Circle/ellipse */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw}>
          <circle cx="10" cy="10" r="7" />
        </svg>
      </div>

      {divider}

      {/* ── Tools + Inserts ── */}
      {/* Text */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round">
          <line x1="4" y1="5" x2="16" y2="5" />
          <line x1="10" y1="5" x2="10" y2="16" />
          <line x1="7" y1="16" x2="13" y2="16" />
        </svg>
      </div>
      {/* Section/frame */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw} strokeLinejoin="round">
          <rect x="3" y="4" width="10" height="10" rx="1" />
          <rect x="7" y="7" width="10" height="10" rx="1" fill={C.canvas} />
        </svg>
      </div>
      {/* Grid/table */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw}>
          <rect x="3" y="3" width="14" height="14" rx="1.5" />
          <line x1="10" y1="3" x2="10" y2="17" />
          <line x1="3" y1="10" x2="17" y2="10" />
        </svg>
      </div>
      {/* Person/stamp */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw}>
          <circle cx="10" cy="7" r="3" />
          <path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6" />
        </svg>
      </div>
      {/* Comment bubble */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw} strokeLinejoin="round">
          <path d="M4 4h12a1 1 0 011 1v8a1 1 0 01-1 1H8L4 17V5a1 1 0 011-1" />
        </svg>
      </div>
      {/* Sticker/image */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw} strokeLinejoin="round">
          <rect x="3" y="3" width="14" height="14" rx="2" />
          <path d="M3 13L7 9L10 12L13 8L17 13" />
          <circle cx="7" cy="7" r="1.5" fill={sc} stroke="none" />
        </svg>
      </div>
      {/* Widgets/components */}
      <div style={cell}>
        <svg width={S} height={S} viewBox="0 0 20 20" fill="none" stroke={sc} strokeWidth={sw}>
          <circle cx="6" cy="6" r="2" /><circle cx="14" cy="6" r="2" />
          <circle cx="6" cy="14" r="2" /><circle cx="14" cy="14" r="2" />
          <line x1="8" y1="6" x2="12" y2="6" /><line x1="8" y1="14" x2="12" y2="14" />
          <line x1="6" y1="8" x2="6" y2="12" /><line x1="14" y1="8" x2="14" y2="12" />
        </svg>
      </div>

      {/* Plus button */}
      <div style={{
        ...cell, color: C.textMuted,
        fontSize: 20, fontWeight: 300, cursor: "pointer",
      }}>
        +
      </div>
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
              <div style={{ flexShrink: 0 }}><InfoIcon /></div>
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
                name="Benjamin Yamron"
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
