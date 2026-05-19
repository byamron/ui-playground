import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { bg, demoPalettes } from "../../palette";
import { DevPanel, DevSlider, DevDivider } from "../../components/DevPanel";
import contributionData from "./contributions.json";

/**
 * GitHub Sparkline — extracted from the portfolio's ContributionHeatmap.
 * Sparkline on the left, label/chip/chevron on the right. Click toggles
 * the heatmap drawer; bars shake-and-settle on every toggle, with the
 * drawer following 80ms behind as a choreographic cue.
 */

const HUE = 34;
const BG_COLOR = bg(demoPalettes["github-sparkline"]);
const YEAR = 2026;

const CELL_SIZE = 16;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const TOTAL_WEEKS = 53;
const HEATMAP_WIDTH = TOTAL_WEEKS * CELL_STEP - CELL_GAP;
const HEATMAP_HEIGHT = 7 * CELL_STEP - CELL_GAP;

const LEFT_WEEKS = 34;
const SECTION_LEFT_WIDTH = LEFT_WEEKS * CELL_STEP;
const SECTION_RIGHT_WIDTH = HEATMAP_WIDTH - SECTION_LEFT_WIDTH;

const SPARK_HEIGHT = 22;
const DAY_BAR_WIDTH = CELL_SIZE / 7;

const DEFAULTS = {
  shakeStiffness: 185,
  shakeDamping: 12,
  shakeSpread: 0.55,
  shakeStagger: 90,
  shakeLead: 80,
  drawerStiffness: 220,
  drawerDamping: 26,
  overshootBias: 1.4,
  startMin: 0.3,
  startMax: 1.0,
};

interface ContributionDay {
  date: string;
  contributionCount: number;
  level: number;
}
interface ContributionWeek {
  contributionDays: ContributionDay[];
}
interface ContributionData {
  totalContributions: number;
  weeks: ContributionWeek[];
  fetchedAt?: string;
}

const data = contributionData as ContributionData;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

interface GridCell {
  date: string;
  count: number;
  inYear: boolean;
}

function buildYearGrid(year: number) {
  const lookup = new Map<string, ContributionDay>();
  for (const week of data.weeks) {
    for (const day of week.contributionDays) lookup.set(day.date, day);
  }

  const jan1 = new Date(year, 0, 1);
  const startOffset = jan1.getDay();
  const gridStart = new Date(year, 0, 1 - startOffset);
  const dec31 = new Date(year, 11, 31);
  const endOffset = 6 - dec31.getDay();
  const gridEnd = new Date(year, 11, 31 + endOffset);

  const grid: GridCell[][] = [];
  let total = 0;
  let maxCount = 0;
  const current = new Date(gridStart);
  while (current <= gridEnd) {
    const week: GridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = `${current.getFullYear()}-${pad2(current.getMonth() + 1)}-${pad2(current.getDate())}`;
      const inYear = current.getFullYear() === year;
      const contrib = lookup.get(dateStr);
      const count = contrib?.contributionCount ?? 0;
      if (inYear) {
        total += count;
        if (count > maxCount) maxCount = count;
      }
      week.push({ date: dateStr, count, inYear });
      current.setDate(current.getDate() + 1);
    }
    grid.push(week);
  }

  // Find the most recent day with real (non-zero or in-data) coverage.
  // We surface this as the "as of" date so the partial-year heatmap reads
  // as "year in progress" rather than "Ben stopped coding."
  let asOfDate: string | null = null;
  if (data.fetchedAt) {
    asOfDate = data.fetchedAt.slice(0, 10);
  } else {
    for (let w = grid.length - 1; w >= 0 && !asOfDate; w--) {
      const week = grid[w]!;
      for (let d = 6; d >= 0; d--) {
        if (week[d]!.inYear && lookup.has(week[d]!.date)) {
          asOfDate = week[d]!.date;
          break;
        }
      }
    }
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  let todayCoord: { week: number; day: number } | null = null;
  for (let w = 0; w < grid.length; w++) {
    const week = grid[w]!;
    for (let d = 0; d < 7; d++) {
      if (week[d]!.date === todayStr && week[d]!.inYear) {
        todayCoord = { week: w, day: d };
      }
    }
  }

  return { grid, total, maxCount: maxCount || 1, todayCoord, asOfDate };
}

function contribFill(count: number, max: number): string {
  if (count === 0) return `hsla(${HUE}, 8%, 55%, 0.06)`;
  const intensity = Math.sqrt(count / max);
  const alpha = 0.18 + intensity * 0.72;
  const sat = 35 + intensity * 45;
  return `hsla(${HUE}, ${sat}%, 56%, ${alpha})`;
}

/**
 * Decorrelated per-bar hash. The four salt values are chosen far apart so
 * sin() lands in unrelated regions for each seed — r0..r3 stay independent.
 */
const NOISE_SALTS = [0, 7919.137, 23029.291, 50321.873];
function hashNoise(i: number, key: number, seedIdx: 0 | 1 | 2 | 3): number {
  const x =
    Math.sin(i * 12.9898 + key * 78.233 + NOISE_SALTS[seedIdx]!) *
    43758.5453;
  return x - Math.floor(x);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${month} ${day}${suffix}`;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getTooltipText(date: string, count: number): string {
  const now = new Date();
  const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  if (date === today)
    return `Today, ${formatDate(date)} — contributions in progress`;
  if (date > today) return "No contributions (yet)";
  return `${count} contribution${count !== 1 ? "s" : ""} on ${formatDate(date)}`;
}

interface Tuning {
  shakeStiffness: number;
  shakeDamping: number;
  shakeSpread: number;
  shakeStagger: number;
  overshootBias: number;
  startMin: number;
  startMax: number;
}

interface BarProps {
  cell: GridCell;
  idx: number;
  animKey: number;
  maxCount: number;
  tuning: Tuning;
  localW: number;
  d: number;
  onHover: (
    e: React.MouseEvent<SVGRectElement>,
    cell: GridCell,
  ) => void;
  onLeave: () => void;
}

/**
 * One sparkline day bar. Owns its own animation controls so it can be
 * `.set()` to a fresh random start height and then `.start()` to its target
 * on every shake — no remount, much less reconciliation overhead than
 * forcing a key change for 365 children.
 */
function Bar({
  cell,
  idx,
  animKey,
  maxCount,
  tuning,
  localW,
  d,
  onHover,
  onLeave,
}: BarProps) {
  const controls = useAnimationControls();

  useLayoutEffect(() => {
    const intensity = Math.sqrt(cell.count / maxCount);
    const h =
      cell.count === 0
        ? 0.6
        : Math.max(1, intensity * (SPARK_HEIGHT - 1));
    const r0 = hashNoise(idx, animKey + 1, 0);
    const r1 = hashNoise(idx, animKey + 1, 1);
    const r2 = hashNoise(idx, animKey + 1, 2);
    const r3 = hashNoise(idx, animKey + 1, 3);

    const range = tuning.startMax - tuning.startMin;
    const startFrac = tuning.startMin + r0 * range;
    const startH = Math.max(0.5, (SPARK_HEIGHT - 0.5) * startFrac);

    const spreadStiff = tuning.shakeStiffness * 0.6 * tuning.shakeSpread;
    const spreadDamp = tuning.shakeDamping * 0.5 * tuning.shakeSpread;
    const baseStiff = tuning.shakeStiffness + (r1 - 0.5) * spreadStiff;
    const baseDamp = tuning.shakeDamping + (r2 - 0.5) * spreadDamp;

    const tallness = Math.max(0, intensity - 0.7) / 0.3;
    const biasK = 1 + (tuning.overshootBias - 1) * tallness;
    const stiffness = baseStiff * biasK;
    const damping = baseDamp / (1 + (biasK - 1) * 0.6);
    const mass = 0.45 + r3 * 0.45;
    const delay = (r1 * tuning.shakeStagger) / 1000;

    // Synchronous set before paint, then async settle.
    controls.set({ y: SPARK_HEIGHT - startH, height: startH });
    controls.start({
      y: SPARK_HEIGHT - h,
      height: h,
      transition: { type: "spring", stiffness, damping, mass, delay },
    });
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const x = localW * CELL_STEP + d * DAY_BAR_WIDTH + 0.15;
  const w = DAY_BAR_WIDTH - 0.3;

  return (
    <motion.rect
      x={x}
      width={w}
      rx={0.3}
      fill={contribFill(cell.count, maxCount)}
      animate={controls}
      onMouseEnter={(e) => onHover(e, cell)}
      onMouseLeave={onLeave}
      style={{ cursor: "default" }}
    />
  );
}

interface SparkSideProps {
  weeks: GridCell[][];
  globalStartWeek: number;
  maxCount: number;
  animKey: number;
  tuning: Tuning;
  sectionWidth: number;
  todayCoord: { week: number; day: number } | null;
  onBarHover: (
    e: React.MouseEvent<SVGRectElement>,
    cell: GridCell,
  ) => void;
  onBarLeave: () => void;
}

function SparkSide({
  weeks,
  globalStartWeek,
  maxCount,
  animKey,
  tuning,
  sectionWidth,
  todayCoord,
  onBarHover,
  onBarLeave,
}: SparkSideProps) {
  // Compute today's x within this section (only if today falls inside)
  let todayX: number | null = null;
  if (
    todayCoord &&
    todayCoord.week >= globalStartWeek &&
    todayCoord.week < globalStartWeek + weeks.length
  ) {
    const localW = todayCoord.week - globalStartWeek;
    todayX =
      localW * CELL_STEP +
      todayCoord.day * DAY_BAR_WIDTH +
      DAY_BAR_WIDTH / 2;
  }

  return (
    <svg
      viewBox={`0 0 ${sectionWidth} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      {weeks.map((week, localW) =>
        week.map((cell, d) => {
          if (!cell.inYear) return null;
          const globalW = globalStartWeek + localW;
          const idx = globalW * 7 + d;
          return (
            <Bar
              key={`${localW}-${d}`}
              cell={cell}
              idx={idx}
              animKey={animKey}
              maxCount={maxCount}
              tuning={tuning}
              localW={localW}
              d={d}
              onHover={onBarHover}
              onLeave={onBarLeave}
            />
          );
        }),
      )}
      {/* Today line — rhymes with the heatmap's today indicator below */}
      {todayX !== null && (
        <line
          x1={todayX}
          x2={todayX}
          y1={0}
          y2={SPARK_HEIGHT}
          stroke="hsla(0, 0%, 95%, 0.55)"
          strokeWidth={0.6}
          style={{ pointerEvents: "none" }}
        />
      )}
    </svg>
  );
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
  anchorHeight: number;
}

export function GithubSparkline() {
  const { grid, total, maxCount, todayCoord, asOfDate } = useMemo(
    () => buildYearGrid(YEAR),
    [],
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [sparkAnimKey, setSparkAnimKey] = useState(0);
  const [expandAnimDone, setExpandAnimDone] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    week: number;
    day: number;
  } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{
    week: number;
    day: number;
  } | null>(null);

  // Tuning state — DevPanel drives these
  const [shakeStiffness, setShakeStiffness] = useState(DEFAULTS.shakeStiffness);
  const [shakeDamping, setShakeDamping] = useState(DEFAULTS.shakeDamping);
  const [shakeSpread, setShakeSpread] = useState(DEFAULTS.shakeSpread);
  const [shakeStagger, setShakeStagger] = useState(DEFAULTS.shakeStagger);
  const [shakeLead, setShakeLead] = useState(DEFAULTS.shakeLead);
  const [drawerStiffness, setDrawerStiffness] = useState(
    DEFAULTS.drawerStiffness,
  );
  const [drawerDamping, setDrawerDamping] = useState(DEFAULTS.drawerDamping);
  const [overshootBias, setOvershootBias] = useState(DEFAULTS.overshootBias);
  const [startMin, setStartMin] = useState(DEFAULTS.startMin);
  const [startMax, setStartMax] = useState(DEFAULTS.startMax);

  const tuning: Tuning = {
    shakeStiffness,
    shakeDamping,
    shakeSpread,
    shakeStagger,
    overshootBias,
    startMin,
    startMax,
  };

  // Refs: outerRef is the positioning anchor for all tooltips.
  const outerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const leftWeeks = grid.slice(0, LEFT_WEEKS);

  const toggle = useCallback(() => {
    setExpandAnimDone(false);
    setSparkAnimKey((k) => k + 1);
    setIsExpanded((prev) => !prev);
  }, []);

  const fontFamily =
    "'Onest', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
  const monoFamily =
    "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";
  const textColor = "hsl(240, 2%, 75%)";

  const placeTooltip = useCallback(
    (rect: DOMRect, text: string) => {
      const outer = outerRef.current;
      if (!outer) return;
      const outerRect = outer.getBoundingClientRect();
      setTooltip({
        text,
        x: rect.left + rect.width / 2 - outerRect.left,
        y: rect.top - outerRect.top,
        anchorHeight: rect.height,
      });
    },
    [],
  );

  const showTooltipForCell = useCallback(
    (week: number, day: number) => {
      const cell = grid[week]?.[day];
      const svg = svgRef.current;
      if (!cell?.inYear || !svg) return;
      const rectEl = svg.querySelector(
        `rect[data-date="${cell.date}"]`,
      ) as SVGRectElement | null;
      if (!rectEl) return;
      placeTooltip(rectEl.getBoundingClientRect(), getTooltipText(cell.date, cell.count));
    },
    [grid, placeTooltip],
  );

  const handleCellMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const target = e.target as SVGElement;
      const weekAttr = target.getAttribute("data-week");
      const dayAttr = target.getAttribute("data-day");
      if (weekAttr === null || dayAttr === null) {
        setHoveredCell((prev) => (prev === null ? prev : null));
        return;
      }
      const week = parseInt(weekAttr);
      const day = parseInt(dayAttr);
      const cell = grid[week]?.[day];
      if (!cell?.inYear) {
        setHoveredCell((prev) => (prev === null ? prev : null));
        return;
      }
      if (
        !hoveredCell ||
        hoveredCell.week !== week ||
        hoveredCell.day !== day
      ) {
        setFocusedCell(null);
        setHoveredCell({ week, day });
        showTooltipForCell(week, day);
      }
    },
    [grid, showTooltipForCell, hoveredCell],
  );

  const handleCellMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setTooltip(null);
  }, []);

  // Sparkline bar hover
  const handleBarHover = useCallback(
    (e: React.MouseEvent<SVGRectElement>, cell: GridCell) => {
      placeTooltip(
        e.currentTarget.getBoundingClientRect(),
        getTooltipText(cell.date, cell.count),
      );
    },
    [placeTooltip],
  );
  const handleBarLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Keyboard nav through cells
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"].includes(
          e.key,
        )
      )
        return;
      e.preventDefault();
      if (e.key === "Escape") {
        setFocusedCell(null);
        setTooltip(null);
        return;
      }
      setFocusedCell((prev) => {
        let week = prev?.week ?? todayCoord?.week ?? 0;
        let day = prev?.day ?? todayCoord?.day ?? 0;
        switch (e.key) {
          case "ArrowRight":
            week = Math.min(week + 1, grid.length - 1);
            break;
          case "ArrowLeft":
            week = Math.max(week - 1, 0);
            break;
          case "ArrowDown":
            day = Math.min(day + 1, 6);
            break;
          case "ArrowUp":
            day = Math.max(day - 1, 0);
            break;
        }
        const cell = grid[week]?.[day];
        if (!cell?.inYear) return prev;
        return { week, day };
      });
    },
    [grid, todayCoord],
  );

  const focusedViaPointer = useRef(false);
  const handlePointerDown = useCallback(() => {
    focusedViaPointer.current = true;
  }, []);
  const handleFocus = useCallback(() => {
    if (focusedViaPointer.current) {
      focusedViaPointer.current = false;
      return;
    }
    if (todayCoord) setFocusedCell(todayCoord);
  }, [todayCoord]);
  const handleBlur = useCallback(() => {
    focusedViaPointer.current = false;
    setFocusedCell(null);
    setTooltip(null);
  }, []);

  useEffect(() => {
    if (focusedCell) showTooltipForCell(focusedCell.week, focusedCell.day);
  }, [focusedCell, showTooltipForCell]);

  useEffect(() => {
    if (!isExpanded) {
      setTooltip(null);
      setHoveredCell(null);
      setFocusedCell(null);
    }
  }, [isExpanded]);

  const drawerDelay = shakeLead / 1000;
  const asOfLabel = asOfDate ? formatShortDate(asOfDate) : null;

  return (
    <DevPanel
      label="GitHub Sparkline"
      background={BG_COLOR}
      defaultOpen={false}
      controls={
        <>
          <DevSlider
            label="Shake stiffness"
            value={shakeStiffness}
            onChange={setShakeStiffness}
            min={60}
            max={400}
            step={5}
          />
          <DevSlider
            label="Shake damping"
            value={shakeDamping}
            onChange={setShakeDamping}
            min={4}
            max={28}
            step={0.5}
          />
          <DevSlider
            label="Spread"
            value={shakeSpread}
            onChange={setShakeSpread}
            min={0}
            max={1.5}
            step={0.05}
          />
          <DevSlider
            label="Stagger (ms)"
            value={shakeStagger}
            onChange={setShakeStagger}
            min={0}
            max={400}
            step={10}
          />
          <DevDivider />
          <DevSlider
            label="Start min"
            value={startMin}
            onChange={setStartMin}
            min={0}
            max={1}
            step={0.05}
          />
          <DevSlider
            label="Start max"
            value={startMax}
            onChange={setStartMax}
            min={0}
            max={1}
            step={0.05}
          />
          <DevSlider
            label="Overshoot bias"
            value={overshootBias}
            onChange={setOvershootBias}
            min={1}
            max={2.5}
            step={0.05}
          />
          <DevDivider />
          <DevSlider
            label="Shake lead (ms)"
            value={shakeLead}
            onChange={setShakeLead}
            min={0}
            max={300}
            step={10}
          />
          <DevSlider
            label="Drawer stiffness"
            value={drawerStiffness}
            onChange={setDrawerStiffness}
            min={80}
            max={400}
            step={5}
          />
          <DevSlider
            label="Drawer damping"
            value={drawerDamping}
            onChange={setDrawerDamping}
            min={10}
            max={50}
            step={1}
          />
        </>
      }
    >
      <div
        ref={outerRef}
        style={{
          width: "min(92vw, 1100px)",
          minWidth: 860,
          fontFamily,
          position: "relative",
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          onMouseEnter={(e) => {
            if (!isExpanded)
              e.currentTarget.style.background = "rgba(255,255,255,0.025)";
          }}
          onMouseLeave={(e) => {
            if (!isExpanded) e.currentTarget.style.background = "transparent";
          }}
          style={{
            padding: "20px 18px 20px 0",
            borderRadius: 16,
            background: isExpanded
              ? "rgba(255,255,255,0.025)"
              : "transparent",
            transition: "background 0.3s",
            display: "grid",
            gridTemplateColumns: `${SECTION_LEFT_WIDTH}fr ${SECTION_RIGHT_WIDTH}fr`,
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none",
            outline: "none",
          }}
        >
          <div style={{ height: SPARK_HEIGHT, minWidth: 0 }}>
            <SparkSide
              weeks={leftWeeks}
              globalStartWeek={0}
              maxCount={maxCount}
              animKey={sparkAnimKey}
              tuning={tuning}
              sectionWidth={SECTION_LEFT_WIDTH}
              todayCoord={todayCoord}
              onBarHover={handleBarHover}
              onBarLeave={handleBarLeave}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: "clamp(12px, 1.05vw, 14px)",
                fontWeight: 400,
                color: textColor,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              <code
                style={{
                  fontFamily: monoFamily,
                  fontSize: "inherit",
                  fontWeight: 400,
                  background: "rgba(255,255,255,0.06)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {total.toLocaleString()}
              </code>{" "}
              GitHub contributions in {YEAR}
              {asOfLabel && (
                <span style={{ opacity: 0.55 }}> · as of {asOfLabel}</span>
              )}
            </span>
            <svg
              width="8"
              height="5"
              viewBox="0 0 8 5"
              fill="none"
              style={{
                display: "block",
                flexShrink: 0,
                transform: isExpanded ? "rotate(180deg)" : undefined,
                transition: "transform 0.25s ease",
              }}
            >
              <path
                d="M1 1l3 3 3-3"
                stroke={textColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Heatmap drawer — mounted as soon as isExpanded flips, but the
            height animation has delay=shakeLead, letting bars cue first. */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="grid"
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: "auto",
                opacity: 1,
                transition: {
                  height: {
                    type: "spring",
                    stiffness: drawerStiffness,
                    damping: drawerDamping,
                    mass: 0.9,
                    delay: drawerDelay,
                  },
                  opacity: {
                    duration: 0.25,
                    delay: drawerDelay + 0.1,
                  },
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  opacity: { duration: 0.15, delay: drawerDelay },
                  height: {
                    type: "spring",
                    stiffness: drawerStiffness * 1.1,
                    damping: drawerDamping + 4,
                    mass: 0.7,
                    delay: drawerDelay,
                  },
                },
              }}
              onAnimationStart={() => setExpandAnimDone(false)}
              onAnimationComplete={() => setExpandAnimDone(true)}
              style={{
                overflow: expandAnimDone ? "visible" : "clip",
                position: "absolute",
                top: "100%",
                left: 0,
                right: 18,
              }}
            >
              <div style={{ paddingTop: 16, position: "relative" }}>
                <div
                  tabIndex={0}
                  aria-label="Contribution heatmap. Use arrow keys to navigate days."
                  onPointerDown={handlePointerDown}
                  onKeyDown={handleKeyDown}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={{ outline: "none" }}
                >
                  <svg
                    ref={svgRef}
                    width="100%"
                    viewBox={`0 0 ${HEATMAP_WIDTH} ${HEATMAP_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    onMouseMove={handleCellMouseMove}
                    onMouseLeave={handleCellMouseLeave}
                    style={{ display: "block", overflow: "visible" }}
                  >
                    {grid.map((week, w) =>
                      week.map((cell, d) => {
                        if (!cell.inYear) return null;
                        return (
                          <rect
                            key={`${w}-${d}`}
                            x={w * CELL_STEP}
                            y={d * CELL_STEP}
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            rx={3}
                            fill={contribFill(cell.count, maxCount)}
                            data-date={cell.date}
                            data-week={w}
                            data-day={d}
                          />
                        );
                      }),
                    )}
                    {/* Today indicator — desaturated white so it reads
                        independently of contribution intensity. */}
                    {todayCoord && (
                      <rect
                        x={todayCoord.week * CELL_STEP + 1.5}
                        y={todayCoord.day * CELL_STEP + 1.5}
                        width={CELL_SIZE - 3}
                        height={CELL_SIZE - 3}
                        rx={2}
                        fill="none"
                        stroke="hsla(0, 0%, 95%, 0.85)"
                        strokeWidth={1.5}
                        style={{ pointerEvents: "none" }}
                      />
                    )}
                    {hoveredCell &&
                      grid[hoveredCell.week]?.[hoveredCell.day]?.inYear && (
                        <rect
                          x={hoveredCell.week * CELL_STEP}
                          y={hoveredCell.day * CELL_STEP}
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          rx={3}
                          fill="rgba(255,255,255,0.18)"
                          style={{ pointerEvents: "none" }}
                        />
                      )}
                    {focusedCell &&
                      grid[focusedCell.week]?.[focusedCell.day]?.inYear && (
                        <rect
                          x={focusedCell.week * CELL_STEP - 1.5}
                          y={focusedCell.day * CELL_STEP - 1.5}
                          width={CELL_SIZE + 3}
                          height={CELL_SIZE + 3}
                          rx={4}
                          fill="none"
                          stroke="hsl(0, 0%, 95%)"
                          strokeWidth={2}
                          style={{ pointerEvents: "none" }}
                        />
                      )}
                  </svg>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tooltip — shared between sparkline bars and heatmap cells.
            Positioned relative to outerRef so it works from any anchor. */}
        {tooltip &&
          (() => {
            const outerWidth = outerRef.current?.offsetWidth ?? Infinity;
            const nearLeft = tooltip.x < 80;
            const nearRight = tooltip.x > outerWidth - 80;
            const left = nearLeft ? 0 : nearRight ? outerWidth : tooltip.x;
            const horizontalTranslate = nearLeft
              ? "0"
              : nearRight
                ? "-100%"
                : "-50%";
            const tooltipEstHeight = 32;
            const gap = 8;
            const showBelow = tooltip.y - gap - tooltipEstHeight < 0;
            const top = showBelow
              ? tooltip.y + tooltip.anchorHeight + gap
              : tooltip.y - gap;
            const verticalTranslate = showBelow ? "0" : "-100%";
            return (
              <div
                style={{
                  position: "absolute",
                  left,
                  top,
                  transform: `translate(${horizontalTranslate}, ${verticalTranslate})`,
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily,
                  fontWeight: 400,
                  lineHeight: 1.3,
                  color: "hsl(0, 0%, 95%)",
                  background: BG_COLOR,
                  border: "1px solid hsl(0, 0%, 30%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                }}
              >
                {tooltip.text}
              </div>
            );
          })()}
      </div>
    </DevPanel>
  );
}
