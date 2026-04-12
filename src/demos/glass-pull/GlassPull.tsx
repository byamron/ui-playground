import { useRef, useEffect, useState } from "react";
import { bg, demoPalettes, text } from "../../palette";
import { DevPanel, DevSlider, DevDivider } from "../../components/DevPanel";

/**
 * Glass Pull — ported from portfolio's useGlassHighlight hook.
 * Spring-physics driven: position, size, and edge-pull all use a damped
 * spring solver for overshoot, settle, and that alive, weighted quality.
 * DevPanel for live spring tuning.
 */

const ITEMS = [
  "Overview",
  "Projects",
  "Activity",
  "Settings",
  "Team",
  "Docs",
];

const BG_COLOR = bg(demoPalettes["glass-pull"]);

// Defaults — these become the DevPanel's starting values
const DEFAULTS = {
  springStiffness: 280,
  springDamping: 23,
  pillMaxLean: 1.5,
  pillMaxTilt: 1.3,
  cardMaxLean: 0.8,
  stretchAmount: 0.02,
  entranceScale: 0.75,
  glassPressure: 0.03,
  highlightIntensity: 0.10,
  cursorLight: 0.02,
};

// Static config (not tunable)
const STATIC = {
  surfaceBlur: 1,
  borderRadius: 10,
  fadeDuration: 200,
  squashAmount: 0.004,
  pullStrength: 0.25,
  edgeZone: 0.20,
  pillDeadZone: 0.4,
  cardLeanRamp: 0.10,
  springMass: 1,
};

// ═══════════════════════════════════════════════════════════════
// Tunable config — read via ref so the imperative loop picks up changes
// ═══════════════════════════════════════════════════════════════

interface TunableConfig {
  springStiffness: number;
  springDamping: number;
  pillMaxLean: number;
  pillMaxTilt: number;
  cardMaxLean: number;
  stretchAmount: number;
  entranceScale: number;
  glassPressure: number;
  highlightIntensity: number;
  cursorLight: number;
}

// ═══════════════════════════════════════════════════════════════
// Spring solver
// ═══════════════════════════════════════════════════════════════

interface SpringState {
  value: number;
  velocity: number;
  target: number;
}

function createSpring(initial: number): SpringState {
  return { value: initial, velocity: 0, target: initial };
}

function stepSpring(s: SpringState, dt: number, k: number, c: number): boolean {
  const displacement = s.value - s.target;
  const springForce = -k * displacement;
  const dampingForce = -c * s.velocity;
  const acceleration = springForce + dampingForce; // mass = 1

  s.velocity += acceleration * dt;
  s.value += s.velocity * dt;

  return Math.abs(displacement) > 0.1 || Math.abs(s.velocity) > 0.1;
}

// ═══════════════════════════════════════════════════════════════
// Imperative glass highlight system
// ═══════════════════════════════════════════════════════════════

function setupGlassHighlight(
  container: HTMLElement,
  configRef: React.MutableRefObject<TunableConfig>,
): () => void {
  let pill: HTMLDivElement | null = null;
  let currentCard: HTMLElement | null = null;
  let rafId: number | null = null;
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  const hue = 260;

  const springs = {
    x: createSpring(0),
    y: createSpring(0),
    w: createSpring(0),
    h: createSpring(0),
  };

  const state = {
    baseX: 0, baseY: 0, baseW: 0, baseH: 0,
    mouseX: 0, mouseY: 0,
    lastTime: 0,
  };

  let cachedContainerRect: DOMRect | null = null;
  let lastPillW = -1;
  let lastPillH = -1;

  let leanedCard: HTMLElement | null = null;
  let leanIntensity = 0;
  let mouseActive = false;
  let activeTextCard: HTMLElement | null = null;

  function setActiveText(card: HTMLElement | null) {
    if (activeTextCard === card) return;
    if (activeTextCard) activeTextCard.removeAttribute("data-active");
    activeTextCard = card;
    if (card) card.setAttribute("data-active", "true");
  }

  // Entrance spring — pill scales up on first appearance
  let entranceScale = 1;
  let entranceVel = 0;
  let entranceTarget = 1;
  const ENTRANCE_K = 350;
  const ENTRANCE_C = 22;

  // Glass pressure — fill opacity modulates with spring velocity
  let glassPressure = 0;
  let glassPressureMax = configRef.current.glassPressure;

  function engageCardLean(card: HTMLElement): void {
    leanIntensity = 0;
    card.style.transition = "none";
    leanedCard = card;
  }

  function releaseCardLean(): void {
    if (!leanedCard) return;
    leanedCard.style.transition = "transform 300ms cubic-bezier(0.5, 0, 0.15, 1)";
    leanedCard.style.transform = "";
    leanedCard = null;
  }

  function createPill(): HTMLDivElement {
    const div = document.createElement("div");
    div.setAttribute("aria-hidden", "true");

    Object.assign(div.style, {
      position: "absolute",
      pointerEvents: "none",
      zIndex: "10",
      opacity: "0",
      willChange: "transform, opacity",
      contain: "layout style",
      top: "0",
      left: "0",
      borderRadius: `${STATIC.borderRadius}px`,
      background: `hsla(${hue}, 20%, 55%, 0.12)`,
      backdropFilter: `blur(${STATIC.surfaceBlur}px)`,
      WebkitBackdropFilter: `blur(${STATIC.surfaceBlur}px)`,
      boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.10)",
      border: "0.5px solid rgba(255, 255, 255, 0.12)",
      transition: `opacity ${STATIC.fadeDuration}ms ease`,
    });

    container.insertBefore(div, container.firstChild);
    return div;
  }

  function getCardPosition(card: HTMLElement) {
    const cardRect = card.getBoundingClientRect();
    if (!cachedContainerRect) cachedContainerRect = container.getBoundingClientRect();
    return {
      x: cardRect.left - cachedContainerRect.left + container.scrollLeft,
      y: cardRect.top - cachedContainerRect.top + container.scrollTop,
      w: cardRect.width,
      h: cardRect.height,
    };
  }

  function fadeIn() {
    if (!pill) return;
    pill.style.transition = `opacity ${STATIC.fadeDuration}ms ease`;
    pill.style.opacity = "1";
  }

  function fadeOut() {
    if (!pill) return;
    // Exit: slight scale-down + fade, mirroring the entrance pop
    pill.style.transition = `opacity ${STATIC.fadeDuration}ms ease, transform ${STATIC.fadeDuration}ms cubic-bezier(0.4, 0, 1, 1)`;
    pill.style.transform = `translate(${springs.x.value}px, ${springs.y.value}px) scale(0.96)`;
    pill.style.opacity = "0";
  }

  function getVelocityStretch(): { sx: number; sy: number } {
    const cfg = configRef.current;
    const vx = springs.x.velocity;
    const vy = springs.y.velocity;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 5) return { sx: 1, sy: 1 };

    const f = Math.min(speed / 400, 1);
    const hr = speed > 0 ? Math.abs(vx) / speed : 0;
    const vr = speed > 0 ? Math.abs(vy) / speed : 0;

    const sx = (1 + cfg.stretchAmount * f * hr) * (1 - STATIC.squashAmount * f * vr);
    const sy = (1 + cfg.stretchAmount * f * vr) * (1 - STATIC.squashAmount * f * hr);
    return { sx, sy };
  }

  function computePullTargets() {
    if (!currentCard) return;

    let newX = state.baseX;
    let newY = state.baseY;
    let newW = state.baseW;
    let newH = state.baseH;

    if (!cachedContainerRect) cachedContainerRect = container.getBoundingClientRect();
    const cardTop = cachedContainerRect.top + state.baseY - container.scrollTop;
    const cardHeight = state.baseH;
    const relY = cardHeight > 0 ? (state.mouseY - cardTop) / cardHeight : 0.5;
    const ez = STATIC.edgeZone;
    let pullAmount = 0;

    if (relY < ez) {
      pullAmount = -Math.pow(Math.max(0, Math.min(1, 1 - relY / ez)), 1.5);
    } else if (relY > 1 - ez) {
      pullAmount = Math.pow(Math.max(0, Math.min(1, (relY - (1 - ez)) / ez)), 1.5);
    }

    if (pullAmount !== 0) {
      const ps = STATIC.pullStrength;
      const dim = state.baseH;
      const maxStretch = dim * 0.25 * ps;
      const maxMove = dim * 0.15 * ps;
      const stretchPx = Math.abs(pullAmount) * maxStretch;
      const movePx = pullAmount * maxMove;

      newH = state.baseH + stretchPx;
      newW = state.baseW * (state.baseH / newH);
      newX = state.baseX + (state.baseW - newW) / 2;
      newY = state.baseY + movePx;
      if (pullAmount < 0) newY -= stretchPx;
    }

    springs.x.target = newX;
    springs.y.target = newY;
    springs.w.target = newW;
    springs.h.target = newH;
  }

  function startLoop() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function loop(now: number) {
    rafId = null;
    if (!currentCard || !pill) return;

    const cfg = configRef.current;
    const k = cfg.springStiffness;
    const c = cfg.springDamping;

    const dt = state.lastTime ? Math.min((now - state.lastTime) / 1000, 0.032) : 0.016;
    state.lastTime = now;

    computePullTargets();

    // Sub-step for stability
    const SUB_STEP = 0.004;
    let remaining = dt;
    let activeX = false, activeY = false, activeW = false, activeH = false;
    while (remaining > 0) {
      const step = Math.min(remaining, SUB_STEP);
      activeX = stepSpring(springs.x, step, k, c) || activeX;
      activeY = stepSpring(springs.y, step, k, c) || activeY;
      activeW = stepSpring(springs.w, step, k, c) || activeW;
      activeH = stepSpring(springs.h, step, k, c) || activeH;
      remaining -= step;
    }
    // Step entrance spring
    const entranceForce = -ENTRANCE_K * (entranceScale - entranceTarget) - ENTRANCE_C * entranceVel;
    entranceVel += entranceForce * dt;
    entranceScale += entranceVel * dt;
    const entranceActive = Math.abs(entranceScale - entranceTarget) > 0.001 || Math.abs(entranceVel) > 0.01;

    // Glass pressure — fill brightens under motion, calms at rest
    glassPressureMax = cfg.glassPressure;
    const springSpeed = Math.sqrt(springs.x.velocity ** 2 + springs.y.velocity ** 2);
    const targetPressure = Math.min(springSpeed / 300, 1) * glassPressureMax;
    glassPressure += (targetPressure - glassPressure) * 0.1;

    const pressureActive = glassPressure > 0.001;
    const settled = !activeX && !activeY && !activeW && !activeH && !entranceActive && !pressureActive;

    if (settled) {
      springs.x.value = springs.x.target;
      springs.y.value = springs.y.target;
      springs.w.value = springs.w.target;
      springs.h.value = springs.h.target;
    }

    const { sx, sy } = getVelocityStretch();
    const baseOpacity = 0.12;

    const w = springs.w.value;
    const h = springs.h.value;

    // ── Pill lean + tilt ──
    let leanX = 0, leanY = 0;
    let rotateDeg = 0;
    let nx = 0, ny = 0;

    if (!cachedContainerRect) cachedContainerRect = container.getBoundingClientRect();
    const pillVpX = cachedContainerRect.left + springs.x.value - container.scrollLeft;
    const pillVpY = cachedContainerRect.top + springs.y.value - container.scrollTop;
    const relX = state.mouseX - pillVpX - w / 2;
    const relY = state.mouseY - pillVpY - h / 2;
    nx = w > 0 ? relX / (w / 2) : 0;
    ny = h > 0 ? relY / (h / 2) : 0;
    const d = Math.sqrt(nx * nx + ny * ny);

    const deadZone = STATIC.pillDeadZone;
    const rawD = Math.max(0, d - deadZone) / (1 - deadZone);
    const t = 1 - Math.exp(-rawD * 2.0);

    const dirX = d > 0.001 ? nx / d : 0;
    const dirY = d > 0.001 ? ny / d : 0;
    leanX = dirX * t * cfg.pillMaxLean;
    leanY = dirY * t * cfg.pillMaxLean;

    const cnx = Math.max(-1, Math.min(1, nx));
    const cny = Math.max(-1, Math.min(1, ny));
    rotateDeg = (cnx * dirY * Math.abs(dirY) + cny * dirX * Math.abs(dirX)) * cfg.pillMaxTilt * t;

    // ── Cursor-as-light-source + ambient edge highlight ──
    // Cursor light: radial gradient epicentered on cursor position
    const clampNx = Math.max(-1, Math.min(1, nx));
    const clampNy = Math.max(-1, Math.min(1, ny));
    const hlPctX = ((clampNx + 1) / 2 * 100).toFixed(1);
    const hlPctY = ((clampNy + 1) / 2 * 100).toFixed(1);
    const clIntensity = cfg.cursorLight * (1 + (1 - Math.min(d * 0.6, 1)) * 0.5);

    // Edge highlight: shifts with cursor position for surface curvature feel
    const ambientHL = cfg.highlightIntensity;
    // Shift shadow position toward cursor — simulates light catching the near edge
    const shadowX = clampNx * 0.8;
    const shadowY = 0.5 + clampNy * 0.5;
    const edgeIntensity = ambientHL + (1 - Math.min(d, 1)) * ambientHL * 0.5;

    // Compose: cursor radial gradient + glass fill (with pressure)
    const fillOpacity = (baseOpacity + glassPressure).toFixed(3);
    pill.style.background = `radial-gradient(ellipse 130% 130% at ${hlPctX}% ${hlPctY}%, rgba(255,255,255,${clIntensity.toFixed(3)}), rgba(255,255,255,${(clIntensity * 0.1).toFixed(3)}) 55%, transparent 100%), hsla(${hue}, 20%, 55%, ${fillOpacity})`;

    // Edge catch shifts with cursor + subtle bottom shadow for depth
    pill.style.boxShadow = `inset ${shadowX.toFixed(2)}px ${shadowY.toFixed(2)}px 0 0 rgba(255,255,255,${edgeIntensity.toFixed(3)}), inset 0 -0.5px 0 0 rgba(0,0,0,0.06)`;

    // ── Card text lean ──
    if (leanedCard && mouseActive) {
      leanIntensity += (1 - leanIntensity) * STATIC.cardLeanRamp;
      if (leanIntensity > 0.99) leanIntensity = 1;
      const cardDist = Math.sqrt(nx * nx + ny * ny);
      const cardT = Math.min(cardDist, 1);
      const cdx = cardDist > 0.001 ? nx / cardDist : 0;
      const cdy = cardDist > 0.001 ? ny / cardDist : 0;
      const edgeProximity = Math.max(Math.abs(nx), Math.abs(ny));
      const edgeFade = edgeProximity < 0.75 ? 1 : Math.max(0, 1 - (edgeProximity - 0.75) / 0.25);
      const clx = cdx * cardT * cfg.cardMaxLean * leanIntensity * edgeFade;
      const cly = cdy * cardT * cfg.cardMaxLean * leanIntensity * edgeFade;
      leanedCard.style.transform = `translate(${clx.toFixed(2)}px, ${cly.toFixed(2)}px)`;
    }

    // ── Text activation: fire when pill center crosses target center ──
    if (currentCard) {
      const pillCenterY = springs.y.value + h / 2;
      const targetCenterY = state.baseY + state.baseH / 2;
      if (Math.abs(pillCenterY - targetCenterY) < state.baseH * 0.5) {
        setActiveText(currentCard);
      }
    }

    const tx = springs.x.value - (w * (sx - 1)) / 2 + leanX;
    const ty = springs.y.value - (h * (sy - 1)) / 2 + leanY;

    // Combine entrance scale with velocity stretch
    const es = Math.max(0.01, entranceScale);
    pill.style.transform = `translate(${tx}px, ${ty}px) rotate(${rotateDeg}deg) scale(${sx * es}, ${sy * es})`;

    const roundedW = Math.round(w);
    const roundedH = Math.round(h);
    if (roundedW !== lastPillW) { pill.style.width = `${roundedW}px`; lastPillW = roundedW; }
    if (roundedH !== lastPillH) { pill.style.height = `${roundedH}px`; lastPillH = roundedH; }

    const leanRamping = leanedCard && mouseActive && leanIntensity < 1;

    if (!settled || leanRamping) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function isCursorInCardStack(clientY: number): boolean {
    const cards = container.querySelectorAll<HTMLElement>("[data-link-card]");
    if (cards.length === 0) return false;
    const firstRect = cards[0]!.getBoundingClientRect();
    const lastRect = cards[cards.length - 1]!.getBoundingClientRect();
    return clientY >= firstRect.top && clientY <= lastRect.bottom;
  }

  function handleMouseOver(e: MouseEvent) {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-link-card]");
    if (!card) {
      if (currentCard && !isCursorInCardStack(e.clientY)) {
        if (!clearTimer) {
          clearTimer = setTimeout(() => {
            clearTimer = null;
            releaseCardLean();
            setActiveText(null);
            currentCard = null;
            fadeOut();
            stopLoop();
          }, 150);
        }
      } else if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
      }
      return;
    }

    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    if (card === currentCard) return;

    const prevCard = currentCard;
    currentCard = card;
    mouseActive = true;
    releaseCardLean();
    engageCardLean(card);
    // Text activation is deferred to the loop — activates when pill crosses target center
    cachedContainerRect = null;
    const pos = getCardPosition(card);

    if (!prevCard) {
      state.baseX = pos.x;
      state.baseY = pos.y;
      state.baseW = pos.w;
      state.baseH = pos.h;

      springs.x.value = springs.x.target = pos.x;
      springs.y.value = springs.y.target = pos.y;
      springs.w.value = springs.w.target = pos.w;
      springs.h.value = springs.h.target = pos.h;
      springs.x.velocity = springs.y.velocity = springs.w.velocity = springs.h.velocity = 0;

      // Entrance: spring scale on every session entry
      entranceScale = configRef.current.entranceScale;
      entranceVel = 0;
      entranceTarget = 1;
      glassPressure = 0;

      pill!.style.transition = "none";
      pill!.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${configRef.current.entranceScale})`;
      pill!.style.width = `${pos.w}px`;
      pill!.style.height = `${pos.h}px`;
      lastPillW = Math.round(pos.w);
      lastPillH = Math.round(pos.h);
      setActiveText(card); // pill snaps to position, activate immediately
      requestAnimationFrame(() => { requestAnimationFrame(() => { fadeIn(); }); });
    } else {
      state.baseX = pos.x;
      state.baseY = pos.y;
      state.baseW = pos.w;
      state.baseH = pos.h;

      springs.x.target = pos.x;
      springs.y.target = pos.y;
      springs.w.target = pos.w;
      springs.h.target = pos.h;
    }

    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    startLoop();
  }

  function handleMouseLeave(e: MouseEvent) {
    if (container.contains(e.relatedTarget as Node)) return;
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    releaseCardLean();
    setActiveText(null);
    currentCard = null;
    fadeOut();
    stopLoop();
  }

  function handleMouseMove(e: MouseEvent) {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    if (!mouseActive) {
      mouseActive = true;
      if (currentCard && !leanedCard) engageCardLean(currentCard);
    }
    if (currentCard && rafId === null) {
      startLoop();
    }
  }

  pill = createPill();
  container.addEventListener("mouseover", handleMouseOver);
  container.addEventListener("mouseleave", handleMouseLeave);
  container.addEventListener("mousemove", handleMouseMove, { passive: true });

  return () => {
    releaseCardLean();
    setActiveText(null);
    stopLoop();
    container.removeEventListener("mouseover", handleMouseOver);
    container.removeEventListener("mouseleave", handleMouseLeave);
    container.removeEventListener("mousemove", handleMouseMove);
    pill?.remove();
    if (clearTimer) clearTimeout(clearTimer);
  };
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function GlassPull() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Tunable state — DevPanel drives these, ref passes them into the imperative loop
  const [stiffness, setStiffness] = useState(DEFAULTS.springStiffness);
  const [damping, setDamping] = useState(DEFAULTS.springDamping);
  const [lean, setLean] = useState(DEFAULTS.pillMaxLean);
  const [tilt, setTilt] = useState(DEFAULTS.pillMaxTilt);
  const [cardLean, setCardLean] = useState(DEFAULTS.cardMaxLean);
  const [stretch, setStretch] = useState(DEFAULTS.stretchAmount);
  const [entrance, setEntrance] = useState(DEFAULTS.entranceScale);
  const [pressure, setPressure] = useState(DEFAULTS.glassPressure);
  const [highlight, setHighlight] = useState(DEFAULTS.highlightIntensity);
  const [cursorLight, setCursorLight] = useState(DEFAULTS.cursorLight);

  const configRef = useRef<TunableConfig>({} as TunableConfig);

  // Keep ref in sync with state (no re-mount needed)
  configRef.current = {
    springStiffness: stiffness,
    springDamping: damping,
    pillMaxLean: lean,
    pillMaxTilt: tilt,
    cardMaxLean: cardLean,
    stretchAmount: stretch,
    entranceScale: entrance,
    glassPressure: pressure,
    highlightIntensity: highlight,
    cursorLight,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return setupGlassHighlight(container, configRef);
  }, []);

  return (
    <DevPanel
      label="Glass Pull"
      background={BG_COLOR}
      defaultOpen={false}
      controls={
        <>
          <DevSlider label="Stiffness" value={stiffness} onChange={setStiffness} min={100} max={600} step={10} />
          <DevSlider label="Damping" value={damping} onChange={setDamping} min={8} max={50} step={1} />
          <DevDivider />
          <DevSlider label="Pill lean" value={lean} onChange={setLean} min={0} max={8} step={0.5} />
          <DevSlider label="Pill tilt" value={tilt} onChange={setTilt} min={0} max={3} step={0.1} />
          <DevSlider label="Card lean" value={cardLean} onChange={setCardLean} min={0} max={6} step={0.2} />
          <DevDivider />
          <DevSlider label="Stretch" value={stretch} onChange={setStretch} min={0} max={0.15} step={0.005} />
          <DevSlider label="Entrance scale" value={entrance} onChange={setEntrance} min={0.7} max={1.0} step={0.01} />
          <DevDivider />
          <DevSlider label="Glass pressure" value={pressure} onChange={setPressure} min={0} max={0.12} step={0.005} />
          <DevSlider label="Edge highlight" value={highlight} onChange={setHighlight} min={0} max={0.15} step={0.005} />
          <DevSlider label="Cursor light" value={cursorLight} onChange={setCursorLight} min={0} max={0.20} step={0.005} />
        </>
      }
    >
      <style>{`
        .glass-list {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .glass-item {
          padding: 16px 24px;
          font-size: 17px;
          color: ${text.dark.tertiary};
          cursor: default;
          position: relative;
          z-index: 1;
          transition: color 0.2s ease;
          user-select: none;
          border-radius: 10px;
        }
        .glass-item[data-active="true"] {
          color: ${text.dark.primary};
        }
      `}</style>

      <div ref={containerRef} className="glass-list">
        {ITEMS.map((item) => (
          <div key={item} className="glass-item" data-link-card>
            {item}
          </div>
        ))}
      </div>
    </DevPanel>
  );
}
