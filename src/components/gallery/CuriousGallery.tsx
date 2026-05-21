import { Link } from "react-router-dom";
import { useEffect, useLayoutEffect, useRef } from "react";
import { galleryDemos } from "./demos";
import { text } from "../../palette";

// "Curious" gallery — each tile is a little creature in a glass case. They
// breathe and sway when left alone, perk up or shy away when the cursor
// approaches, and blink at random intervals. All motion is driven by a single
// RAF loop writing transforms directly to the DOM, so 14 tiles stay smooth.

const REACH = 380; // px — radius of cursor influence
const LEAN = 16; // px — max translate from cursor reaction
const ROT = 5; // deg — max rotation from cursor reaction
const SCALE_RANGE = 0.06; // scale up by this much when curious is full

interface TileMotion {
  // Refs to the DOM nodes we write transforms onto
  card: HTMLDivElement | null;
  glow: HTMLDivElement | null;
  eyeL: HTMLDivElement | null;
  eyeR: HTMLDivElement | null;
  pupilL: HTMLDivElement | null;
  pupilR: HTMLDivElement | null;
  // Viewport-space center, refreshed on resize/scroll
  centerX: number;
  centerY: number;
  // Per-tile personality (seeded from index)
  curiosity: number; // -1..1 — positive leans toward, negative shies away
  idleAmpX: number;
  idleAmpY: number;
  idleAmpR: number;
  freqX: number;
  freqY: number;
  freqR: number;
  phaseX: number;
  phaseY: number;
  phaseR: number;
  // Current animated state
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  scale: number;
  vscale: number;
  eyeX: number;
  eyeY: number;
  veyeX: number;
  veyeY: number;
  pupilScale: number;
  vpupilScale: number;
  // Blink
  blink: number; // 0 = open, 1 = closed
  nextBlinkAt: number;
  blinkDir: 1 | -1; // 1 = closing, -1 = opening
}

// Cheap deterministic PRNG so each demo always gets the same personality
function seeded(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildMotion(index: number): TileMotion {
  const rng = seeded(index + 1);
  // 80% curious, 20% shy
  const curious = rng() < 0.8;
  const magnitude = 0.55 + rng() * 0.45; // 0.55..1
  return {
    card: null,
    glow: null,
    eyeL: null,
    eyeR: null,
    pupilL: null,
    pupilR: null,
    centerX: 0,
    centerY: 0,
    curiosity: curious ? magnitude : -magnitude * 0.7,
    idleAmpX: 1.5 + rng() * 2.5,
    idleAmpY: 1.0 + rng() * 1.6,
    idleAmpR: 0.4 + rng() * 0.7,
    freqX: 0.22 + rng() * 0.35,
    freqY: 0.18 + rng() * 0.32,
    freqR: 0.14 + rng() * 0.26,
    phaseX: rng() * Math.PI * 2,
    phaseY: rng() * Math.PI * 2,
    phaseR: rng() * Math.PI * 2,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
    scale: 1,
    vscale: 0,
    eyeX: 0,
    eyeY: 0,
    veyeX: 0,
    veyeY: 0,
    pupilScale: 1,
    vpupilScale: 0,
    blink: 0,
    nextBlinkAt: 1500 + rng() * 5000,
    blinkDir: 1,
  };
}

export function CuriousGallery() {
  // One TileMotion per demo, kept in a ref so the RAF loop sees mutations
  // without re-rendering.
  const motionsRef = useRef<TileMotion[]>([]);
  if (motionsRef.current.length !== galleryDemos.length) {
    motionsRef.current = galleryDemos.map((_, i) => buildMotion(i));
  }

  const pointerRef = useRef({ x: -9999, y: -9999, active: false });

  // Pointer tracking
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      pointerRef.current.active = true;
    };
    const onLeave = () => {
      pointerRef.current.active = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Measure tile centers on layout/resize/scroll
  useLayoutEffect(() => {
    const measure = () => {
      for (const m of motionsRef.current) {
        if (!m.card) continue;
        const r = m.card.getBoundingClientRect();
        m.centerX = r.left + r.width / 2;
        m.centerY = r.top + r.height / 2;
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const m of motionsRef.current) {
      if (m.card) ro.observe(m.card);
    }
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Single RAF loop — drives all per-tile transforms via direct style writes
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(48, now - last); // ms
      last = now;
      const t = now * 0.001; // seconds for sin phases
      const p = pointerRef.current;

      // Spring constants — semi-implicit Euler, dt-scaled
      const dts = dt / 16.67;
      const STIFF = 0.16 * dts;
      const DAMP = Math.pow(0.84, dts);
      const EYE_STIFF = 0.28 * dts;
      const EYE_DAMP = Math.pow(0.78, dts);

      for (const m of motionsRef.current) {
        if (!m.card) continue;

        // ---- Idle motion (always on) ----
        const idleX = Math.sin(t * m.freqX + m.phaseX) * m.idleAmpX;
        const idleY = Math.sin(t * m.freqY + m.phaseY) * m.idleAmpY;
        const idleRot = Math.sin(t * m.freqR + m.phaseR) * m.idleAmpR;

        // ---- Cursor reaction ----
        let reactX = 0;
        let reactY = 0;
        let reactRot = 0;
        let reactScale = 0;
        let eyeTargetX = 0;
        let eyeTargetY = 0;
        let alertness = 0; // 0..1 — fed into glow + pupil dilation

        if (p.active) {
          const dx = p.x - m.centerX;
          const dy = p.y - m.centerY;
          const dist = Math.hypot(dx, dy);
          if (dist < REACH) {
            const k = 1 - dist / REACH;
            const falloff = k * k * (3 - 2 * k); // smoothstep
            const ux = dx / Math.max(1, dist);
            const uy = dy / Math.max(1, dist);
            const sign = m.curiosity >= 0 ? 1 : -1;
            const mag = Math.abs(m.curiosity);
            reactX = ux * LEAN * mag * sign * falloff;
            reactY = uy * LEAN * mag * sign * falloff;
            reactRot = ux * ROT * sign * falloff;
            // Curious tiles grow toward you, shy tiles shrink back
            reactScale = SCALE_RANGE * mag * sign * falloff;
            alertness = falloff;
            // Eyes always track the cursor (even shy ones — they watch warily)
            const eyeRange = 3.5;
            eyeTargetX = ux * eyeRange;
            eyeTargetY = uy * eyeRange;
          }
        }

        // ---- Compose targets and integrate spring ----
        const tx = idleX + reactX;
        const ty = idleY + reactY;
        const trot = idleRot + reactRot;
        const tscale = 1 + reactScale;
        const tpupil = 1 + alertness * 0.35; // dilate when noticed

        m.vx = (m.vx + (tx - m.x) * STIFF) * DAMP;
        m.x += m.vx;
        m.vy = (m.vy + (ty - m.y) * STIFF) * DAMP;
        m.y += m.vy;
        m.vrot = (m.vrot + (trot - m.rot) * STIFF) * DAMP;
        m.rot += m.vrot;
        m.vscale = (m.vscale + (tscale - m.scale) * STIFF * 1.3) * DAMP;
        m.scale += m.vscale;

        m.veyeX = (m.veyeX + (eyeTargetX - m.eyeX) * EYE_STIFF) * EYE_DAMP;
        m.eyeX += m.veyeX;
        m.veyeY = (m.veyeY + (eyeTargetY - m.eyeY) * EYE_STIFF) * EYE_DAMP;
        m.eyeY += m.veyeY;

        m.vpupilScale =
          (m.vpupilScale + (tpupil - m.pupilScale) * STIFF * 1.5) * DAMP;
        m.pupilScale += m.vpupilScale;

        // ---- Blink ----
        if (m.blinkDir === 1) {
          // Waiting for next blink
          if (now >= m.nextBlinkAt && m.blink === 0) {
            m.blink = 0.001; // kick the closing phase
          }
          if (m.blink > 0) {
            m.blink += (dt / 70); // close in ~70ms
            if (m.blink >= 1) {
              m.blink = 1;
              m.blinkDir = -1;
            }
          }
        } else {
          m.blink -= dt / 90; // open in ~90ms
          if (m.blink <= 0) {
            m.blink = 0;
            m.blinkDir = 1;
            // Schedule next blink — alertness shortens the interval slightly
            const base = 3200 + Math.random() * 4500;
            m.nextBlinkAt = now + base * (1 - alertness * 0.4);
          }
        }
        const eyeOpenness = 1 - m.blink;

        // ---- Write transforms ----
        m.card.style.transform = `translate3d(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px, 0) rotate(${m.rot.toFixed(3)}deg) scale(${m.scale.toFixed(4)})`;

        if (m.glow) {
          m.glow.style.opacity = (alertness * 0.55).toFixed(3);
        }
        if (m.eyeL && m.eyeR) {
          const s = `scaleY(${eyeOpenness.toFixed(3)})`;
          m.eyeL.style.transform = s;
          m.eyeR.style.transform = s;
        }
        if (m.pupilL && m.pupilR) {
          const p2 = `translate(${m.eyeX.toFixed(2)}px, ${m.eyeY.toFixed(2)}px) scale(${m.pupilScale.toFixed(3)})`;
          m.pupilL.style.transform = p2;
          m.pupilR.style.transform = p2;
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background:
          "radial-gradient(ellipse at 50% 30%, #1a1a22 0%, #0a0a0c 60%)",
        color: text.dark.primary,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "72px 40px",
      }}
    >
      <Header />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 20,
          maxWidth: 1280,
          margin: "48px auto 0",
          // perspective lets rotation feel slightly tangible without going 3D
        }}
      >
        {galleryDemos.map((demo, i) => (
          <CreatureTile
            key={demo.path}
            demo={demo}
            index={i}
            register={(refs) => {
              const m = motionsRef.current[i];
              if (!m) return;
              Object.assign(m, refs);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: text.dark.tertiary,
          marginBottom: 14,
        }}
      >
        Playground · {galleryDemos.length} creatures
      </div>
      <h1
        style={{
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: text.dark.primary,
        }}
      >
        Move the cursor.
        <span style={{ color: text.dark.tertiary, fontWeight: 400 }}>
          {" "}
          They're watching.
        </span>
      </h1>
    </header>
  );
}

interface RegisterRefs {
  card: HTMLDivElement | null;
  glow: HTMLDivElement | null;
  eyeL: HTMLDivElement | null;
  eyeR: HTMLDivElement | null;
  pupilL: HTMLDivElement | null;
  pupilR: HTMLDivElement | null;
}

function CreatureTile({
  demo,
  index,
  register,
}: {
  demo: (typeof galleryDemos)[number];
  index: number;
  register: (refs: RegisterRefs) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const eyeLRef = useRef<HTMLDivElement>(null);
  const eyeRRef = useRef<HTMLDivElement>(null);
  const pupilLRef = useRef<HTMLDivElement>(null);
  const pupilRRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    register({
      card: cardRef.current,
      glow: glowRef.current,
      eyeL: eyeLRef.current,
      eyeR: eyeRRef.current,
      pupilL: pupilLRef.current,
      pupilR: pupilRRef.current,
    });
  }, [register]);

  return (
    <div style={{ position: "relative" }}>
      {/* Glow halo, driven by alertness */}
      <div
        ref={glowRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: -3,
          borderRadius: 18,
          background: `radial-gradient(60% 60% at 50% 50%, hsla(${demo.hue}, 70%, 60%, 1) 0%, transparent 70%)`,
          filter: "blur(22px)",
          opacity: 0,
          pointerEvents: "none",
          willChange: "opacity",
        }}
      />
      <Link
        to={demo.path}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <div
          ref={cardRef}
          style={{
            background: demo.bg,
            borderRadius: 14,
            padding: "32px 28px",
            border: "1px solid rgba(255,255,255,0.08)",
            position: "relative",
            // willChange hints make 60fps reliable for 14 simultaneous tiles
            willChange: "transform",
            transformOrigin: "center center",
          }}
        >
          <CreatureEyes
            hue={demo.hue}
            eyeLRef={eyeLRef}
            eyeRRef={eyeRRef}
            pupilLRef={pupilLRef}
            pupilRRef={pupilRRef}
            index={index}
          />

          <h2
            style={{
              fontSize: 19,
              fontWeight: 600,
              marginBottom: 8,
              marginTop: 4,
              letterSpacing: "-0.005em",
            }}
          >
            {demo.title}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: text.dark.tertiary,
              lineHeight: 1.55,
            }}
          >
            {demo.description}
          </p>
        </div>
      </Link>
    </div>
  );
}

function CreatureEyes({
  hue,
  eyeLRef,
  eyeRRef,
  pupilLRef,
  pupilRRef,
  index,
}: {
  hue: number;
  eyeLRef: React.RefObject<HTMLDivElement | null>;
  eyeRRef: React.RefObject<HTMLDivElement | null>;
  pupilLRef: React.RefObject<HTMLDivElement | null>;
  pupilRRef: React.RefObject<HTMLDivElement | null>;
  index: number;
}) {
  // Small visual variation per tile — some have round eyes, some almond,
  // some closer together. Seeded so it's stable.
  const rng = seeded(index + 7);
  const eyeSize = 11 + Math.round(rng() * 3); // 11..14
  const eyeGap = 5 + Math.round(rng() * 4); // 5..9

  const sclera = `hsla(${hue}, 30%, 94%, 0.95)`;
  const irisOuter = `hsla(${hue}, 20%, 88%, 0.85)`;

  const eyeBaseStyle: React.CSSProperties = {
    position: "relative",
    width: eyeSize,
    height: eyeSize,
    borderRadius: "50%",
    background: `radial-gradient(circle at 50% 40%, ${sclera} 0%, ${irisOuter} 100%)`,
    overflow: "hidden",
    transformOrigin: "center center",
    willChange: "transform",
    boxShadow: "0 1px 1px rgba(0,0,0,0.25)",
  };

  const pupilSize = Math.round(eyeSize * 0.5);
  const pupilStyle: React.CSSProperties = {
    position: "absolute",
    top: (eyeSize - pupilSize) / 2,
    left: (eyeSize - pupilSize) / 2,
    width: pupilSize,
    height: pupilSize,
    borderRadius: "50%",
    background: "#0a0a0c",
    willChange: "transform",
    boxShadow: "inset -1px -1px 1px rgba(255,255,255,0.18)",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 18,
        display: "flex",
        gap: eyeGap,
        alignItems: "center",
      }}
    >
      <div ref={eyeLRef} style={eyeBaseStyle}>
        <div ref={pupilLRef} style={pupilStyle} />
      </div>
      <div ref={eyeRRef} style={eyeBaseStyle}>
        <div ref={pupilRRef} style={pupilStyle} />
      </div>
    </div>
  );
}
