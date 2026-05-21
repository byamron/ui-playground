import { useNavigate } from "react-router-dom";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  memo,
  forwardRef,
  type CSSProperties,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { galleryDemos } from "./demos";
import {
  measureSlot,
  seedVariance,
  DEFAULT_VARIANCE,
  type CoinVariance,
  FLIGHT_JACKPOT,
  COIN_STAGGER,
  SLOT_HOVER_GAP,
  COIN_DIAMETER,
} from "./arcade/coinPhysics";
import { arcadeAudio } from "./arcade/audio";

const MONO = `"SF Mono", "JetBrains Mono", "Courier New", ui-monospace, monospace`;
const ARCADE_BG = "#06060a";

// Arcade-cabinet wall — drag a coin from the bag in the corner onto any
// cabinet's slot to credit it, then tap to play.
//
// State per cabinet:
//   idle          → dim, slot dark, drag a coin here to credit
//   inserting     → coin is mid-flight or being inserted; slot is hot/locked
//   credited      → cabinet boots, CREDITS · 01, big TAP TO PLAY button
//   launching     → quick CRT power-on flash → navigate
//   powering_off  → reset choreography; CRT collapses, then becomes idle

type CabinetState =
  | "idle"
  | "inserting"
  | "credited"
  | "launching"
  | "powering_off";

interface DragState {
  // Position tracks the cursor 1:1 — the cursor IS the user's hand.
  x: number;
  y: number;
  hoveredPath: string | null;
  // Which chip in the bag was grabbed (0..2). The bag hides that chip
  // while it's being held — the user is literally holding it.
  chipIndex: number;
  // RotateX in degrees, driven by cursor proximity to the nearest idle
  // slot. The wrist-tilt of "I'm about to insert this." Position never
  // changes from the magnet — only the tilt does. 0 in drop variant.
  tilt: number;
}

// One in-flight coin insertion (either a drag-drop or a jackpot member).
interface FlyingCoin {
  id: number;
  path: string;
  startX: number;
  startY: number;
  // RotateX (deg) when the insertion animation takes over from the drag.
  // For drag-drops this is whatever proximity-tilt the user reached; for
  // jackpots it's 0 (coin starts face-on at the bag).
  startTilt: number;
  // Slot geometry — measured at launch so layout shifts don't yank coins.
  targetCenterX: number;
  targetSlitY: number;
  targetTopY: number;
  hue: number;
  delay: number; // seconds before this coin launches
  flightDuration: number; // seconds for the approach (0 = drag-drop, no flight)
  variance: CoinVariance;
  // Bag chip index this coin came from (null for jackpot — jackpot doesn't
  // remove from the visible pile). Used to refill the chip after the
  // animation completes.
  chipIndex: number | null;
}

// Slot and TAP-TO-PLAY button share these dimensions so the footer never
// reflows when a cabinet transitions from idle → credited.
const FOOTER_CTA_WIDTH = 168;
const FOOTER_CTA_HEIGHT = 32;

const HOT = "#ffd35a"; // coin/credit yellow

export type CoinInsertVariant = "tip" | "drop";
export type RefillDirection = "pop" | "drop";

type ChipPresence = "present" | "missing";

interface FallingCoin {
  id: number;
  startX: number;
  startY: number;
  chipIndex: number;
}

export function ArcadeGallery({
  audio,
  coinInsert,
  refill,
}: {
  audio: boolean;
  coinInsert: CoinInsertVariant;
  refill: RefillDirection;
}) {
  // Per-cabinet state, keyed by demo path
  const [states, setStates] = useState<Record<string, CabinetState>>(() =>
    Object.fromEntries(galleryDemos.map((d) => [d.path, "idle" as CabinetState]))
  );

  const [drag, setDrag] = useState<DragState | null>(null);
  const [flyingCoins, setFlyingCoins] = useState<FlyingCoin[]>([]);
  const [fallingCoins, setFallingCoins] = useState<FallingCoin[]>([]);
  const [chipPresence, setChipPresence] = useState<ChipPresence[]>([
    "present",
    "present",
    "present",
  ]);
  const flyingIdRef = useRef(0);
  const fallingIdRef = useRef(0);

  const removeChip = useCallback((idx: number) => {
    setChipPresence((prev) => {
      if (prev[idx] === "missing") return prev;
      const next = prev.slice();
      next[idx] = "missing";
      return next;
    });
  }, []);

  const refillChip = useCallback((idx: number) => {
    setChipPresence((prev) => {
      if (prev[idx] === "present") return prev;
      const next = prev.slice();
      next[idx] = "present";
      return next;
    });
  }, []);

  const launchTimers = useRef<Record<string, number>>({});
  const resetTimers = useRef<number[]>([]);
  const navigate = useNavigate();

  // Stable refs so the drag handler doesn't re-bind on every state change.
  const statesRef = useRef(states);
  useEffect(() => {
    statesRef.current = states;
  }, [states]);
  const variantRef = useRef(coinInsert);
  useEffect(() => {
    variantRef.current = coinInsert;
  }, [coinInsert]);

  // Push audio toggle into the singleton so coin/launch callbacks read the
  // latest value without prop drilling into every animation component.
  useEffect(() => {
    arcadeAudio.setEnabled(audio);
  }, [audio]);

  const setCabinetState = useCallback((path: string, next: CabinetState) => {
    setStates((prev) => ({ ...prev, [path]: next }));
  }, []);

  // Mark the slot as accepting a coin — locks it, lights it hot, prevents
  // jackpot from re-targeting. Called at the moment the coin is *committed*
  // (drop landed on slot / jackpot launches), not when the coin actually
  // touches the slit.
  const markInserting = useCallback(
    (path: string) => {
      setCabinetState(path, "inserting");
    },
    [setCabinetState]
  );

  // Credit the cabinet — fires at the end of the coin's insertion animation,
  // when the coin has fully disappeared into the slot.
  const creditCabinet = useCallback(
    (path: string) => {
      setCabinetState(path, "credited");
    },
    [setCabinetState]
  );

  const launch = useCallback(
    (path: string) => {
      setCabinetState(path, "launching");
      arcadeAudio.whoosh();
      window.clearTimeout(launchTimers.current[path]);
      launchTimers.current[path] = window.setTimeout(() => {
        navigate(path);
      }, 420);
    },
    [navigate, setCabinetState]
  );

  // Cleanup on unmount
  useEffect(() => {
    const lau = launchTimers.current;
    const res = resetTimers.current;
    return () => {
      Object.values(lau).forEach((t) => window.clearTimeout(t));
      res.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Jackpot — fling a coin into every idle slot at once, staggered so the
  // burst reads like a payout rather than an instant fill.
  const triggerJackpot = useCallback(
    (originX: number, originY: number) => {
      if (flyingCoins.length > 0) return;

      const idleDemos = galleryDemos.filter((d) => states[d.path] === "idle");
      if (idleDemos.length === 0) return;

      const coins: FlyingCoin[] = [];
      idleDemos.forEach((demo, i) => {
        const slot = measureSlot(demo.path);
        if (!slot) return;
        coins.push({
          id: flyingIdRef.current++,
          path: demo.path,
          startX: originX,
          startY: originY,
          startTilt: 0,
          targetCenterX: slot.centerX,
          targetSlitY: slot.slitY,
          targetTopY: slot.topY,
          hue: demo.hue,
          delay: i * COIN_STAGGER,
          flightDuration: FLIGHT_JACKPOT,
          variance: seedVariance(i),
          chipIndex: null,
        });
      });

      // Lock the slots immediately so a subsequent jackpot can't re-target
      // the same idle cabinets, and so the slot icon stays hot through the
      // entire approach.
      coins.forEach((c) => markInserting(c.path));
      setFlyingCoins((prev) => [...prev, ...coins]);
    },
    [flyingCoins.length, markInserting, states]
  );

  // Reset — choreographed reverse: last cabinet powers off first, walking
  // back to the first. Each cabinet plays a CRT collapse, then becomes idle.
  const resetCabinets = useCallback(() => {
    if (flyingCoins.length > 0) return;
    galleryDemos.forEach((_, i) => {
      const idx = galleryDemos.length - 1 - i;
      const path = galleryDemos[idx].path;
      const offDelay = i * 80;
      const idleDelay = offDelay + 220;
      const t1 = window.setTimeout(() => {
        setCabinetState(path, "powering_off");
        arcadeAudio.powerDown();
      }, offDelay);
      const t2 = window.setTimeout(() => {
        setCabinetState(path, "idle");
      }, idleDelay);
      resetTimers.current.push(t1, t2);
    });
  }, [flyingCoins.length, setCabinetState]);

  // Coin reached the slit — light slot already locked, play the click SFX,
  // and start the descent (handled by the coin animation itself).
  const handleCoinImpact = useCallback(() => {
    arcadeAudio.click();
  }, []);

  // Coin fully inserted — credit the cabinet, play the thunk SFX, drop
  // the coin from the in-flight list, and refill the bag chip it came
  // from (only for drag-drop coins; jackpot coins have chipIndex: null).
  const handleCoinComplete = useCallback(
    (id: number, path: string) => {
      arcadeAudio.thunk();
      creditCabinet(path);
      setFlyingCoins((prev) => {
        const gone = prev.find((c) => c.id === id);
        if (gone && gone.chipIndex !== null) refillChip(gone.chipIndex);
        return prev.filter((c) => c.id !== id);
      });
    },
    [creditCabinet, refillChip]
  );

  // Drag lifecycle.
  //
  // Position is 1:1 with the cursor — the cursor IS the user's hand. Tilt
  // (rotateX) is the wrist-rotation of "I'm about to insert this": driven
  // by cursor proximity to the nearest idle slot. Far → coin face-on.
  // Close → coin edge-on. The user feels they're orienting the coin by
  // moving the cursor, not watching a software animation take over.
  //
  // On release the coin is at the right place with the right orientation;
  // the insertion animation has only gravity to apply.
  const startDrag = useCallback(
    (e: React.PointerEvent, chipIndex: number) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;

      // Cache slot positions once per drag — getBoundingClientRect on every
      // pointermove would be 16 reads per frame.
      const idleSlots: { centerX: number; slitY: number }[] = [];
      for (const demo of galleryDemos) {
        if (statesRef.current[demo.path] !== "idle") continue;
        const slot = measureSlot(demo.path);
        if (slot) idleSlots.push({ centerX: slot.centerX, slitY: slot.slitY });
      }

      const TILT_FAR = 50; // px — past this, no tilt (tip kicks in only when close)
      const TILT_NEAR = 6; // px — at this distance, full tilt
      const TILT_MAX = 80; // degrees

      const computeTilt = (cx: number, cy: number): number => {
        if (variantRef.current === "drop") return 0;
        let minDist = Infinity;
        for (const s of idleSlots) {
          const d = Math.hypot(cx - s.centerX, cy - s.slitY);
          if (d < minDist) minDist = d;
        }
        if (minDist >= TILT_FAR) return 0;
        if (minDist <= TILT_NEAR) return TILT_MAX;
        return ((TILT_FAR - minDist) / (TILT_FAR - TILT_NEAR)) * TILT_MAX;
      };

      // The chip is in the user's hand now — remove from the visible pile.
      removeChip(chipIndex);
      setDrag({
        x: startX,
        y: startY,
        hoveredPath: null,
        chipIndex,
        tilt: computeTilt(startX, startY),
      });

      const hitTest = (clientX: number, clientY: number): string | null => {
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return null;
        const slot = el.closest("[data-cabinet-slot]") as HTMLElement | null;
        return slot?.dataset.cabinetSlot ?? null;
      };

      const onMove = (ev: PointerEvent) => {
        const hoveredPath = hitTest(ev.clientX, ev.clientY);
        setDrag({
          x: ev.clientX,
          y: ev.clientY,
          hoveredPath,
          chipIndex,
          tilt: computeTilt(ev.clientX, ev.clientY),
        });
      };

      const onUp = (ev: PointerEvent) => {
        const target = hitTest(ev.clientX, ev.clientY);
        if (target && statesRef.current[target] === "idle") {
          const demo = galleryDemos.find((d) => d.path === target);
          const slot = measureSlot(target);
          if (demo && slot) {
            // Spawn at cursor with the tilt the user reached. Insertion
            // is gravity-only from here — no separate tip phase.
            const coin: FlyingCoin = {
              id: flyingIdRef.current++,
              path: target,
              startX: ev.clientX,
              startY: ev.clientY,
              startTilt: computeTilt(ev.clientX, ev.clientY),
              targetCenterX: slot.centerX,
              targetSlitY: slot.slitY,
              targetTopY: slot.topY,
              hue: demo.hue,
              delay: 0,
              flightDuration: 0,
              variance: DEFAULT_VARIANCE,
              chipIndex,
            };
            markInserting(target);
            setFlyingCoins((prev) => [...prev, coin]);
          } else {
            // Couldn't measure slot — recover the chip back into the bag.
            refillChip(chipIndex);
          }
          setDrag(null);
        } else {
          // Miss — drop the coin to the floor (gravity), then refill the
          // chip when it lands. No more springback to the bag.
          const falling: FallingCoin = {
            id: fallingIdRef.current++,
            startX: ev.clientX,
            startY: ev.clientY,
            chipIndex,
          };
          setFallingCoins((prev) => [...prev, falling]);
          setDrag(null);
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [markInserting, refillChip, removeChip]
  );

  const handleFallingComplete = useCallback(
    (id: number, chipIndex: number) => {
      refillChip(chipIndex);
      setFallingCoins((prev) => prev.filter((c) => c.id !== id));
    },
    [refillChip]
  );

  const hasIdle = useMemo(
    () => Object.values(states).some((s) => s === "idle"),
    [states]
  );
  // "All credited" is the right time to offer RESET — once every cabinet has
  // received its coin and is showing TAP TO PLAY (or has just been launched).
  const allCredited = useMemo(
    () =>
      Object.values(states).every(
        (s) => s === "credited" || s === "launching"
      ),
    [states]
  );

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: `
          radial-gradient(ellipse at 50% 0%, #1a0d2a 0%, ${ARCADE_BG} 55%),
          ${ARCADE_BG}
        `,
        color: "#f5f0ff",
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily: MONO,
        position: "relative",
        cursor: drag ? "grabbing" : "auto",
        userSelect: drag ? "none" : "auto",
      }}
    >
      <ScreenOverlay />

      <div style={{ position: "relative", padding: "0 32px 96px" }}>
        <Marquee />
        <div
          style={{
            maxWidth: 1280,
            margin: "32px auto 0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {galleryDemos.map((demo, i) => (
            <CabinetTile
              key={demo.path}
              demo={demo}
              index={i}
              state={states[demo.path]}
              slotActive={drag?.hoveredPath === demo.path && states[demo.path] === "idle"}
              onLaunch={launch}
            />
          ))}
        </div>
        <Footer />
      </div>

      <CoinBag
        onStartDrag={startDrag}
        dragging={!!drag}
        chipPresence={chipPresence}
        refillDir={refill}
        onJackpot={triggerJackpot}
        onReset={resetCabinets}
        hasIdle={hasIdle}
        allCredited={allCredited}
        coinsInFlight={flyingCoins.length > 0}
      />

      {/* Coins that missed the slot — fall to the floor and disappear. */}
      {fallingCoins.map((coin) => (
        <FallingCoin
          key={coin.id}
          coin={coin}
          onComplete={handleFallingComplete}
        />
      ))}

      {/* Dragged coin sits outside the perspective wrapper — it has no
          parent perspective context, but does use inline perspective in
          its own transform so the tilt reads as 3D. */}
      {drag && (
        <DraggedCoin x={drag.x} y={drag.y} tilt={drag.tilt} />
      )}

      {/* Perspective wrapper for in-flight coin 3D tilt. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 200,
          perspective: "900px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        {/* Each insertion is wrapped in a CoinWrapper that clips the
            coin below the slot — but only during the *descent*. Without
            the deferral, jackpot coins launching from the bag (below
            the slot in viewport coords) would be invisible during their
            arc, looking like they materialize out of the cabinets. */}
        {flyingCoins.map((coin) => (
          <CoinWrapper
            key={coin.id}
            coin={coin}
            variant={coinInsert}
            onImpact={handleCoinImpact}
            onComplete={handleCoinComplete}
          />
        ))}
      </div>
    </div>
  );
}

// -- Cabinet ------------------------------------------------------------------

// Memoized so a parent re-render (triggered every pointer-move during drag)
// doesn't churn 16 cabinet subtrees. The CabinetTile only re-renders when
// one of these specific props changes.
const CabinetTile = memo(function CabinetTile({
  demo,
  index,
  state,
  slotActive,
  onLaunch,
}: {
  demo: (typeof galleryDemos)[number];
  index: number;
  state: CabinetState;
  slotActive: boolean;
  onLaunch: (path: string) => void;
}) {
  // Hover state is *slot-only* — the cabinet itself doesn't translate, glow,
  // or otherwise pretend to be clickable. The slot is the click target; the
  // hover tells the user where to aim.
  const [slotHover, setSlotHover] = useState(false);

  const playerNum = (index % 2) + 1;
  const glow = `hsl(${demo.hue}, 80%, 60%)`;
  const glowDim = `hsl(${demo.hue}, 80%, 50%)`;

  // "Lit" stays on through reset's CRT collapse so the powering-off animation
  // has something to collapse *from*. The transition back to idle's dim
  // styling happens via CSS transitions on color/border/etc.
  const lit =
    state === "credited" ||
    state === "launching" ||
    state === "powering_off";
  const armed = state === "credited";

  return (
    <article
      onMouseEnter={() => setSlotHover(true)}
      onMouseLeave={() => setSlotHover(false)}
      style={{
        position: "relative",
        background: `
          radial-gradient(ellipse at 50% 30%, hsla(${demo.hue}, 50%, 20%, 0.8) 0%, hsla(${demo.hue}, 60%, 8%, 0.95) 70%),
          #050308
        `,
        border: `1px solid ${
          lit || slotActive ? glow : "rgba(255,255,255,0.08)"
        }`,
        borderRadius: 8,
        padding: "20px 18px 16px",
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "border-color 0.2s ease",
        boxShadow: lit
          ? `0 0 32px ${glow}88, inset 0 0 48px ${glowDim}55`
          : slotActive
            ? `0 0 24px ${glow}aa, inset 0 0 40px ${glowDim}55`
            : `inset 0 0 24px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Per-tile scanlines */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 2px, transparent 4px)",
          opacity: 0.7,
        }}
      />

      {/* Boot flicker overlay */}
      <AnimatePresence>
        {state === "credited" && (
          <motion.div
            key="boot"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(ellipse at 50% 50%, ${glow}55 0%, transparent 70%)`,
              mixBlendMode: "screen",
              animation: "bootFlicker 700ms ease-out",
            }}
          />
        )}
      </AnimatePresence>

      {/* Launch flash */}
      <AnimatePresence>
        {state === "launching" && (
          <motion.div
            key="launch"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: glow,
              zIndex: 5,
              animation: "powerOn 380ms ease-out",
              transformOrigin: "center center",
            }}
          />
        )}
      </AnimatePresence>

      {/* Power-off CRT collapse — fires during the reset choreography. */}
      <AnimatePresence>
        {state === "powering_off" && (
          <motion.div
            key="powerOff"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: glow,
              zIndex: 5,
              animation: "powerOff 220ms ease-in forwards",
              transformOrigin: "center center",
            }}
          />
        )}
      </AnimatePresence>

      {/* Top status bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 9,
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.5)",
          position: "relative",
        }}
      >
        <span style={{ color: "#ff7be5" }}>
          CAB.{String(index + 1).padStart(2, "0")}
        </span>
        <span style={{ color: "#7be5ff" }}>{demo.genre}</span>
      </div>

      {/* HIGH SCORE */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: 10,
          letterSpacing: "0.16em",
          marginTop: 14,
          position: "relative",
          minHeight: 16,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.45)" }}>HIGH SCORE</span>
        <span
          style={{
            fontWeight: 700,
            color: HOT,
            textShadow: "0 0 6px rgba(255, 211, 90, 0.6)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {demo.highScore}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: 10,
          letterSpacing: "0.16em",
          marginTop: 6,
          position: "relative",
          minHeight: 16,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.45)" }}>CREDITS</span>
        <span
          style={{
            fontWeight: 700,
            color: lit ? "#7bff8a" : "rgba(255,255,255,0.25)",
            textShadow: lit ? "0 0 6px rgba(123, 255, 138, 0.7)" : "none",
            fontVariantNumeric: "tabular-nums",
            transition: "color 0.3s ease",
          }}
        >
          {lit ? "01" : "00"}
        </span>
      </div>

      {/* Title */}
      <h2
        style={{
          position: "relative",
          marginTop: "auto",
          paddingTop: 20,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "0.04em",
          lineHeight: 1.05,
          textTransform: "uppercase",
          color: lit ? "#ffffff" : "rgba(255,255,255,0.85)",
          textShadow: lit
            ? `0 0 10px ${glow}, 0 0 22px ${glow}aa, 2px 0 0 rgba(0, 200, 255, 0.7), -2px 0 0 rgba(255, 80, 80, 0.6)`
            : `1px 0 0 rgba(0, 200, 255, 0.4), -1px 0 0 rgba(255, 80, 80, 0.35)`,
          transition: "text-shadow 0.3s ease, color 0.3s ease",
        }}
      >
        {demo.title}
      </h2>

      {/* Footer — slot OR tap-to-play button */}
      <CabinetFooter
        path={demo.path}
        hue={demo.hue}
        state={state}
        slotActive={slotActive}
        slotHover={slotHover}
        armed={armed}
        glow={glow}
        playerNum={playerNum}
        onTap={() => onLaunch(demo.path)}
      />
    </article>
  );
});

function CabinetFooter({
  path,
  hue,
  state,
  slotActive,
  slotHover,
  armed,
  glow,
  playerNum,
  onTap,
}: {
  path: string;
  hue: number;
  state: CabinetState;
  slotActive: boolean;
  slotHover: boolean;
  armed: boolean;
  glow: string;
  playerNum: number;
  onTap: () => void;
}) {
  const showStart = armed || state === "launching";
  // Cabinet-hover lifts the slot's affordance without dressing up the cabinet
  // itself. Only applies in idle (no point highlighting a hot/credited slot).
  const slotHinted = slotHover && state === "idle" && !slotActive;
  return (
    <div
      style={{
        position: "relative",
        marginTop: 18,
        paddingTop: 14,
        borderTop: `1px solid ${
          showStart ? glow : slotActive ? glow : "rgba(255,255,255,0.12)"
        }`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 10,
        letterSpacing: "0.18em",
        transition: "border-color 0.3s ease",
        minHeight: 42,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {showStart ? (
          <motion.button
            key="tap"
            aria-label="Tap to play"
            onClick={onTap}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: 1,
              // Heartbeat pulse — all transform writes go through Framer so
              // they compose with whileHover/whileTap instead of fighting.
              scale: [1, 1.04, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.2 },
              scale: {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            style={{
              // Solid arcade LED button — high-saturation hue fill with dark
              // text. Inset highlight gives a chunky physical feel.
              background: `radial-gradient(ellipse at 50% 30%, hsl(${hue}, 95%, 72%) 0%, hsl(${hue}, 90%, 56%) 60%, hsl(${hue}, 85%, 44%) 100%)`,
              border: `1px solid hsl(${hue}, 90%, 38%)`,
              borderRadius: 5,
              width: FOOTER_CTA_WIDTH,
              height: FOOTER_CTA_HEIGHT,
              boxSizing: "border-box",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0a0a0a",
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textShadow: `0 1px 0 hsla(${hue}, 90%, 85%, 0.7)`,
              boxShadow: `
                0 0 14px ${glow}aa,
                0 0 28px ${glow}55,
                inset 0 1px 0 hsla(${hue}, 90%, 90%, 0.7),
                inset 0 -2px 3px hsla(${hue}, 90%, 25%, 0.45)
              `,
            }}
          >
            ▶ TAP TO PLAY
          </motion.button>
        ) : (
          <motion.div
            key="slot"
            data-cabinet-slot={path}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: FOOTER_CTA_WIDTH,
              height: FOOTER_CTA_HEIGHT,
              boxSizing: "border-box",
              padding: 0,
              borderRadius: 4,
              border: `1px dashed ${
                slotActive
                  ? glow
                  : slotHinted
                    ? "rgba(255,255,255,0.45)"
                    : "rgba(255,255,255,0.2)"
              }`,
              background: slotActive
                ? `linear-gradient(180deg, ${glow}33 0%, transparent 100%)`
                : "transparent",
              transition: "border-color 0.2s ease, background 0.2s ease",
            }}
          >
            <CoinSlotIcon active={state === "inserting"} hot={slotActive} />
            <span
              style={{
                color:
                  slotActive || state === "inserting"
                    ? "#fff"
                    : slotHinted
                      ? "#ffffff"
                      : "#7be5ff",
                textShadow:
                  slotActive || state === "inserting"
                    ? `0 0 8px ${glow}, 0 0 14px ${glow}aa`
                    : slotHinted
                      ? "0 0 8px rgba(255,255,255,0.5)"
                      : "0 0 6px rgba(123, 229, 255, 0.55)",
                animation:
                  state === "idle" && !slotActive && !slotHinted
                    ? "attractPulse 1.4s ease-in-out infinite"
                    : undefined,
                transition: "color 0.18s ease, text-shadow 0.18s ease",
              }}
            >
              INSERT COIN
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <span
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 10,
          letterSpacing: "0.18em",
        }}
      >
        {playerNum}P
      </span>
    </div>
  );
}

function CoinSlotIcon({ active, hot }: { active: boolean; hot: boolean }) {
  // Sized to match the coin's diameter (36) plus a few px of margin, so
  // the coin's edge profile when tilted (rotateX 92°) fits the opening.
  return (
    <span
      aria-hidden
      data-slot-icon
      style={{
        display: "inline-block",
        width: 42,
        height: 6,
        background: "rgba(0,0,0,0.7)",
        border: `1px solid ${hot || active ? HOT : "rgba(255,255,255,0.4)"}`,
        borderRadius: 2,
        boxShadow: active
          ? `inset 0 0 6px ${HOT}, 0 0 12px ${HOT}cc`
          : hot
            ? `inset 0 0 6px ${HOT}cc, 0 0 8px ${HOT}88`
            : "inset 0 1px 2px rgba(0,0,0,0.7)",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
      }}
    />
  );
}

// -- Coin bag (the source of coins) -------------------------------------------

const CoinBag = memo(function CoinBag({
  onStartDrag,
  dragging,
  chipPresence,
  refillDir,
  onJackpot,
  onReset,
  hasIdle,
  allCredited,
  coinsInFlight,
}: {
  onStartDrag: (e: React.PointerEvent, chipIndex: number) => void;
  dragging: boolean;
  chipPresence: ChipPresence[];
  refillDir: RefillDirection;
  onJackpot: (originX: number, originY: number) => void;
  onReset: () => void;
  hasIdle: boolean;
  allCredited: boolean;
  coinsInFlight: boolean;
}) {
  const topCoinRef = useRef<HTMLDivElement>(null);
  const [ctaHover, setCtaHover] = useState(false);

  const showReset = allCredited && !coinsInFlight;
  const jackpotDisabled = !hasIdle || coinsInFlight || dragging;
  const ctaDisabled = showReset ? coinsInFlight : jackpotDisabled;

  const handleJackpot = () => {
    if (jackpotDisabled) return;
    const r = topCoinRef.current?.getBoundingClientRect();
    if (!r) return;
    onJackpot(r.left + r.width / 2, r.top + r.height / 2);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 80, // sits above the DevPanel "Tune" button
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        // Floating HUD panel — gives the label something solid to read
        // against and groups the bag + JACKPOT visually as one unit.
        padding: "12px 14px 14px",
        background:
          "linear-gradient(180deg, rgba(14, 8, 20, 0.78) 0%, rgba(6, 4, 10, 0.85) 100%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 211, 90, 0.16)",
        borderRadius: 12,
        boxShadow:
          "0 8px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255, 211, 90, 0.08)",
        pointerEvents: "none", // children opt in
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.78)",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {showReset ? (
          <>ALL CABINETS LIT
            <br />
            RESET TO REPLAY
          </>
        ) : (
          <>INSERT COIN
            <br />
            TO PLAY
          </>
        )}
      </div>

      <div
        style={{
          position: "relative",
          width: 72,
          // Sized so the chip cluster is equidistant from label and button.
          // Highest chip top edge at 56px from container bottom → 4px of
          // breathing room at top matches the chip-0 bottom: 4 → equal
          // visual gap to label and button (12px flex gap + 4px on each
          // side = 16px both).
          height: 60,
          pointerEvents: "auto",
        }}
      >
        {/* A scattered pile — three chips tossed loosely, any grabbable.
            Each chip is independent of the others; on grab it disappears
            from the pile until the coin's journey (insertion or fall)
            completes, then re-enters from above or below. */}
        <AnimatePresence>
          {[
            { idx: 0, left: 6, bottom: 4, rot: -14, dur: 2.6, delay: 0 },
            { idx: 1, left: 22, bottom: 10, rot: 7, dur: 3.1, delay: 0.7 },
            { idx: 2, left: 12, bottom: 20, rot: -3, dur: 2.9, delay: 0.35 },
          ].map((c) =>
            chipPresence[c.idx] !== "present" ? null : (
              <PileChip
                key={c.idx}
                ref={c.idx === 2 ? topCoinRef : undefined}
                baseLeft={c.left}
                baseBottom={c.bottom}
                baseRot={c.rot}
                dur={c.dur}
                delay={c.delay}
                excited={ctaHover && !ctaDisabled}
                refillDir={refillDir}
                onPointerDown={(e) => onStartDrag(e, c.idx)}
              />
            ),
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.button
          key={showReset ? "reset" : "jackpot"}
          type="button"
          onClick={showReset ? onReset : handleJackpot}
          disabled={ctaDisabled}
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          initial={{ opacity: 0, y: 6 }}
          exit={{ opacity: 0, y: -6 }}
          // Continuous breathing — the button is *never* static. Idle
          // breathes slowly; hover speeds up the cycle and brightens
          // the peaks. The animation never stops, so the button reads as
          // always alive and waiting.
          animate={
            ctaDisabled
              ? { opacity: 1, y: 0, scale: 1 }
              : ctaHover
                ? {
                    opacity: 1,
                    y: 0,
                    scale: [1.05, 1.07, 1.05],
                    boxShadow: [
                      "0 0 22px rgba(255, 211, 90, 0.55), 0 0 44px rgba(255, 211, 90, 0.22), inset 0 0 18px rgba(255, 211, 90, 0.22)",
                      "0 0 34px rgba(255, 211, 90, 0.95), 0 0 64px rgba(255, 211, 90, 0.45), inset 0 0 26px rgba(255, 211, 90, 0.38)",
                      "0 0 22px rgba(255, 211, 90, 0.55), 0 0 44px rgba(255, 211, 90, 0.22), inset 0 0 18px rgba(255, 211, 90, 0.22)",
                    ],
                  }
                : {
                    opacity: 1,
                    y: 0,
                    scale: [1, 1.015, 1],
                    boxShadow: [
                      "0 0 14px rgba(255, 211, 90, 0.32), inset 0 0 12px rgba(255, 211, 90, 0.12)",
                      "0 0 22px rgba(255, 211, 90, 0.55), inset 0 0 18px rgba(255, 211, 90, 0.22)",
                      "0 0 14px rgba(255, 211, 90, 0.32), inset 0 0 12px rgba(255, 211, 90, 0.12)",
                    ],
                  }
          }
          transition={
            ctaDisabled
              ? { duration: 0.22 }
              : ctaHover
                ? {
                    opacity: { duration: 0.22 },
                    y: { duration: 0.22 },
                    scale: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
                    boxShadow: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
                  }
                : {
                    opacity: { duration: 0.22 },
                    y: { duration: 0.22 },
                    scale: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                    boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                  }
          }
          whileTap={{ scale: 0.96, transition: { duration: 0.08 } }}
          style={{
            pointerEvents: "auto",
            position: "relative",
            width: 116,
            height: 60,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "8px 10px 6px",
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.24em",
            border: `1px solid ${ctaDisabled ? "rgba(255,255,255,0.15)" : "#ffd35a"}`,
            borderRadius: 6,
            background: ctaDisabled
              ? "rgba(20,12,4,0.6)"
              : "radial-gradient(ellipse at 50% 30%, rgba(255, 230, 130, 0.22) 0%, rgba(120, 70, 10, 0.22) 70%, rgba(20,12,4,0.85) 100%)",
            color: ctaDisabled ? "rgba(255,255,255,0.3)" : "#ffe89b",
            textShadow: ctaDisabled
              ? "none"
              : "0 0 8px rgba(255, 211, 90, 0.7), 2px 0 0 rgba(255, 60, 180, 0.35), -2px 0 0 rgba(0, 200, 255, 0.35)",
            cursor: ctaDisabled ? "not-allowed" : "pointer",
            overflow: "hidden",
          }}
        >
          {/* Slow shimmer sweep across the button — always running,
              faster on hover. */}
          {!ctaDisabled && (
            <motion.div
              aria-hidden
              animate={{ x: ["-120%", "220%"] }}
              transition={{
                duration: ctaHover ? 1.4 : 3.2,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "60%",
                height: "100%",
                background:
                  "linear-gradient(110deg, transparent 0%, rgba(255, 240, 180, 0.18) 50%, transparent 100%)",
                pointerEvents: "none",
              }}
            />
          )}
          {showReset && <ResetGlyph active={!ctaDisabled} />}
          <span
            style={{
              lineHeight: 1,
              position: "relative",
              fontSize: showReset ? 11 : 14,
            }}
          >
            {showReset ? "RESET" : "JACKPOT"}
          </span>
        </motion.button>
      </AnimatePresence>
    </div>
  );
});

// A coin in the bag's pile. Three nested motion.divs:
//   Outer   one-shot entrance from above (refillDir="drop") or below
//           (refillDir="pop"). Spring with slight overshoot.
//   Middle  hover-state response — lifts +scales on hover (float).
//   Inner   continuous bob + rotate. Excited (JACKPOT hover) amps up
//           amplitude and speed. Phase-offset per chip so they don't
//           lock-step.
const PileChip = memo(
  forwardRef<
    HTMLDivElement,
    {
      baseLeft: number;
      baseBottom: number;
      baseRot: number;
      dur: number;
      delay: number;
      excited: boolean;
      refillDir: RefillDirection;
      onPointerDown?: (e: React.PointerEvent) => void;
    }
  >(function PileChip(
    {
      baseLeft,
      baseBottom,
      baseRot,
      dur,
      delay,
      excited,
      refillDir,
      onPointerDown,
    },
    ref,
  ) {
    const [hovered, setHovered] = useState(false);
    const ampRot = excited ? 6 : 0.8;
    const ampY = excited ? 2.5 : 0.5;
    const rotDur = excited ? dur * 0.22 : dur;
    const yDur = excited ? dur * 0.28 : dur * 1.1;

    // Entrance offset — coin slides in from outside the bag panel.
    const entranceY = refillDir === "pop" ? 70 : -70;

    return (
      <motion.div
        ref={ref}
        initial={{ y: entranceY, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{
          y: { type: "spring", damping: 14, stiffness: 240, mass: 0.6 },
          opacity: { duration: 0.18, ease: "easeOut" },
        }}
        style={{
          position: "absolute",
          left: baseLeft,
          bottom: baseBottom,
          width: 36,
          height: 36,
        }}
      >
        <motion.div
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onPointerDown={onPointerDown}
          role="button"
          aria-label="Drag coin"
          animate={hovered ? { y: -5, scale: 1.04 } : { y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 22,
            mass: 0.4,
          }}
          style={{
            width: 36,
            height: 36,
            cursor: "grab",
            touchAction: "none",
          }}
        >
          <motion.div
            animate={{
              rotate: [baseRot - ampRot, baseRot + ampRot, baseRot - ampRot],
              y: [-ampY, ampY, -ampY],
            }}
            transition={{
              rotate: {
                duration: rotDur,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              },
              y: {
                duration: yDur,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay + 0.2,
              },
            }}
            style={{
              ...coinStyle(36),
              boxShadow: hovered
                ? "0 6px 14px rgba(0,0,0,0.55), 0 0 12px rgba(255, 211, 90, 0.7), inset 0 -2px 3px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.75)"
                : "0 2px 6px rgba(0,0,0,0.45), inset 0 -2px 3px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.65)",
              transition: "box-shadow 0.18s ease-out",
            }}
          >
            $
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }),
);

// RESET glyph — a circular arrow drawn in SVG so it stays crisp at any size.
function ResetGlyph({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      width={26}
      height={26}
      viewBox="0 0 24 24"
      style={{
        color: active ? "#ffe89b" : "rgba(255,255,255,0.4)",
        filter: active ? "drop-shadow(0 0 4px rgba(255,211,90,0.7))" : "none",
        transition: "color 0.2s ease, filter 0.2s ease, transform 0.4s ease",
        transform: active ? "rotate(-40deg)" : "rotate(0deg)",
      }}
    >
      <path
        d="M12 4 V1 L7 5 L12 9 V6 a6 6 0 1 1 -5.66 8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CoinChip = forwardRef<
  HTMLDivElement,
  {
    style?: CSSProperties;
    interactive?: boolean;
    onPointerDown?: (e: React.PointerEvent) => void;
  }
>(function CoinChip({ style, interactive, onPointerDown }, ref) {
  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? "Drag coin" : undefined}
      style={{
        position: "absolute",
        ...style,
        ...coinStyle(36),
        cursor: interactive ? "grab" : "default",
        touchAction: "none",
      }}
    >
      $
    </div>
  );
});

// The coin while the user is holding it.
//
// Position: 1:1 with the cursor (no easing, no smoothing) so the drag
// feels glued to the cursor. Tilt: rotateX driven by proximity to the
// nearest idle slot — the user's wrist rotation as they approach. A tiny
// 50ms CSS transition on `transform` smooths sub-frame tilt jitter
// without lagging the position update.
//
// Inline `perspective` in the transform gives the tilt 3D foreshortening
// without putting the dragged coin in a perspective wrapper (which made
// the drag feel sluggish).
// A coin that missed the slot — drops straight down due to gravity until
// it's past the viewport, then unmounts at full opacity. After it lands,
// the orchestrator refills the bag chip it came from.
function FallingCoin({
  coin,
  onComplete,
}: {
  coin: FallingCoin;
  onComplete: (id: number, chipIndex: number) => void;
}) {
  const size = 36;
  const viewportH =
    typeof window !== "undefined" ? window.innerHeight : 1000;
  // Fall past the viewport bottom by a full coin so it's fully off-screen
  // before unmounting.
  const finalY = viewportH + size * 2;
  return (
    <motion.div
      aria-hidden
      initial={{ x: coin.startX, y: coin.startY }}
      animate={{ y: finalY }}
      transition={{ y: { duration: 0.7, ease: [0.4, 0, 0.85, 0.3] } }}
      onAnimationComplete={() => onComplete(coin.id, coin.chipIndex)}
      style={{
        position: "fixed",
        left: -size / 2,
        top: -size / 2,
        zIndex: 198,
        pointerEvents: "none",
        ...coinStyle(size),
        boxShadow:
          "0 6px 18px rgba(0,0,0,0.5), 0 0 14px rgba(255, 211, 90, 0.45), inset 0 -3px 4px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.6)",
      }}
    >
      $
    </motion.div>
  );
}

function DraggedCoin({
  x,
  y,
  tilt,
}: {
  x: number;
  y: number;
  tilt: number;
}) {
  const size = 36;
  // Two nested divs so position and tilt can be transitioned independently:
  //   Outer  — translate3d, no transition → glued to cursor.
  //   Inner  — perspective + rotateX with a 60ms transition → tilt smooths.
  // Splitting prevents the transform's transition from lagging position.
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 199,
        pointerEvents: "none",
        width: size,
        height: size,
        transform: `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`,
        willChange: "transform",
      }}
    >
      <div
        style={{
          ...coinStyle(size),
          transform: `perspective(900px) rotateX(${tilt}deg)`,
          transformOrigin: "center center",
          transition: "transform 60ms ease-out",
          boxShadow:
            "0 6px 18px rgba(0,0,0,0.5), 0 0 16px rgba(255, 211, 90, 0.55), inset 0 -3px 4px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.6)",
        }}
      >
        $
      </div>
    </div>
  );
}

// CoinInsertion — the post-release animation. Two modes:
//
//   Drag-drop (flightDuration === 0):
//     The user already aligned the coin via the drag magnet. The coin sits
//     at its current snapped position, with its current tilt. Animation =
//     pure gravity descent: ~14px straight down, accelerating from zero,
//     into the slit. Tilt rolls the last few degrees to 92° during the
//     descent so the edge clears the slit cleanly.
//
//   Jackpot (flightDuration > 0):
//     Coin starts at the bag, far from the slot. Two phases:
//       1. Approach — arc bag → above-slot, face-spinning (rotateY)
//       2. Insertion — same gravity descent as drag-drop
//     Alignment happens during the tail of the approach (rotateX ramps to
//     78°) so by the time the coin reaches the slot it's already edge-on.
//
// In both modes the coin's *visual* disappearance is real occlusion — a
// clip-path on the parent wrapper hides everything below the slot's bottom
// edge as the coin descends past it.
//
// onImpact fires when the coin's center first crosses the slit plane
// (click SFX). onComplete fires when the descent finishes (thunk SFX +
// credit the cabinet).

// Wraps a CoinInsertion with a clip-path that activates only during the
// descent. For drop mode (flightDuration === 0) the clip is on from t=0.
// For jackpot, the coin must remain visible during the entire arc from
// the bag (below the slot in viewport coords) to the slot — so the clip
// is deferred until the approach completes.
function CoinWrapper({
  coin,
  variant,
  onImpact,
  onComplete,
}: {
  coin: FlyingCoin;
  variant: CoinInsertVariant;
  onImpact: (id: number, path: string) => void;
  onComplete: (id: number, path: string) => void;
}) {
  const [clipping, setClipping] = useState(coin.flightDuration === 0);
  useEffect(() => {
    if (coin.flightDuration === 0) return;
    const t = window.setTimeout(
      () => setClipping(true),
      (coin.delay + coin.flightDuration) * 1000,
    );
    return () => window.clearTimeout(t);
  }, [coin.delay, coin.flightDuration]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        clipPath: clipping
          ? `inset(0 0 calc(100% - ${coin.targetSlitY + 3}px) 0)`
          : undefined,
      }}
    >
      <CoinInsertion
        coin={coin}
        variant={variant}
        onImpact={onImpact}
        onComplete={onComplete}
      />
    </div>
  );
}

function CoinInsertion({
  coin,
  variant,
  onImpact,
  onComplete,
}: {
  coin: FlyingCoin;
  variant: CoinInsertVariant;
  onImpact: (id: number, path: string) => void;
  onComplete: (id: number, path: string) => void;
}) {
  const size = COIN_DIAMETER;
  const v = coin.variance;
  const isDrop = coin.flightDuration === 0;
  const impactFiredRef = useRef(false);

  // Insertion endpoint: well below the slot so the clip-path fully hides it.
  const finalY = coin.targetSlitY + COIN_DIAMETER / 2 + 4;

  // Gravity descent: starts from zero velocity and accelerates.
  const GRAVITY_EASE = [0.35, 0, 0.9, 0.25] as const;

  // Edge-on tilt — 80° gives ~6px projected height which matches the slot
  // icon's height, so during the hold the coin's profile fills the slot.
  const EDGE_TILT = 80;

  if (isDrop) {
    // ============ Drop (drag-release) ==================================
    // The user already oriented the coin via the drag's proximity-tilt;
    // the insertion has only gravity to apply. Three independent property
    // animations, all single-segment, running in parallel:
    //
    //   X       startX → slotCenterX over 150ms (easeOut). Subtle
    //           correction if the cursor was slightly off-center.
    //           Invisible if the user aimed precisely.
    //   Y       startY → finalY over 400ms (gravity easeIn).
    //   rotateX startTilt → 80° over 100ms (easeOut). If the user
    //           reached full tilt already, this is a 0° change.
    //
    // No keyframes, no phases. The "edge-on in slot" moment happens
    // automatically when Y crosses slitY mid-descent.
    const onUpdate = (latest: { x: number; y: number }) => {
      const y = latest.y as number;
      if (!impactFiredRef.current && y >= coin.targetSlitY) {
        impactFiredRef.current = true;
        onImpact(coin.id, coin.path);
      }
    };
    const baseStyle: CSSProperties = {
      position: "fixed",
      left: -size / 2,
      top: -size / 2,
      pointerEvents: "none",
      ...coinStyle(size),
      boxShadow:
        "0 4px 10px rgba(0,0,0,0.5), 0 0 14px rgba(255, 211, 90, 0.55), inset 0 -3px 4px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.6)",
      transformStyle: "preserve-3d",
    };

    // Tip variant ends at 80°; drop variant stays face-on.
    const finalTilt = variant === "tip" ? EDGE_TILT : 0;

    return (
      <motion.div
        aria-hidden
        initial={{
          x: coin.startX,
          y: coin.startY,
          rotateX: coin.startTilt,
          rotateY: 0,
        }}
        animate={{
          x: coin.targetCenterX,
          y: finalY,
          rotateX: finalTilt,
        }}
        transition={{
          x: { duration: 0.15, ease: "easeOut" },
          y: { duration: 0.4, ease: GRAVITY_EASE as unknown as number[] },
          rotateX: { duration: 0.1, ease: "easeOut" },
        }}
        onUpdate={onUpdate}
        onAnimationComplete={() => onComplete(coin.id, coin.path)}
        style={baseStyle}
      >
        $
      </motion.div>
    );
  }

  // ============ Jackpot mode ==========================================
  // True parabolic projectile motion. The previous approach used three
  // keyframes (start, peak, end) with easeOut → easeIn. That eased *both*
  // axes, so X velocity dropped to zero at the apex alongside Y — the
  // coin looked like it paused mid-air then redirected. Real physics:
  //   • X velocity is CONSTANT (no horizontal force)
  //   • Y velocity is parabolic (gravity pulls down)
  //
  // We sample 10 keyframes along a Lagrange parabola through (start,
  // peakY, targetTopY), with X linearly interpolated. `linear` ease
  // between adjacent samples preserves both the constant X velocity AND
  // the parabolic Y curve. No velocity discontinuity at the apex.
  //
  // Rotations layer on top:
  //   • rotateY spins from 0 → spinTurns·360° during the rise; locks
  //     once the coin's at the apex (integer spinTurns guarantees clean
  //     face-square land).
  //   • rotateX tilts 0 → finalTilt during the fall, lands edge-on,
  //     holds through the gravity descent.
  const F = coin.flightDuration * v.flightScale;
  const DESC_DUR = 0.32;
  const total = F + DESC_DUR;
  const spinTurns = v.spinTurns;

  // Peak height proportional to throw distance — longer toss arcs higher.
  // Clamped so top-row arcs don't shoot off the top of the viewport.
  // A real thrower throws a flatter arc into a higher target.
  const dx = coin.targetCenterX - coin.startX;
  const dy = coin.targetTopY - coin.startY;
  const throwDist = Math.hypot(dx, dy);
  const baseLift = 60 + throwDist * 0.18;
  const targetBaseY = Math.min(coin.startY, coin.targetTopY - SLOT_HOVER_GAP);
  const VIEWPORT_TOP_MARGIN = 50; // clears the marquee
  const maxLift = targetBaseY - VIEWPORT_TOP_MARGIN;
  const desiredLift = baseLift + v.peakOffset;
  const actualLift = Math.max(40, Math.min(desiredLift, maxLift));
  const peakY = targetBaseY - actualLift;

  const finalTilt = variant === "tip" ? EDGE_TILT : 0;
  const t_arrived = F / total;
  // Clamp apex away from 0/1 to keep the Lagrange basis well-conditioned.
  const apexU = Math.max(0.3, Math.min(0.7, v.apexPhase));

  // Lagrange interpolation through (0, startY), (apexU, peakY), (1, targetTopY).
  const parabolaY = (u: number): number => {
    const L0 = ((u - apexU) * (u - 1)) / apexU;
    const L1 = (u * (u - 1)) / (apexU * (apexU - 1));
    const L2 = (u * (u - apexU)) / (1 - apexU);
    return coin.startY * L0 + peakY * L1 + coin.targetTopY * L2;
  };

  // Sample the arc. N+1 samples → N segments. The final keyframe (descent)
  // appends after the arc.
  const N = 10;
  const arcXKeys: number[] = [];
  const arcYKeys: number[] = [];
  const arcRotYKeys: number[] = [];
  const arcRotXKeys: number[] = [];
  const arcTimeKeys: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    arcXKeys.push(coin.startX + dx * u);
    arcYKeys.push(parabolaY(u));
    // rotateY spins during rise (0 → apex), holds after
    arcRotYKeys.push(
      u <= apexU ? (spinTurns * 360 * u) / apexU : spinTurns * 360,
    );
    // rotateX stays 0 during rise, ramps to finalTilt during fall
    arcRotXKeys.push(
      u <= apexU ? 0 : (finalTilt * (u - apexU)) / (1 - apexU),
    );
    arcTimeKeys.push(u * t_arrived);
  }
  // Descent keyframe — Y to finalY, everything else stays.
  arcXKeys.push(coin.targetCenterX);
  arcYKeys.push(finalY);
  arcRotYKeys.push(spinTurns * 360);
  arcRotXKeys.push(finalTilt);
  arcTimeKeys.push(1);

  // Linear ease between arc samples (since values are pre-computed at the
  // right positions), gravity ease for the final descent.
  const eases: (string | number[])[] = [];
  for (let i = 0; i < N; i++) eases.push("linear");
  eases.push(GRAVITY_EASE as unknown as number[]);

  const slitCrossProgress = Math.max(
    0,
    Math.min(
      1,
      (coin.targetSlitY - coin.targetTopY) /
        Math.max(finalY - coin.targetTopY, 1),
    ),
  );
  const impactDelay = coin.delay + F + DESC_DUR * slitCrossProgress;

  useEffect(() => {
    const t = window.setTimeout(
      () => onImpact(coin.id, coin.path),
      impactDelay * 1000,
    );
    return () => window.clearTimeout(t);
  }, [coin.id, coin.path, impactDelay, onImpact]);

  return (
    <motion.div
      aria-hidden
      initial={{ x: coin.startX, y: coin.startY, rotateX: 0, rotateY: 0 }}
      animate={{
        x: arcXKeys,
        y: arcYKeys,
        rotateY: arcRotYKeys,
        rotateX: arcRotXKeys,
      }}
      transition={{
        duration: total,
        delay: coin.delay,
        times: arcTimeKeys,
        ease: eases,
      }}
      onAnimationComplete={() => onComplete(coin.id, coin.path)}
      style={{
        position: "fixed",
        left: -size / 2,
        top: -size / 2,
        pointerEvents: "none",
        ...coinStyle(size),
        boxShadow:
          "0 4px 10px rgba(0,0,0,0.5), 0 0 14px rgba(255, 211, 90, 0.55), inset 0 -3px 4px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.6)",
        transformStyle: "preserve-3d",
      }}
    >
      $
    </motion.div>
  );
}


// Shared coin visuals
function coinStyle(size: number): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 35% 30%, #fff5b0 0%, #ffd35a 35%, #b8862a 100%)",
    boxShadow:
      "0 2px 6px rgba(0,0,0,0.45), inset 0 -2px 3px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: MONO,
    fontSize: Math.round(size * 0.45),
    fontWeight: 800,
    color: "#7a4d0c",
    textShadow: "0 1px 0 rgba(255,255,255,0.5)",
    userSelect: "none",
  };
}

// -- Page chrome --------------------------------------------------------------

function ScreenOverlay() {
  return (
    <>
      <style>{`
        @keyframes arcadeFlicker {
          0%, 100% { opacity: 0.18; }
          50% { opacity: 0.22; }
          53% { opacity: 0.10; }
          54% { opacity: 0.20; }
        }
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes attractPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes bootFlicker {
          0% { opacity: 0; filter: brightness(0.4); }
          12% { opacity: 1; filter: brightness(2.2); }
          18% { opacity: 0.2; filter: brightness(0.6); }
          26% { opacity: 1; filter: brightness(1.6); }
          32% { opacity: 0.5; filter: brightness(0.9); }
          40% { opacity: 1; filter: brightness(1.3); }
          100% { opacity: 1; filter: brightness(1); }
        }
        @keyframes powerOn {
          0% { transform: scaleY(0.02) scaleX(1.2); opacity: 0; filter: brightness(8); }
          12% { transform: scaleY(0.04) scaleX(1.2); opacity: 1; filter: brightness(10); }
          30% { transform: scaleY(1) scaleX(0.05); opacity: 1; filter: brightness(8); }
          60% { transform: scaleY(1) scaleX(1); opacity: 1; filter: brightness(2); }
          100% { transform: scaleY(1) scaleX(1); opacity: 1; filter: brightness(1); }
        }
        @keyframes powerOff {
          0% { transform: scaleY(1) scaleX(1); opacity: 0.95; filter: brightness(1.4); }
          45% { transform: scaleY(1) scaleX(0.05); opacity: 1; filter: brightness(6); }
          75% { transform: scaleY(0.02) scaleX(1.1); opacity: 1; filter: brightness(8); }
          100% { transform: scaleY(0.02) scaleX(1.1); opacity: 0; filter: brightness(0.3); }
        }
      `}</style>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 2px, transparent 3px)",
          zIndex: 50,
          animation: "arcadeFlicker 6s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
          zIndex: 51,
        }}
      />
    </>
  );
}

function Marquee() {
  const tag = "★ UI PLAYGROUND ★ INSERT COIN TO PLAY ★ ";
  const longTag = tag.repeat(8);
  return (
    <div
      style={{
        position: "relative",
        padding: "20px 0",
        margin: "0 -32px",
        background:
          "linear-gradient(180deg, rgba(255, 60, 180, 0.15) 0%, rgba(60, 0, 80, 0.05) 100%)",
        borderTop: "1px solid rgba(255, 60, 180, 0.3)",
        borderBottom: "1px solid rgba(255, 60, 180, 0.3)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          display: "inline-block",
          animation: "marqueeScroll 60s linear infinite",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.2em",
          color: "#ff7be5",
          textShadow:
            "0 0 4px #ff3cb4, 0 0 12px rgba(255, 60, 180, 0.6), 2px 0 0 rgba(0, 200, 255, 0.4), -2px 0 0 rgba(255, 80, 80, 0.4)",
        }}
      >
        {longTag}
        {longTag}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "48px auto 0",
        padding: "20px 0",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 10,
        letterSpacing: "0.18em",
        color: "rgba(255,255,255,0.45)",
      }}
    >
      <span>UI PLAYGROUND ARCADE © 2026</span>
    </div>
  );
}
