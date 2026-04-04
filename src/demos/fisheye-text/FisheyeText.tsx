import { useState, useRef, useEffect, useCallback } from "react";
import { bg, demoPalettes } from "../../palette";

const FONT_SIZE = 56;
const BG = bg(demoPalettes["fisheye-text"]);
const PLACEHOLDER = "Start typing...";
const SPRING_STIFFNESS = 300;
const SPRING_DAMPING = 30;
const MAX_SCALE = 2;
const PUSH_RANGE = 4; // how many neighbors get pushed

export function FisheyeText() {
  const [text, setText] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [hoveredChar, setHoveredChar] = useState<number | null>(null);
  const hiddenRef = useRef<HTMLTextAreaElement>(null);
  const charRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const springsRef = useRef<Map<number, { scaleX: number; x: number; targetScaleX: number; targetX: number; velScaleX: number; velX: number }>>(new Map());
  const rafRef = useRef<number>(0);

  const focusInput = useCallback(() => {
    hiddenRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  // Spring physics loop
  useEffect(() => {
    const step = () => {
      const dt = 1 / 60;
      let needsUpdate = false;

      springsRef.current.forEach((spring, idx) => {
        // scaleX spring
        const forceScaleX = -SPRING_STIFFNESS * (spring.scaleX - spring.targetScaleX) - SPRING_DAMPING * spring.velScaleX;
        spring.velScaleX += forceScaleX * dt;
        spring.scaleX += spring.velScaleX * dt;

        // x spring
        const forceX = -SPRING_STIFFNESS * (spring.x - spring.targetX) - SPRING_DAMPING * spring.velX;
        spring.velX += forceX * dt;
        spring.x += spring.velX * dt;

        if (Math.abs(spring.scaleX - spring.targetScaleX) > 0.001 || Math.abs(spring.velScaleX) > 0.01 ||
            Math.abs(spring.x - spring.targetX) > 0.01 || Math.abs(spring.velX) > 0.01) {
          needsUpdate = true;
        }

        const el = charRefs.current.get(idx);
        if (el) {
          el.style.transform = `scaleX(${spring.scaleX}) translateX(${spring.x}px)`;
        }
      });

      if (needsUpdate) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = requestAnimationFrame(step); // keep running for responsiveness
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Update spring targets when hover changes
  useEffect(() => {
    // Ensure springs exist for all characters
    for (let i = 0; i < text.length; i++) {
      if (!springsRef.current.has(i)) {
        springsRef.current.set(i, { scaleX: 1, x: 0, targetScaleX: 1, targetX: 0, velScaleX: 0, velX: 0 });
      }
    }
    // Clean up extras
    springsRef.current.forEach((_, key) => {
      if (key >= text.length) springsRef.current.delete(key);
    });

    // Set targets
    for (let i = 0; i < text.length; i++) {
      const spring = springsRef.current.get(i)!;
      if (hoveredChar === null) {
        spring.targetScaleX = 1;
        spring.targetX = 0;
      } else {
        const distance = Math.abs(i - hoveredChar);
        if (i === hoveredChar) {
          spring.targetScaleX = MAX_SCALE;
          spring.targetX = 0;
        } else if (distance <= PUSH_RANGE) {
          const direction = Math.sign(i - hoveredChar);
          const falloff = 1 - distance / (PUSH_RANGE + 1);
          const pushPx = FONT_SIZE * 0.4 * falloff * direction;
          spring.targetScaleX = 1 - 0.15 * falloff;
          spring.targetX = pushPx;
        } else {
          spring.targetScaleX = 1;
          spring.targetX = 0;
        }
      }
    }
  }, [hoveredChar, text.length, text]);

  const handleInput = () => {
    const el = hiddenRef.current;
    if (!el) return;
    setText(el.value);
    setCursorPos(el.selectionStart ?? el.value.length);
  };

  const syncCursor = () => {
    const el = hiddenRef.current;
    if (!el) return;
    setCursorPos(el.selectionStart ?? el.value.length);
  };

  const handleCharClick = (globalIndex: number) => {
    setCursorPos(globalIndex);
    if (hiddenRef.current) {
      hiddenRef.current.selectionStart = globalIndex;
      hiddenRef.current.selectionEnd = globalIndex;
      hiddenRef.current.focus();
    }
  };

  const chars = text.split("");

  return (
    <div
      className="demo-page"
      style={{ background: BG, cursor: "text" }}
      onClick={focusInput}
    >
      <style>{`
        @keyframes caret-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>

      <textarea
        ref={hiddenRef}
        value={text}
        onChange={handleInput}
        onKeyUp={syncCursor}
        onMouseUp={syncCursor}
        onSelect={syncCursor}
        autoFocus
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          opacity: 0,
          width: 1,
          height: 1,
        }}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
          fontSize: FONT_SIZE,
          fontWeight: 400,
          color: "#fff",
          lineHeight: 1.5,
          maxWidth: 800,
          minHeight: "1.5em",
          position: "relative",
        }}
      >
        {text.length === 0 && (
          <span style={{ color: "rgba(255,255,255,0.15)", position: "relative", display: "inline-flex" }}>
            <Caret />
            {PLACEHOLDER}
          </span>
        )}

        {chars.map((char, i) => {
          const isSpace = char === " ";
          return (
            <span
              key={i}
              style={{ position: "relative", display: "inline-block" }}
            >
              {cursorPos === i && <Caret />}
              <span
                ref={(el) => {
                  if (el) charRefs.current.set(i, el);
                  else charRefs.current.delete(i);
                }}
                onMouseEnter={() => setHoveredChar(i)}
                onMouseLeave={() => setHoveredChar(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCharClick(i);
                }}
                style={{
                  display: "inline-block",
                  transformOrigin: "center",
                  cursor: "text",
                  width: isSpace ? "0.6ch" : undefined,
                  willChange: "transform",
                }}
              >
                {isSpace ? "\u00A0" : char}
              </span>
            </span>
          );
        })}

        {text.length > 0 && cursorPos === text.length && (
          <span style={{ position: "relative", display: "inline-block", width: 2 }}>
            <Caret />
          </span>
        )}
      </div>
    </div>
  );
}

function Caret() {
  return (
    <span
      style={{
        position: "absolute",
        left: -1,
        top: "0.15em",
        width: 2,
        height: "0.75em",
        background: "#fff",
        borderRadius: 1,
        zIndex: 10,
        pointerEvents: "none",
        animation: "caret-blink 1s steps(1) infinite",
      }}
    />
  );
}
