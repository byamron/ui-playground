import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bg, demoPalettes, text as textColors } from "../../palette";

const FONT_SIZE = 56;
const BG = bg(demoPalettes["fisheye-text"]);
const PLACEHOLDER = "Start typing...";

function FisheyeWord({
  word,
  globalOffset,
  cursorPos,
  onCharClick,
}: {
  word: string;
  globalOffset: number;
  cursorPos: number;
  onCharClick: (globalIndex: number) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const letters = word.split("");

  return (
    <span
      style={{
        display: "inline-flex",
        position: "relative",
        whiteSpace: "nowrap",
        alignItems: "baseline",
        overflow: "visible",
      }}
    >
      {letters.map((char, i) => {
        const globalIndex = globalOffset + i;
        let scaleX = 1;
        let pushAmount = 0;

        if (hoveredIndex !== null) {
          const distance = Math.abs(i - hoveredIndex);
          if (i === hoveredIndex) {
            scaleX = 2;
          } else {
            const direction = Math.sign(i - hoveredIndex);
            const maxPush = FONT_SIZE * 0.5;
            pushAmount = (1 / (distance + 1)) * maxPush * direction;
            const edgeFalloff = Math.max(
              0,
              1 - distance / (letters.length - 1)
            );
            scaleX *= 1 - 0.5 * edgeFalloff;
          }
        }

        const showCursor = cursorPos === globalIndex;

        return (
          <span key={i} style={{ position: "relative", display: "inline-flex" }}>
            {showCursor && <Cursor />}
            <motion.span
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onCharClick(globalIndex)}
              animate={{ scaleX, x: pushAmount }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              layout
              style={{
                display: "inline-block",
                transformOrigin: "center",
                cursor: "text",
              }}
            >
              {char}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

function Cursor() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: "steps(1)" }}
      style={{
        position: "absolute",
        left: -1,
        top: "0.1em",
        width: 2,
        height: "0.85em",
        background: "#fff",
        borderRadius: 1,
        zIndex: 10,
        pointerEvents: "none",
      }}
    />
  );
}

export function FisheyeText() {
  const [text, setText] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const hiddenRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep hidden textarea focused
  const focusInput = useCallback(() => {
    hiddenRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  const handleInput = () => {
    const el = hiddenRef.current;
    if (!el) return;
    setText(el.value);
    setCursorPos(el.selectionStart ?? el.value.length);
  };

  const handleKeyUp = () => {
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

  // Build words with their global character offsets
  const segments: { type: "word" | "space"; text: string; offset: number }[] =
    [];
  let offset = 0;
  const parts = text.split(/( +)/);
  for (const part of parts) {
    if (part.length === 0) continue;
    segments.push({
      type: part.trim() === "" ? "space" : "word",
      text: part,
      offset,
    });
    offset += part.length;
  }

  const isEmpty = text.length === 0;

  return (
    <div
      className="demo-page"
      style={{ background: BG, cursor: "text" }}
      onClick={focusInput}
    >
      {/* Hidden textarea captures all keyboard input */}
      <textarea
        ref={hiddenRef}
        value={text}
        onChange={handleInput}
        onKeyUp={handleKeyUp}
        onSelect={handleKeyUp}
        autoFocus
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      />

      <div
        ref={containerRef}
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          alignItems: "baseline",
          fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
          fontSize: FONT_SIZE,
          fontWeight: 400,
          color: "#fff",
          lineHeight: 1.5,
          overflow: "visible",
          maxWidth: 800,
          minHeight: "1.5em",
          position: "relative",
        }}
      >
        {isEmpty && (
          <span style={{ color: "rgba(255,255,255,0.15)", position: "relative" }}>
            <Cursor />
            {PLACEHOLDER}
          </span>
        )}

        <AnimatePresence mode="popLayout">
          {segments.map((seg, si) => {
            if (seg.type === "space") {
              return (
                <span key={`s-${si}`} style={{ position: "relative", display: "inline-flex" }}>
                  {/* Show cursor at each space position */}
                  {Array.from({ length: seg.text.length }).map((_, i) => {
                    const gi = seg.offset + i;
                    return gi === cursorPos ? (
                      <span key={i} style={{ position: "relative", width: "0.6ch" }}>
                        <Cursor />
                        <span style={{ visibility: "hidden" }}>{" "}</span>
                      </span>
                    ) : (
                      <span key={i} style={{ width: "0.6ch", display: "inline-block" }}>
                        {" "}
                      </span>
                    );
                  })}
                </span>
              );
            }
            return (
              <FisheyeWord
                key={`w-${si}`}
                word={seg.text}
                globalOffset={seg.offset}
                cursorPos={cursorPos}
                onCharClick={handleCharClick}
              />
            );
          })}
        </AnimatePresence>

        {/* Cursor at end of text */}
        {!isEmpty && cursorPos === text.length && (
          <span style={{ position: "relative", display: "inline-flex" }}>
            <Cursor />
          </span>
        )}
      </div>
    </div>
  );
}
