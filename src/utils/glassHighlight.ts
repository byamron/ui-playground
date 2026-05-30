/**
 * Shared glass-highlight engine.
 *
 * Originally extracted from `src/demos/glass-pull/GlassPull.tsx` so other
 * demos (e.g. Flock) can use the same pull-pill behaviour on their own
 * `[data-link-card]` elements without duplicating ~500 lines of physics.
 *
 * Container element must hold one or more `[data-link-card]` children.
 * Pass a ref to a `TunableConfig` — values are read every frame, so live
 * tuning works without remounting.
 */

export type GlassMode = "dark" | "light";

export interface GlassTunable {
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
  mode: GlassMode;
}

export const GLASS_DEFAULTS: Omit<GlassTunable, "mode"> = {
  springStiffness: 280,
  springDamping: 23,
  pillMaxLean: 1.5,
  pillMaxTilt: 2.2,
  cardMaxLean: 0.8,
  stretchAmount: 0.02,
  entranceScale: 0.75,
  glassPressure: 0.03,
  highlightIntensity: 0.10,
  cursorLight: 0.02,
};

const STATIC = {
  surfaceBlur: 1,
  borderRadius: 14,
  fadeDuration: 200,
  squashAmount: 0.004,
  pullStrength: 0.25,
  edgeZone: 0.20,
  pillDeadZone: 0.4,
  cardLeanRamp: 0.10,
  springMass: 1,
};

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
  const acceleration = springForce + dampingForce;
  s.velocity += acceleration * dt;
  s.value += s.velocity * dt;
  return Math.abs(displacement) > 0.1 || Math.abs(s.velocity) > 0.1;
}

export interface GlassHighlightAPI {
  cleanup: () => void;
  /** Force a single repaint with the current configRef values. */
  redraw: () => void;
  /** One-shot pulse on the pill's fill opacity (decays naturally via the
   *  smoothing in the loop). Used to couple external events (e.g. a flock
   *  launch) to a visible pill intensification. */
  spikePressure: (amount: number) => void;
  /** Suppress or restore the pill's visibility. Used by the shatter
   *  effect — the pill "becomes" the shards and returns once they're gone. */
  setPillVisible: (visible: boolean) => void;
  /** Read the pill's current bounding rect in viewport coords (or null if
   *  not visible). Used by the shatter effect to know what to break. */
  getPillRect: () => DOMRect | null;
  /** Add a small high-frequency translate jitter to the pill that builds
   *  over `durationMs` (eased so it intensifies near the end). Used to
   *  signal stress before the glass breaks. */
  shakeFor: (durationMs: number, maxPx?: number) => void;
  /** Stop any in-progress shake immediately. */
  cancelShake: () => void;
}

interface SetupOptions {
  /** Override the glass tint hue. Defaults to 260 (violet). */
  hue?: number;
  /** Override the pill corner radius. Defaults to 14px. */
  borderRadius?: number;
}

export function setupGlassHighlight(
  container: HTMLElement,
  configRef: React.MutableRefObject<GlassTunable>,
  options: SetupOptions = {},
): GlassHighlightAPI {
  let pill: HTMLDivElement | null = null;
  let currentCard: HTMLElement | null = null;
  let rafId: number | null = null;
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  const hue = options.hue ?? 260;
  const borderRadius = options.borderRadius ?? STATIC.borderRadius;

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

  let entranceScale = 1;
  let entranceVel = 0;
  let entranceTarget = 1;
  const ENTRANCE_K = 350;
  const ENTRANCE_C = 22;

  let glassPressure = 0;
  let glassPressureMax = configRef.current.glassPressure;

  // External spike: brief brighten of the pill fill in response to a
  // discrete event (e.g. a flock launch). Independent of the spring's
  // smoothing so it has its own clear hold-and-decay envelope.
  let spikeAmount = 0;
  let spikeStartMs = 0;
  const SPIKE_HOLD_MS = 130;
  const SPIKE_DECAY_MS = 380;

  // External suppression of pill visibility (shatter effect).
  let pillSuppressed = false;

  // Shake: small high-frequency translate jitter that builds over its
  // duration, then snaps to nothing. Drives a per-frame random offset
  // applied on top of the spring-driven translate.
  let shakeStartMs = 0;
  let shakeDurationMs = 0;
  let shakeMaxPx = 0;
  const SHAKE_DEFAULT_MAX_PX = 1.6;

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
      willChange: "transform, opacity, box-shadow, background",
      contain: "layout style",
      top: "0",
      left: "0",
      borderRadius: `${borderRadius}px`,
      backdropFilter: `blur(${STATIC.surfaceBlur}px)`,
      WebkitBackdropFilter: `blur(${STATIC.surfaceBlur}px)`,
      transition: `opacity ${STATIC.fadeDuration}ms ease`,
    });
    container.insertBefore(div, container.firstChild);
    return div;
  }

  let appliedMode: GlassMode | null = null;
  function applyMode(m: GlassMode) {
    if (!pill || appliedMode === m) return;
    appliedMode = m;
    pill.style.border = m === "dark"
      ? "0.5px solid rgba(255, 255, 255, 0.12)"
      : "0.5px solid rgba(0, 0, 0, 0.06)";
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
    if (!pill || pillSuppressed) return;
    pill.style.transition = `opacity ${STATIC.fadeDuration}ms ease`;
    pill.style.opacity = "1";
  }

  function fadeOut() {
    if (!pill) return;
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
    const entranceForce = -ENTRANCE_K * (entranceScale - entranceTarget) - ENTRANCE_C * entranceVel;
    entranceVel += entranceForce * dt;
    entranceScale += entranceVel * dt;
    const entranceActive = Math.abs(entranceScale - entranceTarget) > 0.001 || Math.abs(entranceVel) > 0.01;

    glassPressureMax = cfg.glassPressure;
    const springSpeed = Math.sqrt(springs.x.velocity ** 2 + springs.y.velocity ** 2);
    const targetPressure = Math.min(springSpeed / 300, 1) * glassPressureMax;
    glassPressure += (targetPressure - glassPressure) * 0.1;

    const pressureActive = glassPressure > 0.001;
    const spikeActive = spikeAmount > 0;
    const shakeActive = shakeDurationMs > 0;
    const settled = !activeX && !activeY && !activeW && !activeH && !entranceActive && !pressureActive && !spikeActive && !shakeActive;

    if (settled) {
      springs.x.value = springs.x.target;
      springs.y.value = springs.y.target;
      springs.w.value = springs.w.target;
      springs.h.value = springs.h.target;
    }

    const { sx, sy } = getVelocityStretch();
    const isDark = cfg.mode === "dark";
    applyMode(cfg.mode);

    const baseOpacity = isDark ? 0.12 : 0.22;

    const w = springs.w.value;
    const h = springs.h.value;

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

    const clampNx = Math.max(-1, Math.min(1, nx));
    const clampNy = Math.max(-1, Math.min(1, ny));
    const hlPctX = ((clampNx + 1) / 2 * 100).toFixed(1);
    const hlPctY = ((clampNy + 1) / 2 * 100).toFixed(1);
    const clIntensity = cfg.cursorLight * (1 + (1 - Math.min(d * 0.6, 1)) * 0.5);

    const ambientHL = cfg.highlightIntensity;
    const shadowX = clampNx * 0.8;
    const shadowY = 0.5 + clampNy * 0.5;
    const edgeIntensity = ambientHL + (1 - Math.min(d, 1)) * ambientHL * 0.5;

    // Compute external spike contribution: hold at full amount, then ease
    // out over SPIKE_DECAY_MS. Resets to 0 after the envelope completes.
    let spikeContribution = 0;
    if (spikeAmount > 0) {
      const elapsed = now - spikeStartMs;
      if (elapsed < SPIKE_HOLD_MS) {
        spikeContribution = spikeAmount;
      } else if (elapsed < SPIKE_HOLD_MS + SPIKE_DECAY_MS) {
        const t = (elapsed - SPIKE_HOLD_MS) / SPIKE_DECAY_MS;
        // Ease-out cubic
        spikeContribution = spikeAmount * Math.pow(1 - t, 3);
      } else {
        spikeAmount = 0;
      }
    }
    const fillOpacity = (baseOpacity + glassPressure + spikeContribution).toFixed(3);
    const fillHsla = isDark
      ? `hsla(${hue}, 20%, 55%, ${fillOpacity})`
      : `hsla(${hue}, 40%, 28%, ${fillOpacity})`;
    const cursorRadius = (h * 1.1).toFixed(1);
    const cursorWhiteMul = isDark ? 1 : 0.35;
    const clInner = (clIntensity * cursorWhiteMul).toFixed(3);
    const clOuter = (clIntensity * 0.1 * cursorWhiteMul).toFixed(3);
    pill.style.background = `radial-gradient(circle ${cursorRadius}px at ${hlPctX}% ${hlPctY}%, rgba(255,255,255,${clInner}), rgba(255,255,255,${clOuter}) 55%, transparent 100%), ${fillHsla}`;

    const specularMul = isDark ? 1 : 0.30;
    const specularAlpha = (edgeIntensity * specularMul).toFixed(3);
    const topSheen = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.32)";
    const bottomInsetAlpha = isDark ? 0.06 : 0.05;
    const parts = [
      `inset ${shadowX.toFixed(2)}px ${shadowY.toFixed(2)}px 0 0 rgba(255,255,255,${specularAlpha})`,
      `inset 0 1px 0 0 ${topSheen}`,
      `inset 0 -0.5px 0 0 rgba(0,0,0,${bottomInsetAlpha})`,
    ];
    if (!isDark) {
      parts.push("inset 0 0 0 1px rgba(0,0,0,0.04)");
      parts.push(`0 6px 16px hsla(${hue}, 40%, 25%, 0.10)`);
    }
    pill.style.boxShadow = parts.join(", ");

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

    if (currentCard) {
      const pillCenterY = springs.y.value + h / 2;
      const targetCenterY = state.baseY + state.baseH / 2;
      if (Math.abs(pillCenterY - targetCenterY) < state.baseH * 0.5) {
        setActiveText(currentCard);
      }
    }

    const tx = springs.x.value - (w * (sx - 1)) / 2 + leanX;
    const ty = springs.y.value - (h * (sy - 1)) / 2 + leanY;

    // Shake: small random translate jitter on a bell-curve envelope
    // (sin(πt)). Ramps up as the cracks begin, peaks midway through the
    // crack-draw, tapers to 0 as the cracks settle — so the pill *only*
    // shakes while it's actively cracking, never after.
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (shakeDurationMs > 0) {
      const elapsed = now - shakeStartMs;
      const t = elapsed / shakeDurationMs;
      if (t >= 1) {
        shakeDurationMs = 0;
      } else {
        const amp = Math.sin(t * Math.PI) * shakeMaxPx;
        shakeOffsetX = (Math.random() - 0.5) * 2 * amp;
        shakeOffsetY = (Math.random() - 0.5) * 2 * amp;
      }
    }

    const es = Math.max(0.01, entranceScale);
    pill.style.transform = `translate(${tx + shakeOffsetX}px, ${ty + shakeOffsetY}px) rotate(${rotateDeg}deg) scale(${sx * es}, ${sy * es})`;

    const roundedW = Math.round(w);
    const roundedH = Math.round(h);
    if (roundedW !== lastPillW) { pill.style.width = `${roundedW}px`; lastPillW = roundedW; }
    if (roundedH !== lastPillH) { pill.style.height = `${roundedH}px`; lastPillH = roundedH; }

    const leanRamping = leanedCard && mouseActive && leanIntensity < 1;

    if (!settled || leanRamping) {
      rafId = requestAnimationFrame(loop);
    }
  }

  const CARD_PROXIMITY_MARGIN = 8;
  function isCursorNearAnyCard(clientX: number, clientY: number): boolean {
    const cards = container.querySelectorAll<HTMLElement>("[data-link-card]");
    const m = CARD_PROXIMITY_MARGIN;
    for (const card of cards) {
      const r = card.getBoundingClientRect();
      if (
        clientX >= r.left - m &&
        clientX <= r.right + m &&
        clientY >= r.top - m &&
        clientY <= r.bottom + m
      ) {
        return true;
      }
    }
    return false;
  }

  function handleMouseOver(e: MouseEvent) {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-link-card]");
    if (!card) {
      if (currentCard && !isCursorNearAnyCard(e.clientX, e.clientY)) {
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
      setActiveText(card);
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
  applyMode(configRef.current.mode);
  container.addEventListener("mouseover", handleMouseOver);
  container.addEventListener("mouseleave", handleMouseLeave);
  container.addEventListener("mousemove", handleMouseMove, { passive: true });

  return {
    cleanup: () => {
      releaseCardLean();
      setActiveText(null);
      stopLoop();
      container.removeEventListener("mouseover", handleMouseOver);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("mousemove", handleMouseMove);
      pill?.remove();
      if (clearTimer) clearTimeout(clearTimer);
    },
    redraw: () => {
      applyMode(configRef.current.mode);
      if (currentCard && pill) {
        state.lastTime = 0;
        startLoop();
      }
    },
    spikePressure: (amount: number) => {
      // Layered on top of the spring's smoothed pressure, with its own
      // hold-and-decay envelope so it's clearly visible (~500ms total).
      spikeAmount = amount;
      spikeStartMs = performance.now();
      if (currentCard && pill) {
        state.lastTime = 0;
        startLoop();
      }
    },
    setPillVisible: (visible: boolean) => {
      pillSuppressed = !visible;
      if (!pill) return;
      if (!visible) {
        // Instant hide — no transition. The shards take over the moment.
        pill.style.transition = "none";
        pill.style.opacity = "0";
      } else {
        // Restore — fade back in gently so it doesn't pop.
        pill.style.transition = `opacity ${STATIC.fadeDuration}ms ease`;
        pill.style.opacity = currentCard ? "1" : "0";
      }
    },
    getPillRect: () => {
      if (!pill || pillSuppressed) return null;
      return pill.getBoundingClientRect();
    },
    shakeFor: (durationMs: number, maxPx?: number) => {
      shakeStartMs = performance.now();
      shakeDurationMs = durationMs;
      shakeMaxPx = maxPx ?? SHAKE_DEFAULT_MAX_PX;
      if (currentCard && pill) {
        state.lastTime = 0;
        startLoop();
      }
    },
    cancelShake: () => {
      shakeDurationMs = 0;
    },
  };
}
