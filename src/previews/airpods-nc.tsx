import { useEffect, useState } from "react";
import {
  NCContactRow,
  NC_PREVIEW_CONTACTS,
} from "../demos/airpods-nc/AirpodsNC";
import type { PreviewProps } from "./_shared";

type NCMode = "off" | "transparency" | "noise-cancellation";
const MODES: NCMode[] = ["off", "transparency", "noise-cancellation"];

// Two real iOS contact rows from the demo. On hover the modes cycle —
// the "Ex" row shifts between Off / Transparency / Noise Cancellation,
// driving the segmented control's animation through the real component.
export default function AirpodsNcPreview({ active, intense }: PreviewProps) {
  // Pick a recognizable pair from the demo's contacts.
  const baseContacts = NC_PREVIEW_CONTACTS.filter((c) =>
    ["Mom", "Ex"].includes(c.name),
  );
  const [modes, setModes] = useState<NCMode[]>(baseContacts.map((c) => c.mode));

  useEffect(() => {
    if (!active || !intense) return;
    const PERIOD = 1100;
    let raf = 0;
    const start = performance.now();
    let lastIdx = -1;
    const tick = (now: number) => {
      const idx = Math.floor((now - start) / PERIOD) % MODES.length;
      if (idx !== lastIdx) {
        lastIdx = idx;
        setModes(([m0]) => [m0, MODES[idx]]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, intense]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FFFFFF",
        pointerEvents: "none",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%" }}>
        {baseContacts.map((contact, i) => (
          <NCContactRow
            key={contact.name}
            contact={{ ...contact, mode: modes[i] }}
            onModeChange={() => {}}
            isLast={i === baseContacts.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
