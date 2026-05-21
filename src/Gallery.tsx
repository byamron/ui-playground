import { useEffect, useState } from "react";
import { DevPanel, DevButtonGroup, DevDivider } from "./components/DevPanel";
import {
  MuseumGallery,
  type MuseumAppearance,
  type MuseumAccent,
} from "./components/gallery/MuseumGallery";
import { ArcadeGallery } from "./components/gallery/ArcadeGallery";
import { CuriousGallery } from "./components/gallery/CuriousGallery";
import type { GalleryMode } from "./components/gallery/demos";

// Storage keys. Appearance + accent are SHARED across all gallery modes
// (a single portfolio-style theme). Keeping the legacy museum-prefixed
// keys to avoid breaking existing user preferences.
const STORAGE_MODE = "ui-playground:gallery-mode";
const STORAGE_APPEARANCE = "ui-playground:museum-appearance";
const STORAGE_ACCENT = "ui-playground:museum-accent";
const STORAGE_ARCADE_AUDIO = "ui-playground:arcade-audio";
const STORAGE_ARCADE_COIN_INSERT = "ui-playground:arcade-coin-insert";
const STORAGE_ARCADE_REFILL = "ui-playground:arcade-refill";
const STORAGE_ARCADE_HUE_SOURCE = "ui-playground:arcade-hue-source";

// The shared appearance + accent vocabulary — same shape as the portfolio's
// theme tokens. Museum has used these from day one; arcade now consumes
// `accent` too (appearance forced to "dark" for arcade until Phase 5).
type Appearance = MuseumAppearance;
type Accent = MuseumAccent;

type ArcadeAudio = "on" | "off";
type ArcadeCoinInsert = "tip" | "drop";
type ArcadeRefill = "pop" | "drop";
type ArcadeHueSource = "accent" | "demo";

// Numeric hue per accent (matches arcade-themes.css / tokens.md / portfolio).
const ACCENT_HUES: Record<Accent, number> = {
  table: 34,
  portrait: 43,
  sky: 204,
  pizza: 15,
  vineyard: 90,
};

function readMode(): GalleryMode {
  if (typeof window === "undefined") return "arcade";
  const stored = window.localStorage.getItem(STORAGE_MODE);
  if (stored === "museum" || stored === "arcade" || stored === "curious") {
    return stored;
  }
  return "arcade";
}

function readAppearance(): Appearance {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_APPEARANCE);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function readAccent(): Accent {
  if (typeof window === "undefined") return "pizza";
  const stored = window.localStorage.getItem(STORAGE_ACCENT);
  if (
    stored === "sky" ||
    stored === "table" ||
    stored === "portrait" ||
    stored === "pizza" ||
    stored === "vineyard"
  ) {
    return stored;
  }
  return "pizza";
}

function readArcadeAudio(): ArcadeAudio {
  if (typeof window === "undefined") return "off";
  const stored = window.localStorage.getItem(STORAGE_ARCADE_AUDIO);
  if (stored === "on" || stored === "off") return stored;
  return "off";
}

function readArcadeCoinInsert(): ArcadeCoinInsert {
  if (typeof window === "undefined") return "tip";
  const stored = window.localStorage.getItem(STORAGE_ARCADE_COIN_INSERT);
  if (stored === "tip" || stored === "drop") return stored;
  return "tip";
}

function readArcadeRefill(): ArcadeRefill {
  if (typeof window === "undefined") return "drop";
  const stored = window.localStorage.getItem(STORAGE_ARCADE_REFILL);
  if (stored === "pop" || stored === "drop") return stored;
  return "drop";
}

function readArcadeHueSource(): ArcadeHueSource {
  if (typeof window === "undefined") return "accent";
  const stored = window.localStorage.getItem(STORAGE_ARCADE_HUE_SOURCE);
  if (stored === "accent" || stored === "demo") return stored;
  return "accent";
}


export function Gallery() {
  const [mode, setMode] = useState<GalleryMode>(readMode);
  // Shared across all modes — the room's theme.
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);
  const [accent, setAccent] = useState<Accent>(readAccent);
  const [arcadeAudio, setArcadeAudio] = useState<ArcadeAudio>(readArcadeAudio);
  const [coinInsert, setCoinInsert] = useState<ArcadeCoinInsert>(
    readArcadeCoinInsert,
  );
  const [refill, setRefill] = useState<ArcadeRefill>(readArcadeRefill);
  const [hueSource, setHueSource] = useState<ArcadeHueSource>(readArcadeHueSource);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_MODE, mode);
  }, [mode]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_APPEARANCE, appearance);
  }, [appearance]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_ACCENT, accent);
  }, [accent]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_ARCADE_AUDIO, arcadeAudio);
  }, [arcadeAudio]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_ARCADE_COIN_INSERT, coinInsert);
  }, [coinInsert]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_ARCADE_REFILL, refill);
  }, [refill]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_ARCADE_HUE_SOURCE, hueSource);
  }, [hueSource]);

  return (
    <DevPanel
      label="Gallery"
      defaultOpen={false}
      controls={
        <>
          <DevButtonGroup<GalleryMode>
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { label: "Museum", value: "museum" },
              { label: "Arcade", value: "arcade" },
              { label: "Curious", value: "curious" },
            ]}
          />
          {mode === "museum" && (
            <>
              <DevDivider />
              <DevButtonGroup<MuseumAppearance>
                label="Appearance"
                value={appearance}
                onChange={setAppearance}
                options={[
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                ]}
              />
              <DevButtonGroup<MuseumAccent>
                label="Accent"
                value={accent}
                onChange={setAccent}
                options={[
                  { label: "Table", value: "table" },
                  { label: "Portrait", value: "portrait" },
                  { label: "Sky", value: "sky" },
                  { label: "Pizza", value: "pizza" },
                  { label: "Vineyard", value: "vineyard" },
                ]}
              />
            </>
          )}
          {mode === "arcade" && (
            <>
              <DevDivider />
              <DevButtonGroup<Accent>
                label="Accent"
                value={accent}
                onChange={setAccent}
                options={[
                  { label: "Table", value: "table" },
                  { label: "Portrait", value: "portrait" },
                  { label: "Sky", value: "sky" },
                  { label: "Pizza", value: "pizza" },
                  { label: "Vineyard", value: "vineyard" },
                ]}
              />
              <DevButtonGroup<ArcadeHueSource>
                label="Cabinet hue"
                value={hueSource}
                onChange={setHueSource}
                options={[
                  { label: "Accent", value: "accent" },
                  { label: "Per-demo", value: "demo" },
                ]}
              />
              <DevButtonGroup<ArcadeCoinInsert>
                label="Insert"
                value={coinInsert}
                onChange={setCoinInsert}
                options={[
                  { label: "Tip", value: "tip" },
                  { label: "Drop", value: "drop" },
                ]}
              />
              <DevButtonGroup<ArcadeRefill>
                label="Refill"
                value={refill}
                onChange={setRefill}
                options={[
                  { label: "Pop ↑", value: "pop" },
                  { label: "Drop ↓", value: "drop" },
                ]}
              />
              <DevButtonGroup<ArcadeAudio>
                label="Audio"
                value={arcadeAudio}
                onChange={setArcadeAudio}
                options={[
                  { label: "On", value: "on" },
                  { label: "Off", value: "off" },
                ]}
              />
            </>
          )}
        </>
      }
    >
      {mode === "museum" && (
        <MuseumGallery appearance={appearance} accent={accent} />
      )}
      {mode === "arcade" && (
        <ArcadeGallery
          audio={arcadeAudio === "on"}
          coinInsert={coinInsert}
          refill={refill}
          accent={accent}
          accentHue={ACCENT_HUES[accent]}
          hueSource={hueSource}
        />
      )}
      {mode === "curious" && <CuriousGallery />}
    </DevPanel>
  );
}
