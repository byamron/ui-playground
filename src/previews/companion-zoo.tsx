import { Clippy } from "../demos/companion-zoo/CompanionZoo";
import type { PreviewProps } from "./_shared";

// Real Clippy from the demo. Idle: silent. Hover: taps + cycles messages.
export default function CompanionZooPreview({ active, intense }: PreviewProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <Clippy autoplay={active && intense} introDelay={150} />
    </div>
  );
}
