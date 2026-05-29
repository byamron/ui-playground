import { useState, useCallback, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { text } from "../palette";

// ---------------------------------------------------------------------------
// Style constants — Linear-inspired: subtle glass, tight typography
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH = 232;

const PANEL = {
  bg: "rgba(8, 8, 10, 0.78)",
  blur: "16px",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
  radius: 12,
  width: SIDEBAR_WIDTH,
  gap: 14,
  pad: 14,
  font: {
    family:
      "'SF Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace",
    label: 11,
    value: 11,
  },
} as const;

/** Spacing token for controls inside the sidebar — use as `gap` on custom wrappers. */
export const DEV_PANEL_GAP = PANEL.gap;

const COLOR = {
  label: text.dark.tertiary,
  value: text.dark.secondary,
  muted: text.dark.muted,
  primary: text.dark.primary,
  active: "rgba(255,255,255,0.10)",
  activeBorder: "rgba(255,255,255,0.22)",
  track: "rgba(255,255,255,0.10)",
  fill: "rgba(255,255,255,0.22)",
  thumb: "rgba(255,255,255,0.85)",
} as const;

// ---------------------------------------------------------------------------
// TuneButton — shared toggle, same appearance in both positions
// ---------------------------------------------------------------------------

function TuneButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={open ? "Close panel" : "Open panel"}
      aria-expanded={open}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${PANEL.border}`,
        borderRadius: 10,
        padding: "7px 12px",
        color: COLOR.primary,
        fontSize: 10,
        fontFamily: PANEL.font.family,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      <motion.span
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{ display: "inline-block", fontSize: 14, lineHeight: 1 }}
      >
        +
      </motion.span>
      {open ? "Close" : "Tune"}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// DevPanel — sidebar layout wrapping the full page
//
// Usage:
//   <DevPanel label="Shader" controls={<>sliders, buttons, etc</>}>
//     {/* main demo content — centered in remaining space */}
//   </DevPanel>
// ---------------------------------------------------------------------------

export function DevPanel({
  label,
  children,
  controls,
  defaultOpen = true,
  background,
  hideTuneButton = false,
}: {
  label?: string;
  children: ReactNode;
  controls: ReactNode;
  defaultOpen?: boolean;
  background?: string;
  // When true, the floating "Tune" button is hidden for clean recording.
  // The panel can still be revealed by pushing the mouse to the right
  // edge of the viewport (within EDGE_REVEAL_PX).
  hideTuneButton?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!hideTuneButton || open) return;
    const EDGE_REVEAL_PX = 20;
    const onMove = (e: MouseEvent) => {
      if (window.innerWidth - e.clientX <= EDGE_REVEAL_PX) {
        setOpen(true);
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [hideTuneButton, open]);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Content area — shrinks when sidebar is open, centers children */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          background: background,
        }}
      >
        {children}
      </div>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: open ? SIDEBAR_WIDTH : 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        onMouseLeave={() => {
          // In tune-hidden mode the panel acts as a pure hover region:
          // mouse to right edge opens it, leaving the panel closes it.
          // In normal mode the button stays the only way to dismiss.
          if (hideTuneButton) setOpen(false);
        }}
        style={{
          overflow: "hidden",
          flexShrink: 0,
          height: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            width: SIDEBAR_WIDTH,
            height: "100%",
            background: PANEL.bg,
            backdropFilter: `blur(${PANEL.blur})`,
            WebkitBackdropFilter: `blur(${PANEL.blur})`,
            borderLeft: `1px solid ${PANEL.border}`,
            padding: PANEL.pad,
            paddingTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: PANEL.gap,
            fontFamily: PANEL.font.family,
            overflowY: "auto",
            overflowX: "hidden",
            boxSizing: "border-box",
          }}
        >
          {label && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: COLOR.muted,
              }}
            >
              {label}
            </span>
          )}
          {controls}

          {/* Tune button — inside sidebar when open */}
          <div style={{ marginTop: "auto", paddingTop: 8, display: "flex" }}>
            <TuneButton open={open} onClick={() => setOpen(false)} />
          </div>
        </div>
      </motion.aside>

      {/* Tune button — fixed bottom-right when sidebar is closed.
          Suppressed when hideTuneButton is set so the recording frame is
          clean; right-edge mouse reveal (above) brings the panel back. */}
      {!open && !hideTuneButton && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ position: "fixed", bottom: 16, right: 16, zIndex: 100 }}
        >
          <TuneButton open={false} onClick={() => setOpen(true)} />
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DevSlider — range track + editable numeric value
// ---------------------------------------------------------------------------

export function DevSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const progress = (value - min) / (max - min);

  const formatted = format
    ? format(value)
    : step >= 1
      ? String(Math.round(value))
      : step >= 0.1
        ? value.toFixed(1)
        : value.toFixed(2);

  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step)),
    [min, max, step]
  );

  // Local draft while editing — lets user type freely, commits on blur/Enter
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  const commit = useCallback(() => {
    if (draft !== null) {
      const parsed = parseFloat(draft);
      if (!isNaN(parsed)) onChange(clamp(parsed));
    }
    setDraft(null);
  }, [draft, onChange, clamp]);

  const VALUE_STYLE: React.CSSProperties = {
    width: 44,
    background: "none",
    border: "none",
    color: COLOR.value,
    fontSize: PANEL.font.value,
    fontFamily: PANEL.font.family,
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    padding: 0,
    outline: "none",
    cursor: "text",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* Label + value row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: PANEL.font.label,
            color: COLOR.label,
            userSelect: "none",
          }}
        >
          {label}
        </span>

        <input
          type="text"
          inputMode="decimal"
          value={editing ? draft : formatted}
          aria-label={`${label} value`}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => {
            setDraft(formatted);
            requestAnimationFrame(() => e.target.select());
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setDraft(null);
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const next = clamp(value + step);
              onChange(next);
              setDraft(null);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = clamp(value - step);
              onChange(next);
              setDraft(null);
            }
          }}
          style={VALUE_STYLE}
        />
      </div>

      {/* Track */}
      <div
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={formatted}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(max, value + step));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(min, value - step));
          } else if (e.key === "Home") {
            e.preventDefault();
            onChange(min);
          } else if (e.key === "End") {
            e.preventDefault();
            onChange(max);
          }
        }}
        style={{
          position: "relative",
          height: 16,
          cursor: "pointer",
          touchAction: "none",
          outline: "none",
        }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          updateFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          updateFromPointer(e);
        }}
      >
        {/* Background track */}
        <div
          style={{
            position: "absolute",
            top: 7,
            left: 0,
            right: 0,
            height: 2,
            borderRadius: 1,
            background: COLOR.track,
          }}
        />
        {/* Fill */}
        <div
          style={{
            position: "absolute",
            top: 7,
            left: 0,
            width: `${progress * 100}%`,
            height: 2,
            borderRadius: 1,
            background: COLOR.fill,
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: "absolute",
            top: 4,
            left: `calc(${progress * 100}% - 4px)`,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: COLOR.thumb,
            boxShadow: "0 0 4px rgba(0,0,0,0.3)",
            transition: "transform 0.1s",
          }}
        />
      </div>
    </div>
  );

  function updateFromPointer(e: React.PointerEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // Snap to step
    const raw = min + x * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(Math.min(max, Math.max(min, snapped)));
  }
}

// ---------------------------------------------------------------------------
// DevButtonGroup — segmented selector
// ---------------------------------------------------------------------------

export function DevButtonGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  modified,
}: {
  label?: string;
  options: { label: string; value: T }[];
  value: T | null;
  onChange: (v: T) => void;
  modified?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <span
          style={{
            fontSize: PANEL.font.label,
            color: COLOR.label,
            userSelect: "none",
          }}
        >
          {label}
          {modified && (
            <span style={{ color: COLOR.muted, fontStyle: "italic", marginLeft: 4 }}>
              edited
            </span>
          )}
        </span>
      )}
      <div
        role="group"
        aria-label={label}
        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          const activeModified = active && modified;
          return (
            <button
              key={String(opt.value)}
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              style={{
                padding: "5px 9px",
                borderRadius: 6,
                border: `1px solid ${active ? (activeModified ? "rgba(255,255,255,0.14)" : COLOR.activeBorder) : PANEL.border}`,
                background: active ? COLOR.active : "transparent",
                color: active ? (activeModified ? COLOR.value : COLOR.primary) : COLOR.label,
                cursor: "pointer",
                fontSize: 10,
                fontFamily: PANEL.font.family,
                fontWeight: active ? 500 : 400,
                transition: "all 0.12s",
                lineHeight: 1.3,
                fontStyle: activeModified ? "italic" : "normal",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DevToggle — accessible switch
// ---------------------------------------------------------------------------

export function DevToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: PANEL.font.label,
          color: COLOR.label,
          userSelect: "none",
        }}
      >
        {label}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        style={{
          position: "relative",
          width: 28,
          height: 16,
          borderRadius: 8,
          border: "none",
          background: checked ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)",
          cursor: "pointer",
          padding: 0,
          transition: "background 0.15s",
          outline: "none",
        }}
      >
        <motion.div
          animate={{ x: checked ? 13 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            position: "absolute",
            top: 2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: checked ? COLOR.primary : "rgba(255,255,255,0.45)",
          }}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DevButton — action button
// ---------------------------------------------------------------------------

export function DevButton({
  label,
  onClick,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "muted" | "primary";
}) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isMuted = variant === "muted";

  const bg = isPrimary
    ? "rgba(255,255,255,0.10)"
    : isSecondary
      ? "rgba(255,255,255,0.04)"
      : isMuted
        ? "transparent"
        : "rgba(255,255,255,0.03)";

  const fg = isPrimary || isSecondary ? COLOR.primary : isMuted ? COLOR.muted : COLOR.label;
  const borderColor = isPrimary ? "rgba(255,255,255,0.20)" : PANEL.border;
  const borderHover = isPrimary ? "rgba(255,255,255,0.30)" : PANEL.borderHover;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        width: "100%",
        padding: "8px 12px",
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: bg,
        color: fg,
        cursor: "pointer",
        fontSize: PANEL.font.label,
        fontFamily: PANEL.font.family,
        fontWeight: isPrimary ? 500 : 400,
        lineHeight: 1.4,
        transition: "border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = borderHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = borderColor;
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          style={{ display: "block" }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// DevTextInput — editable text field
// ---------------------------------------------------------------------------

export function DevTextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: PANEL.font.label,
          color: COLOR.label,
          userSelect: "none",
        }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${PANEL.border}`,
          borderRadius: 6,
          color: COLOR.value,
          fontSize: PANEL.font.value,
          fontFamily: PANEL.font.family,
          padding: "5px 8px",
          outline: "none",
          transition: "border-color 0.12s",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = COLOR.activeBorder)
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = PANEL.border)
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DevDivider — thin separator line
// ---------------------------------------------------------------------------

export function DevDivider() {
  return (
    <div
      style={{
        height: 1,
        background: PANEL.border,
        margin: "0 -2px",
      }}
    />
  );
}
