import { useEffect, useState } from "react";
import {
  FIGMA_PERMS,
  FigmaAccessRow,
  FigmaAvatar,
} from "../demos/figma-highfive/FigmaHighfive";
import type { PreviewProps } from "./_shared";

// Real FigJam access row + real permission dropdown. On hover the dropdown
// opens and the synthetic cursor lands on "can high-five".
export default function FigmaHighfivePreview({ active, intense }: PreviewProps) {
  const [open, setOpen] = useState(false);
  const [hoveredPerm, setHoveredPerm] = useState<string | null>(null);
  const [permission, setPermission] = useState("can edit");

  useEffect(() => {
    if (!active || !intense) {
      setOpen(false);
      setHoveredPerm(null);
      setPermission("can edit");
      return;
    }
    // Sequence: open dropdown → hover "can high-five" → commit → close → repeat
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cycleId = 0;

    const runCycle = () => {
      cycleId++;
      const id = cycleId;
      timeouts.push(setTimeout(() => id === cycleId && setOpen(true), 250));
      timeouts.push(
        setTimeout(() => id === cycleId && setHoveredPerm("can high-five"), 900),
      );
      timeouts.push(
        setTimeout(() => {
          if (id !== cycleId) return;
          setPermission("can high-five");
          setHoveredPerm(null);
        }, 1800),
      );
      timeouts.push(setTimeout(() => id === cycleId && setOpen(false), 2200));
      timeouts.push(
        setTimeout(() => {
          if (id !== cycleId) return;
          setPermission("can edit");
          runCycle();
        }, 3200),
      );
    };
    runCycle();

    return () => {
      cycleId++;
      timeouts.forEach(clearTimeout);
    };
  }, [active, intense]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FFFFFF",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1 }}>
        <FigmaAccessRow
          icon={<FigmaAvatar initials="YS" bg="#0ACF83" size={26} />}
          name="You"
          nameExtra=" (you)"
          permission={permission}
          isDropdown
          dropdownOpen={open}
          onToggle={() => {}}
          onSelect={() => {}}
          hoveredPerm={hoveredPerm}
          onHoverPerm={() => {}}
        />
      </div>
    </div>
  );
}
