import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DevPanel,
  DevButtonGroup,
  DevToggle,
  DevButton,
  DevSectionLabel,
} from "../../components/DevPanel";

/**
 * Spotify Wrapped for Ads — Witty product concept (drop finale).
 *
 * 2024 Wrapped's pixel-art chunky aesthetic applied to the year's worst
 * inheritance: the ads that interrupted your music. 4 stat cards +
 * a shareable recap, story-style chrome, hybrid auto-advance.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────────────────────

const FONT_DISPLAY =
  "'Onest', 'Figtree', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
const FONT_UI =
  "'Figtree', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";

const PHONE_W = 393;
const PHONE_H = 852;
const PHONE_ASPECT = `${PHONE_W} / ${PHONE_H}`;
const MOBILE_BREAKPOINT = 540;

const CARD_DURATION_MS = 5200;
const HOLD_THRESHOLD_MS = 180; // press > this duration without drag = "hold to pause"
const SWIPE_THRESHOLD_PX = 60;
const SWIPE_VELOCITY = 380; // px/s flick

const TAP_ZONE_RATIO = 0.32; // left ~32% / right ~32% are tap zones; center holds

// ─────────────────────────────────────────────────────────────────────────────
// Personas — each fully populates all 5 cards
// ─────────────────────────────────────────────────────────────────────────────

interface Persona {
  id: string;
  label: string;
  // Card 1: total ads endured
  totalAds: string; // big number
  totalHours: string; // e.g. "47 hours"
  totalCompare: string; // e.g. "That's The Godfather, 58 times back-to-back."
  // Card 2: music vs ads comparison
  musicMinutes: string; // total music listening minutes, e.g. "14,100"
  adMinutes: string; // total ad time minutes, e.g. "2,820"
  ratio: string; // music-to-ad ratio, e.g. "5" → "1 min of ads for every 5 of music"
  compareKicker: string; // sincere Wrapped-voice tail line
  // Card 3: top ad genre
  topGenre: string; // big stat
  topGenreSub: string;
  /** 4 brand names that "soundtracked the year" — rendered as logo
   *  placeholder chips alongside (or in place of) the sub sentence. */
  topGenreBrands: string[];
  topGenreDetail: string;
  // Card 3: top advertiser
  topBrand: string;
  topBrandSpots: string; // "847"
  topBrandDetail: string;
  jingleLyric: string;
  /** Optional persona-specific kicker connecting the jingle to Premium.
   *  e.g. Geico's "15% or more" → ~a year of Spotify Premium. */
  topBrandHook?: string;
  // Card 4: longest streak — same ad in a row
  streakCount: string; // "7"
  streakBrand: string; // brand of the repeated ad
  streakSpotName: string; // human label for the specific spot
  streakWhen: string; // "2:47 AM on a Tuesday"
  streakDetail: string;
  // Card 5: percentile
  percentile: string; // "0.3%"
  percentileTitle: string;
  percentileDetail: string;
  // Card 7: spotify ad revenue you generated
  spotifyRevenue: string; // "172.84" — dollars without the $ prefix
  // Card 8: share recap
  topBrands: string[]; // 5
  topGenres: string[]; // 5
  recapTopGenre: string;
}

const PERSONAS: Persona[] = [
  {
    id: "free-tier",
    label: "Free Tier",
    totalAds: "14,387",
    totalHours: "131 hours",
    totalCompare: "Few listeners gave them more time.",
    musicMinutes: "14,143",
    adMinutes: "7,842",
    ratio: "2",
    compareKicker: "You really filled the year.",
    spotifyRevenue: "172.84",
    topGenre: "Insurance",
    topGenreSub:
      "Geico, Progressive, Liberty Mutual, and State Farm soundtracked your year.",
    topGenreBrands: ["Geico", "Progressive", "Liberty Mutual", "State Farm"],
    topGenreDetail: "You went deep on this one.",
    topBrand: "Geico",
    topBrandSpots: "1,247",
    topBrandDetail:
      "You were one of their most loyal listeners this year.",
    jingleLyric: "15 minutes could save you 15 percent or more on car insurance.",
    topBrandHook: "15% or more — about a year of Premium, right there.",
    streakCount: "7",
    streakBrand: "Geico",
    streakSpotName: "the \"Switch to Geico\" spot",
    streakWhen: "2:47 AM on a Tuesday",
    streakDetail: "You couldn't get enough.",
    percentile: "0.3%",
    percentileTitle: "You're in the top",
    percentileDetail:
      "of listeners who know the Geico jingle by heart. Few fans showed up like you.",
    topBrands: [
      "Geico",
      "Microsoft Copilot",
      "BetterHelp",
      "Squarespace",
      "ZipRecruiter",
    ],
    topGenres: [
      "Insurance",
      "AI Productivity",
      "Mental Health App",
      "Website Builder",
      "Job Listings",
    ],
    recapTopGenre: "Insurance",
  },
  {
    id: "podcast-believer",
    label: "Podcast Believer",
    totalAds: "11,408",
    totalHours: "106 hours",
    totalCompare: "Few listeners really got it like you did.",
    musicMinutes: "11,378",
    adMinutes: "6,317",
    ratio: "2",
    compareKicker: "A loyal split.",
    spotifyRevenue: "128.42",
    topGenre: "Mental Health App",
    topGenreSub:
      "BetterHelp, Talkspace, Headspace, and Calm soundtracked your year.",
    topGenreBrands: ["BetterHelp", "Talkspace", "Headspace", "Calm"],
    topGenreDetail: "Their sound was your sound.",
    topBrand: "BetterHelp",
    topBrandSpots: "612",
    topBrandDetail:
      "You were one of their most loyal listeners this year.",
    jingleLyric: "This episode is brought to you by BetterHelp…",
    streakCount: "5",
    streakBrand: "BetterHelp",
    streakSpotName: "the \"10% off your first month\" spot",
    streakWhen: "1:12 PM on a Sunday",
    streakDetail: "You really felt this one.",
    percentile: "0.7%",
    percentileTitle: "You're in the top",
    percentileDetail:
      "of listeners who started a podcast and let it keep going. We noticed you in there.",
    topBrands: [
      "BetterHelp",
      "ZipRecruiter",
      "Squarespace",
      "Microsoft Copilot",
      "Geico",
    ],
    topGenres: [
      "Mental Health App",
      "Job Listings",
      "Website Builder",
      "AI Productivity",
      "Insurance",
    ],
    recapTopGenre: "Mental Health App",
  },
  {
    id: "tech-optimist",
    label: "Tech Optimist",
    totalAds: "8,439",
    totalHours: "79 hours",
    totalCompare: "You really put the hours in.",
    musicMinutes: "8,392",
    adMinutes: "4,738",
    ratio: "2",
    compareKicker: "You kept the rhythm.",
    spotifyRevenue: "87.32",
    topGenre: "AI Productivity",
    topGenreSub:
      "Microsoft Copilot, Notion AI, Granola, and Gemini soundtracked your year.",
    topGenreBrands: ["Microsoft Copilot", "Notion AI", "Granola", "Gemini"],
    topGenreDetail: "Their sound was your sound.",
    topBrand: "Microsoft Copilot",
    topBrandSpots: "503",
    topBrandDetail:
      "You were one of their most loyal listeners this year.",
    jingleLyric: "What if your work… worked for you?",
    streakCount: "6",
    streakBrand: "Microsoft Copilot",
    streakSpotName: "the \"What if your work…\" spot",
    streakWhen: "9:08 AM on a Monday",
    streakDetail: "You really put it on repeat.",
    percentile: "1.2%",
    percentileTitle: "You're in the top",
    percentileDetail:
      "of listeners who heard \"AI-powered\" more than \"hello\" this year. You really felt this one.",
    topBrands: [
      "Microsoft Copilot",
      "NordVPN",
      "Athletic Greens",
      "Squarespace",
      "Geico",
    ],
    topGenres: [
      "AI Productivity",
      "VPN & Privacy",
      "Greens Powder",
      "Website Builder",
      "Insurance",
    ],
    recapTopGenre: "AI Productivity",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Card themes — colors + which pattern + which content slot
// ─────────────────────────────────────────────────────────────────────────────

type PatternKind = "pyramid" | "compare" | "diamond" | "x" | "streak" | "ramp" | "money" | "collage";

interface CardTheme {
  pattern: PatternKind;
  /** Background fill behind the pattern. */
  bg: string;
  /** Primary pattern color (the bright stack/diamond). */
  patternPrimary: string;
  /** Secondary pattern color (shadow / accent). */
  patternSecondary: string;
  /** Text color for big headline. */
  fg: string;
  /** Muted text color. */
  muted: string;
  /** Pause/peek/close icon stroke (matches fg). */
  chromeStroke: string;
  /** Inactive progress bar background. */
  progressBg: string;
  /** Active progress fill. */
  progressFg: string;
}

const THEMES: CardTheme[] = [
  // Card 1: pyramid — pure black bg with two HOT PINK pyramids facing each
  // other (top apex-down + bottom apex-up). Matches the iconic 2024 Wrapped
  // "You listened for X minutes" card exactly.
  {
    pattern: "pyramid",
    bg: "#000000",
    patternPrimary: "#FF1493",
    patternSecondary: "#5C0735",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
    chromeStroke: "#FFFFFF",
    progressBg: "rgba(255,255,255,0.22)",
    progressFg: "#FFFFFF",
  },
  // Card 2: music vs ads comparison — dark canvas, yellow bars take the
  // place of an abstract pattern. The bars ARE the data.
  {
    pattern: "compare",
    bg: "#0F0A1F",
    patternPrimary: "#FFE600",
    patternSecondary: "#FF1493",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
    chromeStroke: "#FFFFFF",
    progressBg: "rgba(255,255,255,0.18)",
    progressFg: "#FFFFFF",
  },
  // Card 3: diamond — yellow on cobalt blue (matches "leaderboard" card)
  {
    pattern: "diamond",
    bg: "#1B3FFE",
    patternPrimary: "#FFE600",
    patternSecondary: "#7AB8FF",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
    chromeStroke: "#FFFFFF",
    progressBg: "rgba(0,0,0,0.32)",
    progressFg: "#FFFFFF",
  },
  // Card 3: X cross — coral X on dark crimson (matches "biggest day" card)
  {
    pattern: "x",
    bg: "#1B1014",
    patternPrimary: "#FF3A6A",
    patternSecondary: "#7A1230",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.74)",
    chromeStroke: "#FFFFFF",
    progressBg: "rgba(255,255,255,0.18)",
    progressFg: "#FFFFFF",
  },
  // Card 4: streak — stacked identical bars (visualizes "N in a row")
  {
    pattern: "streak",
    bg: "#3A0E78",
    patternPrimary: "#FFE600",
    patternSecondary: "#5C1FA8",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
    chromeStroke: "#FFFFFF",
    progressBg: "rgba(0,0,0,0.28)",
    progressFg: "#FFFFFF",
  },
  // Card 5: ramp — acid lime → forest stepped gradient
  {
    pattern: "ramp",
    bg: "#0A2615",
    patternPrimary: "#BFFF42",
    patternSecondary: "#1DB954",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.74)",
    chromeStroke: "#FFFFFF",
    progressBg: "rgba(255,255,255,0.18)",
    progressFg: "#FFFFFF",
  },
  // Card 7: money for Spotify — Spotify-green canvas, gold "$" pattern.
  // Deep green ties the satire to Spotify's brand identity; gold is the
  // universal "money" signal.
  {
    pattern: "money",
    bg: "#0A3D1F",
    patternPrimary: "#FFD700",
    patternSecondary: "#5A4900",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.80)",
    chromeStroke: "#FFFFFF",
    progressBg: "rgba(255,255,255,0.16)",
    progressFg: "#FFFFFF",
  },
  // Card 8: share recap — warm orange/red collage (matches Drake share card)
  {
    pattern: "collage",
    bg: "#FF5A2E",
    patternPrimary: "#FFE600",
    patternSecondary: "#3A1C8E",
    fg: "#0A0A0A",
    muted: "rgba(0,0,0,0.65)",
    chromeStroke: "#0A0A0A",
    progressBg: "rgba(0,0,0,0.18)",
    progressFg: "#0A0A0A",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mobile hook
// ─────────────────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Patterns — pixel-art-style SVG backgrounds
// ─────────────────────────────────────────────────────────────────────────────

function SolidBg({ bg }: { primary: string; secondary: string; bg: string }) {
  // No pattern — the card's content (e.g. comparison bars) carries the visual.
  return (
    <svg
      viewBox="0 0 393 852"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width={393} height={852} fill={bg} />
    </svg>
  );
}

function StepPyramid({ primary, secondary, bg }: { primary: string; secondary: string; bg: string }) {
  // Two stepped pyramids facing each other vertically. TOP pyramid has its
  // base at the top edge with apex pointing DOWN; BOTTOM pyramid mirrors it
  // (base at bottom, apex pointing UP). Text sits in the gap between the
  // two apexes. Matches the canonical Wrapped "minutes listened" card.
  const STEPS = 8;
  const baseW = 380;
  const stepH = 32;
  const shrinkPerStep = 38;
  const W = 393;
  const H = 852;
  // Top pyramid starts below the iOS + Spotify chrome (~110px).
  const topStartY = 110;
  // Bottom pyramid's base sits above the share button (~90px from bottom).
  const bottomBaseY = H - 90;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width={W} height={H} fill={bg} />
      {/* TOP pyramid — base at topStartY, narrowing downward */}
      {Array.from({ length: STEPS }).map((_, i) => {
        const w = baseW - i * shrinkPerStep;
        if (w <= 0) return null;
        const x = (W - w) / 2;
        const y = topStartY + i * stepH;
        // Top of top-pyramid (i=0) is brightest (closest to light); inner
        // steps (i=STEPS-1) toward apex are darker.
        const stepColor = mixColor(primary, secondary, 0.04 + (i / STEPS) * 0.42);
        return (
          <g key={`t-${i}`}>
            {/* cast shadow on the right edge */}
            <rect x={x + w} y={y + 5} width={8} height={stepH} fill={secondary} opacity={0.9} />
            {/* main step */}
            <rect x={x} y={y} width={w} height={stepH} fill={stepColor} />
            {/* bottom edge highlight (acts as pixel-stair tread) */}
            <rect x={x} y={y + stepH - 2} width={w} height={2} fill={primary} opacity={0.7} />
          </g>
        );
      })}
      {/* BOTTOM pyramid — base at bottomBaseY, narrowing upward */}
      {Array.from({ length: STEPS }).map((_, i) => {
        const w = baseW - i * shrinkPerStep;
        if (w <= 0) return null;
        const x = (W - w) / 2;
        const y = bottomBaseY - (i + 1) * stepH;
        const stepColor = mixColor(primary, secondary, 0.04 + (i / STEPS) * 0.42);
        return (
          <g key={`b-${i}`}>
            <rect x={x + w} y={y + 5} width={8} height={stepH} fill={secondary} opacity={0.9} />
            <rect x={x} y={y} width={w} height={stepH} fill={stepColor} />
            {/* top edge highlight */}
            <rect x={x} y={y} width={w} height={2} fill={primary} opacity={0.85} />
          </g>
        );
      })}
    </svg>
  );
}

function DiamondBlock({ primary, secondary, bg }: { primary: string; secondary: string; bg: string }) {
  // Diamond pushed to the lower-mid card area so text in the upper ~40% sits
  // on the solid bg (not overlapping the bright yellow). Pixel-ramp stripes
  // radiate from the diamond's edges to each card corner.
  const W = 393;
  const H = 852;
  const cx = W / 2;
  const cy = H * 0.66;
  const r = 180;
  const RAY_STEPS = 18;
  // pre-mix colors along the ramp: white-ish (bright) near diamond → primary
  // → secondary at the far edge. Stored as a list so each ring picks its tint.
  const ringColor = (i: number) => mixColor(secondary, primary, Math.max(0, 1 - i / (RAY_STEPS - 1)));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width={W} height={H} fill={bg} />
      {/* Concentric rotated-square rings emanating from the diamond's edge —
          each progressively larger and dimmer, producing radial pixel rays
          that visually follow the diamond's 45° faces out to the corners. */}
      {Array.from({ length: RAY_STEPS }).map((_, i) => {
        const ringR = r + (i + 1) * 36;
        const color = ringColor(i);
        const opacity = 0.85 - (i / RAY_STEPS) * 0.78;
        return (
          <polygon
            key={i}
            points={`${cx},${cy - ringR} ${cx + ringR},${cy} ${cx},${cy + ringR} ${cx - ringR},${cy}`}
            fill={color}
            opacity={opacity}
          />
        );
      })}
      {/* diamond cast shadow */}
      <polygon
        points={`${cx + 8},${cy - r + 8} ${cx + r + 8},${cy + 8} ${cx + 8},${cy + r + 8} ${cx - r + 8},${cy + 8}`}
        fill={secondary}
        opacity={0.75}
      />
      {/* main diamond */}
      <polygon
        points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
        fill={primary}
      />
      {/* inner diamond rim — slightly darker shade for chunky-pixel rim */}
      <polygon
        points={`${cx},${cy - r + 22} ${cx + r - 22},${cy} ${cx},${cy + r - 22} ${cx - r + 22},${cy}`}
        fill={mixColor(primary, "#ffffff", 0.18)}
      />
    </svg>
  );
}

function XCross({ primary, secondary, bg }: { primary: string; secondary: string; bg: string }) {
  // Two clean parallelogram diagonals going corner-to-corner — matches the
  // 2024 "biggest day" card. The X intersects at center; text in the upper
  // portion overlays the diagonals but reads cleanly because:
  //   - stripes are bright primary on dark bg (high contrast)
  //   - shadow strip behind each diagonal adds chunky-pixel depth
  // No screen-blend texture bands — they were washing out text contrast.
  const W = 393;
  const H = 852;
  const STRIPE_W = 110;
  const SHADOW = 12;
  // Diagonals overshoot the card edges so they exit cleanly past the corners.
  const d1 = (ox = 0, oy = 0) =>
    `M ${-STRIPE_W + ox} ${-STRIPE_W + oy}
     L ${STRIPE_W + ox} ${-STRIPE_W + oy}
     L ${W + STRIPE_W + ox} ${H - STRIPE_W + oy}
     L ${W + STRIPE_W + ox} ${H + STRIPE_W + oy}
     L ${W - STRIPE_W + ox} ${H + STRIPE_W + oy}
     L ${-STRIPE_W + ox} ${STRIPE_W + oy} Z`;
  const d2 = (ox = 0, oy = 0) =>
    `M ${-STRIPE_W + ox} ${H + STRIPE_W + oy}
     L ${STRIPE_W + ox} ${H + STRIPE_W + oy}
     L ${W + STRIPE_W + ox} ${STRIPE_W + oy}
     L ${W + STRIPE_W + ox} ${-STRIPE_W + oy}
     L ${W - STRIPE_W + ox} ${-STRIPE_W + oy}
     L ${-STRIPE_W + ox} ${H - STRIPE_W + oy} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width={W} height={H} fill={bg} />
      {/* shadow parallelograms */}
      <path d={d1(SHADOW, SHADOW)} fill={secondary} opacity={0.9} />
      <path d={d2(-SHADOW, SHADOW)} fill={secondary} opacity={0.9} />
      {/* main solid stripes */}
      <path d={d1()} fill={primary} />
      <path d={d2()} fill={primary} />
      {/* 2px highlight on top edge of each diagonal for the chunky-pixel rim */}
      <path
        d={d1()}
        fill="none"
        stroke={mixColor(primary, "#ffffff", 0.32)}
        strokeWidth={2}
        opacity={0.7}
      />
      <path
        d={d2()}
        fill="none"
        stroke={mixColor(primary, "#ffffff", 0.32)}
        strokeWidth={2}
        opacity={0.7}
      />
    </svg>
  );
}

function StreakBars({ primary, secondary, bg }: { primary: string; secondary: string; bg: string }) {
  // Seven identical horizontal slabs — literal visualization of "N in a row."
  // Cluster shifted DOWN so the upper ~40% of the card is plain bg for the
  // headline text. Each slab has a tiny dropshadow row underneath in
  // `secondary` for the 8-bit chunky-pixel feel.
  const W = 393;
  const H = 852;
  const BARS = 7;
  const slabH = 34;
  const gap = 14;
  const totalH = BARS * slabH + (BARS - 1) * gap;
  const startY = H * 0.46;
  const barInset = 36;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width={W} height={H} fill={bg} />
      {Array.from({ length: BARS }).map((_, i) => {
        const y = startY + i * (slabH + gap);
        const dimFromCenter = Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2);
        const opacity = 1 - dimFromCenter * 0.35;
        return (
          <g key={i}>
            {/* dropshadow row */}
            <rect
              x={barInset + 8}
              y={y + slabH - 10}
              width={W - barInset * 2}
              height={10}
              fill={secondary}
              opacity={0.9}
            />
            {/* main slab */}
            <rect
              x={barInset}
              y={y}
              width={W - barInset * 2}
              height={slabH}
              fill={primary}
              opacity={opacity}
            />
          </g>
        );
      })}
    </svg>
  );
}

function PixelRamp({ primary, secondary, bg }: { primary: string; secondary: string; bg: string }) {
  // Stepped vertical ramp — pixelated gradient. Bright `primary` at the
  // BOTTOM, dark `secondary` blending into `bg` at the TOP so text in the
  // upper portion sits on a dark, high-contrast surface.
  const W = 393;
  const H = 852;
  const STEPS = 10;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width={W} height={H} fill={bg} />
      {Array.from({ length: STEPS }).map((_, i) => {
        // i=0 (bottom) → bright primary; i=STEPS-1 (top) → dark secondary.
        const t = i / (STEPS - 1);
        const mixed = mixColor(primary, secondary, t);
        const y = H - ((i + 1) * H) / STEPS;
        // Top half of steps blend further into bg so text has clean canvas.
        const opacity = t > 0.6 ? 1 - (t - 0.6) * 1.8 : 1;
        return (
          <rect
            key={i}
            x={0}
            y={y}
            width={W}
            height={H / STEPS + 1}
            fill={mixed}
            opacity={Math.max(0, opacity)}
          />
        );
      })}
    </svg>
  );
}

function DollarSign({ primary, secondary, bg }: { primary: string; secondary: string; bg: string }) {
  // Big chunky "$" symbol anchored to the lower portion of the card so the
  // headline + supporting copy in the upper half sit on clean bg. Cast shadow
  // offset bottom-right matches the pyramid / X depth treatment.
  const W = 393;
  const H = 852;
  const cx = W / 2;
  // Center between the headline block (ends ~y 410) and the share pill
  // (top ~y 780). Onest's "$" glyph renders much taller than its em-square,
  // so we shrink + center conservatively — the $ sits cleanly in the lower
  // half without touching the supporting copy or the share button.
  const cy = H * 0.66;
  const fontSize = 300;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width={W} height={H} fill={bg} />
      {/* shadow $ */}
      <text
        x={cx + 10}
        y={cy + 10}
        textAnchor="middle"
        dominantBaseline="central"
        fill={secondary}
        opacity={0.95}
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize,
          fontWeight: 900,
          letterSpacing: "-0.04em",
        }}
      >
        $
      </text>
      {/* main $ */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={primary}
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize,
          fontWeight: 900,
          letterSpacing: "-0.04em",
        }}
      >
        $
      </text>
    </svg>
  );
}

function CollageBlocks({ primary, secondary, bg }: { primary: string; secondary: string; bg: string }) {
  // Drake-style share card — abstract chunky shapes scattered around the
  // edges. Carefully kept OUT of:
  //   - the story chrome zone (y 0–110: status bar, progress, Spotify row)
  //   - the central content corridor x ~70–323 where the hero square +
  //     brand/genre list + stats live
  //   - the share button footprint (centered at bottom ~y 800–836)
  // Shapes hug the side edges and tuck into the corners.
  const W = 393;
  const H = 852;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width={W} height={H} fill={bg} />
      {/* left-edge squiggle (yellow) — sits just below chrome, hugs the left
          side so it doesn't cross the centered hero square. */}
      <path
        d="M -16 140 Q 18 110, 52 140 T 120 140"
        stroke={primary}
        strokeWidth={16}
        strokeLinecap="round"
        fill="none"
        opacity={0.9}
      />
      {/* right-edge chunky cross — pushed below chrome (y > 120) and toward
          the right edge so it never overlaps the pause/mute/close icons. */}
      <g transform="translate(348 150) rotate(15)">
        <rect x={-5} y={-26} width={10} height={52} fill={secondary} />
        <rect x={-26} y={-5} width={52} height={10} fill={secondary} />
      </g>
      {/* left-edge dot — vertical mid-card, hugged to the edge so the brand
          list (which starts ~x 36) sits clear. */}
      <circle cx={20} cy={520} r={14} fill={primary} opacity={0.85} />
      {/* right-edge squiggle — slid further right and DOWN past the brands /
          genres list (which ends ~y 540) and the stats row. */}
      <path
        d="M 372 600 Q 350 575, 340 600 T 320 618"
        stroke={primary}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
        opacity={0.9}
      />
      {/* bottom-left zigzag — tucked into the corner below the footer line
          (footer text sits ~y 790), kept off the share button (centered). */}
      <path
        d="M 14 822 L 36 800 L 58 822 L 80 800 L 102 822"
        stroke={secondary}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.9}
      />
      {/* bottom-right starburst — hugged into the corner, smaller radius so
          it doesn't reach into the share-pill zone. */}
      <g transform="translate(352 820)">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={0}
              y1={0}
              x2={Math.cos(a) * 18}
              y2={Math.sin(a) * 18}
              stroke={secondary}
              strokeWidth={4.5}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </svg>
  );
}

function mixColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Story chrome
// ─────────────────────────────────────────────────────────────────────────────

function StatusBar({ tint }: { tint: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        padding: "16px 28px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: FONT_UI,
        fontSize: 16,
        fontWeight: 600,
        color: tint,
        zIndex: 6,
        pointerEvents: "none",
      }}
    >
      <span style={{ fontVariantNumeric: "tabular-nums" }}>9:41</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {/* Signal bars */}
        <svg width="17" height="11" viewBox="0 0 17 11">
          <rect x="0" y="8" width="3" height="3" rx="0.5" fill={tint} />
          <rect x="4.5" y="5.5" width="3" height="5.5" rx="0.5" fill={tint} />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill={tint} />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={tint} />
        </svg>
        {/* WiFi */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill={tint}>
          <path d="M8 8a1.4 1.4 0 110 2.8A1.4 1.4 0 018 8z" />
          <path d="M4.7 5.4a4.6 4.6 0 016.6 0" stroke={tint} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M1.9 2.5a8.5 8.5 0 0112.2 0" stroke={tint} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
        {/* Battery */}
        <svg width="26" height="11" viewBox="0 0 26 11">
          <rect x="0" y="0.5" width="22" height="10" rx="2.5" stroke={tint} strokeOpacity="0.5" fill="none" />
          <rect x="23" y="3.5" width="1.8" height="4" rx="0.5" fill={tint} opacity="0.4" />
          <rect x="1.5" y="2" width="19" height="7" rx="1.5" fill={tint} />
        </svg>
      </div>
    </div>
  );
}

function ProgressBars({
  count,
  current,
  progress,
  trackBg,
  trackFg,
}: {
  count: number;
  current: number;
  progress: number;
  trackBg: string;
  trackFg: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 54,
        left: 14,
        right: 14,
        display: "flex",
        gap: 5,
        zIndex: 6,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const fillPct =
          i < current ? 100 : i === current ? Math.min(100, progress * 100) : 0;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 2,
              borderRadius: 1,
              background: trackBg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${fillPct}%`,
                height: "100%",
                background: trackFg,
                transition: i === current ? "none" : "width 0.2s ease",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function ChromeRow({
  stroke,
  onClose,
}: {
  stroke: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        left: 14,
        right: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 7,
      }}
    >
      {/* Spotify logo + tiny "Free" badge — mirrors Spotify Free's tier
          indicator, sets context that this is a free-tier Wrapped so the ad
          jokes land. Subtle, present on every card. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill={stroke} />
          <path
            d="M17.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.64 5.801 15.6 6.06 20.04 8.82c.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.379.3z"
            fill={stroke === "#FFFFFF" ? "#000" : "#fff"}
          />
        </svg>
        <span
          style={{
            fontFamily: FONT_UI,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: stroke,
            textTransform: "uppercase",
            opacity: 0.92,
          }}
        >
          Free
        </span>
      </div>
      {/* Right cluster: pause, mute speaker, close */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          pointerEvents: "auto",
        }}
      >
        {/* Pause icon (decorative) */}
        <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
          <rect x="0" y="0" width="3.6" height="14" rx="1" fill={stroke} />
          <rect x="8.4" y="0" width="3.6" height="14" rx="1" fill={stroke} />
        </svg>
        {/* Speaker w/ mute slash icon (decorative) */}
        <svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true" fill="none">
          {/* speaker body */}
          <path
            d="M2 5.5 H 5 L 9.5 2 V 14 L 5 10.5 H 2 Z"
            fill={stroke}
            stroke={stroke}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* mute slash */}
          <line
            x1="12"
            y1="4.5"
            x2="18"
            y2="11.5"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="18"
            y1="4.5"
            x2="12"
            y2="11.5"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close story"
          style={{
            background: "none",
            border: "none",
            padding: 4,
            margin: -4,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
            <line x1="2" y1="2" x2="13" y2="13" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="13" y1="2" x2="2" y2="13" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ShareButton({
  stroke,
  bgInverted,
  label = "Share this story",
  onClick,
}: {
  stroke: string;
  bgInverted: boolean;
  label?: string;
  onClick?: () => void;
}) {
  // Wrapped's share pill: dark pill with white text on bright cards; on dark
  // backgrounds it inverts. `bgInverted` chooses inversion.
  const bg = bgInverted ? "#FFFFFF" : "#000000";
  const fg = bgInverted ? "#000000" : "#FFFFFF";
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        bottom: 26,
        left: "50%",
        transform: "translateX(-50%)",
        background: bg,
        color: fg,
        border: "none",
        borderRadius: 999,
        padding: "12px 22px",
        fontFamily: FONT_UI,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        zIndex: 7,
        boxShadow: bgInverted ? "0 2px 10px rgba(0,0,0,0.18)" : "none",
      }}
      // Stroke is here just so the unused-warning doesn't appear; React strict
      // mode would flag the prop being unused. We use it as a subtle border to
      // tie the button visually to the chrome icons (white on white needs it).
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 1.5 V 9 M 4 4.5 L 7 1.5 L 10 4.5 M 2.5 8 V 11 A 1.5 1.5 0 0 0 4 12.5 H 10 A 1.5 1.5 0 0 0 11.5 11 V 8"
          stroke={fg}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ color: stroke === fg ? fg : fg }}>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandTile — logo placeholder container used on cards that name brands. The
// real product would swap a logo asset in; the demo shows a chunky letterform
// inside a tinted square that reads as a deliberately-empty image slot.
// ─────────────────────────────────────────────────────────────────────────────

function BrandTile({
  brand,
  size = "sm",
  fg,
  cardBg,
}: {
  brand: string;
  /** sm = chip row on Card 3; lg = album-cover-sized hero on Card 4. */
  size?: "sm" | "lg";
  /** Text/foreground color of the *card* — used as the tile fill so the tile
   *  reads as a clean knockout against the card's bright pattern. */
  fg: string;
  /** Card's pattern bg — used as the tile's *text* color so the letter pops. */
  cardBg: string;
}) {
  const isLg = size === "lg";
  const tileSize = isLg ? 152 : 78;
  // For sm chips, scale down very long single-word brands ("Progressive",
  // "Microsoft Copilot") so they fit on one or two clean lines without
  // mid-word hyphenation. Length is the longest single token.
  const longestTokenLen = Math.max(...brand.split(/\s+/).map((t) => t.length));
  const smFontSize = longestTokenLen >= 11 ? 10 : longestTokenLen >= 8 ? 11 : 12;
  const fontSize = isLg ? 32 : smFontSize;
  return (
    <div
      style={{
        width: tileSize,
        height: tileSize,
        background: fg,
        color: cardBg,
        borderRadius: isLg ? 6 : 4,
        display: "grid",
        placeItems: "center",
        padding: isLg ? 14 : 8,
        boxShadow: isLg
          ? "0 4px 0 rgba(0,0,0,0.18)"
          : "0 2px 0 rgba(0,0,0,0.14)",
        flexShrink: 0,
      }}
      aria-label={`Logo placeholder for ${brand}`}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 900,
          fontSize,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          textAlign: "center",
          // Break only on whitespace — "Progressive" stays whole instead of
          // hyphenating to "Progress / ive"; multi-word names ("Liberty
          // Mutual") still wrap cleanly at the space.
          wordBreak: "normal",
          overflowWrap: "normal",
          hyphens: "none",
        }}
      >
        {brand}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card body — typography blocks
// ─────────────────────────────────────────────────────────────────────────────

const HEADLINE_STYLE: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 900,
  letterSpacing: "-0.025em",
  lineHeight: 0.95,
  margin: 0,
};

const SUB_STYLE: CSSProperties = {
  fontFamily: FONT_UI,
  fontWeight: 500,
  lineHeight: 1.35,
  margin: 0,
};

function CardContent({
  pattern,
  theme,
  align = "top",
  children,
}: {
  pattern: PatternKind;
  theme: CardTheme;
  align?: "center" | "top";
  children: ReactNode;
}) {
  // align="top" is the canonical Wrapped layout — text sits in the upper
  // ~40% of the card on plain bg, the pattern occupies the lower/mid portion.
  // Per-card components can pass align="center" only when the pattern is
  // designed to sit BEHIND the text (none of our current patterns are).
  const Pattern =
    pattern === "pyramid"
      ? StepPyramid
      : pattern === "compare"
        ? SolidBg
        : pattern === "diamond"
          ? DiamondBlock
          : pattern === "x"
            ? XCross
            : pattern === "streak"
              ? StreakBars
              : pattern === "ramp"
                ? PixelRamp
                : pattern === "money"
                  ? DollarSign
                  : CollageBlocks;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: theme.bg,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <Pattern
          primary={theme.patternPrimary}
          secondary={theme.patternSecondary}
          bg={theme.bg}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: align === "center" ? "center" : "flex-start",
          textAlign: "center",
          padding: align === "center" ? "120px 28px 110px" : "128px 28px 110px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 1: Total Ads
// ─────────────────────────────────────────────────────────────────────────────

function Card1TotalAds({ persona, theme }: { persona: Persona; theme: CardTheme }) {
  return (
    <CardContent pattern={theme.pattern} theme={theme} align="center">
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Single-sentence headline that wraps — matches the real Wrapped
            "You listened for X minutes this year" treatment. Sits in the
            gap between the two pink pyramids. */}
        <h1
          style={{
            ...HEADLINE_STYLE,
            color: theme.fg,
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            maxWidth: 320,
            margin: "0 auto",
          }}
        >
          You listened to {persona.totalAds} ads this year
        </h1>
        <p
          style={{
            ...SUB_STYLE,
            color: theme.muted,
            fontSize: 15,
            fontWeight: 500,
            marginTop: 18,
            maxWidth: 300,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.4,
          }}
        >
          That's {persona.totalHours}. {persona.totalCompare}
        </p>
      </div>
    </CardContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 2: Music vs Ads comparison — two stacked bars, sincere Wrapped framing
// ─────────────────────────────────────────────────────────────────────────────

function Card2Compare({ persona, theme }: { persona: Persona; theme: CardTheme }) {
  // Parse the two numbers to derive bar widths. Music bar is always full
  // width; ad bar is proportional. Falls back to a tiny minimum so the ad
  // bar is always visible even at extreme ratios.
  const music = parseInt(persona.musicMinutes.replace(/,/g, ""), 10) || 0;
  const ads = parseInt(persona.adMinutes.replace(/,/g, ""), 10) || 0;
  const adFraction = music > 0 ? Math.max(0.06, Math.min(1, ads / music)) : 0.2;
  return (
    <CardContent pattern={theme.pattern} theme={theme}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ ...HEADLINE_STYLE, fontSize: 28, fontWeight: 800, color: theme.fg, letterSpacing: "-0.02em" }}>
          Your year in <span style={{ fontStyle: "italic" }}>sound</span>
        </h2>

        {/* Two chunky stacked bars with HUGE numbers above each.
            Music bar is full-width, ads bar is proportional — visually
            shows the ratio at a glance. */}
        <div
          style={{
            marginTop: 36,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <CompareBar
            label="Music"
            value={persona.musicMinutes}
            unit="min"
            widthFraction={1}
            barColor={theme.patternPrimary}
            shadowColor={mixColor(theme.patternPrimary, "#000000", 0.45)}
            fg={theme.fg}
          />
          <CompareBar
            label="Ads"
            value={persona.adMinutes}
            unit="min"
            widthFraction={adFraction}
            barColor={theme.patternSecondary}
            shadowColor={mixColor(theme.patternSecondary, "#000000", 0.45)}
            fg={theme.fg}
          />
        </div>

        <p
          style={{
            ...SUB_STYLE,
            color: theme.fg,
            fontSize: 17,
            fontWeight: 600,
            marginTop: 38,
            lineHeight: 1.35,
            maxWidth: 320,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          1 minute of ads for every {persona.ratio} of music.
        </p>
        <p style={{ ...SUB_STYLE, color: theme.muted, fontSize: 14, fontWeight: 500, fontStyle: "italic", marginTop: 6 }}>
          {persona.compareKicker}
        </p>
      </div>
    </CardContent>
  );
}

function CompareBar({
  label,
  value,
  unit,
  widthFraction,
  barColor,
  shadowColor,
  fg,
}: {
  label: string;
  value: string;
  unit: string;
  widthFraction: number;
  barColor: string;
  shadowColor: string;
  fg: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: FONT_UI,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: fg,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: fg,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {value}
          <span style={{ fontSize: 17, fontWeight: 700, opacity: 0.7, marginLeft: 4 }}>{unit}</span>
        </span>
      </div>
      {/* Chunky pixel bar with a dropshadow row underneath for 8-bit depth */}
      <div style={{ position: "relative", height: 46 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            width: `${widthFraction * 100}%`,
            height: 40,
            background: shadowColor,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${widthFraction * 100}%`,
            height: 38,
            background: barColor,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 3: Top Genre
// ─────────────────────────────────────────────────────────────────────────────

function Card2TopGenre({ persona, theme }: { persona: Persona; theme: CardTheme }) {
  return (
    <CardContent pattern={theme.pattern} theme={theme}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ ...SUB_STYLE, fontSize: 22, fontWeight: 800, color: theme.fg, letterSpacing: "-0.01em" }}>
          Your top genre
        </h2>
        <h1 style={{ ...HEADLINE_STYLE, color: theme.fg, fontSize: 56, marginTop: 8 }}>
          {persona.topGenre}
        </h1>
        {/* 4-brand logo-placeholder row — visualizes the named advertisers
            instead of leaving them as a wall of text. Sits between the
            headline and the diamond pattern below. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            marginTop: 22,
            paddingLeft: 8,
            paddingRight: 8,
          }}
        >
          {persona.topGenreBrands.slice(0, 4).map((b) => (
            <BrandTile key={b} brand={b} size="sm" fg={theme.fg} cardBg={theme.bg} />
          ))}
        </div>
        <p style={{ ...SUB_STYLE, color: theme.muted, fontSize: 14, fontWeight: 500, marginTop: 14 }}>
          {persona.topGenreDetail}
        </p>
      </div>
    </CardContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 3: Top Advertiser
// ─────────────────────────────────────────────────────────────────────────────

function Card3TopBrand({ persona, theme }: { persona: Persona; theme: CardTheme }) {
  return (
    <CardContent pattern={theme.pattern} theme={theme}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ ...SUB_STYLE, fontSize: 22, fontWeight: 800, color: theme.fg, letterSpacing: "-0.01em" }}>
          Your #1 of the year
        </h2>
        {/* Album-cover-style logo placeholder — mirrors Wrapped's "top
            artist" treatment where the artist photo sits in a large square
            above the supporting stats. */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <BrandTile brand={persona.topBrand} size="lg" fg={theme.fg} cardBg={theme.bg} />
        </div>
        <p style={{ ...SUB_STYLE, color: theme.fg, fontSize: 20, fontWeight: 700, marginTop: 18 }}>
          {persona.topBrandSpots} plays
        </p>
        <p style={{ ...SUB_STYLE, color: theme.fg, fontSize: 16, fontWeight: 600, fontStyle: "italic", marginTop: 18, maxWidth: 300, marginLeft: "auto", marginRight: "auto", lineHeight: 1.35 }}>
          "{persona.jingleLyric}"
        </p>
        {persona.topBrandHook && (
          <p style={{ ...SUB_STYLE, color: theme.muted, fontSize: 14, fontWeight: 500, marginTop: 10, maxWidth: 300, marginLeft: "auto", marginRight: "auto", lineHeight: 1.4 }}>
            {persona.topBrandHook}
          </p>
        )}
      </div>
    </CardContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 4: Longest streak (same ad in a row)
// ─────────────────────────────────────────────────────────────────────────────

function Card4Streak({ persona, theme }: { persona: Persona; theme: CardTheme }) {
  return (
    <CardContent pattern={theme.pattern} theme={theme}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ ...SUB_STYLE, fontSize: 22, fontWeight: 800, color: theme.fg, letterSpacing: "-0.01em" }}>
          Your longest loop
        </h2>
        <h1 style={{ ...HEADLINE_STYLE, color: theme.fg, fontSize: 56, marginTop: 8 }}>
          {persona.streakCount} {persona.streakBrand} ads
        </h1>
        <h2 style={{ ...HEADLINE_STYLE, color: theme.fg, fontSize: 40, marginTop: 6, letterSpacing: "-0.02em" }}>
          in a row.
        </h2>
        <p style={{ ...SUB_STYLE, color: theme.muted, fontSize: 15, fontWeight: 500, marginTop: 22, maxWidth: 310, marginLeft: "auto", marginRight: "auto", lineHeight: 1.4 }}>
          {persona.streakSpotName}, {persona.streakWhen}. {persona.streakDetail}
        </p>
      </div>
    </CardContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 5: Percentile
// ─────────────────────────────────────────────────────────────────────────────

function Card4Percentile({ persona, theme }: { persona: Persona; theme: CardTheme }) {
  return (
    <CardContent pattern={theme.pattern} theme={theme}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ ...SUB_STYLE, fontSize: 22, fontWeight: 800, color: theme.fg, letterSpacing: "-0.01em" }}>
          {persona.percentileTitle}
        </h2>
        <h1 style={{ ...HEADLINE_STYLE, color: theme.fg, fontSize: 132, marginTop: 6 }}>
          {persona.percentile}
        </h1>
        <p style={{ ...SUB_STYLE, color: theme.fg, fontSize: 15, fontWeight: 500, marginTop: 18, maxWidth: 320, marginLeft: "auto", marginRight: "auto", lineHeight: 1.4 }}>
          {persona.percentileDetail}
        </p>
      </div>
    </CardContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 7: Money for Spotify — the contribution the listener made in ad
// revenue, framed as sincere thanks in Wrapped fan voice.
// ─────────────────────────────────────────────────────────────────────────────

function Card7Money({ persona, theme }: { persona: Persona; theme: CardTheme }) {
  return (
    <CardContent pattern={theme.pattern} theme={theme}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ ...SUB_STYLE, fontSize: 22, fontWeight: 800, color: theme.fg, letterSpacing: "-0.01em" }}>
          Thanks to you,
        </h2>
        <h1 style={{ ...HEADLINE_STYLE, color: theme.fg, fontSize: 88, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
          ${persona.spotifyRevenue}
        </h1>
        <h2 style={{ ...HEADLINE_STYLE, color: theme.fg, fontSize: 26, marginTop: 6, letterSpacing: "-0.015em" }}>
          in ad revenue this year.
        </h2>
        <p style={{ ...SUB_STYLE, color: theme.muted, fontSize: 15, fontWeight: 500, marginTop: 22, maxWidth: 300, marginLeft: "auto", marginRight: "auto", lineHeight: 1.4 }}>
          You're in the top 1% of contributors. We see you.
        </p>
      </div>
    </CardContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 8: Share recap
// ─────────────────────────────────────────────────────────────────────────────

function Card5Share({ persona, theme }: { persona: Persona; theme: CardTheme }) {
  return (
    <CardContent pattern={theme.pattern} theme={theme} align="top">
      {/* Hero image slot — solid square that reads as a photo placeholder
          (real mascot/logo image swaps in later). Centered, prominent. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 170,
          height: 170,
          margin: "0 auto",
          background: "#0A0A0A",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          boxShadow: "0 4px 0 rgba(0,0,0,0.18)",
        }}
        aria-label={`Hero image placeholder for ${persona.topBrand}`}
      >
        <p
          style={{
            ...HEADLINE_STYLE,
            fontSize: 26,
            color: theme.bg,
            margin: 0,
            padding: 14,
            textAlign: "center",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          {persona.topBrand}
        </p>
      </div>

      {/* Two-column lists — mirrors Drake recap's Top Artists / Top Songs */}
      <div
        style={{
          marginTop: 26,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 22,
          rowGap: 4,
          position: "relative",
          zIndex: 1,
          textAlign: "left",
        }}
      >
        <RecapList title="Top Brands" items={persona.topBrands} color={theme.fg} mutedColor={theme.muted} />
        <RecapList title="Top Genres" items={persona.topGenres} color={theme.fg} mutedColor={theme.muted} />
      </div>

      {/* Stats — left + right, big numbers in Wrapped style */}
      <div
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 22,
          position: "relative",
          zIndex: 1,
          textAlign: "left",
        }}
      >
        <div>
          <p style={{ ...SUB_STYLE, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.muted, marginBottom: 2 }}>
            Ad Minutes
          </p>
          <p style={{ ...HEADLINE_STYLE, color: theme.fg, fontSize: 24, letterSpacing: "-0.02em" }}>
            {persona.adMinutes}
          </p>
        </div>
        <div>
          <p style={{ ...SUB_STYLE, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.muted, marginBottom: 2 }}>
            Top Genre
          </p>
          <p style={{ ...HEADLINE_STYLE, color: theme.fg, fontSize: 20, letterSpacing: "-0.02em" }}>
            {persona.recapTopGenre}
          </p>
        </div>
      </div>

      {/* Premium upsell — the Wrapped-voice punchline. Italic centered aside. */}
      <p
        style={{
          ...SUB_STYLE,
          color: theme.fg,
          fontSize: 13,
          fontWeight: 500,
          fontStyle: "italic",
          lineHeight: 1.4,
          marginTop: 22,
          maxWidth: 300,
          marginLeft: "auto",
          marginRight: "auto",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        Premium is $11.99 a month. For your most music yet.
      </p>

      {/* Footer: small Spotify wordmark logo + SPOTIFY.COM/WRAPPED */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 1,
          paddingTop: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill={theme.fg} />
            <path
              d="M17.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.64 5.801 15.6 6.06 20.04 8.82c.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.379.3z"
              fill={theme.bg}
            />
          </svg>
          <span
            style={{
              fontFamily: FONT_UI,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: theme.fg,
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            Free
          </span>
        </div>
        <span
          style={{
            fontFamily: FONT_UI,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: theme.fg,
          }}
        >
          SPOTIFY.COM/WRAPPED
        </span>
      </div>
    </CardContent>
  );
}

function RecapList({
  title,
  items,
  color,
  mutedColor,
}: {
  title: string;
  items: string[];
  color: string;
  mutedColor: string;
}) {
  return (
    <div>
      <p
        style={{
          ...SUB_STYLE,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: mutedColor,
          marginBottom: 6,
        }}
      >
        {title}
      </p>
      <ol
        style={{
          padding: 0,
          margin: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              fontFamily: FONT_UI,
              fontSize: 14,
              fontWeight: 600,
              color,
              lineHeight: 1.35,
              display: "grid",
              gridTemplateColumns: "16px 1fr",
              alignItems: "baseline",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: mutedColor }}>{i + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Carousel — auto-advance + tap zones + hold-to-pause + swipe
// ─────────────────────────────────────────────────────────────────────────────

function PhoneSurface({
  isMobile,
  children,
}: {
  isMobile: boolean;
  children: ReactNode;
}) {
  // Desktop: lock 393:852 aspect (iPhone 14/15/16 Pro), scale to viewport with
  // a small safety margin so the phone always fits the gallery shell.
  return (
    <div
      style={{
        width: isMobile ? "100%" : "auto",
        height: isMobile ? "100%" : `min(${PHONE_H}px, 94vh)`,
        aspectRatio: isMobile ? undefined : PHONE_ASPECT,
        borderRadius: isMobile ? 0 : 44,
        overflow: "hidden",
        background: "#000",
        boxShadow: isMobile
          ? "none"
          : "0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
        position: "relative",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const CARD_COUNT = 8;

export function SpotifyWrappedAds() {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(!!reducedMotion);
  reducedMotionRef.current = !!reducedMotion;

  const [personaIdx, setPersonaIdx] = useState(0);
  const persona = PERSONAS[personaIdx];

  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [paused, setPaused] = useState(false); // hold-to-pause
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Replay key — bumping it restarts the run from card 0.
  const [, setReplayKey] = useState(0);

  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const autoRef = useRef(true);
  autoRef.current = autoAdvance;

  // Pointer state for tap/hold/swipe detection
  const pressStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const heldRef = useRef(false);
  const movedRef = useRef(false);
  const velSampleRef = useRef<{ x: number; t: number }>({ x: 0, t: 0 });
  const velRef = useRef(0);

  const goTo = useCallback(
    (idx: number) => {
      const next = Math.max(0, Math.min(CARD_COUNT - 1, idx));
      setCurrent(next);
      setProgress(0);
      lastTickRef.current = null;
    },
    [setCurrent]
  );

  const advance = useCallback(() => {
    setCurrent((c) => {
      if (c >= CARD_COUNT - 1) return c;
      return c + 1;
    });
    setProgress(0);
    lastTickRef.current = null;
  }, []);

  const goBack = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
    setProgress(0);
    lastTickRef.current = null;
  }, []);

  const replay = useCallback(() => {
    setReplayKey((k) => k + 1);
    setCurrent(0);
    setProgress(0);
    lastTickRef.current = null;
  }, []);

  // Auto-advance loop — drives the progress bar at a constant rate. A
  // separate effect (below) watches for progress >= 1 and bumps the card.
  useEffect(() => {
    let cancelled = false;
    function tick(now: number) {
      if (cancelled) return;
      if (!autoRef.current || pausedRef.current) {
        lastTickRef.current = now;
      } else {
        if (lastTickRef.current === null) lastTickRef.current = now;
        const dt = now - lastTickRef.current;
        lastTickRef.current = now;
        setProgress((p) => Math.min(1, p + dt / CARD_DURATION_MS));
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // When progress fills, advance to next card (or hold at 1 on the last card).
  useEffect(() => {
    if (progress < 1) return;
    if (current >= CARD_COUNT - 1) return;
    const id = window.setTimeout(() => {
      setCurrent((c) => Math.min(CARD_COUNT - 1, c + 1));
      setProgress(0);
      lastTickRef.current = null;
    }, 0);
    return () => window.clearTimeout(id);
  }, [progress, current]);

  // Pointer handlers — tap zones, hold to pause, swipe.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pressStartRef.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    heldRef.current = false;
    movedRef.current = false;
    velSampleRef.current = { x: e.clientX, t: e.timeStamp };
    velRef.current = 0;
    setIsDragging(true);
    // Schedule "hold" detection — if pointer is still down after threshold
    // without significant movement, pause auto-advance.
    const startId = pressStartRef.current.t;
    window.setTimeout(() => {
      if (
        pressStartRef.current &&
        pressStartRef.current.t === startId &&
        !movedRef.current
      ) {
        heldRef.current = true;
        setPaused(true);
      }
    }, HOLD_THRESHOLD_MS);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pressStartRef.current) return;
    const dx = e.clientX - pressStartRef.current.x;
    const dy = e.clientY - pressStartRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > 8) {
      movedRef.current = true;
    }
    // Track horizontal swipe.
    if (Math.abs(dx) > Math.abs(dy) && movedRef.current) {
      setDragX(dx);
    }
    // Velocity sample
    const dt = e.timeStamp - velSampleRef.current.t;
    if (dt > 0) {
      velRef.current = ((e.clientX - velSampleRef.current.x) / dt) * 1000;
    }
    velSampleRef.current = { x: e.clientX, t: e.timeStamp };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = pressStartRef.current;
      pressStartRef.current = null;
      setIsDragging(false);
      const wasHeld = heldRef.current;
      heldRef.current = false;
      if (wasHeld) {
        setPaused(false);
      }
      if (!start) return;

      const dx = e.clientX - start.x;
      const vel = velRef.current;
      const dur = e.timeStamp - start.t;

      // Swipe? — large displacement OR fast flick wins over tap-zone logic.
      if (
        Math.abs(dx) > SWIPE_THRESHOLD_PX ||
        Math.abs(vel) > SWIPE_VELOCITY
      ) {
        setDragX(0);
        if (dx < 0 || vel < 0) {
          advance();
        } else {
          goBack();
        }
        return;
      }
      setDragX(0);

      // Tap? — only treat as a tap if it was quick and didn't trigger a hold.
      if (!wasHeld && dur < HOLD_THRESHOLD_MS + 40 && !movedRef.current) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const xInside = e.clientX - rect.left;
        const w = rect.width;
        if (xInside < w * TAP_ZONE_RATIO) {
          goBack();
        } else if (xInside > w * (1 - TAP_ZONE_RATIO)) {
          advance();
        }
        // Center tap = no-op (let users hold-to-pause without an unintended skip).
      }
    },
    [advance, goBack]
  );

  const handlePointerCancel = useCallback(() => {
    pressStartRef.current = null;
    setIsDragging(false);
    setDragX(0);
    if (heldRef.current) {
      heldRef.current = false;
      setPaused(false);
    }
  }, []);

  // When persona changes, restart from card 0 so the user sees the change
  // ripple through the whole story.
  useEffect(() => {
    setCurrent(0);
    setProgress(0);
    lastTickRef.current = null;
  }, [personaIdx]);

  const theme = THEMES[current];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <DevPanel
      label="Wrapped for Ads"
      background="#0a0a0a"
      defaultOpen={!isMobile}
      controls={
        <>
          <DevSectionLabel>Card</DevSectionLabel>
          <DevButtonGroup
            options={[
              { label: "1", value: 0 },
              { label: "2", value: 1 },
              { label: "3", value: 2 },
              { label: "4", value: 3 },
              { label: "5", value: 4 },
              { label: "6", value: 5 },
              { label: "7", value: 6 },
              { label: "8", value: 7 },
            ]}
            value={current}
            onChange={(v) => goTo(v)}
          />

          <DevToggle
            label="Auto-advance"
            checked={autoAdvance}
            onChange={setAutoAdvance}
          />

          <DevButton label="Replay from start" onClick={replay} />

          <DevSectionLabel>Persona</DevSectionLabel>
          <DevButtonGroup
            options={PERSONAS.map((p, i) => ({ label: p.label, value: i }))}
            value={personaIdx}
            onChange={setPersonaIdx}
          />
        </>
      }
    >
      <div
        style={{
          position: isMobile ? "fixed" : "relative",
          inset: isMobile ? 0 : "auto",
          width: isMobile ? "100%" : "100%",
          height: isMobile ? "100%" : "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          fontFamily: FONT_UI,
        }}
      >
        <PhoneSurface isMobile={isMobile}>
          {/* Cards container — uses transform with the current index +
              optional drag offset. */}
          <motion.div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            initial={false}
            animate={{
              x: `calc(${-current * 100}% + ${isDragging ? dragX : 0}px)`,
            }}
            transition={
              isDragging
                ? { duration: 0 }
                : reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.42, ease: [0.2, 1, 0.3, 1] }
            }
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              touchAction: "none",
            }}
          >
            {Array.from({ length: CARD_COUNT }).map((_, i) => (
              <div
                key={i}
                style={{
                  minWidth: "100%",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {i === 0 && <Card1TotalAds persona={persona} theme={THEMES[0]} />}
                {i === 1 && <Card2Compare persona={persona} theme={THEMES[1]} />}
                {i === 2 && <Card2TopGenre persona={persona} theme={THEMES[2]} />}
                {i === 3 && <Card3TopBrand persona={persona} theme={THEMES[3]} />}
                {i === 4 && <Card4Streak persona={persona} theme={THEMES[4]} />}
                {i === 5 && <Card4Percentile persona={persona} theme={THEMES[5]} />}
                {i === 6 && <Card7Money persona={persona} theme={THEMES[6]} />}
                {i === 7 && <Card5Share persona={persona} theme={THEMES[7]} />}
              </div>
            ))}
          </motion.div>

          {/* iOS status bar — sits at the very top, white tint reads across
              every card. Real Wrapped runs full-screen with iOS chrome
              visible above the Spotify story chrome. */}
          <StatusBar tint="#FFFFFF" />

          {/* Story chrome — progress bars + close icons, themed by current card */}
          <ProgressBars
            count={CARD_COUNT}
            current={current}
            progress={progress}
            trackBg={theme.progressBg}
            trackFg={theme.progressFg}
          />
          <ChromeRow stroke={theme.chromeStroke} onClose={replay} />

          {/* Share pill — bottom-center on every card. The recap card has a
              bigger inverted button instead, so we hide the small one there. */}
          {current < CARD_COUNT - 1 && (
            <ShareButton
              stroke={theme.chromeStroke}
              bgInverted={false}
              label="Share this story"
            />
          )}
          {current === CARD_COUNT - 1 && (
            <ShareButton
              stroke={theme.chromeStroke}
              bgInverted={true}
              label="Share"
            />
          )}
        </PhoneSurface>
      </div>
    </DevPanel>
  );
}
