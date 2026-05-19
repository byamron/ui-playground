import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RANKING_SAMPLE_TASKS } from "../demos/task-ranking/TaskRanking";
import type { PreviewProps } from "./_shared";

// Two stacked rank-cards with "or" between, using the demo's actual sample tasks.
// On hover, a winner is picked and the next pair fades in — same spring shapes as the demo.
export default function TaskRankingPreview({ active, intense }: PreviewProps) {
  const [pairIdx, setPairIdx] = useState(0);
  const [pickedSide, setPickedSide] = useState<"a" | "b" | null>(null);

  useEffect(() => {
    if (!active || !intense) {
      setPickedSide(null);
      return;
    }
    const PERIOD = 2200;
    const start = performance.now();
    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      const c = Math.floor((now - start) / PERIOD);
      if (c !== last) {
        last = c;
        setPickedSide(c % 2 === 0 ? "a" : "b");
        setTimeout(() => setPairIdx((i) => (i + 1) % (RANKING_SAMPLE_TASKS.length - 1)), 600);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, intense]);

  const a = RANKING_SAMPLE_TASKS[pairIdx];
  const b = RANKING_SAMPLE_TASKS[pairIdx + 1] ?? RANKING_SAMPLE_TASKS[0];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        padding: "0 18px",
        boxSizing: "border-box",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`pair-${pairIdx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "stretch", width: "100%", maxWidth: 260, gap: 4 }}
        >
          <Card task={a} side="a" picked={pickedSide === "a"} />
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "lowercase", letterSpacing: "0.04em", textAlign: "center", padding: "1px 0" }}>
            or
          </div>
          <Card task={b} side="b" picked={pickedSide === "b"} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Card({
  task,
  side,
  picked,
}: {
  task: { title: string; description?: string };
  side: "a" | "b";
  picked: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "a" ? -30 : 30, scale: 0.94 }}
      animate={{
        opacity: picked ? 1 : 0.95,
        x: 0,
        scale: picked ? 1.03 : 1,
      }}
      transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: `1px solid rgba(255,255,255,${picked ? 0.22 : 0.1})`,
        background: `rgba(255,255,255,${picked ? 0.08 : 0.05})`,
        boxShadow: picked ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 2px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.96)", lineHeight: 1.25 }}>
        {task.title}
      </div>
      {task.description && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.3, marginTop: 1 }}>
          {task.description}
        </div>
      )}
    </motion.div>
  );
}
