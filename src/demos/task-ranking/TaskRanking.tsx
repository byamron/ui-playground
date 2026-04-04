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
  const generatorRef = useRef<AsyncGenerator<{ a: Task; b: Task; step: number; total: number }, number> | null>(null);
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
    generatorRef.current = null;
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
          padding: 20px 24px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          cursor: pointer;
          user-select: none;
          width: 280px;
          transition: border-color 0.15s, background 0.15s;
        }
        .rank-card:hover {
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
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
          width: 280px;
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div className="rank-heading">Which is more important?</div>

            <div
              className="rank-card"
              onClick={() => handleChoice(true)}
              onKeyDown={(e) => e.key === "1" && handleChoice(true)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="rank-card-title">{comparison.a.title}</div>
                <span className="rank-shortcut">1</span>
              </div>
              {comparison.a.description && (
                <div className="rank-card-desc">{comparison.a.description}</div>
              )}
            </div>

            <div className="rank-or">or</div>

            <div
              className="rank-card"
              onClick={() => handleChoice(false)}
              onKeyDown={(e) => e.key === "2" && handleChoice(false)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="rank-card-title">{comparison.b.title}</div>
                <span className="rank-shortcut">2</span>
              </div>
              {comparison.b.description && (
                <div className="rank-card-desc">{comparison.b.description}</div>
              )}
            </div>

            <div className="rank-progress">
              Comparison {comparison.step} of ~{comparison.total}
              {unranked.length > 0 && ` · ${unranked.length + 1} tasks remaining`}
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div className="rank-heading">Prioritized</div>
            <div className="rank-result">
              {ranked.map((task, i) => (
                <motion.div
                  key={task.id}
                  className="rank-result-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <span className="rank-result-num">{i + 1}</span>
                  <span className="rank-result-title">{task.title}</span>
                </motion.div>
              ))}
            </div>
            <button className="rank-reset" onClick={reset}>
              Start over
            </button>
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
