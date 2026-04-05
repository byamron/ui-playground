import { useState, useCallback, useEffect } from "react";
import {
  DevPanel,
  DevButtonGroup,
  DevToggle,
  DevDivider,
} from "../../components/DevPanel";
import { bg, HUES, text } from "../../palette";

const BG = bg({ hue: HUES.sky, mode: "dark", intensity: 0 });

const FONT =
  "'SF Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace";

const STORAGE_KEY = "frame-guide";

// Presets: ratio is always wider/narrower (>= 1)
const RATIO_PRESETS = [
  { label: "4:3", value: "4:3", w: 4, h: 3 },
  { label: "16:9", value: "16:9", w: 16, h: 9 },
  { label: "1:1", value: "1:1", w: 1, h: 1 },
];

const ORIENTATION_OPTIONS = [
  { label: "Landscape", value: "landscape" as const },
  { label: "Portrait", value: "portrait" as const },
];

// --- Helpers ---

function detectPreset(w: number, h: number): string | null {
  const big = Math.max(w, h);
  const small = Math.min(w, h);
  if (small === 0) return null;
  const ratio = big / small;
  for (const p of RATIO_PRESETS) {
    if (Math.abs(ratio - p.w / p.h) < 0.015) return p.value;
  }
  return null;
}

interface Saved {
  width: number;
  height: number;
  locked: boolean;
}

function load(): Saved {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      return {
        width: parsed.width ?? 800,
        height: parsed.height ?? 600,
        locked: parsed.locked ?? true,
      };
    }
  } catch {
    /* ignore */
  }
  return { width: 800, height: 600, locked: true };
}

function save(s: Saved) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// --- Dimension Input (matches DevSlider value style) ---

function DimensionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = useCallback(() => {
    if (draft !== null) {
      const parsed = parseInt(draft, 10);
      if (!isNaN(parsed) && parsed >= 50) onChange(parsed);
    }
    setDraft(null);
  }, [draft, onChange]);

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
          fontSize: 11,
          color: text.dark.tertiary,
          userSelect: "none",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? String(value)}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => {
            setDraft(String(value));
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
              const next = value + (e.shiftKey ? 8 : 1);
              onChange(next);
              setDraft(null);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = Math.max(50, value - (e.shiftKey ? 8 : 1));
              onChange(next);
              setDraft(null);
            }
          }}
          style={{
            width: 48,
            background: "none",
            border: "none",
            color: text.dark.secondary,
            fontSize: 11,
            fontFamily: FONT,
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
            padding: 0,
            outline: "none",
            cursor: "text",
          }}
        />
        <span
          style={{ fontSize: 9, color: text.dark.muted, userSelect: "none" }}
        >
          px
        </span>
      </div>
    </div>
  );
}

// --- Corner bracket for frame ---

function Corner({
  top,
  right,
  bottom,
  left,
}: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}) {
  const SIZE = 12;
  const borderColor = "rgba(255,255,255,0.55)";
  return (
    <div
      style={{
        position: "absolute",
        width: SIZE,
        height: SIZE,
        top,
        right,
        bottom,
        left,
        borderTop:
          top !== undefined ? `1px solid ${borderColor}` : undefined,
        borderBottom:
          bottom !== undefined ? `1px solid ${borderColor}` : undefined,
        borderLeft:
          left !== undefined ? `1px solid ${borderColor}` : undefined,
        borderRight:
          right !== undefined ? `1px solid ${borderColor}` : undefined,
      }}
    />
  );
}

// --- Main Component ---

export function FrameGuide() {
  const [width, setWidthRaw] = useState(() => load().width);
  const [height, setHeightRaw] = useState(() => load().height);
  const [locked, setLocked] = useState(() => load().locked);

  useEffect(() => {
    save({ width, height, locked });
  }, [width, height, locked]);

  const isLandscape = width >= height;
  const activePreset = detectPreset(width, height);
  const lockedRatio = width / height;

  const setWidth = (w: number) => {
    const clamped = Math.max(50, Math.round(w));
    setWidthRaw(clamped);
    if (locked) {
      setHeightRaw(Math.max(50, Math.round(clamped / lockedRatio)));
    }
  };

  const setHeight = (h: number) => {
    const clamped = Math.max(50, Math.round(h));
    setHeightRaw(clamped);
    if (locked) {
      setWidthRaw(Math.max(50, Math.round(clamped * lockedRatio)));
    }
  };

  const applyPreset = (presetValue: string) => {
    const p = RATIO_PRESETS.find((r) => r.value === presetValue);
    if (!p) return;
    const ratio = isLandscape ? p.w / p.h : p.h / p.w;
    setHeightRaw(Math.max(50, Math.round(width / ratio)));
    setLocked(true);
  };

  const toggleOrientation = (o: string) => {
    const wantLandscape = o === "landscape";
    if (wantLandscape === isLandscape) return;
    setWidthRaw(height);
    setHeightRaw(width);
  };

  const controls = (
    <>
      <DimensionInput label="Width" value={width} onChange={setWidth} />
      <DimensionInput label="Height" value={height} onChange={setHeight} />
      <DevToggle label="Lock ratio" checked={locked} onChange={setLocked} />
      <DevDivider />
      <DevButtonGroup
        label="Ratio"
        options={RATIO_PRESETS}
        value={activePreset}
        onChange={applyPreset}
      />
      <DevButtonGroup
        label="Orientation"
        options={ORIENTATION_OPTIONS}
        value={isLandscape ? "landscape" : "portrait"}
        onChange={toggleOrientation}
      />
    </>
  );

  return (
    <DevPanel label="Frame" controls={controls} background={BG}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Frame box at actual pixel dimensions */}
        <div
          style={{
            width,
            height,
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: 2,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <Corner top={-1} left={-1} />
          <Corner top={-1} right={-1} />
          <Corner bottom={-1} left={-1} />
          <Corner bottom={-1} right={-1} />

          {/* Center crosshair */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 16,
              height: 1,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 1,
              height: 16,
              background: "rgba(255,255,255,0.08)",
            }}
          />
        </div>

        {/* Dimension label */}
        <span
          style={{
            fontSize: 11,
            fontFamily: FONT,
            color: text.dark.muted,
            fontVariantNumeric: "tabular-nums",
            userSelect: "none",
          }}
        >
          {width} × {height}
        </span>
      </div>
    </DevPanel>
  );
}
