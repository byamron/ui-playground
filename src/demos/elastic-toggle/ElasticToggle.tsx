import { useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { bg, demoPalettes, accent, HUES } from "../../palette";

const BG = bg(demoPalettes["elastic-toggle"]);
const ACCENT_ON = accent(HUES.sky, 50, 65);

export function ElasticToggle() {
  const [isOn, setIsOn] = useState(false);

  const spring = useSpring(isOn ? 1 : 0, {
    stiffness: 500,
    damping: 25,
    mass: 0.8,
  });

  const x = useTransform(spring, [0, 1], [2, 30]);
  const bgColor = useTransform(
    spring,
    [0, 1],
    ["rgba(255,255,255,0.1)", ACCENT_ON]
  );
  const thumbScale = useTransform(spring, [0, 0.5, 1], [1, 1.15, 1]);

  return (
    <div className="demo-page" style={{ background: BG }}>
      <style>{`
        .toggle-track {
          width: 56px;
          height: 28px;
          border-radius: 14px;
          cursor: pointer;
          position: relative;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .toggle-thumb {
          width: 24px;
          height: 24px;
          border-radius: 12px;
          background: #fff;
          position: absolute;
          top: 2px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .toggle-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 48px;
        }
        .toggle-label {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.05em;
        }
      `}</style>
      <div className="toggle-group">
        <motion.div
          className="toggle-track"
          style={{ background: bgColor }}
          onClick={() => setIsOn(!isOn)}
        >
          <motion.div
            className="toggle-thumb"
            style={{ x, scale: thumbScale }}
          />
        </motion.div>
        <span className="toggle-label">
          {isOn ? "On" : "Off"}
        </span>
      </div>
    </div>
  );
}
