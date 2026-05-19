import { useEffect, useRef, useState } from "react";
import {
  SLIDE_UNLOCK_PALETTE_GLOWS,
  slideUnlockComposeFragment,
} from "../demos/slide-unlock/SlideUnlock";
import {
  FULLSCREEN_QUAD_VS,
  createProgram,
  drawFullscreenQuad,
  initWebGL,
  resizeCanvas,
} from "../utils/webgl";
import type { PreviewProps } from "./_shared";

// Real fluid shader (slideUnlockComposeFragment) running in a small WebGL
// canvas. The handle drags autoplay-style on hover.
const TRACK_W = 240;
const TRACK_H = 48;
const HANDLE = 36;
const PRESET = { palette: 4, texture: 0 }; // Purple/Flow

export default function SlideUnlockPreview({ active, intense }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = initWebGL(canvas);
    if (!gl) return;
    const fragment = slideUnlockComposeFragment(PRESET.texture, PRESET.palette);
    const program = createProgram(gl, FULLSCREEN_QUAD_VS, fragment);
    if (!program) return;
    const start = performance.now();

    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      resizeCanvas(canvas, gl);
      gl.useProgram(program);
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(gl.getUniformLocation(program, "u_time"), t);
      gl.uniform1f(gl.getUniformLocation(program, "u_speed"), 0.6);
      gl.uniform1f(gl.getUniformLocation(program, "u_scale"), 1.4);
      gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), 0.55);
      gl.uniform2f(gl.getUniformLocation(program, "u_size"), canvas.width, canvas.height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      drawFullscreenQuad(gl);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      gl.deleteProgram(program);
    };
  }, [active]);

  // Autoplay drag — hover-gated
  useEffect(() => {
    if (!active || !intense) {
      setProgress(0);
      return;
    }
    const PERIOD = 2400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = ((now - start) % PERIOD) / PERIOD;
      let p: number;
      if (t < 0.6) p = easeInOut(t / 0.6);
      else if (t < 0.7) p = 1;
      else p = 1 - easeInOut((t - 0.7) / 0.3);
      setProgress(Math.max(0, Math.min(1, p)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, intense]);

  const glow = SLIDE_UNLOCK_PALETTE_GLOWS[PRESET.palette];
  const handleX = progress * (TRACK_W - HANDLE - 6);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          overflow: "hidden",
          border: `1px solid hsla(${glow.h}, ${glow.s}%, ${glow.l + 10}%, 0.5)`,
          boxShadow: `0 0 18px hsla(${glow.h}, ${glow.s}%, ${glow.l}%, 0.35)`,
          background: "rgba(0,0,0,0.4)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 3,
            left: 3 + handleX,
            width: HANDLE,
            height: HANDLE,
            borderRadius: "50%",
            background: "white",
            boxShadow: `0 0 22px hsla(${glow.h}, ${glow.s}%, ${glow.l + 20}%, 0.55)`,
          }}
        />
      </div>
    </div>
  );
}

function easeInOut(t: number) {
  return (1 - Math.cos(Math.PI * t)) / 2;
}
