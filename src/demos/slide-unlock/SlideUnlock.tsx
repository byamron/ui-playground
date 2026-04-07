import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { bg, text } from "../../palette";
import {
  initWebGL,
  createProgram,
  FULLSCREEN_QUAD_VS,
  drawFullscreenQuad,
  resizeCanvas,
} from "../../utils/webgl";
import {
  DevPanel,
  DevSlider,
  DevButtonGroup,
  DevTextInput,
  DevButton,
  DevDivider,
} from "../../components/DevPanel";

// --- Layout constants ---

const TRACK_WIDTH = 340;
const TRACK_HEIGHT = 64;
const TRACK_PADDING = 4;
const HANDLE_SIZE = TRACK_HEIGHT - TRACK_PADDING * 2;
const MAX_OFFSET = TRACK_WIDTH - HANDLE_SIZE - TRACK_PADDING * 2;
const THRESHOLD = 0.85;

// --- Spring physics (matches SwiftUI: response 0.35, dampingFraction 0.7) ---
// ω_n = 2π / response ≈ 17.95, stiffness = ω_n² ≈ 322, damping = 2 * ζ * ω_n ≈ 25.1

const SPRING_STIFFNESS = 322;
const SPRING_DAMPING = 25.1;

// --- Completion timeline (RAF-driven, replaces setTimeout cascade) ---

const COMPLETION_TIMELINE = [
  { at: 100, action: "flash" },
  { at: 450, action: "gone" },
  { at: 1000, action: "reset" },
  { at: 1500, action: "idle" },
] as const;

// --- GLSL noise library (shared across all patterns) ---

const NOISE_GLSL = `
// 3D Simplex noise — Ashima Arts, MIT license
vec3 mod289_3(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec4 mod289_4(vec4 x) { return x - floor(x / 289.0) * 289.0; }
vec4 permute(vec4 x) { return mod289_4((x * 34.0 + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - r * 0.85373472095314; }

float snoise(vec3 v) {
  vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, vec3(C.y)));
  vec3 x0 = v - i + dot(i, vec3(C.x));

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g, l.zxy);
  vec3 i2 = max(g, l.zxy);

  vec3 x1 = x0 - i1 + C.x;
  vec3 x2 = x0 - i2 + C.y;
  vec3 x3 = x0 - D.yyy;

  i = mod289_3(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x2_ = x_ * ns.x + ns.yyyy;
  vec4 y2_ = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x2_) - abs(y2_);

  vec4 b0 = vec4(x2_.xy, y2_.xy);
  vec4 b1 = vec4(x2_.zw, y2_.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p, float lacunarity, float gain) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * snoise(p);
    p *= lacunarity;
    amplitude *= gain;
  }
  return value;
}
`;

// --- Shader system: Textures × Palettes, composed at runtime ---

// Textures compute float n (0-1) and float n2 (0-1) from UV + uniforms
const TEXTURES = [
  {
    label: "Flow",
    glsl: `
  vec3 p = vec3(uv * u_scale, u_time * u_speed);
  float n = fbm(p, 2.0, 0.5) * 0.5 + 0.5;
  float n2 = fbm(p + vec3(5.2, 1.3, 0.0), 2.0, 0.5) * 0.5 + 0.5;`,
  },
  {
    label: "Ridged",
    glsl: `
  vec3 p = vec3(uv * u_scale * 0.8, u_time * u_speed * 0.5);
  float n = abs(fbm(p, 2.0, 0.5)) * 1.2;
  n = 1.0 - n; // invert ridges
  float n2 = abs(fbm(p * 1.5 + vec3(3.1, 7.2, 0.0), 2.0, 0.5));`,
  },
  {
    label: "Bands",
    glsl: `
  vec3 p = vec3(uv.x * u_scale * 0.6, uv.y * u_scale * 2.5, u_time * u_speed * 0.6);
  float raw = fbm(p, 2.0, 0.5) * 0.5 + 0.5;
  float n = smoothstep(0.25, 0.5, raw) * smoothstep(0.75, 0.5, raw) * 2.0;
  float n2 = fbm(p + vec3(5.2, 1.3, 0.0), 2.0, 0.5) * 0.5 + 0.5;`,
  },
];

// Palettes map n, n2, edgeFade → fragColor
const PALETTES = [
  {
    label: "Green",
    glsl: `
  vec3 dark = vec3(0.1, 0.45, 0.2) * 0.6;
  vec3 bright = vec3(0.15, 0.7, 0.3) * 0.85;
  vec3 color = mix(dark, bright, n);
  float opacity = (0.50 + u_intensity * n) * edgeFade;
  fragColor = vec4(color * opacity, opacity);`,
  },
  {
    label: "Red",
    glsl: `
  vec3 darkRed = vec3(0.5, 0.05, 0.0);
  vec3 orange = vec3(0.9, 0.35, 0.05);
  vec3 yellow = vec3(1.0, 0.7, 0.1);
  vec3 color = mix(darkRed, orange, n);
  color = mix(color, yellow, n2 * n * 0.6);
  float opacity = (0.50 + u_intensity * n) * edgeFade;
  fragColor = vec4(color * opacity, opacity);`,
  },
  {
    label: "Blue",
    glsl: `
  vec3 deep = vec3(0.02, 0.1, 0.3);
  vec3 mid = vec3(0.05, 0.3, 0.55);
  vec3 foam = vec3(0.4, 0.7, 0.8);
  vec3 color = mix(deep, mid, n);
  color = mix(color, foam, pow(n2, 2.0) * 0.4);
  float opacity = (0.50 + u_intensity * n) * edgeFade;
  fragColor = vec4(color * opacity, opacity);`,
  },
  {
    label: "Teal",
    glsl: `
  vec3 c1 = vec3(0.1, 0.6, 0.55);
  vec3 c2 = vec3(0.2, 0.8, 0.4);
  vec3 c3 = vec3(0.4, 0.2, 0.7);
  vec3 color = mix(mix(c1, c2, n), c3, n2 * 0.4);
  float band = smoothstep(0.2, 0.5, n) * smoothstep(0.8, 0.5, n);
  float opacity = (0.35 + u_intensity * band * 1.5 + n2 * 0.15) * edgeFade;
  fragColor = vec4(color * opacity, opacity);`,
  },
  {
    label: "Purple",
    glsl: `
  float t = u_time * u_speed;
  float r = sin(n * 3.14159 + t * 0.5) * 0.5 + 0.5;
  float g = sin(n * 3.14159 + t * 0.5 + 2.094) * 0.5 + 0.5;
  float b = sin(n * 3.14159 + t * 0.5 + 4.189) * 0.5 + 0.5;
  vec3 color = vec3(r, g, b) * 0.7;
  float opacity = (0.50 + u_intensity * (n * 0.5 + 0.5)) * edgeFade;
  fragColor = vec4(color * opacity, opacity);`,
  },
];

// Glow colors matched to each palette (used for border glow)
const PALETTE_GLOWS = [
  { h: 145, s: 55, l: 40 }, // Green
  { h: 15,  s: 75, l: 48 }, // Red
  { h: 200, s: 65, l: 42 }, // Blue
  { h: 170, s: 55, l: 42 }, // Teal
  { h: 280, s: 55, l: 52 }, // Purple
];

// Compose a fragment shader from a texture + palette
function composeFragment(textureIdx: number, paletteIdx: number): string {
  return `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_size;
uniform float u_time;
uniform float u_speed;
uniform float u_scale;
uniform float u_intensity;

${NOISE_GLSL}

void main() {
  vec2 uv = v_uv;
  float edgeFade = smoothstep(1.0, 0.85, uv.x);

  // Texture
  ${TEXTURES[textureIdx].glsl}

  // Palette
  ${PALETTES[paletteIdx].glsl}
}
`;
}

// Presets: named combinations with default slider values
interface Preset {
  label: string;
  texture: number;
  palette: number;
  speed: number;
  scale: number;
  intensity: number;
}

const PRESETS: Preset[] = [
  { label: "Fluid Green", texture: 0, palette: 0, speed: 0.3, scale: 1.5, intensity: 0.2 },
  { label: "Aurora",      texture: 2, palette: 3, speed: 0.3, scale: 6.0, intensity: 0.2 },
  { label: "Lava",        texture: 0, palette: 1, speed: 0.3, scale: 4.0, intensity: 0.2 },
  { label: "Ocean",       texture: 1, palette: 2, speed: 0.3, scale: 6.0, intensity: 0.2 },
  { label: "Plasma",      texture: 0, palette: 4, speed: 0.3, scale: 6.0, intensity: 0.2 },
];

// --- Handle icon (right-pointing arrow) ---

function ArrowIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M7.5 4.5L13.5 10L7.5 15.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Component ---

import { demoPalettes } from "../../palette";
const BG = bg(demoPalettes["slide-unlock"]);

export function SlideUnlock() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(performance.now());

  const [dragOffset, setDragOffset] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Shader config: texture × palette, with preset tracking
  const [textureIdx, setTextureIdx] = useState(0);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [activePreset, setActivePreset] = useState<number | null>(0);
  const [speed, setSpeed] = useState(0.3);
  const [scale, setScale] = useState(1.5);
  const [intensity, setIntensity] = useState(0.2);
  const speedRef = useRef(speed);
  const scaleRef = useRef(scale);
  const intensityRef = useRef(intensity);
  speedRef.current = speed;
  scaleRef.current = scale;
  intensityRef.current = intensity;

  // Glow
  const [glowIntensity, setGlowIntensity] = useState(0.5);

  // Editable hint text
  const [hintText, setHintText] = useState("slide to unlock");

  // Copy feedback
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  // Track whether current state matches the active preset
  const presetModified =
    activePreset !== null &&
    (textureIdx !== PRESETS[activePreset].texture ||
      paletteIdx !== PRESETS[activePreset].palette ||
      speed !== PRESETS[activePreset].speed ||
      scale !== PRESETS[activePreset].scale ||
      intensity !== PRESETS[activePreset].intensity);

  // Shader key: recompile when texture or palette changes
  const shaderKey = `${textureIdx}-${paletteIdx}`;

  // Completion phases: idle → flash → gone → entering → idle
  type Phase = "idle" | "flash" | "gone" | "entering";
  const [phase, setPhase] = useState<Phase>("idle");
  const [cycleKey, setCycleKey] = useState(0);

  // Spring state for snap-back (imperative — not React state)
  const springRef = useRef({ position: 0, velocity: 0, target: 0, active: false });

  // Drag state
  const dragStateRef = useRef({
    dragging: false,
    startX: 0,
    startOffset: 0,
    samples: [] as Array<{ x: number; t: number }>,
  });

  // Completion timeline state (RAF-driven)
  const completionRef = useRef<{ startTime: number; actionIndex: number } | null>(null);

  // Threshold-crossing detent
  const prevAtThresholdRef = useRef(false);
  const [handlePulse, setHandlePulse] = useState(false);

  // Proportional scale so the element fills more of the page
  const [viewScale, setViewScale] = useState(1);
  const viewScaleRef = useRef(1);
  useEffect(() => {
    const update = () => {
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      const s = Math.max(1, Math.min(1.6, vmin / 700));
      setViewScale(s);
      viewScaleRef.current = s;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Typewriter state
  const [revealedCount, setRevealedCount] = useState(0);
  const [revealDone, setRevealDone] = useState(false);

  // Shimmer position driven by JS (0 → 1, left to right)
  const shimmerRef = useRef<HTMLSpanElement>(null);
  const shimmerStartRef = useRef(0);

  // --- Typewriter + shimmer (re-runs on cycleKey change) ---
  useEffect(() => {
    setRevealedCount(0);
    setRevealDone(false);
    const total = hintText.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= total; i++) {
      timers.push(
        setTimeout(() => {
          setRevealedCount(i);
          if (i === total) {
            timers.push(setTimeout(() => setRevealDone(true), 500));
          }
        }, i * 70)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [cycleKey]);

  // --- Shimmer loop (JS-driven, always starts from left) ---
  useEffect(() => {
    if (!revealDone) return;
    shimmerStartRef.current = performance.now();
    let raf = 0;
    const DURATION = 2500; // ms per sweep

    const tick = () => {
      const el = shimmerRef.current;
      if (!el) { raf = requestAnimationFrame(tick); return; }
      const t = ((performance.now() - shimmerStartRef.current) % DURATION) / DURATION;
      // t goes 0→1. Map to background-position so bright spot sweeps L→R.
      // bright spot at 50% of 200%-wide gradient.
      // We want: t=0 → spot off-screen left, t=1 → spot off-screen right.
      // position in px = lerp(left_hide, right_hide, t)
      // Using percentage: lerp(150%, -50%, t) — 150% hides spot left, -50% hides right
      const pos = 150 - t * 200; // 150 → -50
      el.style.backgroundPosition = `${pos}% 0`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealDone]);

  // --- WebGL setup & render loop ---

  const buildProgram = useCallback(
    (gl: WebGL2RenderingContext, tIdx: number, pIdx: number) => {
      if (programRef.current) gl.deleteProgram(programRef.current);
      try {
        programRef.current = createProgram(gl, FULLSCREEN_QUAD_VS, composeFragment(tIdx, pIdx));
      } catch (e) {
        console.error("Shader compile failed:", e);
        programRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = glRef.current ?? initWebGL(canvas);
    glRef.current = gl;

    // Dummy VAO required by WebGL2
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    buildProgram(gl, textureIdx, paletteIdx);

    const render = () => {
      if (!glRef.current || !programRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      resizeCanvas(canvas, gl);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(programRef.current);

      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const sizeLoc = gl.getUniformLocation(programRef.current, "u_size");
      const timeLoc = gl.getUniformLocation(programRef.current, "u_time");
      const speedLoc = gl.getUniformLocation(programRef.current, "u_speed");
      const scaleLoc = gl.getUniformLocation(programRef.current, "u_scale");
      const intensityLoc = gl.getUniformLocation(programRef.current, "u_intensity");

      if (sizeLoc) gl.uniform2f(sizeLoc, canvas.width, canvas.height);
      if (timeLoc) gl.uniform1f(timeLoc, elapsed);
      if (speedLoc) gl.uniform1f(speedLoc, speedRef.current);
      if (scaleLoc) gl.uniform1f(scaleLoc, scaleRef.current);
      if (intensityLoc) gl.uniform1f(intensityLoc, intensityRef.current);

      drawFullscreenQuad(gl);
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [shaderKey, buildProgram, textureIdx, paletteIdx]);

  // --- Spring animation loop ---

  useEffect(() => {
    let lastTime = performance.now();
    let raf = 0;

    const step = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.032); // cap at ~30fps min
      lastTime = now;

      const s = springRef.current;
      if (s.active) {
        const displacement = s.position - s.target;
        const force = -SPRING_STIFFNESS * displacement - SPRING_DAMPING * s.velocity;
        s.velocity += force * dt;
        s.position += s.velocity * dt;

        if (Math.abs(displacement) < 0.3 && Math.abs(s.velocity) < 0.5) {
          s.position = s.target;
          s.velocity = 0;
          s.active = false;
        }
        setDragOffset(Math.max(0, s.position));
      }

      // Process completion timeline
      const comp = completionRef.current;
      if (comp !== null) {
        const elapsed = now - comp.startTime;
        while (
          comp.actionIndex < COMPLETION_TIMELINE.length &&
          elapsed >= COMPLETION_TIMELINE[comp.actionIndex].at
        ) {
          const action = COMPLETION_TIMELINE[comp.actionIndex].action;
          comp.actionIndex++;

          switch (action) {
            case "flash":
              setPhase("flash");
              break;
            case "gone":
              setPhase("gone");
              break;
            case "reset":
              setIsComplete(false);
              setDragOffset(0);
              springRef.current = { position: 0, velocity: 0, target: 0, active: false };
              prevAtThresholdRef.current = false;
              setCycleKey((k) => k + 1);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => setPhase("entering"));
              });
              break;
            case "idle":
              setPhase("idle");
              completionRef.current = null;
              break;
          }
        }
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // --- Pointer handling ---

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isComplete) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStateRef.current = {
        dragging: true,
        startX: e.clientX,
        startOffset: dragOffset,
        samples: [{ x: e.clientX, t: performance.now() }],
      };
      springRef.current.active = false;
    },
    [isComplete, dragOffset]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStateRef.current.dragging) return;
    const dx = (e.clientX - dragStateRef.current.startX) / viewScaleRef.current;
    const newOffset = Math.min(Math.max(dragStateRef.current.startOffset + dx, 0), MAX_OFFSET);
    setDragOffset(newOffset);
    springRef.current.position = newOffset;

    const samples = dragStateRef.current.samples;
    samples.push({ x: e.clientX, t: performance.now() });
    if (samples.length > 4) samples.shift();
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragStateRef.current.dragging) return;
    dragStateRef.current.dragging = false;

    const progress = dragOffset / MAX_OFFSET;
    if (progress >= THRESHOLD) {
      // Start completion timeline (cancels any in-flight one)
      setIsComplete(true);
      springRef.current = { position: dragOffset, velocity: 0, target: MAX_OFFSET, active: true };
      if (navigator.vibrate) navigator.vibrate(10);
      completionRef.current = { startTime: performance.now(), actionIndex: 0 };
    } else {
      // Compute gesture velocity from recent samples
      let gestureVelocity = 0;
      const samples = dragStateRef.current.samples;
      if (samples.length >= 2) {
        const newest = samples[samples.length - 1];
        const oldest = samples[Math.max(0, samples.length - 3)];
        const dtMs = newest.t - oldest.t;
        if (dtMs > 0 && dtMs < 200) {
          gestureVelocity = ((newest.x - oldest.x) / dtMs) * 1000 / viewScaleRef.current;
        }
      }
      gestureVelocity = Math.max(-3000, Math.min(3000, gestureVelocity));

      // Snap back with gesture momentum
      springRef.current = { position: dragOffset, velocity: gestureVelocity, target: 0, active: true };
    }
  }, [dragOffset]);

  const progress = dragOffset / MAX_OFFSET;
  const isAtThreshold = progress >= THRESHOLD;

  // Detect threshold crossing during active drag
  if (isAtThreshold !== prevAtThresholdRef.current) {
    prevAtThresholdRef.current = isAtThreshold;
    if (isAtThreshold && dragStateRef.current.dragging) {
      navigator.vibrate?.(5);
      setHandlePulse(true);
      setTimeout(() => setHandlePulse(false), 120);
    }
  }

  const trailWidth =
    phase === "flash" ? TRACK_WIDTH : Math.max(0, dragOffset + HANDLE_SIZE + TRACK_PADDING);
  const trailOpacity =
    phase === "flash"
      ? 1
      : phase === "entering"
        ? 0
        : progress < 0.02
          ? 0
          : Math.min(progress * 4, 1);
  const textOpacity = Math.max(0, 1 - progress * 2);

  const panelControls = (
    <>
      <DevButtonGroup
        label="Preset"
        options={PRESETS.map((p, i) => ({
          label: p.label,
          value: i,
        }))}
        value={activePreset}
        onChange={(i: number) => {
          const p = PRESETS[i];
          if (activePreset === i && presetModified) {
            setTextureIdx(p.texture);
            setPaletteIdx(p.palette);
            setSpeed(p.speed);
            setScale(p.scale);
            setIntensity(p.intensity);
          } else {
            setActivePreset(i);
            setTextureIdx(p.texture);
            setPaletteIdx(p.palette);
            setSpeed(p.speed);
            setScale(p.scale);
            setIntensity(p.intensity);
          }
        }}
        modified={presetModified}
      />
      <DevDivider />
      <DevButtonGroup
        label="Texture"
        options={TEXTURES.map((t, i) => ({ label: t.label, value: i }))}
        value={textureIdx}
        onChange={(i) => { setTextureIdx(i); setActivePreset(null); }}
      />
      <DevButtonGroup
        label="Palette"
        options={PALETTES.map((p, i) => ({ label: p.label, value: i }))}
        value={paletteIdx}
        onChange={(i) => { setPaletteIdx(i); setActivePreset(null); }}
      />
      <DevDivider />
      <DevSlider
        label="Speed" value={speed} min={0.05} max={2} step={0.05}
        onChange={(v) => { setSpeed(v); setActivePreset(null); }}
      />
      <DevSlider
        label="Scale" value={scale} min={1} max={20} step={0.5}
        onChange={(v) => { setScale(v); setActivePreset(null); }}
      />
      <DevSlider
        label="Intensity" value={intensity} min={0} max={1} step={0.05}
        onChange={(v) => { setIntensity(v); setActivePreset(null); }}
      />
      <DevSlider
        label="Glow" value={glowIntensity} min={0} max={1} step={0.05}
        onChange={setGlowIntensity}
      />
      <DevDivider />
      <DevTextInput label="Text" value={hintText} onChange={setHintText} />
      <div style={{ height: 2 }} />
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1 }}>
          <DevButton
            label="Reset"
            variant="default"
            onClick={() => {
              const p = PRESETS[0];
              setActivePreset(0);
              setTextureIdx(p.texture);
              setPaletteIdx(p.palette);
              setSpeed(p.speed);
              setScale(p.scale);
              setIntensity(p.intensity);
              setGlowIntensity(0.5);
              setHintText("slide to unlock");
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <DevButton
            label={copied ? "Copied!" : "Copy"}
            variant="primary"
            onClick={() => {
              const glsl = composeFragment(textureIdx, paletteIdx);
              navigator.clipboard.writeText(glsl);
              setCopied(true);
            }}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
    <style>{`
      .slide-hint-text {
        background: linear-gradient(
          90deg,
          ${text.dark.muted} 0%,
          ${text.dark.muted} 35%,
          ${text.dark.secondary} 50%,
          ${text.dark.muted} 65%,
          ${text.dark.muted} 100%
        );
        background-size: 200% 100%;
        background-position: 150% 0;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .track-wrapper {
        position: absolute;
        top: 50%;
        left: 50%;
        transition: transform 0.4s cubic-bezier(0, 0, 0.2, 1.1),
                    opacity 0.3s ease-out;
      }
      .track-wrapper.phase-gone {
        transition: transform 0.3s cubic-bezier(0.4, 0, 1, 1),
                    opacity 0.3s cubic-bezier(0.4, 0, 1, 1);
      }
      .track-wrapper.phase-entering {
        transition: none;
      }
      @keyframes glow-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    `}</style>
    <DevPanel label="Shader" controls={panelControls} background={BG}>

      {/* Track wrapper — absolute centered, proportionally scaled */}
      <div
        className={`track-wrapper${phase === "gone" ? " phase-gone" : phase === "entering" ? " phase-entering" : ""}`}
        style={{
          transform: phase === "gone" || phase === "entering"
            ? `translate(-50%, -50%) scale(${viewScale * 0.92})`
            : `translate(-50%, -50%) scale(${viewScale})`,
          opacity: phase === "gone" || phase === "entering" ? 0 : 1,
        }}
      >
        {/* Glow — follows the trail, not the full track */}
        {(() => {
          const g = PALETTE_GLOWS[paletteIdx];
          const glowAlpha = trailOpacity * glowIntensity;
          return glowAlpha > 0 ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: trailWidth,
                height: TRACK_HEIGHT,
                borderRadius: TRACK_HEIGHT / 2,
                boxShadow: [
                  `0 0 ${4 + glowIntensity * 8}px hsla(${g.h}, ${g.s}%, ${g.l}%, ${glowAlpha * 0.45})`,
                  `0 0 ${12 + glowIntensity * 20}px hsla(${g.h}, ${g.s}%, ${g.l}%, ${glowAlpha * 0.2})`,
                  `inset 0 0 ${2 + glowIntensity * 4}px hsla(${g.h}, ${g.s}%, ${g.l}%, ${glowAlpha * 0.15})`,
                ].join(", "),
                animation: "glow-pulse 3s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          ) : null;
        })()}
        <div
          style={{
            position: "relative",
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            background: "rgba(255,255,255,0.06)",
            outline: "1px solid rgba(255,255,255,0.15)",
            outlineOffset: -1,
            overflow: "hidden",
            userSelect: "none",
            touchAction: "none",
          }}
        >
          {/* WebGL fluid trail */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: trailWidth,
              height: TRACK_HEIGHT,
              borderRadius: TRACK_HEIGHT / 2,
              overflow: "hidden",
              opacity: trailOpacity,
              transition:
                phase === "flash"
                  ? "width 0.25s cubic-bezier(0.0, 0.0, 0.2, 1), opacity 0.15s"
                  : trailOpacity === 0
                    ? "opacity 0.25s ease-out"
                    : "none",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>

          {/* Bright flash overlay on completion */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: TRACK_HEIGHT / 2,
              pointerEvents: "none",
            }}
            animate={{
              opacity: phase === "flash" ? 1 : 0,
            }}
            transition={{ duration: phase === "flash" ? 0.15 : 0.3 }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: TRACK_HEIGHT / 2,
                background:
                  "radial-gradient(ellipse 120% 100% at 80% 50%, rgba(100,220,140,0.35), rgba(60,180,100,0.15) 60%, transparent)",
              }}
            />
          </motion.div>

          {/* Hint text — centered across full track */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              opacity: phase === "flash" ? 0 : textOpacity,
              transition: phase === "flash" ? "opacity 0.15s" : undefined,
            }}
          >
            <span
              key={cycleKey}
              ref={shimmerRef}
              className="slide-hint-text"
              style={{
                fontFamily: "'Source Sans Pro', 'Source Sans 3', system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              {hintText.split("").map((char, i) => (
                <span
                  key={i}
                  style={{
                    opacity: i < revealedCount ? 1 : 0,
                    transition: "opacity 0.05s",
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
          </div>

          {/* Draggable handle */}
          <motion.div
            style={{
              position: "absolute",
              top: TRACK_PADDING,
              left: TRACK_PADDING + dragOffset,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isComplete ? "default" : "grab",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.06)",
              zIndex: 2,
              transform: handlePulse ? "scale(1.04)" : "scale(1)",
              transition: "transform 120ms ease-out",
            }}
            animate={{
              backgroundColor: isAtThreshold
                ? `hsl(${PALETTE_GLOWS[paletteIdx].h}, ${PALETTE_GLOWS[paletteIdx].s}%, ${PALETTE_GLOWS[paletteIdx].l}%)`
                : "hsl(0, 0%, 20%)",
            }}
            transition={{ duration: 0.2 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <ArrowIcon color={isAtThreshold ? "#fff" : text.dark.tertiary} />
          </motion.div>
        </div>
      </div>
    </DevPanel>
    </>
  );
}
