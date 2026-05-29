import { useRef, useEffect, useState } from "react";
import { HUES, bg, text } from "../../palette";
import { DevPanel, DevSlider, DevButtonGroup, DevButton } from "../../components/DevPanel";
import {
  setupGlassHighlight,
  GLASS_DEFAULTS,
  type GlassMode,
  type GlassTunable,
} from "../../utils/glassHighlight";

/**
 * Glass Pull — ported from portfolio's useGlassHighlight hook.
 * Spring-physics driven: position, size, and edge-pull all use a damped
 * spring solver for overshoot, settle, and that alive, weighted quality.
 * DevPanel for live spring tuning.
 */

const ITEMS = [
  "Overview",
  "Projects",
  "Activity",
  "Settings",
  "Team",
  "Docs",
];

const BG_COLORS: Record<GlassMode, string> = {
  dark: bg({ hue: HUES.violet, mode: "dark", intensity: 1 }),
  light: bg({ hue: HUES.violet, mode: "light", intensity: 0 }),
};

export function GlassPull() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<GlassMode>("dark");
  const [stiffness, setStiffness] = useState(GLASS_DEFAULTS.springStiffness);
  const [damping, setDamping] = useState(GLASS_DEFAULTS.springDamping);
  const [lean, setLean] = useState(GLASS_DEFAULTS.pillMaxLean);
  const [tilt, setTilt] = useState(GLASS_DEFAULTS.pillMaxTilt);
  const [cardLean, setCardLean] = useState(GLASS_DEFAULTS.cardMaxLean);
  const [stretch, setStretch] = useState(GLASS_DEFAULTS.stretchAmount);
  const [entrance, setEntrance] = useState(GLASS_DEFAULTS.entranceScale);
  const [pressure, setPressure] = useState(GLASS_DEFAULTS.glassPressure);
  const [highlight, setHighlight] = useState(GLASS_DEFAULTS.highlightIntensity);
  const [cursorLight, setCursorLight] = useState(GLASS_DEFAULTS.cursorLight);

  const configRef = useRef<GlassTunable>({} as GlassTunable);
  configRef.current = {
    springStiffness: stiffness,
    springDamping: damping,
    pillMaxLean: lean,
    pillMaxTilt: tilt,
    cardMaxLean: cardLean,
    stretchAmount: stretch,
    entranceScale: entrance,
    glassPressure: pressure,
    highlightIntensity: highlight,
    cursorLight,
    mode,
  };

  const apiRef = useRef<ReturnType<typeof setupGlassHighlight> | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = setupGlassHighlight(container, configRef);
    apiRef.current = api;
    return () => {
      apiRef.current = null;
      api.cleanup();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.redraw();
  }, [mode]);

  const palette = mode === "dark" ? text.dark : text.light;

  return (
    <DevPanel
      label="Glass Pull"
      background={BG_COLORS[mode]}
      defaultOpen={false}
      controls={
        <>
          <DevButtonGroup
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { label: "Dark", value: "dark" },
              { label: "Light", value: "light" },
            ]}
          />
          <DevSlider label="Stiffness" value={stiffness} onChange={setStiffness} min={100} max={600} step={10} />
          <DevSlider label="Damping" value={damping} onChange={setDamping} min={8} max={50} step={1} />
          <DevSlider label="Pill lean" value={lean} onChange={setLean} min={0} max={8} step={0.5} />
          <DevSlider label="Pill tilt" value={tilt} onChange={setTilt} min={0} max={3} step={0.1} />
          <DevSlider label="Card lean" value={cardLean} onChange={setCardLean} min={0} max={6} step={0.2} />
          <DevSlider label="Stretch" value={stretch} onChange={setStretch} min={0} max={0.15} step={0.005} />
          <DevSlider label="Entrance scale" value={entrance} onChange={setEntrance} min={0.7} max={1.0} step={0.01} />
          <DevSlider label="Glass pressure" value={pressure} onChange={setPressure} min={0} max={0.12} step={0.005} />
          <DevSlider label="Edge highlight" value={highlight} onChange={setHighlight} min={0} max={0.15} step={0.005} />
          <DevSlider label="Cursor light" value={cursorLight} onChange={setCursorLight} min={0} max={0.20} step={0.005} />
          <DevButton
            label="Reset"
            onClick={() => {
              setStiffness(GLASS_DEFAULTS.springStiffness);
              setDamping(GLASS_DEFAULTS.springDamping);
              setLean(GLASS_DEFAULTS.pillMaxLean);
              setTilt(GLASS_DEFAULTS.pillMaxTilt);
              setCardLean(GLASS_DEFAULTS.cardMaxLean);
              setStretch(GLASS_DEFAULTS.stretchAmount);
              setEntrance(GLASS_DEFAULTS.entranceScale);
              setPressure(GLASS_DEFAULTS.glassPressure);
              setHighlight(GLASS_DEFAULTS.highlightIntensity);
              setCursorLight(GLASS_DEFAULTS.cursorLight);
            }}
          />
        </>
      }
    >
      <style>{`
        .glass-list {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .glass-item {
          padding: 18px 32px;
          font-size: 24px;
          letter-spacing: -0.01em;
          color: ${palette.tertiary};
          cursor: default;
          position: relative;
          z-index: 1;
          transition: color 0.2s ease;
          user-select: none;
          border-radius: 14px;
          width: fit-content;
        }
        .glass-item[data-active="true"] {
          color: ${palette.primary};
        }
      `}</style>

      <div ref={containerRef} className="glass-list">
        {ITEMS.map((item) => (
          <div key={item} className="glass-item" data-link-card>
            {item}
          </div>
        ))}
      </div>
    </DevPanel>
  );
}
