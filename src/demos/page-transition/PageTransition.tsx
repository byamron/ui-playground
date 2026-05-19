import { useEffect, useRef, useState } from "react";

/**
 * Page Transition — focused demo of the portfolio's project-link → and
 * back-button ← animations. Both run a 500ms windup→slide while the page
 * fades to 0, then the next page fades in. Skeleton content keeps the eye
 * on the arrow.
 */

const ARROW_MS = 500;
const FADE_MS = 280;
const FONT = "'Onest', -apple-system, BlinkMacSystemFont, sans-serif";

type Theme = "light" | "dark";
type View = "index" | "detail";

interface ThemeTokens {
  bg: string;
  textDark: string;
  textGrey: string;
  skeleton: string;
  skeletonStrong: string;
  underline: string;
  hoverBg: string;
  pressedBg: string;
  backHoverBg: string;
  switchTrack: string;
  switchKnob: string;
  switchIcon: string;
}

const THEMES: Record<Theme, ThemeTokens> = {
  light: {
    bg: "hsl(34, 30%, 94%)",
    textDark: "hsl(0, 0%, 7%)",
    textGrey: "hsl(0, 0%, 40%)",
    skeleton: "hsl(34, 14%, 86%)",
    skeletonStrong: "hsl(34, 14%, 80%)",
    underline: "hsl(34, 8%, 58%)",
    hoverBg: "hsla(0, 0%, 0%, 0.05)",
    pressedBg: "hsla(0, 0%, 0%, 0.06)",
    backHoverBg: "hsla(0, 0%, 0%, 0.05)",
    switchTrack: "hsl(34, 14%, 86%)",
    switchKnob: "hsl(0, 0%, 100%)",
    switchIcon: "hsl(0, 0%, 30%)",
  },
  dark: {
    bg: "hsl(34, 14%, 9%)",
    textDark: "hsl(0, 0%, 96%)",
    textGrey: "hsl(0, 0%, 62%)",
    skeleton: "hsl(34, 8%, 16%)",
    skeletonStrong: "hsl(34, 8%, 22%)",
    underline: "hsl(34, 6%, 42%)",
    hoverBg: "hsla(0, 0%, 100%, 0.07)",
    pressedBg: "hsla(0, 0%, 100%, 0.10)",
    backHoverBg: "hsla(0, 0%, 100%, 0.08)",
    switchTrack: "hsl(34, 8%, 16%)",
    switchKnob: "hsl(0, 0%, 18%)",
    switchIcon: "hsl(0, 0%, 80%)",
  },
} as const;

const CARDS: { title: string; subtitle: string }[] = [
  { title: "Something I built", subtitle: "Some company, 2026" },
  { title: "Creating shareholder value", subtitle: "Another company, 2025" },
  { title: "A side project", subtitle: "Just me, 2024" },
];

const TITLE_WEIGHT = 400;
const SUBTITLE_SIZE = 14;
const PAIR_GAP = 6;
const UNDERLINE_BOTTOM = 4;

export function PageTransition() {
  const [theme, setTheme] = useState<Theme>("light");
  const [view, setView] = useState<View>("index");
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null);
  const [backAnimating, setBackAnimating] = useState(false);
  const [pageOpacity, setPageOpacity] = useState(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const t = THEMES[theme];

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function go(next: View) {
    clearTimers();
    // Let the arrow play cleanly for its first ~340ms, then overlap the fade
    // with the arrow's final 160ms — page exits behind the arrow, not on top.
    const fadeStart = ARROW_MS - 160;
    timers.current.push(
      setTimeout(() => setPageOpacity(0), fadeStart),
      setTimeout(() => {
        setView(next);
        setAnimatingIdx(null);
        setBackAnimating(false);
        // brief breath before fade-in so the swap reads
        timers.current.push(setTimeout(() => setPageOpacity(1), 20));
      }, ARROW_MS),
    );
  }

  function prefersReducedMotion() {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function instantSwap(next: View) {
    clearTimers();
    setView(next);
    setAnimatingIdx(null);
    setBackAnimating(false);
    setPageOpacity(1);
  }

  function openCard(i: number) {
    if (animatingIdx !== null || backAnimating) return;
    if (prefersReducedMotion()) {
      instantSwap("detail");
      return;
    }
    setAnimatingIdx(i);
    go("detail");
  }

  function goBack() {
    if (animatingIdx !== null || backAnimating) return;
    if (prefersReducedMotion()) {
      instantSwap("index");
      return;
    }
    setBackAnimating(true);
    go("index");
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: t.bg,
        fontFamily: FONT,
        color: t.textDark,
        position: "relative",
        overflow: "hidden",
        transition: `background-color ${FADE_MS}ms ease`,
      }}
    >
      <ThemeSwitch theme={theme} onToggle={() => setTheme(theme === "light" ? "dark" : "light")} t={t} />

      <div
        style={{
          width: "100%",
          height: "100%",
          opacity: pageOpacity,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      >
        {view === "index" ? (
          <IndexPage
            theme={t}
            cards={CARDS}
            animatingIdx={animatingIdx}
            onOpen={openCard}
          />
        ) : (
          <DetailPage theme={t} backAnimating={backAnimating} onBack={goBack} />
        )}
      </div>

      <Keyframes />
    </div>
  );
}

// ─── Index page ───────────────────────────────────────────────────────

interface IndexProps {
  theme: ThemeTokens;
  cards: typeof CARDS;
  animatingIdx: number | null;
  onOpen: (i: number) => void;
}

function IndexPage({ theme, cards, animatingIdx, onOpen }: IndexProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 40px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 32, width: "100%", maxWidth: 720 }}>
        {cards.map((c, i) => (
          <ProjectCard
            key={i}
            theme={theme}
            title={c.title}
            subtitle={c.subtitle}
            sliding={animatingIdx === i}
            onClick={() => onOpen(i)}
          />
        ))}
      </div>
    </div>
  );
}

interface CardProps {
  theme: ThemeTokens;
  title: string;
  subtitle: string;
  sliding: boolean;
  onClick: () => void;
}

function ProjectCard({ theme, title, subtitle, sliding, onClick }: CardProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="pt-card"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: PAIR_GAP,
        background: "transparent",
        border: "none",
        padding: "10px 14px",
        margin: "0 -14px",
        borderRadius: 14,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT,
        overflow: "hidden",
        transformOrigin: "center",
        transform: sliding ? "scale(0.99)" : "scale(1)",
        transition: "background 180ms ease-out, transform 180ms ease-out",
        backgroundColor: sliding
          ? theme.pressedBg
          : hover
            ? theme.hoverBg
            : "transparent",
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span
          className="pt-card__title"
          style={{
            fontSize: 18,
            fontWeight: TITLE_WEIGHT,
            color: theme.textDark,
            lineHeight: 1.4,
            opacity: sliding ? 0.5 : 1,
            transition: "opacity 200ms ease-out",
            ["--pt-underline" as string]: theme.underline,
            ["--pt-underline-bottom" as string]: `${UNDERLINE_BOTTOM}px`,
          }}
        >
          {title}
        </span>
        <ArrowGlyph
          direction="right"
          sliding={sliding}
          hover={hover && !sliding}
          color={theme.textDark}
        />
      </div>
      <span
        style={{
          fontSize: SUBTITLE_SIZE,
          color: theme.textGrey,
          letterSpacing: "0.01em",
          lineHeight: 1.4,
          opacity: sliding ? 0.5 : 1,
          transition: "opacity 200ms ease-out",
        }}
      >
        {subtitle}
      </span>
    </button>
  );
}

// ─── Detail page ──────────────────────────────────────────────────────

interface DetailProps {
  theme: ThemeTokens;
  backAnimating: boolean;
  onBack: () => void;
}

function DetailPage({ theme, backAnimating, onBack }: DetailProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        paddingTop: 80,
        paddingLeft: 40,
        paddingRight: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 36,
        }}
      >
        <BackButton theme={theme} sliding={backAnimating} onClick={onBack} />

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <SkeletonBar w={420} h={28} color={theme.skeletonStrong} radius={6} />
          <SkeletonBar w={180} h={14} color={theme.skeleton} radius={4} />
        </div>

        <SkeletonBar w="100%" h={260} color={theme.skeleton} radius={12} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 640 }}>
          <SkeletonBar w="100%" h={12} color={theme.skeleton} radius={4} />
          <SkeletonBar w="87%" h={12} color={theme.skeleton} radius={4} />
          <SkeletonBar w="94%" h={12} color={theme.skeleton} radius={4} />
          <SkeletonBar w="52%" h={12} color={theme.skeleton} radius={4} />
        </div>
      </div>
    </div>
  );
}

interface BackProps {
  theme: ThemeTokens;
  sliding: boolean;
  onClick: () => void;
}

function BackButton({ theme, sliding, onClick }: BackProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="pt-back"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        background: "transparent",
        border: "none",
        padding: "10px 14px",
        margin: "0 -14px",
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: FONT,
        fontSize: 17,
        fontWeight: 400,
        color: theme.textDark,
        overflow: "hidden",
        transformOrigin: "center",
        transform: sliding ? "scale(0.99)" : "scale(1)",
        transition: "background 180ms ease-out, transform 180ms ease-out",
        backgroundColor: sliding
          ? theme.pressedBg
          : hover
            ? theme.backHoverBg
            : "transparent",
      }}
    >
      <ArrowGlyph direction="left" sliding={sliding} hover={hover && !sliding} color={theme.textDark} />
      <span
        className="pt-back__label"
        style={{
          marginLeft: 4,
          fontWeight: TITLE_WEIGHT,
          opacity: sliding ? 0.5 : 1,
          transition: "opacity 200ms ease-out",
          ["--pt-underline" as string]: theme.underline,
          ["--pt-underline-bottom" as string]: `${UNDERLINE_BOTTOM}px`,
        }}
      >
        Back
      </span>
    </button>
  );
}

// ─── Arrow ────────────────────────────────────────────────────────────

interface ArrowProps {
  direction: "left" | "right";
  sliding: boolean;
  hover?: boolean;
  color: string;
}

function ArrowGlyph({ direction, sliding, hover, color }: ArrowProps) {
  const animName = direction === "right" ? "ptArrowOutRight" : "ptArrowOutLeft";
  const hoverNudge = hover ? (direction === "right" ? 3 : -3) : 0;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        fontSize: 18,
        fontWeight: 500,
        verticalAlign: "middle",
        color,
        lineHeight: 1,
        transform: `translateX(${hoverNudge}px)`,
        transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        ...(sliding
          ? { animation: `${animName} ${ARROW_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards` }
          : {}),
      }}
    >
      {direction === "right" ? "→" : "←"}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────

interface SkelProps {
  w: number | string;
  h: number;
  color: string;
  radius?: number;
  maxW?: number;
}

function SkeletonBar({ w, h, color, radius = 4, maxW }: SkelProps) {
  return (
    <div
      style={{
        width: typeof w === "number" ? w : w,
        maxWidth: maxW,
        height: h,
        background: color,
        borderRadius: radius,
      }}
    />
  );
}

// ─── Theme switch ─────────────────────────────────────────────────────

function SunIcon({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill={color} />
      <g stroke={color} strokeWidth="1.4" strokeLinecap="round">
        <line x1="8" y1="1.4" x2="8" y2="3.2" />
        <line x1="8" y1="12.8" x2="8" y2="14.6" />
        <line x1="1.4" y1="8" x2="3.2" y2="8" />
        <line x1="12.8" y1="8" x2="14.6" y2="8" />
        <line x1="3.3" y1="3.3" x2="4.5" y2="4.5" />
        <line x1="11.5" y1="11.5" x2="12.7" y2="12.7" />
        <line x1="3.3" y1="12.7" x2="4.5" y2="11.5" />
        <line x1="11.5" y1="4.5" x2="12.7" y2="3.3" />
      </g>
    </svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 10.2A5.5 5.5 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z"
        fill={color}
      />
    </svg>
  );
}

interface SwitchProps {
  theme: Theme;
  onToggle: () => void;
  t: ThemeTokens;
}

function ThemeSwitch({ theme, onToggle, t }: SwitchProps) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        position: "absolute",
        top: 24,
        right: 24,
        zIndex: 10,
        width: 56,
        height: 30,
        borderRadius: 15,
        background: t.switchTrack,
        border: "none",
        cursor: "pointer",
        padding: 3,
        display: "flex",
        alignItems: "center",
        transition: "background 280ms ease",
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: t.switchKnob,
          color: t.switchIcon,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateX(${isDark ? 26 : 0}px)`,
          transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), background 280ms ease, color 280ms ease",
          boxShadow: isDark
            ? "0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 1px 2px rgba(0,0,0,0.12)",
        }}
      >
        {isDark ? <MoonIcon color={t.switchIcon} /> : <SunIcon color={t.switchIcon} />}
      </span>
    </button>
  );
}

// ─── Keyframes (injected once) ────────────────────────────────────────

let injected = false;
function Keyframes() {
  useEffect(() => {
    if (injected) return;
    const style = document.createElement("style");
    style.textContent = `
@keyframes ptArrowOutRight {
  0%   { transform: translateX(0);    opacity: 1; }
  30%  { transform: translateX(-5px); opacity: 1; }
  100% { transform: translateX(22px); opacity: 0; }
}
@keyframes ptArrowOutLeft {
  0%   { transform: translateX(0);     opacity: 1; }
  30%  { transform: translateX(5px);   opacity: 1; }
  100% { transform: translateX(-22px); opacity: 0; }
}
@keyframes ptBackEnter {
  0%   { transform: translateX(-12px); opacity: 0; }
  100% { transform: translateX(0);     opacity: 1; }
}
.pt-card:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  border-radius: 14px;
}
.pt-back:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  border-radius: 10px;
}
.pt-back {
  animation: ptBackEnter 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.pt-card__title, .pt-back__label {
  position: relative;
  display: inline-block;
}
.pt-card__title::after, .pt-back__label::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--pt-underline-bottom, 0);
  height: 1px;
  background: var(--pt-underline, currentColor);
  opacity: 0.3;
  transition: opacity 200ms ease-out;
}
.pt-card:hover .pt-card__title::after,
.pt-card:focus-visible .pt-card__title::after,
.pt-back:hover .pt-back__label::after,
.pt-back:focus-visible .pt-back__label::after {
  opacity: 0.7;
}
@media (prefers-reduced-motion: reduce) {
  .pt-card__title::after, .pt-back__label::after { transition: none; }
  .pt-back { animation: none; }
}
`;
    document.head.appendChild(style);
    injected = true;
  }, []);
  return null;
}
