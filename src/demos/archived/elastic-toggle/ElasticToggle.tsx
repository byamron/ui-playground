import { useState } from "react";
import { motion } from "framer-motion";
import { bg, demoPalettes, accent, HUES } from "../../palette";

const BG = bg(demoPalettes["elastic-toggle"]);
const ACCENT_ON = accent(HUES.sky, 50, 65);

export function ElasticToggle() {
  const [isOn, setIsOn] = useState(false);

  return (
    <div className="demo-page" style={{ background: BG }}>
      <style>{`
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
          style={{
            width: 56,
            height: 28,
            borderRadius: 14,
            cursor: "pointer",
            position: "relative",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          animate={{
            backgroundColor: isOn ? ACCENT_ON : "rgba(255,255,255,0.1)",
          }}
          transition={{ duration: 0.2 }}
          onClick={() => setIsOn(!isOn)}
        >
          <motion.div
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              background: "#fff",
              position: "absolute",
              top: 1,
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
            animate={{
              x: isOn ? 29 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              mass: 0.8,
            }}
          />
        </motion.div>
        <span className="toggle-label">
          {isOn ? "On" : "Off"}
        </span>
      </div>
    </div>
  );
}
