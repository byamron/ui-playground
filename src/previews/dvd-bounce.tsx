import { useEffect, useRef } from "react";
import {
  DVD_BASE_LOGO_H,
  DVD_BASE_LOGO_W,
  DVD_COLORS,
  dvdStepSpring,
} from "../demos/dvd-bounce/DvdBounce";
import type { PreviewProps } from "./_shared";

// Real DVD logo + same constants/spring math as the demo. Loads /dvd-logo.svg
// (the same asset the demo loads), tints with source-in compositing.
export default function DvdBouncePreview({ active, intense }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let img: HTMLImageElement | null = null;
    const tintCanvas = document.createElement("canvas");
    let hasAlpha = true;

    let raf = 0;
    let running = false;

    // Sized for the preview band — small logo so it has room to bounce.
    const SIZE_SCALE = 0.32; // ~58×26 logo
    const SPEED = 1.4;

    const state = {
      x: 24, y: 18,
      vx: SPEED, vy: SPEED * 0.78,
      colorIndex: 0,
      deformX: { value: 1, velocity: 0 },
      deformY: { value: 1, velocity: 0 },
    };

    const drawLogo = (
      x: number, y: number, w: number, h: number,
      color: string, scaleX: number, scaleY: number,
    ) => {
      if (!img) return;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(scaleX, scaleY);
      if (hasAlpha) {
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
        ctx.shadowBlur = 16;
        ctx.globalAlpha = 0.35;
        ctx.drawImage(tintCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.drawImage(tintCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
    };

    let containerW = 0;
    let containerH = 0;
    const syncSize = () => {
      const w = canvas.parentElement!.clientWidth;
      const h = canvas.parentElement!.clientHeight;
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

    const frame = () => {
      if (!running) return;
      syncSize();
      const s = state;
      const W = containerW;
      const H = containerH;
      const logoW = DVD_BASE_LOGO_W * SIZE_SCALE;
      const logoH = DVD_BASE_LOGO_H * SIZE_SCALE;

      s.x += s.vx;
      s.y += s.vy;

      let hit = false;
      if (s.x <= 0) { s.x = 0; s.vx = Math.abs(s.vx); hit = true; }
      else if (s.x + logoW >= W) { s.x = W - logoW; s.vx = -Math.abs(s.vx); hit = true; }
      if (s.y <= 0) { s.y = 0; s.vy = Math.abs(s.vy); hit = true; }
      else if (s.y + logoH >= H) { s.y = H - logoH; s.vy = -Math.abs(s.vy); hit = true; }

      if (hit) {
        s.colorIndex = (s.colorIndex + 1) % DVD_COLORS.length;
        // Subtle squash on wall hit
        s.deformX.velocity = -8;
        s.deformY.velocity = 4;
      }

      // Same spring math as the demo (imported)
      dvdStepSpring(s.deformX, 1, 300, 14);
      dvdStepSpring(s.deformY, 1, 300, 14);

      ctx.clearRect(0, 0, W, H);
      drawLogo(s.x, s.y, logoW, logoH, DVD_COLORS[s.colorIndex], s.deformX.value, s.deformY.value);

      raf = requestAnimationFrame(frame);
    };

    // Only run frames while hovered.
    const startRunning = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    const stopRunning = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    };

    const paintIdle = () => {
      syncSize();
      const logoW = DVD_BASE_LOGO_W * SIZE_SCALE;
      const logoH = DVD_BASE_LOGO_H * SIZE_SCALE;
      ctx.clearRect(0, 0, containerW, containerH);
      drawLogo(state.x, state.y, logoW, logoH, DVD_COLORS[0], 1, 1);
    };

    // Load logo (same asset as the demo). Paint initial frame once it's ready.
    const i = new Image();
    i.src = "/dvd-logo.svg";
    i.onload = () => {
      img = i;
      if (!running) paintIdle();
    };
    if (i.complete) {
      img = i;
      paintIdle();
    }

    // React to intense changes via a side-channel on the canvas element
    (canvas as any).__startDvd = startRunning;
    (canvas as any).__stopDvd = stopRunning;

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      (canvas as any).__startDvd = null;
      (canvas as any).__stopDvd = null;
    };
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const start = (canvas as any).__startDvd as (() => void) | null;
    const stop = (canvas as any).__stopDvd as (() => void) | null;
    if (intense && active) start?.();
    else stop?.();
  }, [intense, active]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
