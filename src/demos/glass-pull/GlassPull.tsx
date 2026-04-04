import { useRef, useEffect } from "react";
import { bg, demoPalettes, text } from "../../palette";

/**
 * Glass Pull — ported directly from the portfolio's useGlassHighlight hook.
 * Imperative single-RAF-loop approach with gravitational edge pull,
 * volume-preserving stretch/squash, and Web Animations API deformation.
 */

const ITEMS = [
  "Design Systems",
  "Motion Design",
  "Interaction",
  "Prototyping",
  "Visual Design",
  "User Research",
];

const BG_COLOR = bg(demoPalettes["glass-pull"]);

// Glass config (matching portfolio defaults)
const CONFIG = {
  fillSaturation: 0.10,
  fillBrightness: 0.45,
  fillOpacity: 0.05,
  surfaceBlur: 1.0,
  innerGlow: 0.80,
  borderWidth: 0.10,
  borderRadius: 16,
  fadeDuration: 200,
  stretchAmount: 0.05,
  squashAmount: 0.003,
  recoveryDuration: 150,
  pullStrength: 0.25,
  edgeZone: 0.20,
  lerpSpeed: 0.15,
};

function setupGlassHighlight(container: HTMLElement): () => void {
  let pill: HTMLDivElement | null = null;
  let currentCard: HTMLElement | null = null;
  let isVisible = false;
  let rafId: number | null = null;
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  const hue = 260; // violet

  const state = {
    currentX: 0, currentY: 0, currentW: 0, currentH: 0,
    targetX: 0, targetY: 0, targetW: 0, targetH: 0,
    baseX: 0, baseY: 0, baseW: 0, baseH: 0,
    mouseX: 0, mouseY: 0,
  };

  // Create pill
  function createPill(): HTMLDivElement {
    const div = document.createElement("div");
    div.setAttribute("aria-hidden", "true");

    // Original glass recipe: radial highlight + 6 directional shadows
    const fill = `hsla(${hue}, ${CONFIG.fillSaturation * 100}%, ${CONFIG.fillBrightness * 100}%, ${CONFIG.fillOpacity})`;
    const intensity = 0.15 + CONFIG.fillBrightness * 0.1;
    const highlight = `radial-gradient(ellipse 150% 120% at 50% 10%, rgba(255,255,255,${intensity}), rgba(255,255,255,${intensity * 0.4}) 50%, rgba(255,255,255,${intensity * 0.1}) 85%, transparent 120%)`;

    const topHL = CONFIG.innerGlow * 0.4;
    const botSH = CONFIG.innerGlow * 0.15;
    const bi = 0.12 + CONFIG.fillBrightness * 0.15;
    const bw = CONFIG.borderWidth;
    const boxShadow = [
      `inset 0 1px 0 0 rgba(255,255,255,${topHL})`,
      `inset 0 -1px 0 0 rgba(0,0,0,${botSH})`,
      `inset 0 ${bw}px 0 0 rgba(255,255,255,${bi * 1.2})`,
      `inset ${bw}px 0 0 0 rgba(255,255,255,${bi})`,
      `inset -${bw}px 0 0 0 rgba(255,255,255,${bi})`,
      `inset 0 -${bw}px 0 0 rgba(255,255,255,${bi * 0.8})`,
    ].join(", ");

    Object.assign(div.style, {
      position: "absolute",
      pointerEvents: "none",
      zIndex: "10",
      opacity: "0",
      willChange: "transform, opacity",
      contain: "layout style",
      top: "0",
      left: "0",
      borderRadius: `${CONFIG.borderRadius}px`,
      background: `${highlight}, ${fill}`,
      backdropFilter: `blur(${CONFIG.surfaceBlur}px) saturate(1.2)`,
      WebkitBackdropFilter: `blur(${CONFIG.surfaceBlur}px) saturate(1.2)`,
      boxShadow,
      border: `${bw}px solid hsla(${hue}, 20%, 50%, 0.2)`,
      transition: `opacity ${CONFIG.fadeDuration}ms ease`,
    });

    container.insertBefore(div, container.firstChild);
    return div;
  }

  function getCardPosition(card: HTMLElement) {
    const cardRect = card.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      x: cardRect.left - containerRect.left + container.scrollLeft,
      y: cardRect.top - containerRect.top + container.scrollTop,
      w: cardRect.width,
      h: cardRect.height,
    };
  }

  function fadeIn() {
    if (!pill) return;
    isVisible = true;
    pill.style.transition = `opacity ${CONFIG.fadeDuration}ms ease`;
    pill.style.opacity = "1";
  }

  function fadeOut() {
    if (!pill) return;
    isVisible = false;
    pill.style.transition = `opacity ${CONFIG.fadeDuration}ms ease`;
    pill.style.opacity = "0";
  }

  function applyStretchSquash(dx: number, dy: number, distance: number) {
    if (!pill || distance <= 5) return;
    const f = Math.min(distance / 150, 1);
    const hr = Math.abs(dx) / distance;
    const vr = Math.abs(dy) / distance;
    const peakSx = (1 + CONFIG.stretchAmount * f * hr) * (1 - CONFIG.squashAmount * f * vr);
    const peakSy = (1 + CONFIG.stretchAmount * f * vr) * (1 - CONFIG.squashAmount * f * hr);

    pill.animate(
      [
        { transform: "scale(1, 1)", offset: 0 },
        { transform: `scale(${peakSx}, ${peakSy})`, offset: 0.3 },
        { transform: "scale(1, 1)", offset: 1.0 },
      ],
      {
        duration: 350,
        easing: "ease-out",
        fill: "none" as FillMode,
        composite: "add",
      }
    );
  }

  function computePullTargets() {
    if (!currentCard) return;

    let newX = state.baseX;
    let newY = state.baseY;
    let newW = state.baseW;
    let newH = state.baseH;

    const cardRect = currentCard.getBoundingClientRect();
    const relY = (state.mouseY - cardRect.top) / cardRect.height;
    const ez = CONFIG.edgeZone;
    let pullAmount = 0;

    if (relY < ez) {
      pullAmount = -Math.pow(Math.max(0, Math.min(1, 1 - relY / ez)), 1.5);
    } else if (relY > 1 - ez) {
      pullAmount = Math.pow(Math.max(0, Math.min(1, (relY - (1 - ez)) / ez)), 1.5);
    }

    if (pullAmount !== 0) {
      const ps = CONFIG.pullStrength;
      const dim = state.baseH;
      const maxStretch = dim * 0.25 * ps;
      const maxMove = dim * 0.15 * ps;
      const stretchPx = Math.abs(pullAmount) * maxStretch;
      const movePx = pullAmount * maxMove;

      newH = state.baseH + stretchPx;
      newW = state.baseW * (state.baseH / newH); // volume preservation
      newX = state.baseX + (state.baseW - newW) / 2;
      newY = state.baseY + movePx;
      if (pullAmount < 0) newY -= stretchPx;
    }

    state.targetX = newX;
    state.targetY = newY;
    state.targetW = newW;
    state.targetH = newH;
  }

  // Single RAF loop
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

  function loop() {
    rafId = null;
    if (!currentCard || !pill) return;

    const lr = CONFIG.lerpSpeed;
    computePullTargets();

    state.currentX += (state.targetX - state.currentX) * lr;
    state.currentY += (state.targetY - state.currentY) * lr;
    state.currentW += (state.targetW - state.currentW) * lr;
    state.currentH += (state.targetH - state.currentH) * lr;

    const threshold = 0.3;
    const settled =
      Math.abs(state.currentX - state.targetX) < threshold &&
      Math.abs(state.currentY - state.targetY) < threshold &&
      Math.abs(state.currentW - state.targetW) < threshold &&
      Math.abs(state.currentH - state.targetH) < threshold;

    if (settled) {
      state.currentX = state.targetX;
      state.currentY = state.targetY;
      state.currentW = state.targetW;
      state.currentH = state.targetH;
    }

    pill.style.transform = `translate(${state.currentX}px, ${state.currentY}px)`;
    pill.style.width = `${state.currentW}px`;
    pill.style.height = `${state.currentH}px`;

    if (!settled) {
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
    const pos = getCardPosition(card);

    if (!prevCard) {
      state.baseX = state.currentX = state.targetX = pos.x;
      state.baseY = state.currentY = state.targetY = pos.y;
      state.baseW = state.currentW = state.targetW = pos.w;
      state.baseH = state.currentH = state.targetH = pos.h;

      pill!.style.transition = "none";
      pill!.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      pill!.style.width = `${pos.w}px`;
      pill!.style.height = `${pos.h}px`;
      void pill!.offsetHeight;

      fadeIn();
    } else {
      const dx = pos.x - state.baseX;
      const dy = pos.y - state.baseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      state.baseX = pos.x;
      state.baseY = pos.y;
      state.baseW = pos.w;
      state.baseH = pos.h;
      state.targetX = pos.x;
      state.targetY = pos.y;
      state.targetW = pos.w;
      state.targetH = pos.h;

      applyStretchSquash(dx, dy, distance);
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
    currentCard = null;
    fadeOut();
    stopLoop();
  }

  function handleMouseMove(e: MouseEvent) {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    if (currentCard && rafId === null) {
      startLoop();
    }
  }

  // Init
  pill = createPill();
  container.addEventListener("mouseover", handleMouseOver);
  container.addEventListener("mouseleave", handleMouseLeave);
  container.addEventListener("mousemove", handleMouseMove, { passive: true });

  return () => {
    stopLoop();
    container.removeEventListener("mouseover", handleMouseOver);
    container.removeEventListener("mouseleave", handleMouseLeave);
    container.removeEventListener("mousemove", handleMouseMove);
    pill?.remove();
    if (clearTimer) clearTimeout(clearTimer);
  };
}

export function GlassPull() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return setupGlassHighlight(container);
  }, []);

  return (
    <div className="demo-page" style={{ background: BG_COLOR }}>
      <style>{`
        .glass-list {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .glass-item {
          padding: 14px 24px;
          font-size: 15px;
          color: ${text.dark.tertiary};
          cursor: default;
          position: relative;
          z-index: 1;
          transition: color 0.15s;
          user-select: none;
        }
        .glass-item:hover {
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
    </div>
  );
}
