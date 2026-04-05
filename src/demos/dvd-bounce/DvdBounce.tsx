import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bg, demoPalettes } from "../../palette";
import { generateExportHtml } from "./export-template";
import {
  DevPanel,
  DevSlider,
  DevToggle,
  DevButton,
  DevDivider,
  DEV_PANEL_GAP,
} from "../../components/DevPanel";

const BG = bg(demoPalettes["dvd-bounce"]);

const DVD_COLORS = [
  "#e24a4a", "#4a9ee2", "#e2c84a", "#4ae270",
  "#c84ae2", "#e2824a", "#4ae2d4",
];

const BASE_LOGO_W = 180;
const BASE_LOGO_H = 80; // matches the real DVD logo's ~2.27:1 aspect ratio
const GROWTH_FACTOR = 1.2; // 20% bigger from current size each corner hit
const MAX_GROWTH_HITS = 6; // reset to base size after this many growth steps

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string;
  size: number; rotation: number; rotationSpeed: number;
  shape: "circle" | "rect"; // confetti pieces
}

interface Config {
  speed: number;
  size: number;
  elasticity: number;
  deform: number;
  shake: number;
  trail: number;
  cornerSeek: number;
  mouseGravity: number;
}

const DEFAULT_CONFIG: Config = {
  speed: 2,
  size: 1,
  elasticity: 0,
  deform: 0,
  shake: 0,
  trail: 0,
  cornerSeek: 0,
  mouseGravity: 0,
};

const SLIDER_DEFS: {
  key: keyof Config; label: string; min: number; max: number; step: number;
  display?: (v: number) => string;
}[] = [
  { key: "speed", label: "Speed", min: 0.5, max: 6, step: 0.1 },
  { key: "size", label: "Size", min: 0.3, max: 2.5, step: 0.1, display: (v) => `${v.toFixed(1)}x` },
  { key: "elasticity", label: "Elasticity", min: 0, max: 0.85, step: 0.01 },
  { key: "deform", label: "Deform", min: 0, max: 0.75, step: 0.01 },
  { key: "shake", label: "Shake", min: 0, max: 1, step: 0.01 },
  { key: "trail", label: "Trail", min: 0, max: 1, step: 0.01 },
  { key: "cornerSeek", label: "Corner seek", min: 0, max: 1, step: 0.01, display: (v) => `${Math.round(v * 100)}%` },
  { key: "mouseGravity", label: "Mouse gravity", min: 0, max: 1, step: 0.01 },
];

function relativeLuminance(hex: string): number {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return 0;
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

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

// ---------------------------------------------------------------------------
// CornerFlyText — "CORNER!" thrown from hit location into the counter
// Uses real projectile physics: parabolic arc, spin, shrink on arrival.
// ---------------------------------------------------------------------------

function CornerFlyText({
  startX,
  startY,
  targetX,
  targetY,
  color,
  onComplete,
}: {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
  onComplete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const el = ref.current;
    if (!el) { onCompleteRef.current(); return; }

    const HOLD = 0.5; // seconds to display before throwing
    const THROW = 0.6; // seconds for the throw arc
    const G = 1800; // gravity px/s²

    const dx = targetX - startX;
    const dy = targetY - startY;
    const vx = dx / THROW;
    // Solve for initial vy so projectile lands at target: y = vy*t + ½g*t²
    const vy = (dy - 0.5 * G * THROW * THROW) / THROW;
    const spinDir = dx < 0 ? -1 : 1;
    const spinSpeed = spinDir * 720; // 2 full rotations

    const END_SCALE = 0.35; // ≈ 11px/32px — matches counter digit size
    let t0: number | null = null;
    let raf: number;

    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const elapsed = (ts - t0) / 1000;

      if (elapsed < HOLD) {
        // Hold phase — pop in and sit still
        const fadeIn = Math.min(1, elapsed / 0.08);
        el.style.transform = `translate(${startX}px, ${startY}px) translate(-50%, -50%) scale(1)`;
        el.style.opacity = String(fadeIn);
        raf = requestAnimationFrame(tick);
        return;
      }

      // Throw phase
      const throwElapsed = elapsed - HOLD;
      const t = Math.min(throwElapsed / THROW, 1);

      const x = startX + vx * throwElapsed;
      const y = startY + vy * throwElapsed + 0.5 * G * throwElapsed * throwElapsed;
      const scale = 1 - (1 - END_SCALE) * t * t; // holds big, shrinks late
      const rotation = spinSpeed * throwElapsed;
      const opacity = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1;

      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`;
      el.style.opacity = String(Math.max(0, opacity));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startX, startY, targetX, targetY]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        color,
        font: 'bold 32px "SF Mono", "Fira Code", monospace',
        whiteSpace: "nowrap",
        zIndex: 10,
        textShadow: `0 0 20px ${color}66`,
        opacity: 0,
      }}
    >
      CORNER!
    </div>
  );
}

export function DvdBounce() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const tintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [liveColor, setLiveColor] = useState(DVD_COLORS[0]);
  const [liveBounces, setLiveBounces] = useState(0);
  const [cornerKey, setCornerKey] = useState(0);
  const [displayedCorners, setDisplayedCorners] = useState(0);
  const [cornerFlies, setCornerFlies] = useState<
    Array<{ key: number; color: string; startX: number; startY: number; targetX: number; targetY: number }>
  >([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const cornerCounterRef = useRef<HTMLSpanElement>(null);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [logoAspect, setLogoAspect] = useState(BASE_LOGO_W / BASE_LOGO_H);
  const [showCornerText, setShowCornerText] = useState(false);
  const [showCounter, setShowCounter] = useState(true);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const [growOnCorner, setGrowOnCorner] = useState(false);
  const growOnCornerRef = useRef(true);
  growOnCornerRef.current = growOnCorner;
  const [bgColor, setBgColor] = useState("#111111");
  const bgIsLight = useMemo(() => relativeLuminance(bgColor) > 0.18, [bgColor]);
  const overlayColor = bgIsLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
  const overlayMuted = bgIsLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";
  const overlayDivider = bgIsLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";
  const [dragState, setDragState] = useState<"idle" | "accepting" | "error">("idle");
  const dragCounterRef = useRef(0);
  const [logoHasAlpha, setLogoHasAlpha] = useState(true);
  const logoHasAlphaRef = useRef(true);
  logoHasAlphaRef.current = logoHasAlpha;
  const configRef = useRef(config);
  configRef.current = config;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultSvgDataUrlRef = useRef<string | null>(null);
  const logoDimsRef = useRef({ w: BASE_LOGO_W, h: BASE_LOGO_H });
  logoDimsRef.current = { w: Math.round(BASE_LOGO_H * logoAspect), h: BASE_LOGO_H };
  const showCornerTextRef = useRef(showCornerText);
  showCornerTextRef.current = showCornerText;

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
    growthHits: 0,
    shakeX: { value: 0, velocity: 0 } as DeformSpring,
    shakeY: { value: 0, velocity: 0 } as DeformSpring,
    trailPositions: [] as { x: number; y: number }[],
  });

  // Load the real DVD SVG logo + capture as data URL for export
  useEffect(() => {
    const img = new Image();
    img.src = "/dvd-logo.svg";
    img.onload = () => { logoImgRef.current = img; };
    tintCanvasRef.current = document.createElement("canvas");
    fetch("/dvd-logo.svg")
      .then((r) => r.text())
      .then((svgText) => {
        defaultSvgDataUrlRef.current =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
      });
  }, []);

  const handleSetGrowOnCorner = useCallback((v: boolean) => {
    setGrowOnCorner(v);
    if (!v) { stateRef.current.growthScale = 1; stateRef.current.growthHits = 0; }
  }, []);

  const isSupportedFile = useCallback((file: File) => {
    return file.type.includes("svg") || file.name.endsWith(".svg") ||
           file.type === "image/png" || file.name.endsWith(".png");
  }, []);

  const checkHasAlpha = useCallback((img: HTMLImageElement): boolean => {
    const c = document.createElement("canvas");
    const w = Math.min(64, img.naturalWidth || 64);
    const h = Math.min(64, img.naturalHeight || 64);
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  }, []);

  const loadLogoFile = useCallback((file: File) => {
    if (!isSupportedFile(file)) return;
    const isSvg = file.type.includes("svg") || file.name.endsWith(".svg");
    const reader = new FileReader();
    reader.onload = () => {
      let dataUrl: string;
      if (isSvg) {
        const text = reader.result as string;
        dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
      } else {
        dataUrl = reader.result as string;
      }
      setSvgDataUrl(dataUrl);
      const img = new Image();
      img.onload = () => {
        logoImgRef.current = img;
        const hasAlpha = isSvg || checkHasAlpha(img);
        setLogoHasAlpha(hasAlpha);
        let aspect = img.naturalWidth / img.naturalHeight;
        if (isSvg && (!aspect || !isFinite(aspect))) {
          const text = reader.result as string;
          const match = text.match(/viewBox=["']([^"']+)["']/);
          if (match) {
            const parts = match[1].split(/\s+/).map(Number);
            if (parts[2] > 0 && parts[3] > 0) aspect = parts[2] / parts[3];
          }
        }
        setLogoAspect(Math.max(0.5, Math.min(10, aspect || BASE_LOGO_W / BASE_LOGO_H)));
        stateRef.current.growthScale = 1; stateRef.current.growthHits = 0;
      };
      img.src = dataUrl;
    };
    if (isSvg) reader.readAsText(file); else reader.readAsDataURL(file);
  }, [isSupportedFile, checkHasAlpha]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadLogoFile(file);
    e.target.value = "";
  }, [loadLogoFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    const items = e.dataTransfer.items;
    if (items.length > 0) {
      const type = items[0].type;
      const ok = type.includes("svg") || type === "image/png";
      setDragState(ok ? "accepting" : "error");
    } else {
      setDragState("accepting");
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragState("idle");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragState("idle");
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (isSupportedFile(file)) {
      loadLogoFile(file);
    } else {
      setDragState("error");
      setTimeout(() => setDragState("idle"), 1500);
    }
  }, [isSupportedFile, loadLogoFile]);

  const resetLogo = useCallback(() => {
    setSvgDataUrl(null);
    setLogoHasAlpha(true);
    setLogoAspect(BASE_LOGO_W / BASE_LOGO_H);
    const img = new Image();
    img.src = "/dvd-logo.svg";
    img.onload = () => { logoImgRef.current = img; };
    stateRef.current.growthScale = 1; stateRef.current.growthHits = 0;
  }, []);

  const handleExport = useCallback(() => {
    const dataUrl = svgDataUrl ?? defaultSvgDataUrlRef.current;
    if (!dataUrl) return;
    const html = generateExportHtml({
      svgDataUrl: dataUrl,
      config: {
        speed: configRef.current.speed,
        size: configRef.current.size,
        elasticity: configRef.current.elasticity,
        deform: configRef.current.deform,
        shake: configRef.current.shake,
        trail: configRef.current.trail,
        cornerSeek: configRef.current.cornerSeek,
      },
      aspectRatio: logoAspect,
      showCornerText,
      showCounter,
      bgColor,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loading-screen.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [svgDataUrl, logoAspect, showCornerText, showCounter, bgColor]);

  // Draw the logo tinted to `color` with squash/stretch
  const drawDvdLogo = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
     color: string, scaleX: number, scaleY: number) => {
      const img = logoImgRef.current;
      const tintCanvas = tintCanvasRef.current;
      if (!img || !tintCanvas) return;
      const hasAlpha = logoHasAlphaRef.current;

      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(scaleX, scaleY);

      if (hasAlpha) {
        // Tint: fill color using source-in composite (only fills where image has alpha)
        const drawW = Math.ceil(w + 4);
        const drawH = Math.ceil(h + 4);
        tintCanvas.width = drawW;
        tintCanvas.height = drawH;
        const tc = tintCanvas.getContext("2d")!;
        tc.clearRect(0, 0, drawW, drawH);
        tc.drawImage(img, 2, 2, w, h);
        tc.globalCompositeOperation = "source-in";
        tc.fillStyle = color;
        tc.fillRect(0, 0, drawW, drawH);
        tc.globalCompositeOperation = "source-over";

        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(tintCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.drawImage(tintCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        // Opaque image — draw original with no tinting
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }

      ctx.restore();
    }, [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let frameCount = 0;

    const container = canvas.parentElement!;
    let containerW = 0;
    let containerH = 0;

    // Check container size at the start of each frame so resize + redraw
    // are atomic — avoids flash when the sidebar animates open/closed.
    const syncSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === containerW && h === containerH) return;
      containerW = w;
      containerH = h;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();

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

    const frame = () => {
      syncSize();
      const s = stateRef.current;
      const c = configRef.current;
      const W = containerW;
      const H = containerH;
      frameCount++;

      const logoW = logoDimsRef.current.w * c.size * s.growthScale;
      const logoH = logoDimsRef.current.h * c.size * s.growthScale;

      if (!pausedRef.current) {
      // --- Simulation (skipped when paused) ---

      if (frameCount % 10 === 0) {
        setLiveColor(DVD_COLORS[s.colorIndex]);
        setLiveBounces(s.bounceCount);
      }

      // Mouse influence — derive force & radius from single gravity knob
      if (s.mouseActive && c.mouseGravity > 0) {
        const mouseForce = c.mouseGravity * 0.5;
        const mouseRadius = 100 + c.mouseGravity * 400;
        const logoCX = s.x + logoW / 2;
        const logoCY = s.y + logoH / 2;
        const dx = s.mouseX - logoCX;
        const dy = s.mouseY - logoCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius && dist > 1) {
          const force = (1 - dist / mouseRadius) * mouseForce;
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

      // Curved path steering toward corner
      if (s.cornerQueued) {
        const targetX = s.vx > 0 ? W - logoW : 0;
        const targetY = s.vy > 0 ? H - logoH : 0;
        const dx = targetX - s.x;
        const dy = targetY - s.y;
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(s.vy, s.vx);
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        // Constant-rate turn with proportional fine-tuning near target
        const maxSteer = 0.02;
        const steer = Math.sign(angleDiff) * Math.min(maxSteer, Math.abs(angleDiff) * 0.25);
        const cos = Math.cos(steer);
        const sin = Math.sin(steer);
        const newVx = s.vx * cos - s.vy * sin;
        const newVy = s.vx * sin + s.vy * cos;
        s.vx = newVx;
        s.vy = newVy;
      }

      // Restore to base speed
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

      // No corner snap — near-misses stay as near-misses (adds suspense)

      if (hitX || hitY) {
        s.colorIndex = (s.colorIndex + 1) % DVD_COLORS.length;
        s.bounceCount++;
        s.bounceSinceNudge++;

        const impactSpeed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const impactStrength = Math.min(1, impactSpeed / (c.speed * 2));
        const squashAmount = impactStrength * (0.3 + c.elasticity * 0.4);
        const deformScale = c.deform * 2;

        if (hitX && hitY) {
          // CORNER HIT
          s.deformX.velocity = -squashAmount * 80 * deformScale;
          s.deformY.velocity = -squashAmount * 80 * deformScale;
          s.celebrating = true;
          s.celebrateTimer = 150;
          s.cornerCount++;
          s.cornerQueued = false;
          s.bounceSinceNudge = 0;

          // Grow on corner hit (if enabled) — reset after MAX_GROWTH_HITS
          if (growOnCornerRef.current) {
            s.growthHits = (s.growthHits || 0) + 1;
            if (s.growthHits > MAX_GROWTH_HITS) {
              s.growthScale = 1;
              s.growthHits = 0;
            } else {
              s.growthScale *= GROWTH_FACTOR;
            }
          }

          // Confetti from logo center (cap particles to prevent overload)
          if (showCornerTextRef.current && s.particles.length < 300) {
            spawnConfetti(s.x + logoW / 2, s.y + logoH / 2);
          }

          // Screen shake
          if (c.shake > 0) {
            const shakeStr = c.shake * 25;
            s.shakeX.velocity += (Math.random() * 2 - 1) * shakeStr;
            s.shakeY.velocity += (Math.random() * 2 - 1) * shakeStr;
          }

          // Queue fly animation or increment counter immediately
          setLiveBounces(s.bounceCount);
          if (showCornerTextRef.current) {
            const contentEl = contentRef.current;
            const counterEl = cornerCounterRef.current;
            let targetX = 100;
            let targetY = H - 28;
            if (contentEl && counterEl) {
              const cRect = contentEl.getBoundingClientRect();
              const tRect = counterEl.getBoundingClientRect();
              targetX = tRect.left - cRect.left + tRect.width / 2;
              targetY = tRect.top - cRect.top + tRect.height / 2;
            }
            setCornerFlies((prev) => [
              ...prev,
              {
                key: Date.now(),
                color: DVD_COLORS[s.colorIndex],
                startX: s.x + logoW / 2,
                startY: s.y + logoH / 2,
                targetX,
                targetY,
              },
            ]);
          } else {
            setDisplayedCorners(s.cornerCount);
            setCornerKey((k) => k + 1);
          }
        } else {
          if (hitX) {
            s.deformX.velocity = -squashAmount * 60 * deformScale;
            s.deformY.velocity = squashAmount * 30 * deformScale;
          } else {
            s.deformY.velocity = -squashAmount * 60 * deformScale;
            s.deformX.velocity = squashAmount * 30 * deformScale;
          }

          if (c.cornerSeek > 0 && !s.cornerQueued) {
            if (Math.random() < c.cornerSeek) {
              s.cornerQueued = true;
              s.bounceSinceNudge = 0;
            }
          }
        }
      }

      // Trail recording — every frame for smooth fade
      const maxTrail = Math.round(c.trail * 40);
      if (maxTrail > 0) {
        s.trailPositions.push({ x: s.x, y: s.y });
        while (s.trailPositions.length > maxTrail) s.trailPositions.shift();
      } else {
        s.trailPositions.length = 0;
      }

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

      } // end simulation (paused check)

      // Spring deformation (always run so draw has valid values)
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

      // Shake springs
      stepSpring(s.shakeX, 0, 600, 30);
      stepSpring(s.shakeY, 0, 600, 30);

      // Drain trail when paused (motion trail fades without motion)
      if (pausedRef.current && s.trailPositions.length > 0) {
        s.trailPositions.shift();
      }

      // --- Draw ---
      ctx.clearRect(0, 0, W, H);
      const color = DVD_COLORS[s.colorIndex];

      // Screen shake transform
      ctx.save();
      ctx.translate(s.shakeX.value, s.shakeY.value);

      // Screen flash on corner (subtle to avoid strobing)
      if (s.celebrating && s.celebrateTimer > 130) {
        const flashAlpha = ((s.celebrateTimer - 130) / 20) * 0.04;
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

      // Smooth trail — continuous fade behind the logo
      if (c.trail > 0 && s.trailPositions.length > 0) {
        const img = logoImgRef.current;
        const tint = tintCanvasRef.current;
        if (img && tint) {
          const hasAlpha = logoHasAlphaRef.current;
          if (hasAlpha) {
            const tw = Math.ceil(logoW + 4);
            const th = Math.ceil(logoH + 4);
            tint.width = tw;
            tint.height = th;
            const tc = tint.getContext("2d")!;
            tc.clearRect(0, 0, tw, th);
            tc.drawImage(img, 2, 2, logoW, logoH);
            tc.globalCompositeOperation = "source-in";
            tc.fillStyle = color;
            tc.fillRect(0, 0, tw, th);
            tc.globalCompositeOperation = "source-over";
          }
          for (let i = 0; i < s.trailPositions.length; i++) {
            const tp = s.trailPositions[i];
            const t = (i + 1) / (s.trailPositions.length + 1);
            ctx.save();
            ctx.globalAlpha = t * t * 0.06;
            if (hasAlpha) {
              const tw = Math.ceil(logoW + 4);
              const th = Math.ceil(logoH + 4);
              ctx.drawImage(tint, tp.x + logoW / 2 - tw / 2, tp.y + logoH / 2 - th / 2);
            } else {
              ctx.drawImage(img, tp.x, tp.y, logoW, logoH);
            }
            ctx.restore();
          }
        }
      }

      // Logo
      drawDvdLogo(ctx, s.x, s.y, logoW, logoH, color, finalScaleX, finalScaleY);

      ctx.restore(); // end screen shake

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [drawDvdLogo]);

  const set = (key: keyof Config, val: number) =>
    setConfig((prev) => ({ ...prev, [key]: val }));

  const panelControls = (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: "relative", display: "flex", flexDirection: "column", gap: DEV_PANEL_GAP }}
    >
      {/* Drop overlay */}
      {dragState !== "idle" && (
        <div style={{
          position: "absolute", inset: -14, zIndex: 10,
          background: dragState === "accepting"
            ? "rgba(8,8,10,0.92)" : "rgba(40,10,10,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{
            color: dragState === "accepting" ? "rgba(255,255,255,0.5)" : "rgba(255,80,80,0.7)",
            fontSize: 11, letterSpacing: "0.03em",
          }}>
            {dragState === "accepting" ? "Drop to apply" : "SVG or PNG only"}
          </span>
        </div>
      )}

      {SLIDER_DEFS.map((def) => (
        <DevSlider
          key={def.key}
          label={def.label}
          value={config[def.key]}
          min={def.min}
          max={def.max}
          step={def.step}
          format={def.display}
          onChange={(v) => set(def.key, v)}
        />
      ))}

      <DevDivider />

      <DevToggle label="Counter" checked={showCounter} onChange={setShowCounter} />
      <DevToggle label="Corner celebration" checked={showCornerText} onChange={setShowCornerText} />
      <DevToggle label="Grow on corner" checked={growOnCorner} onChange={handleSetGrowOnCorner} />

      <DevDivider />

      {/* Background color */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, letterSpacing: "0.02em" }}>
          Background
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 14, height: 14, borderRadius: 4,
            background: bgColor,
            border: "1px solid rgba(255,255,255,0.15)",
          }} />
          <input
            type="text"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            spellCheck={false}
            style={{
              width: 68, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4, padding: "3px 6px",
              color: "rgba(255,255,255,0.55)", fontSize: 10,
              fontFamily: "inherit", outline: "none",
              letterSpacing: "0.02em",
            }}
          />
        </div>
      </div>

      {/* Logo upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: "flex", cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8, overflow: "hidden",
        }}
      >
        <div style={{
          width: 52, flexShrink: 0,
          background: "rgba(255,255,255,0.03)",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRight: "1px solid rgba(255,255,255,0.10)",
        }}>
          <img
            src={svgDataUrl || "/dvd-logo.svg"}
            alt=""
            style={{
              height: 22, maxWidth: 36, objectFit: "contain",
              filter: "brightness(0) invert(1)", opacity: 0.55,
            }}
          />
        </div>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "8px 0",
          color: "rgba(255,255,255,0.45)", fontSize: 10,
          fontFamily: "inherit", letterSpacing: "0.03em",
        }}>
          {svgDataUrl ? "Replace logo" : "Upload SVG / PNG"}
        </div>
      </div>

      <DevDivider />

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1 }}>
          <DevButton
            label="Reset"
            onClick={() => { setConfig(DEFAULT_CONFIG); stateRef.current.growthScale = 1; stateRef.current.growthHits = 0; resetLogo(); setBgColor("#111111"); }}
            variant="secondary"
          />
        </div>
        <div style={{ flex: 1 }}>
          <DevButton label="Export" onClick={handleExport} variant="primary" />
        </div>
      </div>
    </div>
  );

  return (
    <DevPanel label="DVD Bounce" controls={panelControls} background={bgColor}>
      <div ref={contentRef} style={{ position: "absolute", inset: 0 }}>
        <canvas
          ref={canvasRef}
          onClick={() => setPaused((p) => !p)}
          style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair" }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png,image/svg+xml,image/png"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

        {/* Flying CORNER! text — physics throw into counter */}
        {cornerFlies.map((fly) => (
          <CornerFlyText
            key={fly.key}
            startX={fly.startX}
            startY={fly.startY}
            targetX={fly.targetX}
            targetY={fly.targetY}
            color={fly.color}
            onComplete={() => {
              setDisplayedCorners((d) => d + 1);
              setCornerKey((k) => k + 1);
              setCornerFlies((prev) => prev.filter((f) => f.key !== fly.key));
            }}
          />
        ))}

        {/* Stats bar */}
        <div style={{
          position: "absolute", bottom: 20, left: 20,
          display: showCounter ? "flex" : "none", gap: 20, alignItems: "baseline",
          fontFamily: "'SF Mono', monospace", fontSize: 11,
          color: overlayColor,
          transition: "color 0.3s",
        }}>
          <span>bounces <span style={{ fontVariantNumeric: "tabular-nums" }}>{liveBounces}</span></span>
          <span style={{ width: 1, height: 10, background: overlayDivider, display: "inline-block", transition: "background 0.3s" }} />
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
            corners{" "}
            <span ref={cornerCounterRef} style={{ display: "inline-block" }}>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={cornerKey}
                initial={{ scale: 1.8, y: -4, color: liveColor }}
                animate={{ scale: 1, y: 0, color: overlayColor }}
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
                {displayedCorners}
              </motion.span>
            </AnimatePresence>
            </span>
          </span>
        </div>

        {/* Click to pause hint */}
        <div style={{
          position: "absolute", bottom: 20, right: 20,
          fontFamily: "'SF Mono', monospace", fontSize: 11,
          color: overlayColor,
          pointerEvents: "none",
          transition: "color 0.3s",
        }}>
          {paused ? "click to resume" : "click to pause"}
        </div>
      </div>
    </DevPanel>
  );
}
