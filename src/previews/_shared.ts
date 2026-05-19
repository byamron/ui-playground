import { useEffect, useRef, useState } from "react";

// One RAF, many subscribers.
const subs = new Set<(t: number) => void>();
let raf = 0;
let start = 0;

function tick(now: number) {
  if (!start) start = now;
  const t = (now - start) / 1000;
  subs.forEach((cb) => cb(t));
  raf = requestAnimationFrame(tick);
}

export function useClock(active: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    subs.add(setT);
    if (!raf) raf = requestAnimationFrame(tick);
    return () => {
      subs.delete(setT);
      if (subs.size === 0 && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        start = 0;
      }
    };
  }, [active]);
  return active ? t : 0;
}

export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { rootMargin: "100px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

export interface PreviewProps {
  active: boolean;
  intense: boolean;
}

// Easing helpers
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
// 0..1..0 triangle wave on cycle length L
export const pingPong = (t: number, L: number) => {
  const m = (t % L) / L;
  return m < 0.5 ? m * 2 : (1 - m) * 2;
};
