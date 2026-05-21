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

const STORAGE_MODE = "ui-playground:gallery-mode";
const STORAGE_MUSEUM_APPEARANCE = "ui-playground:museum-appearance";
const STORAGE_MUSEUM_ACCENT = "ui-playground:museum-accent";
const STORAGE_ARCADE_AUDIO = "ui-playground:arcade-audio";
const STORAGE_ARCADE_COIN_INSERT = "ui-playground:arcade-coin-insert";
const STORAGE_ARCADE_REFILL = "ui-playground:arcade-refill";

type ArcadeAudio = "on" | "off";
type ArcadeCoinInsert = "tip" | "drop";
type ArcadeRefill = "pop" | "drop";

function readMode(): GalleryMode {
  if (typeof window === "undefined") return "museum";
  const stored = window.localStorage.getItem(STORAGE_MODE);
  if (stored === "museum" || stored === "arcade" || stored === "curious") {
    return stored;
  }
  return "museum";
}

function readAppearance(): MuseumAppearance {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_MUSEUM_APPEARANCE);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function readAccent(): MuseumAccent {
  if (typeof window === "undefined") return "table";
  const stored = window.localStorage.getItem(STORAGE_MUSEUM_ACCENT);
  if (
    stored === "sky" ||
    stored === "table" ||
    stored === "portrait" ||
    stored === "pizza" ||
    stored === "vineyard"
  ) {
    return stored;
  }
  return "table";
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
  if (typeof window === "undefined") return "pop";
  const stored = window.localStorage.getItem(STORAGE_ARCADE_REFILL);
  if (stored === "pop" || stored === "drop") return stored;
  return "pop";
}


export function Gallery() {
  const [mode, setMode] = useState<GalleryMode>(readMode);
  const [appearance, setAppearance] = useState<MuseumAppearance>(readAppearance);
  const [accent, setAccent] = useState<MuseumAccent>(readAccent);
  const [arcadeAudio, setArcadeAudio] = useState<ArcadeAudio>(readArcadeAudio);
  const [coinInsert, setCoinInsert] = useState<ArcadeCoinInsert>(
    readArcadeCoinInsert,
  );
  const [refill, setRefill] = useState<ArcadeRefill>(readArcadeRefill);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_MODE, mode);
  }, [mode]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_MUSEUM_APPEARANCE, appearance);
  }, [appearance]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_MUSEUM_ACCENT, accent);
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
        />
      )}
      {mode === "curious" && <CuriousGallery />}
    </DevPanel>
  );
}
