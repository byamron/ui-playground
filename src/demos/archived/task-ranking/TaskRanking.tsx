import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bg, demoPalettes, text } from "../../palette";

/**
 * Task Ranking — ported from Trio's RankingView.swift.
 * Binary search pairwise comparison: "Which is more important?"
 * User taps one of two cards, and the algorithm narrows down where to insert.
 */

const BG = bg(demoPalettes["task-ranking"]);

interface Task {
  id: string;
  title: string;
  description?: string;
}

const SAMPLE_TASKS: Task[] = [
  { id: "1", title: "Ship v2.0 release", description: "Final QA and deployment" },
  { id: "2", title: "Fix auth token refresh", description: "Users getting logged out" },
  { id: "3", title: "Design system audit", description: "Color and spacing consistency" },
  { id: "4", title: "Onboarding flow rework", description: "Reduce drop-off rate" },
  { id: "5", title: "Performance profiling", description: "Bundle size regression" },
  { id: "6", title: "API rate limiting", description: "Prevent abuse on public endpoints" },
];

// Binary search ranking — returns the final sorted order
async function* binarySearchRank(
  newTask: Task,
  sortedTasks: Task[]
): AsyncGenerator<{ a: Task; b: Task; step: number; total: number }, number> {
  if (sortedTasks.length === 0) return 0;

  let low = 0;
  let high = sortedTasks.length;
  const totalSteps = Math.ceil(Math.log2(sortedTasks.length + 1));
  let step = 0;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    step++;
    const isHigher: boolean = yield {
      a: newTask,
      b: sortedTasks[mid],
      step,
      total: totalSteps,
    };
    if (isHigher) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

export function TaskRanking() {
  const [ranked, setRanked] = useState<Task[]>([]);
  const [unranked, setUnranked] = useState<Task[]>(() => [...SAMPLE_TASKS]);
  const [comparison, setComparison] = useState<{ a: Task; b: Task; step: number; total: number } | null>(null);
  const [done, setDone] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [pairKey, setPairKey] = useState(0);

  const startNextRank = useCallback(async () => {
    if (unranked.length === 0) {
      setDone(true);
      return;
    }

    const task = unranked[0];
    setUnranked((prev) => prev.slice(1));

    // Wrap the generator to bridge yield ↔ user input
    const gen = binarySearchRank(task, ranked);

    let result = await gen.next();

    while (!result.done) {
      const comp = result.value;
      setComparison(comp);
      setPairKey((k) => k + 1);

      // Wait for user choice
      const choice = await new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });

      result = await gen.next(choice);
    }

    const insertIndex = result.value;
    setRanked((prev) => {
      const next = [...prev];
      next.splice(insertIndex, 0, task);
      return next;
    });
    setComparison(null);
  }, [unranked, ranked]);

  // Auto-start the first/next ranking
  useEffect(() => {
    if (!comparison && !done && unranked.length > 0) {
      startNextRank();
    }
  }, [comparison, done, unranked.length, startNextRank]);

  const handleChoice = (newTaskIsHigher: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(newTaskIsHigher);
      resolveRef.current = null;
    }
  };

  const reset = () => {
    setRanked([]);
    setUnranked([...SAMPLE_TASKS]);
    setComparison(null);
    setDone(false);
    resolveRef.current = null;
  };

  return (
    <div className="demo-page" style={{ background: BG, flexDirection: "column", gap: 0, padding: 40 }}>
      <style>{`
        .rank-heading {
          font-size: 15px;
          font-weight: 500;
          color: ${text.dark.tertiary};
          margin-bottom: 32px;
          letter-spacing: 0.02em;
        }
        .rank-card {
          padding: 22px 26px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          cursor: pointer;
          user-select: none;
          width: clamp(260px, 28vw, 340px);
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .rank-card:hover {
          border-color: rgba(255,255,255,0.20);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .rank-card-title {
          font-size: 16px;
          font-weight: 600;
          color: ${text.dark.primary};
          margin-bottom: 4px;
        }
        .rank-card-desc {
          font-size: 13px;
          color: ${text.dark.tertiary};
          line-height: 1.4;
        }
        .rank-or {
          font-size: 13px;
          color: ${text.dark.muted};
          margin: 12px 0;
          text-transform: lowercase;
        }
        .rank-progress {
          font-size: 12px;
          color: ${text.dark.muted};
          margin-top: 32px;
          letter-spacing: 0.03em;
        }
        .rank-shortcut {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          font-size: 11px;
          color: ${text.dark.muted};
          margin-left: 8px;
          font-weight: 500;
        }
        .rank-result {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: clamp(260px, 28vw, 340px);
        }
        .rank-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .rank-result-num {
          font-size: 12px;
          font-weight: 600;
          color: ${text.dark.muted};
          width: 18px;
          text-align: center;
        }
        .rank-result-title {
          font-size: 14px;
          color: ${text.dark.primary};
        }
        .rank-reset {
          margin-top: 24px;
          padding: 8px 20px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: none;
          color: ${text.dark.tertiary};
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .rank-reset:hover {
          border-color: rgba(255,255,255,0.25);
        }
      `}</style>

      <AnimatePresence mode="wait">
        {comparison && !done && (
          <motion.div
            key={`compare-${pairKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div className="rank-heading">Which is more important?</div>

            {/* Card A — enters from left with spring overshoot */}
            <motion.div
              className="rank-card"
              onClick={() => handleChoice(true)}
              initial={{ opacity: 0, x: -60, scale: 0.92, rotate: -3 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, x: 80, scale: 0.85, rotate: 5 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 25,
                mass: 0.8,
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="rank-card-title">{comparison.a.title}</div>
                <span className="rank-shortcut">1</span>
              </div>
              {comparison.a.description && (
                <div className="rank-card-desc">{comparison.a.description}</div>
              )}
            </motion.div>

            {/* "or" divider with breathing pulse */}
            <motion.div
              className="rank-or"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.08)" }} />
              <span>or</span>
              <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.08)" }} />
            </motion.div>

            {/* Card B — enters from right with spring overshoot */}
            <motion.div
              className="rank-card"
              onClick={() => handleChoice(false)}
              initial={{ opacity: 0, x: 60, scale: 0.92, rotate: 3 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, x: -80, scale: 0.85, rotate: -5 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 25,
                mass: 0.8,
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="rank-card-title">{comparison.b.title}</div>
                <span className="rank-shortcut">2</span>
              </div>
              {comparison.b.description && (
                <div className="rank-card-desc">{comparison.b.description}</div>
              )}
            </motion.div>

            {/* Progress — converging beam */}
            <motion.div
              className="rank-progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {Array.from({ length: comparison.total }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      background: i < comparison.step
                        ? "hsla(350, 50%, 65%, 0.8)"
                        : "rgba(255,255,255,0.08)",
                      scale: i === comparison.step - 1 ? [1, 1.3, 1] : 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                    }}
                    style={{
                      width: 20,
                      height: 4,
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
              <span>
                {unranked.length + 1} task{unranked.length > 0 ? "s" : ""} remaining
              </span>
            </motion.div>
          </motion.div>
        )}

        {done && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div className="rank-heading">Prioritized</div>
            <div className="rank-result">
              {ranked.map((task, i) => (
                <motion.div
                  key={task.id}
                  className="rank-result-item"
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 22,
                    delay: Math.pow(i, 1.4) * 0.05,
                  }}
                >
                  <span className="rank-result-num">{i + 1}</span>
                  <span className="rank-result-title">{task.title}</span>
                </motion.div>
              ))}
            </div>
            <motion.button
              className="rank-reset"
              onClick={reset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.pow(Math.max(0, ranked.length - 1), 1.4) * 0.05 + 0.3 }}
            >
              Start over
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard handler */}
      <KeyboardHandler onChoice={handleChoice} active={!!comparison && !done} />
    </div>
  );
}

function KeyboardHandler({ onChoice, active }: { onChoice: (v: boolean) => void; active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "1") onChoice(true);
      if (e.key === "2") onChoice(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onChoice, active]);
  return null;
}
