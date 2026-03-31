import { useEffect, useRef, useState, useCallback } from "react";
import { bg, demoPalettes, text as textColors } from "../../palette";

const BG = bg(demoPalettes["text-scramble"]);

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
const PHRASES = [
  "Design is how it works",
  "Every pixel matters",
  "Craft over convention",
  "Details make the design",
];

function useScramble(text: string, isActive: boolean) {
  const [display, setDisplay] = useState(text);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      setDisplay(text);
      return;
    }

    let frame = 0;
    const totalFrames = text.length * 3;

    const tick = () => {
      const progress = frame / totalFrames;
      const resolved = Math.floor(progress * text.length);

      const result = text
        .split("")
        .map((char, i) => {
          if (char === " ") return " ";
          if (i < resolved) return char;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join("");

      setDisplay(result);
      frame++;

      if (frame <= totalFrames) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [text, isActive]);

  return display;
}

export function TextScramble() {
  const [index, setIndex] = useState(0);
  const [scrambling, setScrambling] = useState(true);
  const display = useScramble(PHRASES[index], scrambling);

  useEffect(() => {
    const interval = setInterval(() => {
      setScrambling(true);
      setIndex((i) => (i + 1) % PHRASES.length);
      // Reset scramble trigger
      setTimeout(() => setScrambling(true), 50);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Re-trigger scramble on index change
  useEffect(() => {
    setScrambling(false);
    const t = requestAnimationFrame(() => setScrambling(true));
    return () => cancelAnimationFrame(t);
  }, [index]);

  return (
    <div className="demo-page" style={{ background: BG }}>
      <style>{`
        .scramble-text {
          font-size: 32px;
          font-weight: 500;
          color: #fff;
          font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
          letter-spacing: -0.02em;
          min-width: 600px;
          text-align: center;
        }
        .scramble-char {
          display: inline-block;
          min-width: 0.6em;
        }
      `}</style>
      <div className="scramble-text">
        {display.split("").map((char, i) => (
          <span key={i} className="scramble-char" style={{
            color: char === PHRASES[index][i]
              ? "rgba(255,255,255,0.95)"
              : "rgba(255,255,255,0.3)",
          }}>
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
