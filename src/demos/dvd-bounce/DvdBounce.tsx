import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bg, demoPalettes } from "../../palette";

const BG = bg(demoPalettes["dvd-bounce"]);

const DVD_COLORS = [
  "#e24a4a", "#4a9ee2", "#e2c84a", "#4ae270",
  "#c84ae2", "#e2824a", "#4ae2d4",
];

const BASE_LOGO_W = 180;
const BASE_LOGO_H = 80; // matches the real DVD logo's ~2.27:1 aspect ratio
const GROWTH_PER_CORNER = 0.08; // 8% bigger each corner hit

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string;
  size: number; rotation: number; rotationSpeed: number;
  shape: "circle" | "rect"; // confetti pieces
}

interface Config {
  speed: number;
  elasticity: number;
  cornerRate: number;
  mouseForce: number;
  mouseRadius: number;
}

const DEFAULT_CONFIG: Config = {
  speed: 2.2,
  elasticity: 0.6,
  cornerRate: 0.05,
  mouseForce: 0.15,
  mouseRadius: 200,
};

const SLIDER_DEFS: {
  key: keyof Config; label: string; min: number; max: number; step: number;
  display?: (v: number) => string;
}[] = [
  { key: "speed", label: "Speed", min: 0.5, max: 6, step: 0.1 },
  { key: "elasticity", label: "Elasticity", min: 0, max: 1, step: 0.01 },
  { key: "cornerRate", label: "Corner %", min: 0, max: 1, step: 0.01, display: (v) => `${Math.round(v * 100)}%` },
  { key: "mouseForce", label: "Attraction", min: 0, max: 0.5, step: 0.01 },
  { key: "mouseRadius", label: "Reach", min: 50, max: 500, step: 10, display: (v) => `${v}px` },
];

interface DeformSpring {
  value: number;
  velocity: number;
}

function stepSpring(s: DeformSpring, target: number, stiffness: number, damping: number): void {
  const force = -stiffness * (s.value - target);
  const drag = -damping * s.velocity;
  s.velocity += (force + drag) / 60;
  s.value += s.velocity / 60;
}

export function DvdBounce() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const tintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [liveColor, setLiveColor] = useState(DVD_COLORS[0]);
  const [liveCorners, setLiveCorners] = useState(0);
  const [liveBounces, setLiveBounces] = useState(0);
  const [cornerKey, setCornerKey] = useState(0);
  const configRef = useRef(config);
  configRef.current = config;

  const stateRef = useRef({
    x: 80, y: 60,
    vx: DEFAULT_CONFIG.speed, vy: DEFAULT_CONFIG.speed,
    colorIndex: 0,
    deformX: { value: 1, velocity: 0 } as DeformSpring,
    deformY: { value: 1, velocity: 0 } as DeformSpring,
    particles: [] as Particle[],
    celebrating: false, celebrateTimer: 0,
    mouseX: -1000, mouseY: -1000, mouseActive: false,
    bounceCount: 0, cornerCount: 0,
    bounceSinceNudge: 0,
    cornerQueued: false,
    growthScale: 1,
  });

  // Load the real DVD SVG logo
  useEffect(() => {
    const img = new Image();
    img.src = "/dvd-logo.svg";
    img.onload = () => { logoImgRef.current = img; };
    // Offscreen canvas for color tinting
    tintCanvasRef.current = document.createElement("canvas");
  }, []);

  const resetSize = useCallback(() => {
    stateRef.current.growthScale = 1;
  }, []);

  // Draw the SVG logo tinted to `color` with squash/stretch
  const drawDvdLogo = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
     color: string, scaleX: number, scaleY: number) => {
      const img = logoImgRef.current;
      const tintCanvas = tintCanvasRef.current;
      if (!img || !tintCanvas) return;

      // Size the tint canvas to match the logo draw size (with some padding for glow)
      const drawW = Math.ceil(w + 4);
      const drawH = Math.ceil(h + 4);
      tintCanvas.width = drawW;
      tintCanvas.height = drawH;
      const tc = tintCanvas.getContext("2d")!;

      // Draw the SVG (black on transparent)
      tc.clearRect(0, 0, drawW, drawH);
      tc.drawImage(img, 2, 2, w, h);

      // Tint: fill color using source-in composite (only fills where the SVG has alpha)
      tc.globalCompositeOperation = "source-in";
      tc.fillStyle = color;
      tc.fillRect(0, 0, drawW, drawH);
      tc.globalCompositeOperation = "source-over";

      // Draw to main canvas with squash/stretch
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(scaleX, scaleY);

      // Glow behind the logo
      ctx.shadowColor = color;
      ctx.shadowBlur = 25;
      ctx.globalAlpha = 0.3;
      ctx.drawImage(tintCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.shadowBlur = 0;

      // Crisp logo on top
      ctx.globalAlpha = 1;
      ctx.drawImage(tintCanvas, -drawW / 2, -drawH / 2, drawW, drawH);

      ctx.restore();
    }, [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let frameCount = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      stateRef.current.mouseX = e.clientX;
      stateRef.current.mouseY = e.clientY;
      stateRef.current.mouseActive = true;
    };
    const onMouseLeave = () => { stateRef.current.mouseActive = false; };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // Confetti burst from the logo center on corner hit
    const spawnConfetti = (cx: number, cy: number) => {
      const s = stateRef.current;
      // Small fast particles
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        s.particles.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2, // slight upward bias
          life: 1,
          maxLife: 50 + Math.random() * 50,
          color: DVD_COLORS[Math.floor(Math.random() * DVD_COLORS.length)],
          size: 3 + Math.random() * 5,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          shape: Math.random() > 0.4 ? "rect" : "circle",
        });
      }
      // Larger slow sparkles
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 * i) / 16;
        const speed = 1.5 + Math.random() * 3;
        s.particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 70 + Math.random() * 40,
          color: DVD_COLORS[s.colorIndex],
          size: 8 + Math.random() * 8,
          rotation: 0,
          rotationSpeed: 0,
          shape: "circle",
        });
      }
    };

    const aimAtCorner = (s: typeof stateRef.current) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const logoW = BASE_LOGO_W * s.growthScale;
      const logoH = BASE_LOGO_H * s.growthScale;
      const travelW = W - logoW;
      const travelH = H - logoH;
      if (travelW <= 0 || travelH <= 0) return;

      const distToEdgeX = s.vx > 0 ? travelW - s.x : s.x;
      const distToEdgeY = s.vy > 0 ? travelH - s.y : s.y;
      const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy);

      const currentRatio = Math.abs(s.vy / s.vx);
      let bestRatio = currentRatio;
      let bestDiff = Infinity;

      for (let n = 1; n <= 8; n++) {
        const totalX = distToEdgeX + n * travelW;
        for (let m = 1; m <= 8; m++) {
          const totalY = distToEdgeY + m * travelH;
          const ratio = totalY / totalX;
          const diff = Math.abs(ratio - currentRatio);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestRatio = ratio;
          }
        }
      }

      const newVx = spd / Math.sqrt(1 + bestRatio * bestRatio);
      const newVy = newVx * bestRatio;
      s.vx = Math.sign(s.vx) * newVx;
      s.vy = Math.sign(s.vy) * newVy;
      s.cornerQueued = true;
    };

    const frame = () => {
      const s = stateRef.current;
      const c = configRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      frameCount++;

      const logoW = BASE_LOGO_W * s.growthScale;
      const logoH = BASE_LOGO_H * s.growthScale;

      if (frameCount % 10 === 0) {
        setLiveColor(DVD_COLORS[s.colorIndex]);
        setLiveBounces(s.bounceCount);
        setLiveCorners(s.cornerCount);
      }

      // Mouse influence
      if (s.mouseActive) {
        const logoCX = s.x + logoW / 2;
        const logoCY = s.y + logoH / 2;
        const dx = s.mouseX - logoCX;
        const dy = s.mouseY - logoCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < c.mouseRadius && dist > 1) {
          const force = (1 - dist / c.mouseRadius) * c.mouseForce;
          s.vx += (dx / dist) * force;
          s.vy += (dy / dist) * force;
          const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
          const maxSpeed = c.speed * 3;
          if (speed > maxSpeed) {
            s.vx = (s.vx / speed) * maxSpeed;
            s.vy = (s.vy / speed) * maxSpeed;
          }
          if (s.cornerQueued) s.cornerQueued = false;
        }
      }

      // Restore to base speed — scale both axes uniformly to preserve direction ratio
      // (critical when cornerQueued is true: ratio must stay exact)
      const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      if (speed > 0.1) {
        const targetSpeed = s.cornerQueued ? c.speed : speed + (c.speed - speed) * 0.005;
        const scale = targetSpeed / speed;
        s.vx *= scale;
        s.vy *= scale;
      }

      s.x += s.vx;
      s.y += s.vy;

      let hitX = false;
      let hitY = false;

      if (s.x <= 0) { s.x = 0; s.vx = Math.abs(s.vx); hitX = true; }
      else if (s.x + logoW >= W) { s.x = W - logoW; s.vx = -Math.abs(s.vx); hitX = true; }
      if (s.y <= 0) { s.y = 0; s.vy = Math.abs(s.vy); hitY = true; }
      else if (s.y + logoH >= H) { s.y = H - logoH; s.vy = -Math.abs(s.vy); hitY = true; }

      // Corner snap: if trajectory was aimed at a corner and we hit one wall,
      // check if we're close to the perpendicular edge and snap to it.
      // Floating-point drift means the perfect corner is almost never exact.
      const CORNER_SNAP = Math.max(8, c.speed * 3);
      if (s.cornerQueued && (hitX !== hitY)) {
        if (hitX && !hitY) {
          // We hit a vertical wall — are we near a horizontal edge?
          if (s.y < CORNER_SNAP) { s.y = 0; s.vy = Math.abs(s.vy); hitY = true; }
          else if (s.y + logoH > H - CORNER_SNAP) { s.y = H - logoH; s.vy = -Math.abs(s.vy); hitY = true; }
        } else if (hitY && !hitX) {
          // We hit a horizontal wall — are we near a vertical edge?
          if (s.x < CORNER_SNAP) { s.x = 0; s.vx = Math.abs(s.vx); hitX = true; }
          else if (s.x + logoW > W - CORNER_SNAP) { s.x = W - logoW; s.vx = -Math.abs(s.vx); hitX = true; }
        }
      }

      if (hitX || hitY) {
        s.colorIndex = (s.colorIndex + 1) % DVD_COLORS.length;
        s.bounceCount++;
        s.bounceSinceNudge++;

        const impactSpeed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const impactStrength = Math.min(1, impactSpeed / (c.speed * 2));
        const squashAmount = impactStrength * (0.3 + c.elasticity * 0.4);

        if (hitX && hitY) {
          // CORNER HIT
          s.deformX.velocity = -squashAmount * 80;
          s.deformY.velocity = -squashAmount * 80;
          s.celebrating = true;
          s.celebrateTimer = 150;
          s.cornerCount++;
          s.cornerQueued = false;
          s.bounceSinceNudge = 0;

          // Grow!
          s.growthScale += GROWTH_PER_CORNER;

          // Confetti from logo center
          spawnConfetti(s.x + logoW / 2, s.y + logoH / 2);

          // Sync React state immediately for the counter animation
          setLiveCorners(s.cornerCount);
          setLiveBounces(s.bounceCount);
          setCornerKey((k) => k + 1);
        } else {
          if (hitX) {
            s.deformX.velocity = -squashAmount * 60;
            s.deformY.velocity = squashAmount * 30;
          } else {
            s.deformY.velocity = -squashAmount * 60;
            s.deformX.velocity = squashAmount * 30;
          }

          if (c.cornerRate > 0 && !s.cornerQueued) {
            const expectedInterval = 1 / c.cornerRate;
            const p = Math.min(0.95, s.bounceSinceNudge / expectedInterval);
            if (Math.random() < p) {
              aimAtCorner(s);
              s.bounceSinceNudge = 0;
            }
          }
        }
      }

      // Spring deformation
      const stiffness = 300 + (1 - c.elasticity) * 400;
      const damping = 8 + (1 - c.elasticity) * 25;
      stepSpring(s.deformX, 1, stiffness, damping);
      stepSpring(s.deformY, 1, stiffness, damping);

      const rawX = s.deformX.value;
      const rawY = s.deformY.value;
      const area = rawX * rawY;
      const correction = area > 0.01 ? Math.sqrt(1 / area) : 1;
      const blend = 0.4;
      const finalScaleX = rawX * (1 - blend) + (rawX * correction) * blend;
      const finalScaleY = rawY * (1 - blend) + (rawY * correction) * blend;

      // Particles — with gravity and tumble
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.rotation += p.rotationSpeed;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      if (s.celebrating) {
        s.celebrateTimer--;
        if (s.celebrateTimer <= 0) s.celebrating = false;
      }

      // --- Draw ---
      ctx.clearRect(0, 0, W, H);

      // Screen flash on corner
      if (s.celebrating) {
        const flashAlpha = Math.max(0, s.celebrateTimer / 150) * 0.1;
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Particles
      for (const p of s.particles) {
        ctx.save();
        ctx.globalAlpha = p.life * 0.85;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === "rect") {
          const w = p.size * p.life;
          const h = w * 0.5;
          ctx.fillRect(-w / 2, -h / 2, w, h);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // Logo
      const color = DVD_COLORS[s.colorIndex];
      drawDvdLogo(ctx, s.x, s.y, logoW, logoH, color, finalScaleX, finalScaleY);

      // "CORNER!" text with fade
      if (s.celebrating) {
        const t = s.celebrateTimer / 150;
        const alpha = t > 0.7 ? (1 - t) / 0.3 : t > 0.2 ? 1 : t / 0.2; // fade in, hold, fade out
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = DVD_COLORS[s.colorIndex];
        ctx.font = `bold 32px "SF Mono", "Fira Code", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Float upward
        const yOffset = (1 - t) * 40;
        ctx.fillText("CORNER!", W / 2, H / 2 - 100 - yOffset);
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [drawDvdLogo]);

  const set = (key: keyof Config, val: number) =>
    setConfig((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="demo-page" style={{ background: BG, padding: 0, position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair" }}
      />

      {/* Stats bar */}
      <div style={{
        position: "fixed", bottom: 20, left: 20,
        display: "flex", gap: 20, alignItems: "baseline",
        fontFamily: "'SF Mono', monospace", fontSize: 11,
        color: "rgba(255,255,255,0.3)",
      }}>
        <span>bounces <span style={{ fontVariantNumeric: "tabular-nums" }}>{liveBounces}</span></span>
        <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.1)", display: "inline-block" }} />
        {/* Animated corner counter */}
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
          corners{" "}
          <AnimatePresence mode="popLayout">
            <motion.span
              key={cornerKey}
              initial={{ scale: 1.8, y: -4, color: liveColor }}
              animate={{ scale: 1, y: 0, color: "rgba(255,255,255,0.3)" }}
              transition={{
                scale: { type: "spring", stiffness: 400, damping: 15 },
                y: { type: "spring", stiffness: 400, damping: 15 },
                color: { duration: 1.2, ease: "easeOut" },
              }}
              style={{
                display: "inline-block", fontVariantNumeric: "tabular-nums",
                fontWeight: 600, originX: "50%", originY: "50%",
              }}
            >
              {liveCorners}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      {/* Panel toggle */}
      <motion.button
        onClick={() => setPanelOpen(!panelOpen)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        style={{
          position: "fixed", top: 20, right: 20, zIndex: 100,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "8px 14px",
          color: "rgba(255,255,255,0.5)", fontSize: 11,
          fontFamily: "'SF Mono', monospace", cursor: "pointer",
          backdropFilter: "blur(20px) saturate(1.3)",
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <motion.span
          animate={{ rotate: panelOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{ display: "inline-block", fontSize: 14, lineHeight: 1 }}
        >
          +
        </motion.span>
        Tune
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            style={{
              position: "fixed", top: 60, right: 20, zIndex: 99,
              width: 240,
              background: "rgba(12,12,12,0.75)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16, overflow: "hidden",
              backdropFilter: "blur(40px) saturate(1.4)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 0.5px 0 rgba(255,255,255,0.06)",
              fontFamily: "'SF Mono', monospace",
            }}
          >
            <motion.div
              animate={{ backgroundColor: liveColor }}
              transition={{ duration: 0.3 }}
              style={{ height: 2, width: "100%", opacity: 0.6 }}
            />

            <div style={{ padding: "16px 18px 14px" }}>
              {SLIDER_DEFS.map((def, i) => (
                <motion.div
                  key={def.key}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <PanelSlider
                    label={def.label}
                    value={config[def.key]}
                    min={def.min} max={def.max} step={def.step}
                    display={def.display}
                    accentColor={liveColor}
                    onChange={(v) => set(def.key, v)}
                  />
                </motion.div>
              ))}

              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfig(DEFAULT_CONFIG)}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8, padding: "7px 0",
                    color: "rgba(255,255,255,0.3)", fontSize: 10,
                    fontFamily: "inherit", cursor: "pointer",
                    letterSpacing: "0.03em",
                  }}
                >
                  Reset
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={resetSize}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8, padding: "7px 0",
                    color: "rgba(255,255,255,0.3)", fontSize: 10,
                    fontFamily: "inherit", cursor: "pointer",
                    letterSpacing: "0.03em",
                  }}
                >
                  Reset size
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelSlider({ label, value, min, max, step, onChange, display, accentColor }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display?: (v: number) => string;
  accentColor: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const shown = display ? display(value) : step < 0.1 ? value.toFixed(2) : step < 1 ? value.toFixed(1) : String(value);
  const [dragging, setDragging] = useState(false);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", marginBottom: 5,
        fontSize: 10, letterSpacing: "0.02em",
      }}>
        <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
        <motion.span
          animate={{ color: dragging ? accentColor : "rgba(255,255,255,0.25)" }}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {shown}
        </motion.span>
      </div>
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 2, borderRadius: 1,
          background: "rgba(255,255,255,0.06)",
        }} />
        <motion.div
          animate={{ backgroundColor: dragging ? accentColor : "rgba(255,255,255,0.15)" }}
          transition={{ duration: 0.2 }}
          style={{
            position: "absolute", left: 0, width: `${pct}%`, height: 2, borderRadius: 1,
          }}
        />
        <motion.div
          animate={{
            scale: dragging ? 1.4 : 1,
            backgroundColor: dragging ? accentColor : "#fff",
            boxShadow: dragging
              ? `0 0 8px ${accentColor}44, 0 1px 3px rgba(0,0,0,0.4)`
              : "0 1px 3px rgba(0,0,0,0.3)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            position: "absolute", left: `${pct}%`, transform: "translateX(-50%)",
            width: 8, height: 8, borderRadius: 4,
            pointerEvents: "none",
          }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute", left: -4, right: -4, width: "calc(100% + 8px)", height: 20,
            opacity: 0, cursor: "pointer", margin: 0,
          }}
        />
      </div>
    </div>
  );
}
