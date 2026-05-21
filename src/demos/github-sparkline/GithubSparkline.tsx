import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { bg, demoPalettes } from "../../palette";
import {
  DevPanel,
  DevSlider,
  DevDivider,
  DevToggle,
  DevButtonGroup,
  DevButton,
} from "../../components/DevPanel";
import contributionData from "./contributions.json";

/**
 * GitHub Sparkline — re-aligned with the portfolio's ContributionHeatmap.
 * Menu-item row: chip + count text + trailing sparkline + chevron. The
 * sparkline floats above the row baseline (height: 0 + absolute SVG)
 * so it stays visible in both collapsed and expanded states. Click
 * toggles a drawer absolutely positioned below the row — the header
 * itself never moves. Every click re-fires the shake-and-settle.
 */

const HUE = 34;
const BG_COLOR = bg(demoPalettes["github-sparkline"]);
const YEAR = 2026;

// All visual dimensions scaled 1.5× from the original to make the demo
// pop on screen during recording. Heatmap cells scale through the
// viewport (SVG width: 100%) so CELL_SIZE/CELL_GAP stay in their
// existing proportion — the rendered cells grow because the container
// width grows with the larger header content.
const CELL_SIZE = 14;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;

const SPARK_BAR_W = 3;
const SPARK_BAR_GAP = 1.5;
const SPARK_BAR_STEP = SPARK_BAR_W + SPARK_BAR_GAP;
const SPARK_HEIGHT = 21;

// Drawer spring is fixed — committed defaults, not user-tunable.
const DRAWER_STIFFNESS = 220;
const DRAWER_DAMPING = 26;

// The "Shake intensity" slider drives stiffness, damping, spread, and
// stagger through a single curve. t=0 is quiet/uniform/fast, t=1 is
// loud/chaotic/slow. Default t=0.5 ≈ the original four-slider defaults.
function shakeFromIntensity(t: number) {
  return {
    shakeStiffness: 280 - t * 180, // 280 → 100
    shakeDamping: 22 - t * 17, // 22 → 5
    shakeSpread: t * 1.1, // 0 → 1.1
    shakeStagger: t * 180, // 0 → 180
  };
}

const DEFAULTS = {
  shakeIntensity: 0.8,
  overshootBias: 2.0,
  popSpeed: 0.5,
};

type PopOrder = "sequential" | "random";
const POP_ORDER_OPTIONS: { label: string; value: PopOrder }[] = [
  { label: "Sequential", value: "sequential" },
  { label: "Random", value: "random" },
];

type SparkPos = "trailing" | "right" | "tight" | "stretch";
const SPARK_POS_OPTIONS: { label: string; value: SparkPos }[] = [
  { label: "Trailing", value: "trailing" },
  { label: "Right", value: "right" },
  { label: "Tight", value: "tight" },
  { label: "Stretch", value: "stretch" },
];

type TooltipTransition = "none" | "crossfade" | "tween";
const TOOLTIP_TRANSITION_OPTIONS: {
  label: string;
  value: TooltipTransition;
}[] = [
  { label: "None", value: "none" },
  { label: "Crossfade", value: "crossfade" },
  { label: "Tween", value: "tween" },
];

type TweenSpeed = "snappy" | "considered" | "deliberate";
const TWEEN_SPEED_OPTIONS: { label: string; value: TweenSpeed }[] = [
  { label: "Snappy", value: "snappy" },
  { label: "Considered", value: "considered" },
  { label: "Deliberate", value: "deliberate" },
];

// Durations mapped to HCI perceptual bands. The count and dial each get
// their own scale because dial motion communicates via the movement
// itself (so it can be shorter) while count must let the eye perceive
// the easeOutExpo tail.
const TWEEN_DURATIONS: Record<
  TweenSpeed,
  { count: number; dial: number }
> = {
  snappy: { count: 0.22, dial: 0.16 },
  considered: { count: 0.38, dial: 0.22 },
  deliberate: { count: 0.55, dial: 0.32 },
};

// Rendered px width of the sparkline in non-stretch modes. Bars within
// this fixed space auto-adjust their width based on column count.
// (1.5× the original 65px to match the demo scale-up.)
const SPARK_FIXED_WIDTH = 98;

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

  const fullGrid: GridCell[][] = [];
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
    fullGrid.push(week);
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  let lastFilledWeek = 0;
  for (let w = 0; w < fullGrid.length; w++) {
    const week = fullGrid[w]!;
    if (week.some((c) => c.inYear && c.date <= todayStr)) {
      lastFilledWeek = w;
    }
  }
  const grid = fullGrid.slice(0, lastFilledWeek + 1);

  let todayCoord: { week: number; day: number } | null = null;
  for (let w = 0; w < grid.length; w++) {
    const week = grid[w]!;
    for (let d = 0; d < 7; d++) {
      if (week[d]!.date === todayStr && week[d]!.inYear) {
        todayCoord = { week: w, day: d };
      }
    }
  }

  const weeklyTotals = grid.map((week) =>
    week.reduce((sum, c) => sum + (c.inYear ? c.count : 0), 0),
  );
  const maxWeekly = Math.max(...weeklyTotals, 1);

  return {
    grid,
    total,
    maxCount: maxCount || 1,
    todayCoord,
    weeklyTotals,
    maxWeekly,
  };
}

function contribFill(count: number, max: number): string {
  if (count === 0) return `hsla(${HUE}, 8%, 55%, 0.06)`;
  const intensity = Math.sqrt(count / max);
  const alpha = 0.18 + intensity * 0.72;
  const sat = 35 + intensity * 45;
  return `hsla(${HUE}, ${sat}%, 56%, ${alpha})`;
}

const NOISE_SALTS = [0, 7919.137, 23029.291, 50321.873];
function hashNoise(i: number, key: number, seedIdx: 0 | 1 | 2 | 3): number {
  const x =
    Math.sin(i * 12.9898 + key * 78.233 + NOISE_SALTS[seedIdx]!) * 43758.5453;
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
}

interface SparklineProps {
  binnedTotals: number[];
  maxBinned: number;
  animKey: number;
  tuning: Tuning;
}

/**
 * Sparkline — bars start TALLER than their target and settle down to it.
 * Each bar's overshoot is derived from a decorrelated hash of (idx, animKey)
 * so the sparkline reads as a single wave through the row. Bars are
 * keyed by `${animKey}-${i}` so a key bump re-mounts the rect, letting
 * Framer's `initial` re-fire cleanly on every toggle.
 */
function Sparkline({
  binnedTotals,
  maxBinned,
  animKey,
  tuning,
}: SparklineProps) {
  // viewBox width derives from the bar count; the SVG renders at 100% of
  // its parent and uses preserveAspectRatio="none", so bars auto-stretch
  // horizontally to fill whatever pixel width the parent provides. This
  // works in both fixed-width (SPARK_FIXED_WIDTH) and flex-grown
  // (stretch mode) parent spans.
  const sparkWidth = binnedTotals.length * SPARK_BAR_STEP - SPARK_BAR_GAP;
  return (
    <svg
      width="100%"
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${sparkWidth} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      style={{
        display: "block",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        transform: `translateY(-${SPARK_HEIGHT}px)`,
        overflow: "visible",
      }}
      aria-hidden
    >
      {binnedTotals.map((total, i) => {
        const intensity = Math.sqrt(total / maxBinned);
        const h =
          total === 0 ? 0.6 : Math.max(1, intensity * (SPARK_HEIGHT - 1));

        const r0 = hashNoise(i, animKey + 1, 0);
        const r1 = hashNoise(i, animKey + 1, 1);
        const r2 = hashNoise(i, animKey + 1, 2);
        const r3 = hashNoise(i, animKey + 1, 3);

        // Always start taller than target — bars grow then settle down.
        // Includes a minimum overshoot beyond SPARK_HEIGHT so the tallest
        // bars (which already sit near max) still travel a visible distance.
        // SVG has overflow: visible so the overshoot can extend above bounds.
        const MIN_OVERSHOOT = 4;
        const grow = 0.3 + r0 * 0.5 + r1 * 0.3;
        const headroom = SPARK_HEIGHT - h + MIN_OVERSHOOT;
        const startH = Math.min(
          SPARK_HEIGHT + MIN_OVERSHOOT,
          h + headroom * grow,
        );

        const spreadStiff = tuning.shakeStiffness * 0.6 * tuning.shakeSpread;
        const spreadDamp = tuning.shakeDamping * 0.5 * tuning.shakeSpread;
        const baseStiff =
          tuning.shakeStiffness + (r1 - 0.5) * spreadStiff;
        const baseDamp = tuning.shakeDamping + (r2 - 0.5) * spreadDamp;

        const tallness = Math.max(0, intensity - 0.7) / 0.3;
        const biasK = 1 + (tuning.overshootBias - 1) * tallness;
        const stiffness = baseStiff * biasK;
        const damping = baseDamp / (1 + (biasK - 1) * 0.6);
        const mass = 0.45 + r3 * 0.45;
        const delay = (r1 * tuning.shakeStagger) / 1000;

        return (
          <motion.rect
            key={`${animKey}-${i}`}
            x={i * SPARK_BAR_STEP}
            width={SPARK_BAR_W}
            rx={0.5}
            fill={contribFill(total, maxBinned)}
            initial={{ y: SPARK_HEIGHT - startH, height: startH }}
            animate={{ y: SPARK_HEIGHT - h, height: h }}
            transition={{
              type: "spring",
              stiffness,
              damping,
              mass,
              delay,
            }}
          />
        );
      })}
    </svg>
  );
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
  anchorHeight: number;
}

/** A single digit "wheel" — when the digit prop changes, the old digit
 *  slides up out of view and the new digit slides up in from below
 *  (iOS-picker direction). `delay` lets the parent stagger digits so
 *  the ones column animates before the tens.
 *
 *  Baseline fix: CSS resolves an inline-block's baseline to the bottom
 *  of its margin box whenever `overflow != visible` — so the previous
 *  `overflow: hidden` version sat too high regardless of any
 *  placeholder. Clipping with `clip-path: inset(0)` keeps overflow at
 *  its default `visible`, which lets the baseline resolve to the
 *  hidden "0" placeholder's text baseline → aligned with the
 *  surrounding text. */
function DigitWheel({
  digit,
  delay,
  duration,
}: {
  digit: number;
  delay: number;
  duration: number;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        width: "1ch",
        verticalAlign: "baseline",
        lineHeight: 1,
        clipPath: "inset(0)",
      }}
    >
      <span aria-hidden style={{ visibility: "hidden" }}>
        0
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={digit}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{
            duration,
            ease: [0.16, 1, 0.3, 1],
            delay,
          }}
          style={{
            position: "absolute",
            inset: 0,
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Counts up to `value` via an explicitly-tweened motion value. Uses
 *  easeOutExpo so the digits start moving immediately and settle slowly
 *  — feels intentional, not mechanical. */
function CountingNumber({
  value,
  duration,
}: {
  value: number;
  duration: number;
}) {
  const mv = useMotionValue(value);
  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, mv, duration]);
  const display = useTransform(mv, (v) => Math.round(v).toString());
  return (
    <motion.span style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </motion.span>
  );
}

/** Renders an integer as a row of digit-wheels. Wheels are keyed by
 *  position-from-right so the ones column maps to the ones column
 *  across value changes (and not, e.g., to the tens column when the
 *  number gains a digit). Animation delays cascade right→left so the
 *  ones-column digit moves first, then tens, then hundreds.
 *
 *  `dial=false` keeps the count-up animation but renders it as a
 *  spring-interpolated number rather than the picker dial. */
function TweenNumber({
  value,
  dial,
  speed,
}: {
  value: number;
  dial: boolean;
  speed: TweenSpeed;
}) {
  const { count: countDuration, dial: dialDuration } =
    TWEEN_DURATIONS[speed];
  if (!dial) {
    return <CountingNumber value={value} duration={countDuration} />;
  }
  const digits = value.toString().split("").map(Number);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {digits.map((d, i) => {
        const positionFromRight = digits.length - 1 - i;
        const delay = positionFromRight * 0.05;
        return (
          <DigitWheel
            key={positionFromRight}
            digit={d}
            delay={delay}
            duration={dialDuration}
          />
        );
      })}
    </span>
  );
}

/** Renders the tooltip body per mode. For "tween", parses out the
 *  leading integer (e.g., "5 contributions on May 12th") and springs it
 *  toward the new value; the rest of the string is static. For other
 *  modes the entire text is treated as one block. */
function TooltipBody({
  text,
  mode,
  dial,
  speed,
}: {
  text: string;
  mode: TooltipTransition;
  dial: boolean;
  speed: TweenSpeed;
}) {
  if (mode === "crossfade") {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          style={{ display: "inline-block" }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    );
  }
  if (mode === "tween") {
    const m = text.match(/^(\d+) (.+)$/);
    if (m) {
      return (
        <>
          <TweenNumber value={parseInt(m[1]!, 10)} dial={dial} speed={speed} />{" "}
          {m[2]}
        </>
      );
    }
  }
  return <>{text}</>;
}

export function GithubSparkline() {
  const { grid, total, maxCount, todayCoord } = useMemo(
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
  const [isHovering, setIsHovering] = useState(false);

  const headerRef = useRef<HTMLButtonElement>(null);
  const [headerHeight, setHeaderHeight] = useState(48);
  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const measure = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  const [shakeIntensity, setShakeIntensity] = useState(
    DEFAULTS.shakeIntensity,
  );
  const [overshootBias, setOvershootBias] = useState(DEFAULTS.overshootBias);

  // Cell-pop entrance — bouncy scale-up per cell with intensity-scaled
  // spring params (high-contribution days bounce harder, as if they
  // carry more energy). Order and speed are tunable.
  const [popEnabled, setPopEnabled] = useState(false);
  const [popOrder, setPopOrder] = useState<PopOrder>("sequential");
  const [popSpeed, setPopSpeed] = useState(DEFAULTS.popSpeed);

  // Where the sparkline sits in the header row.
  const [sparkPos, setSparkPos] = useState<SparkPos>("tight");

  // Column count — bar density inside the fixed sparkline space. As the
  // slider changes, the bars auto-adjust width via preserveAspectRatio
  // "none". Daily YTD data is binned into N buckets so the chart stays
  // accurate at any density.
  const [columnCount, setColumnCount] = useState(20);

  // Tight (concentric) variant — default on. When true, padding becomes
  // symmetric V=H=17 so the chip's inset is identical on every side,
  // and the outer radius is set to 23 (= inset 17 + chip radius 6),
  // making the chip's corners visually concentric with the row's.
  // When false, returns to the original puffy values (V=21, H=27, R=21).
  const [tight, setTight] = useState(true);
  const [refinedChevron, setRefinedChevron] = useState(true);

  const [tooltipTransition, setTooltipTransition] =
    useState<TooltipTransition>("tween");
  const [tweenDial, setTweenDial] = useState(false);
  const [tweenSpeed, setTweenSpeed] = useState<TweenSpeed>("considered");

  const ytdDays = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const counts: number[] = [];
    for (const week of grid) {
      for (const cell of week) {
        if (cell.inYear && cell.date <= today) counts.push(cell.count);
      }
    }
    return counts;
  }, [grid]);

  const binnedTotals = useMemo(() => {
    if (ytdDays.length === 0) return [];
    const n = Math.max(1, Math.min(columnCount, ytdDays.length));
    const binSize = ytdDays.length / n;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const start = Math.floor(i * binSize);
      const end = i === n - 1 ? ytdDays.length : Math.floor((i + 1) * binSize);
      let sum = 0;
      for (let j = start; j < end; j++) sum += ytdDays[j] ?? 0;
      out.push(sum);
    }
    return out;
  }, [ytdDays, columnCount]);

  const maxBinned = useMemo(
    () => Math.max(...binnedTotals, 1),
    [binnedTotals],
  );

  const tuning: Tuning = useMemo(() => {
    const s = shakeFromIntensity(shakeIntensity);
    return { ...s, overshootBias };
  }, [shakeIntensity, overshootBias]);

  // Tight = concentric. Symmetric inset and matching radius so the
  // chip's corners are visually nested in the row's corners.
  const inset = tight ? 17 : 21;
  const padTop = inset;
  const padBottom = inset;
  const padLeft = tight ? 17 : 27;
  const padRight = tight ? 17 : 27;
  // Chip radius is 6, so concentric outer radius = inset + 6 = 23 (tight)
  // or 27 (loose) — the latter goes pill, so we keep 21 in loose mode
  // for the original feel.
  const containerRadius = tight ? 23 : 21;
  const chevronViewBox = refinedChevron ? "0 0 11 7" : "0 0 9 6";
  const chevronStroke = refinedChevron ? 1.2 : 1.5;
  const chevronPath = refinedChevron
    ? "M1 1l4.5 4.5L10 1"
    : "M1 1l3.5 3.5L8 1";

  const resetToDefaults = useCallback(() => {
    setShakeIntensity(DEFAULTS.shakeIntensity);
    setOvershootBias(DEFAULTS.overshootBias);
    setPopEnabled(false);
    setPopOrder("sequential");
    setPopSpeed(DEFAULTS.popSpeed);
    setSparkPos("tight");
    setColumnCount(20);
    setTight(true);
    setRefinedChevron(true);
    setTooltipTransition("tween");
    setTweenDial(false);
    setTweenSpeed("considered");
  }, []);

  const outerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const HEATMAP_WIDTH = grid.length * CELL_STEP - CELL_GAP;
  const HEATMAP_HEIGHT = 7 * CELL_STEP - CELL_GAP;

  const toggle = useCallback(() => {
    setExpandAnimDone(false);
    setSparkAnimKey((k) => k + 1);
    setIsExpanded((prev) => !prev);
  }, []);

  const fontFamily =
    "'Onest', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
  const monoFamily =
    "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";
  const textColor = "hsl(240, 2%, 78%)";

  const placeTooltip = useCallback((rect: DOMRect, text: string) => {
    const outer = outerRef.current;
    if (!outer) return;
    const outerRect = outer.getBoundingClientRect();
    setTooltip({
      text,
      x: rect.left + rect.width / 2 - outerRect.left,
      y: rect.top - outerRect.top,
      anchorHeight: rect.height,
    });
  }, []);

  const showTooltipForCell = useCallback(
    (week: number, day: number) => {
      const cell = grid[week]?.[day];
      const svg = svgRef.current;
      if (!cell?.inYear || !svg) return;
      const rectEl = svg.querySelector(
        `rect[data-date="${cell.date}"]`,
      ) as SVGRectElement | null;
      if (!rectEl) return;
      placeTooltip(
        rectEl.getBoundingClientRect(),
        getTooltipText(cell.date, cell.count),
      );
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


  // At rest: border only (mobile-friendly affordance + figure-ground anchor
  // without competing with content). On hover/expand: fill enters as the
  // confirmation reward for committing to the click.
  const containerBg =
    isExpanded || isHovering ? "rgba(255,255,255,0.05)" : "transparent";
  const containerBorder =
    isExpanded || isHovering
      ? "rgba(255,255,255,0.09)"
      : "rgba(255,255,255,0.05)";

  return (
    <DevPanel
      label="GitHub Sparkline"
      background={BG_COLOR}
      defaultOpen={false}
      controls={
        <>
          <DevSlider
            label="Shake intensity"
            value={shakeIntensity}
            onChange={setShakeIntensity}
            min={0}
            max={1}
            step={0.02}
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
          <DevToggle
            label="Pop entrance"
            checked={popEnabled}
            onChange={setPopEnabled}
          />
          <DevButtonGroup<PopOrder>
            label="Pop order"
            options={POP_ORDER_OPTIONS}
            value={popOrder}
            onChange={setPopOrder}
          />
          <DevSlider
            label="Pop speed"
            value={popSpeed}
            onChange={setPopSpeed}
            min={0}
            max={1}
            step={0.02}
          />
          <DevDivider />
          <DevButtonGroup<SparkPos>
            label="Sparkline position"
            options={SPARK_POS_OPTIONS}
            value={sparkPos}
            onChange={setSparkPos}
          />
          <DevSlider
            label="Columns"
            value={columnCount}
            onChange={(v) => setColumnCount(Math.round(v))}
            min={8}
            max={90}
            step={1}
          />
          <DevDivider />
          <DevToggle
            label="Tight (concentric)"
            checked={tight}
            onChange={setTight}
          />
          <DevToggle
            label="Refined chevron"
            checked={refinedChevron}
            onChange={setRefinedChevron}
          />
          <DevButtonGroup<TooltipTransition>
            label="Tooltip update"
            options={TOOLTIP_TRANSITION_OPTIONS}
            value={tooltipTransition}
            onChange={setTooltipTransition}
          />
          <DevToggle
            label="Tween dial"
            checked={tweenDial}
            onChange={setTweenDial}
          />
          <DevButtonGroup<TweenSpeed>
            label="Tween speed"
            options={TWEEN_SPEED_OPTIONS}
            value={tweenSpeed}
            onChange={setTweenSpeed}
          />
          <DevDivider />
          <DevButton
            label="Reset to defaults"
            onClick={resetToDefaults}
            variant="muted"
          />
        </>
      }
    >
      <div
        ref={outerRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: `-${headerHeight / 2}px`,
          // Tight mode lets the row shrink to fit its content so the
          // sparkline ends naturally adjacent to the chevron — proximity
          // preserved AND right-edge implicitly aligned.
          width:
            sparkPos === "tight"
              ? "max-content"
              : "min(870px, calc(100vw - 16px))",
          maxWidth: "calc(100vw - 16px)",
          fontFamily,
          borderRadius: containerRadius,
          background: containerBg,
          border: `1px solid ${containerBorder}`,
          transition:
            "background 0.3s ease, border-color 0.3s ease",
          overflow: isExpanded && expandAnimDone ? "visible" : "hidden",
        }}
      >
        <button
          type="button"
          ref={headerRef}
          aria-expanded={isExpanded}
          onClick={toggle}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{
            all: "unset",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            width: "100%",
            padding: `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: "clamp(15px, 4.5vw, 22px)",
              fontWeight: 400,
              color: textColor,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <code
              style={{
                fontFamily: monoFamily,
                fontSize: "inherit",
                fontWeight: 400,
                // Subtle warm tint so the chip integrates with the
                // gold sparkline/container palette rather than reading
                // as a cool neutral inserted into a warm field.
                background: `hsla(${HUE}, 14%, 78%, 0.09)`,
                padding: "3px 9px",
                borderRadius: 6,
                // 10px margin + ~6px from the natural space character
                // ≈ 16px total, matching the flex gap between the text
                // and the sparkline.
                marginRight: 10,
              }}
            >
              {total.toLocaleString()}
            </code>{" "}
            GitHub contributions in {YEAR}
          </span>

          {/* Sparkline floats above the row baseline. The span has a
              FIXED pixel width in trailing/right/tight; in stretch it
              flex-grows to fill the gap between text and chevron. In
              either case bars auto-adjust their width to fit (via the
              SVG's preserveAspectRatio="none") so the column-count
              slider changes density, not container size. */}
          <span
            style={{
              position: "relative",
              height: 0,
              clipPath: "inset(-20px 0)",
              flexShrink: 0,
              ...(sparkPos === "stretch"
                ? { flex: "1 1 0", minWidth: 0 }
                : { width: SPARK_FIXED_WIDTH }),
              marginLeft: sparkPos === "right" ? "auto" : 0,
            }}
          >
            <Sparkline
              binnedTotals={binnedTotals}
              maxBinned={maxBinned}
              animKey={sparkAnimKey}
              tuning={tuning}
            />
          </span>

          <svg
            width="14"
            height="9"
            viewBox={chevronViewBox}
            fill="none"
            style={{
              display: "block",
              flexShrink: 0,
              alignSelf: "center",
              // Chevron pinned right via auto-margin in every mode except
              // "right" (where it sits flush against the sparkline) and
              // "stretch" (where the sparkline already consumed free
              // space). In "rhythmic" mode the spark *also* has
              // marginLeft auto, splitting free space equally → matched
              // gaps before and after the sparkline.
              marginLeft:
                sparkPos === "right" || sparkPos === "stretch"
                  ? 0
                  : "auto",
              transform: isExpanded ? "rotate(180deg)" : undefined,
              transition: "transform 0.25s ease",
            }}
          >
            <path
              d={chevronPath}
              stroke={textColor}
              strokeWidth={chevronStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Drawer is in-flow inside the unified container so the background
            extends behind both. The container's TOP is anchored via
            marginTop, so growth happens downward and the header stays
            fixed in the viewport. Reveal is choreographed: spring on the
            height (overshoots slightly for "alive" feel), then content
            fades in with a tiny y-settle behind it. */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="grid"
              initial={{ height: 0 }}
              animate={{
                height: "auto",
                transition: {
                  type: "spring",
                  stiffness: DRAWER_STIFFNESS,
                  damping: DRAWER_DAMPING,
                  mass: 0.9,
                },
              }}
              exit={{
                height: 0,
                transition: {
                  type: "spring",
                  stiffness: DRAWER_STIFFNESS * 1.15,
                  damping: DRAWER_DAMPING + 6,
                  mass: 0.7,
                },
              }}
              onAnimationStart={() => setExpandAnimDone(false)}
              onAnimationComplete={() => setExpandAnimDone(true)}
              style={{
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={popEnabled ? false : { opacity: 0, y: -4 }}
                animate={
                  popEnabled
                    ? { opacity: 1, y: 0 }
                    : {
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.32,
                          delay: 0.08,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }
                }
                exit={
                  popEnabled
                    ? { opacity: 0, transition: { duration: 0.18 } }
                    : { opacity: 0, y: -2, transition: { duration: 0.14 } }
                }
                style={{ padding: "6px 27px 27px" }}
              >
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
                        if (popEnabled) {
                          // Intensity-scaled bounce: high-contribution
                          // days get a less-damped, heavier, snappier
                          // spring → more visible overshoot. Range is
                          // tightened (vs an earlier chaotic pass) so
                          // empty days still settle promptly and tall
                          // days don't oscillate past their neighbors.
                          const intensity = Math.sqrt(cell.count / maxCount);
                          const damping = 16 - intensity * 5; // 16 → 11
                          const stiffness = 320 + intensity * 60; // 320 → 380
                          const mass = 0.4 + intensity * 0.2; // 0.4 → 0.6

                          // Speed slider maps to the total stagger window.
                          // popSpeed=0 → 4s; popSpeed=1 → 0.5s; default
                          // 0.5 → 2.25s. The slower default is what makes
                          // the column-major cascade actually read as
                          // "down each column" — at the previous 1s
                          // default, every column's 7 days finished in
                          // 45ms, which the eye fuses into a horizontal
                          // sweep.
                          const totalStaggerSec = 4 - popSpeed * 3.5;
                          // Pure column-major chronological order: visit
                          // (w=0, d=0..6), then (w=1, d=0..6), etc.
                          const totalCells = grid.length * 7;
                          const delayFrac =
                            popOrder === "sequential"
                              ? (w * 7 + d) / totalCells
                              : hashNoise(w, d, 0);
                          const delay = delayFrac * totalStaggerSec;

                          // Explicit per-cell transform-origin in SVG
                          // user units. (transform-box: fill-box should
                          // work but is unreliable across SVG renderers;
                          // setting the origin at the cell's center in
                          // px is bulletproof.)
                          const originX = w * CELL_STEP + CELL_SIZE / 2;
                          const originY = d * CELL_STEP + CELL_SIZE / 2;

                          return (
                            <motion.rect
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
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                transition: {
                                  opacity: { duration: 0.15, delay },
                                  scale: {
                                    type: "spring",
                                    stiffness,
                                    damping,
                                    mass,
                                    delay,
                                  },
                                },
                              }}
                              style={{
                                transformOrigin: `${originX}px ${originY}px`,
                              }}
                            />
                          );
                        }
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  pointerEvents: "none",
                  zIndex: 10,
                  // Smooth slide between cells. Mount/unmount stays
                  // instant — CSS transitions don't fire on element
                  // birth/death, only on property changes.
                  transition:
                    "left 0.18s cubic-bezier(0.22, 1, 0.36, 1), top 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <div
                  style={{
                    padding: "9px 15px",
                    borderRadius: 9,
                    fontSize: 18,
                    fontFamily,
                    fontWeight: 400,
                    lineHeight: 1.3,
                    color: "hsl(0, 0%, 95%)",
                    background: BG_COLOR,
                    border: "1px solid hsl(0, 0%, 30%)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <TooltipBody
                    text={tooltip.text}
                    mode={tooltipTransition}
                    dial={tweenDial}
                    speed={tweenSpeed}
                  />
                </div>
              </div>
            );
          })()}
      </div>
    </DevPanel>
  );
}
