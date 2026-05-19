import { useState, useRef, useCallback, useEffect } from "react";
import { bg, text } from "../../palette";

/**
 * Theme Sidebar — ported from portfolio's SidebarThemeControls.tsx.
 * Color swatches + intensity gradient strip + appearance mode (system/light/dark).
 * Hover to expand, stagger-animated. Each section has its own glass hover pill.
 */

type AccentColor = "table" | "portrait" | "sky" | "pizza";
type AppearanceMode = "system" | "light" | "dark";

export const THEME_ACCENTS: { color: AccentColor; swatch: string; hue: number }[] = [
  { color: "table", swatch: "hsl(34, 50%, 60%)", hue: 34 },
  { color: "portrait", swatch: "hsl(47, 34%, 64%)", hue: 47 },
  { color: "sky", swatch: "hsl(204, 50%, 70%)", hue: 204 },
  { color: "pizza", swatch: "hsl(15, 53%, 64%)", hue: 15 },
];

const ACCENTS: { color: AccentColor; swatch: string; hue: number }[] = [
  { color: "table", swatch: "hsl(34, 50%, 60%)", hue: 34 },
  { color: "portrait", swatch: "hsl(47, 34%, 64%)", hue: 47 },
  { color: "sky", swatch: "hsl(204, 50%, 70%)", hue: 204 },
  { color: "pizza", swatch: "hsl(15, 53%, 64%)", hue: 15 },
];

const INTENSITY_LEVELS = [
  { name: "Whisper", satMult: 1.0, lightShiftDark: 0 },
  { name: "Subtle", satMult: 1.5, lightShiftDark: 1 },
  { name: "Tinted", satMult: 2.0, lightShiftDark: 1.5 },
  { name: "Warm", satMult: 2.8, lightShiftDark: 2 },
];

const BG_BASE: Record<AccentColor, [number, number, number]> = {
  table: [33, 18, 12],
  portrait: [47, 18, 10],
  sky: [200, 22, 8],
  pizza: [8, 22, 7],
};

function computeBg(accent: AccentColor, intensity: number): string {
  const [h, s, l] = BG_BASE[accent];
  const level = INTENSITY_LEVELS[intensity];
  const newS = Math.min(100, s * level.satMult);
  const newL = l + level.lightShiftDark;
  return `hsl(${h}, ${newS.toFixed(1)}%, ${newL}%)`;
}

function computeBgLight(accent: AccentColor, intensity: number): string {
  const [h] = BG_BASE[accent];
  const level = INTENSITY_LEVELS[intensity];
  const baseSat = 20;
  const baseL = 96;
  const newS = Math.min(100, baseSat * level.satMult);
  const newL = baseL - intensity * 2;
  return `hsl(${h}, ${newS.toFixed(1)}%, ${newL}%)`;
}

const STRIP_HEIGHT = 72;
const THUMB_SIZE = 11;
const THUMB_TRAVEL = STRIP_HEIGHT - THUMB_SIZE;
const TRIGGER_OPACITY = [0.45, 0.65, 0.85, 1.0];
const TRIGGER_GLOW_SPREAD = [0, 6, 10, 14];
const TRIGGER_GLOW_ALPHA = [0, 0.2, 0.35, 0.5];

// SVG icons for modes (simple, no deps)
function MonitorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
      <path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H108l-4.8,14.4A8,8,0,0,0,110.8,224h34.4a8,8,0,0,0,7.6-9.6L148,200h60a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
      <path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
      <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.36A88,88,0,0,1,65.64,67.09a89,89,0,0,1,31.76-26A106,106,0,0,0,96,128a106,106,0,0,0,86.93,31.41A89,89,0,0,1,188.9,190.36Z" />
    </svg>
  );
}

const MODES: { mode: AppearanceMode; Icon: () => React.ReactNode; label: string }[] = [
  { mode: "system", Icon: MonitorIcon, label: "System" },
  { mode: "light", Icon: SunIcon, label: "Light" },
  { mode: "dark", Icon: MoonIcon, label: "Dark" },
];

// Mini glass pill for hover
export function setupThemePill(container: HTMLElement): () => void {
  return setupPill(container);
}

function setupPill(container: HTMLElement): () => void {
  let pill: HTMLDivElement | null = null;
  let currentCtrl: HTMLElement | null = null;
  let rafId: number | null = null;
  const PILL = 36;

  const state = {
    cx: 0, cy: 0, cw: 0, ch: 0,
    tx: 0, ty: 0, tw: 0, th: 0,
  };

  function create() {
    const d = document.createElement("div");
    d.setAttribute("aria-hidden", "true");
    Object.assign(d.style, {
      position: "absolute", pointerEvents: "none", zIndex: "10",
      opacity: "0", willChange: "transform, opacity", top: "0", left: "0",
      borderRadius: "12px",
      background: "radial-gradient(ellipse 150% 120% at 50% 10%, rgba(255,255,255,0.12), rgba(255,255,255,0.048) 50%, transparent 85%), hsla(0, 10%, 45%, 0.08)",
      backdropFilter: "blur(1px) saturate(1.2)",
      boxShadow: "inset 0 0.5px 0 0 rgba(255,255,255,0.2), inset 0 -0.5px 0 0 rgba(0,0,0,0.08)",
      border: "0.5px solid hsla(0, 20%, 50%, 0.15)",
    });
    container.insertBefore(d, container.firstChild);
    return d;
  }

  function loop() {
    rafId = null;
    if (!currentCtrl || !pill) return;
    const lr = 0.2;
    state.cx += (state.tx - state.cx) * lr;
    state.cy += (state.ty - state.cy) * lr;
    state.cw += (state.tw - state.cw) * lr;
    state.ch += (state.th - state.ch) * lr;

    const settled = Math.abs(state.cx - state.tx) < 0.3 && Math.abs(state.cy - state.ty) < 0.3;
    if (settled) { state.cx = state.tx; state.cy = state.ty; state.cw = state.tw; state.ch = state.th; }

    pill.style.transform = `translate(${state.cx}px, ${state.cy}px)`;
    pill.style.width = `${state.cw}px`;
    pill.style.height = `${state.ch}px`;
    if (!settled) rafId = requestAnimationFrame(loop);
  }

  function start() { if (rafId === null) rafId = requestAnimationFrame(loop); }
  function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

  function handleOver(e: MouseEvent) {
    const ctrl = (e.target as HTMLElement).closest<HTMLElement>("[data-sidebar-control]");
    if (!ctrl || ctrl === currentCtrl) return;
    const prev = currentCtrl;
    currentCtrl = ctrl;
    const cr = ctrl.getBoundingClientRect();
    const pr = container.getBoundingClientRect();
    const pos = { x: cr.left + cr.width / 2 - pr.left - PILL / 2, y: cr.top + cr.height / 2 - pr.top - PILL / 2, w: PILL, h: PILL };
    if (!prev) {
      state.cx = state.tx = pos.x; state.cy = state.ty = pos.y; state.cw = state.tw = pos.w; state.ch = state.th = pos.h;
      pill!.style.transition = "none";
      pill!.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      pill!.style.width = `${pos.w}px`; pill!.style.height = `${pos.h}px`;
      void pill!.offsetHeight;
      pill!.style.transition = "opacity 150ms ease"; pill!.style.opacity = "1";
    } else {
      state.tx = pos.x; state.ty = pos.y; state.tw = pos.w; state.th = pos.h;
    }
    start();
  }

  function handleLeave(e: MouseEvent) {
    if (container.contains(e.relatedTarget as Node)) return;
    currentCtrl = null;
    if (pill) { pill.style.transition = "opacity 150ms ease"; pill.style.opacity = "0"; }
    stop();
  }

  pill = create();
  container.addEventListener("mouseover", handleOver);
  container.addEventListener("mouseleave", handleLeave);
  return () => { stop(); container.removeEventListener("mouseover", handleOver); container.removeEventListener("mouseleave", handleLeave); pill?.remove(); };
}

export function ThemeSidebar() {
  const [accent, setAccent] = useState<AccentColor>("table");
  const [intensity, setIntensity] = useState(1);
  const [mode, setMode] = useState<AppearanceMode>("dark");
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const swatchesRef = useRef<HTMLDivElement>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSwatch = ACCENTS.find((a) => a.color === accent)!;
  const isLight = mode === "light";
  const pageBg = isLight ? computeBgLight(accent, intensity) : computeBg(accent, intensity);

  // Setup glass pills when expanded
  useEffect(() => {
    if (!hovered) return;
    const cleanups: (() => void)[] = [];
    const timer = setTimeout(() => {
      if (swatchesRef.current) cleanups.push(setupPill(swatchesRef.current));
      if (modesRef.current) cleanups.push(setupPill(modesRef.current));
    }, 120);
    return () => { clearTimeout(timer); cleanups.forEach((c) => c()); };
  }, [hovered]);

  const updateLevel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(STRIP_HEIGHT, e.clientY - rect.top));
    setIntensity(Math.round((y / STRIP_HEIGHT) * (INTENSITY_LEVELS.length - 1)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
    updateLevel(e);
  }, [updateLevel]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateLevel(e);
  }, [updateLevel]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  const stagger = (i: number) => ({
    opacity: hovered ? 1 : 0,
    transform: hovered ? "translateX(0)" : "translateX(20px)",
    transition: `opacity 0.22s ease ${hovered ? i * 0.04 : 0}s, transform 0.22s ease ${hovered ? i * 0.04 : 0}s`,
    pointerEvents: (hovered ? "auto" : "none") as React.CSSProperties["pointerEvents"],
  });

  const divStyle = (i: number): React.CSSProperties => ({
    width: 20, height: 1, background: "rgba(255,255,255,0.15)",
    margin: "18px 0",
    opacity: hovered ? 1 : 0,
    transform: hovered ? "translateX(0)" : "translateX(20px)",
    transition: `opacity 0.22s ease ${hovered ? i * 0.04 : 0}s, transform 0.22s ease ${hovered ? i * 0.04 : 0}s`,
  });

  return (
    <div className="demo-page" style={{ background: pageBg, transition: "background 500ms ease" }}>
      <style>{`
        .sidebar-hint {
          font-size: 14px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.03em;
          user-select: none;
        }
      `}</style>

      {/* Theme preview area — mock content that responds to theme changes */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 340,
          transition: "all 500ms ease",
        }}
      >
        {/* Mock notification card */}
        <div
          style={{
            padding: "24px",
            borderRadius: 16,
            background: isLight
              ? `hsla(${activeSwatch.hue}, ${20 + intensity * 10}%, ${96 - intensity * 4}%, 1)`
              : `hsla(${activeSwatch.hue}, ${12 + intensity * 8}%, ${16 + intensity * 3}%, ${0.5 + intensity * 0.15})`,
            border: `1px solid ${isLight
              ? `hsla(${activeSwatch.hue}, 20%, 50%, ${0.08 + intensity * 0.06})`
              : `hsla(${activeSwatch.hue}, 30%, 50%, ${0.06 + intensity * 0.04})`}`,
            transition: "all 500ms ease",
          }}
        >
          {/* Header with icon and status */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${activeSwatch.swatch}, hsla(${activeSwatch.hue}, 40%, ${isLight ? 55 : 40}%, 0.8))`,
                opacity: TRIGGER_OPACITY[intensity],
                transition: "all 500ms ease",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: isLight ? text.light.primary : text.dark.primary, transition: "color 500ms" }}>
                New message
              </div>
              <div style={{ fontSize: 12, color: isLight ? text.light.tertiary : text.dark.tertiary, transition: "color 500ms" }}>
                2 min ago
              </div>
            </div>
            {/* Status dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: activeSwatch.swatch,
                opacity: TRIGGER_OPACITY[intensity],
                boxShadow: intensity > 1 ? `0 0 ${4 + intensity * 3}px ${activeSwatch.swatch}` : "none",
                transition: "all 500ms ease",
              }}
            />
          </div>

          {/* Message preview lines */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ height: 8, borderRadius: 4, background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)", width: "90%", transition: "background 500ms" }} />
            <div style={{ height: 8, borderRadius: 4, background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)", width: "65%", transition: "background 500ms" }} />
          </div>

          {/* Action button */}
          <div
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 8,
              background: `hsla(${activeSwatch.hue}, ${30 + intensity * 10}%, ${isLight ? 50 : 60}%, ${0.1 + intensity * 0.08})`,
              color: activeSwatch.swatch,
              fontSize: 13,
              fontWeight: 600,
              display: "inline-block",
              transition: "all 500ms ease",
              opacity: TRIGGER_OPACITY[intensity],
            }}
          >
            Reply
          </div>
        </div>

        {/* Accent color bar */}
        <div style={{ display: "flex", gap: 3 }}>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((opacity, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 1.5,
                background: activeSwatch.swatch,
                opacity: opacity * TRIGGER_OPACITY[intensity],
                transition: "all 500ms ease",
              }}
            />
          ))}
        </div>

        <p className="sidebar-hint" style={{ marginTop: 8, color: isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)" }}>Hover the right edge</p>
      </div>

      {/* Sidebar trigger zone */}
      <div
        onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); setHovered(true); }}
        onMouseLeave={() => { closeTimer.current = setTimeout(() => setHovered(false), 250); }}
        style={{
          position: "fixed", top: 0, right: 0, width: 56, height: "100vh", zIndex: 100,
        }}
      >
        <div style={{ position: "absolute", top: 64, right: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Trigger dot */}
          <div
            style={{
              width: 16, height: 16, borderRadius: 5,
              background: activeSwatch.swatch,
              opacity: TRIGGER_OPACITY[intensity],
              boxShadow: intensity > 0
                ? `0 0 ${TRIGGER_GLOW_SPREAD[intensity]}px hsla(${activeSwatch.hue}, 50%, 60%, ${TRIGGER_GLOW_ALPHA[intensity]})`
                : "none",
              transition: "background 200ms, opacity 300ms, box-shadow 300ms",
              flexShrink: 0,
            }}
          />

          {/* Expandable controls */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Divider */}
            <div style={divStyle(0)} />

            {/* Color swatches */}
            <div ref={swatchesRef} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              {ACCENTS.map((item, i) => (
                <div key={item.color} style={stagger(1 + i)}>
                  <button
                    data-sidebar-control
                    onClick={() => setAccent(item.color)}
                    style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: item.swatch, border: "none", cursor: "pointer", padding: 0,
                      outline: accent === item.color ? `1.5px solid ${item.swatch}` : "none",
                      outlineOffset: 3, transition: "outline 200ms",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={divStyle(5)} />

            {/* Intensity strip */}
            <div style={stagger(6)}>
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDragStart={(e) => e.preventDefault()}
                style={{
                  position: "relative", width: 24, height: STRIP_HEIGHT,
                  display: "flex", justifyContent: "center",
                  cursor: isDragging ? "grabbing" : "grab",
                  touchAction: "none", userSelect: "none",
                }}
              >
                <div style={{
                  width: 8, height: STRIP_HEIGHT, borderRadius: 4,
                  background: `linear-gradient(to bottom, hsla(${activeSwatch.hue}, 50%, 60%, 0.08), hsla(${activeSwatch.hue}, 50%, 60%, 0.55))`,
                  transition: "background 500ms", pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: "50%",
                  background: activeSwatch.swatch,
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                  left: "50%", transform: "translateX(-50%)",
                  top: (intensity / (INTENSITY_LEVELS.length - 1)) * THUMB_TRAVEL,
                  transition: isDragging ? "none" : "top 200ms, background 500ms",
                }} />
              </div>
            </div>

            {/* Divider */}
            <div style={divStyle(7)} />

            {/* Mode icons */}
            <div ref={modesRef} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              {MODES.map(({ mode: m, Icon, label }, i) => (
                <div key={m} style={stagger(8 + i)}>
                  <button
                    data-sidebar-control
                    onClick={() => setMode(m)}
                    style={{
                      width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                      border: "none", background: "none", cursor: "pointer", padding: 0, borderRadius: 8,
                      opacity: mode === m ? 1 : 0.4, color: isLight ? text.light.primary : text.dark.primary,
                      transition: "opacity 200ms",
                    }}
                    title={label}
                  >
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 24, height: 24, borderRadius: 6,
                      outline: mode === m ? "1.5px solid rgba(255,255,255,0.2)" : "none",
                      outlineOffset: 3, transition: "outline 200ms",
                    }}>
                      <Icon />
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
