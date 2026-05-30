import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DevPanel, DevSlider, DevToggle, DevDivider } from "../../components/DevPanel";
import { setBackVisible } from "../../components/chromeControl";

/**
 * Page Transition — focused demo of the portfolio's project-link → and
 * back-button ← animations. Both run a windup→slide while the page fades to
 * 0, then the next page fades in. A dev panel exposes the timing levers and
 * lets the recorder hide the global Back button so it doesn't compete with
 * the demo's own Back affordance.
 */

const FONT = "'Onest', -apple-system, BlinkMacSystemFont, sans-serif";
const SERIF = "'Literata', Georgia, 'Times New Roman', serif";

const DEFAULTS = {
  arrowMs: 500,
  fadeMs: 280,
  rampMs: 800,
  fastMs: 160,
  jiggleIntensity: 1,
} as const;

type Theme = "light" | "dark";
type View = "index" | "detail";

interface ThemeTokens {
  bg: string;
  textDark: string;
  textGrey: string;
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
  { title: "Something I built", subtitle: "Some company · 2026" },
  { title: "Creating shareholder value", subtitle: "Another company · 2025" },
];

const TITLE_WEIGHT = 400;
const SUBTITLE_SIZE = 14;
const PAIR_GAP = 6;
const UNDERLINE_BOTTOM = 4;

interface Timings {
  arrowMs: number;
  rampMs: number;
  fastMs: number;
}

const TimingsContext = createContext<Timings>({
  arrowMs: DEFAULTS.arrowMs,
  rampMs: DEFAULTS.rampMs,
  fastMs: DEFAULTS.fastMs,
});

export function PageTransition() {
  const [theme, setTheme] = useState<Theme>("light");
  const [view, setView] = useState<View>("index");
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null);
  const [backAnimating, setBackAnimating] = useState(false);
  const [pageOpacity, setPageOpacity] = useState(1);

  // Tunable
  const [arrowMs, setArrowMs] = useState<number>(DEFAULTS.arrowMs);
  const [fadeMs, setFadeMs] = useState<number>(DEFAULTS.fadeMs);
  const [rampMs, setRampMs] = useState<number>(DEFAULTS.rampMs);
  const [jiggleIntensity, setJiggleIntensity] = useState<number>(
    DEFAULTS.jiggleIntensity,
  );
  // Recording chrome — toggles to clean the frame for screen capture.
  // When the tune button is hidden the panel still opens via right-edge
  // mouse reveal (see DevPanel).
  const [showBackButton, setShowBackButton] = useState(true);
  const [showTuneButton, setShowTuneButton] = useState(true);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const t = THEMES[theme];

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    setBackVisible(showBackButton);
    return () => setBackVisible(true);
  }, [showBackButton]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function go(next: View) {
    clearTimers();
    // Let the arrow play cleanly, then overlap the fade with its final ~32%
    // so the page exits behind the arrow rather than on top of it.
    const fadeStart = Math.max(0, arrowMs - Math.round(arrowMs * 0.32));
    timers.current.push(
      setTimeout(() => setPageOpacity(0), fadeStart),
      setTimeout(() => {
        setView(next);
        setAnimatingIdx(null);
        setBackAnimating(false);
        // wait one frame so the new view paints before fading in
        requestAnimationFrame(() => setPageOpacity(1));
      }, arrowMs),
    );
  }

  function prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
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

  const timings = useMemo<Timings>(
    () => ({ arrowMs, rampMs, fastMs: DEFAULTS.fastMs }),
    [arrowMs, rampMs],
  );

  const keyframesCSS = useMemo(
    () => buildKeyframesCSS(jiggleIntensity),
    [jiggleIntensity],
  );

  return (
    <DevPanel
      label="Page Transition"
      background={t.bg}
      hideTuneButton={!showTuneButton}
      controls={
        <>
          <DevSlider
            label="Arrow speed"
            value={arrowMs}
            onChange={setArrowMs}
            min={220}
            max={1100}
            step={20}
            format={(v) => `${Math.round(v)}ms`}
          />
          <DevSlider
            label="Page fade"
            value={fadeMs}
            onChange={setFadeMs}
            min={120}
            max={500}
            step={10}
            format={(v) => `${Math.round(v)}ms`}
          />
          <DevSlider
            label="Jiggle build-up"
            value={rampMs}
            onChange={setRampMs}
            min={300}
            max={2400}
            step={50}
            format={(v) => `${Math.round(v)}ms`}
          />
          <DevSlider
            label="Jiggle intensity"
            value={jiggleIntensity}
            onChange={setJiggleIntensity}
            min={0}
            max={2}
            step={0.1}
            format={(v) => `${v.toFixed(1)}×`}
          />
          <DevDivider />
          <DevToggle
            label="Show back button"
            checked={showBackButton}
            onChange={setShowBackButton}
          />
          <DevToggle
            label="Show tune button"
            checked={showTuneButton}
            onChange={setShowTuneButton}
          />
        </>
      }
    >
      <TimingsContext.Provider value={timings}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: t.bg,
            fontFamily: FONT,
            color: t.textDark,
            position: "relative",
            overflow: "hidden",
            transition: `background-color ${fadeMs}ms ease`,
          }}
        >
          <ThemeSwitch
            theme={theme}
            onToggle={() => setTheme(theme === "light" ? "dark" : "light")}
            t={t}
          />

          <div
            style={{
              width: "100%",
              height: "100%",
              opacity: pageOpacity,
              transition: `opacity ${fadeMs}ms ease`,
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
              <DetailPage
                theme={t}
                backAnimating={backAnimating}
                onBack={goBack}
              />
            )}
          </div>

          <style>{keyframesCSS}</style>
        </div>
      </TimingsContext.Provider>
    </DevPanel>
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
        alignItems: "center",
        paddingTop: 96,
        paddingLeft: 40,
        paddingRight: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          width: "100%",
          maxWidth: 560,
        }}
      >
        <h1
          style={{
            margin: "0 0 48px 0",
            fontFamily: SERIF,
            fontSize: 38,
            fontWeight: 400,
            lineHeight: 1.05,
            color: theme.textDark,
            letterSpacing: "-0.015em",
          }}
        >
          Projects
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 40,
            width: "100%",
          }}
        >
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
  const [focus, setFocus] = useState(false);
  return (
    <button
      className="pt-card"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setFocus(true);
      }}
      onBlur={() => setFocus(false)}
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
            fontSize: 20,
            fontWeight: TITLE_WEIGHT,
            color: theme.textDark,
            lineHeight: 1.35,
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
          hover={(hover || focus) && !sliding}
          color={theme.textDark}
        />
      </div>
      <span
        style={{
          fontSize: SUBTITLE_SIZE,
          color: theme.textGrey,
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
          gap: 32,
        }}
      >
        <BackButton theme={theme} sliding={backAnimating} onClick={onBack} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: SERIF,
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.15,
              color: theme.textDark,
              letterSpacing: "-0.015em",
            }}
          >
            Something I built
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: theme.textGrey,
              lineHeight: 1.4,
            }}
          >
            Some company · 2026
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: 580,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: theme.textDark,
            }}
          >
            Welcome to the case study. The transition you just used moves
            between the index and this view in half a second — the arrow runs
            a brief windup, then carries the page off-frame as the next view
            fades in.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: theme.textGrey,
            }}
          >
            Here is where I talk about the context, role, the work itself, and
            the reasoning behind the decisions.
          </p>
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
  const [focus, setFocus] = useState(false);
  return (
    <button
      className="pt-back"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setFocus(true);
      }}
      onBlur={() => setFocus(false)}
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
      <ArrowGlyph
        direction="left"
        sliding={sliding}
        hover={(hover || focus) && !sliding}
        color={theme.textDark}
      />
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
  const { arrowMs, rampMs, fastMs } = useContext(TimingsContext);
  const slideAnim =
    direction === "right" ? "ptArrowOutRight" : "ptArrowOutLeft";
  const rampAnim =
    direction === "right"
      ? "ptArrowJiggleRampRight"
      : "ptArrowJiggleRampLeft";
  const fastAnim =
    direction === "right"
      ? "ptArrowJiggleFastRight"
      : "ptArrowJiggleFastLeft";
  return (
    <span
      aria-hidden="true"
      className="pt-arrow"
      style={{
        display: "inline-block",
        fontSize: 16,
        fontWeight: 500,
        verticalAlign: "middle",
        color,
        lineHeight: 1,
        ...(sliding
          ? {
              animation: `${slideAnim} ${arrowMs}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
            }
          : hover
            ? {
                animation: `${rampAnim} ${rampMs}ms linear forwards, ${fastAnim} ${fastMs}ms linear ${rampMs}ms infinite`,
              }
            : {}),
      }}
    >
      {direction === "right" ? "→" : "←"}
    </span>
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
          transition:
            "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), background 280ms ease, color 280ms ease",
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

// ─── Keyframes ────────────────────────────────────────────────────────

// Ramp: amplitude grows from 0 to ±1.5px while oscillation period shortens.
// Mirrored by sign for left/right; scaled by jiggle intensity. Final stop
// matches FAST_STOPS[0] so the steady-state loop hands off seamlessly.
const RAMP_STOPS: ReadonlyArray<[number, number]> = [
  [0, 0], [8, -0.3], [18, 0.2], [28, -0.45], [38, 0.3],
  [48, -0.6], [57, 0.45], [65, -0.8], [72, 0.6],
  [79, -1], [85, 0.75], [90, -1.2], [94, 0.9],
  [97, -1.35], [100, -1.5],
];

const FAST_STOPS: ReadonlyArray<[number, number]> = [
  [0, -1.5], [25, 1.2], [50, -1.5], [75, 1], [100, -1.5],
];

function buildJiggle(
  name: string,
  stops: ReadonlyArray<[number, number]>,
  sign: 1 | -1,
  intensity: number,
) {
  const body = stops
    .map(
      ([p, v]) =>
        `  ${p}% { transform: translateX(${(v * sign * intensity).toFixed(3)}px); }`,
    )
    .join("\n");
  return `@keyframes ${name} {\n${body}\n}`;
}

function buildKeyframesCSS(intensity: number) {
  return `
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
${buildJiggle("ptArrowJiggleRampRight", RAMP_STOPS, 1, intensity)}
${buildJiggle("ptArrowJiggleRampLeft", RAMP_STOPS, -1, intensity)}
${buildJiggle("ptArrowJiggleFastRight", FAST_STOPS, 1, intensity)}
${buildJiggle("ptArrowJiggleFastLeft", FAST_STOPS, -1, intensity)}
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
  opacity: 0.7;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.pt-card:hover .pt-card__title::after,
.pt-card:focus-visible .pt-card__title::after,
.pt-back:hover .pt-back__label::after,
.pt-back:focus-visible .pt-back__label::after {
  transform: scaleX(1);
}
@media (prefers-reduced-motion: reduce) {
  .pt-card__title::after, .pt-back__label::after {
    transition: none;
    transform: scaleX(1);
  }
  .pt-back { animation: none; }
  .pt-arrow { animation: none !important; }
}
`;
}
