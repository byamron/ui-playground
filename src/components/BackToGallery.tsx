import { useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getBackTint,
  getBackVisible,
  subscribeBack,
  subscribeTint,
} from "./chromeControl";

// Floating "back" affordance rendered at the root of the app. Shows on
// every route except the gallery itself. Top-left, fixed, neutral styling
// so it sits on top of any demo without competing with the demo's own
// visual language. Click → navigate to "/". Individual demos can hide
// this for clean recordings via setBackVisible() (see chromeControl).
export function BackToGallery() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const visible = useSyncExternalStore(
    subscribeBack,
    getBackVisible,
    getBackVisible,
  );
  const tint = useSyncExternalStore(subscribeTint, getBackTint, getBackTint);
  if (pathname === "/") return null;
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="Back to gallery"
      onClick={() => navigate("/")}
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        left: 16,
        zIndex: 1000,
        width: 40,
        height: 40,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "transform 0.18s cubic-bezier(.5,1.4,.5,1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        style={{ marginLeft: -2 }}
      >
        <path
          d="M14.5 6L8.5 12L14.5 18"
          stroke={tint}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
