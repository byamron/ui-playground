import { useLocation, useNavigate } from "react-router-dom";

// Floating "back" affordance rendered at the root of the app. Shows on
// every route except the gallery itself. Top-left, fixed, neutral styling
// so it sits on top of any demo without competing with the demo's own
// visual language. Click → navigate to "/".
export function BackToGallery() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (pathname === "/") return null;
  return (
    <button
      type="button"
      aria-label="Back to gallery"
      onClick={() => navigate("/")}
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 1000,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px 8px 10px",
        borderRadius: 999,
        background: "rgba(20, 20, 22, 0.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        color: "rgba(255, 255, 255, 0.9)",
        fontFamily: `"IBM Plex Mono", "SF Mono", ui-monospace, monospace`,
        fontSize: 12,
        letterSpacing: "0.08em",
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
        transition:
          "transform 0.18s cubic-bezier(.5,1.4,.5,1), background 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.04)";
        e.currentTarget.style.background = "rgba(30, 30, 34, 0.85)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.background = "rgba(20, 20, 22, 0.72)";
      }}
    >
      <span
        aria-hidden
        style={{ fontSize: 14, lineHeight: 1, marginTop: -1 }}
      >
        ←
      </span>
      <span>BACK</span>
    </button>
  );
}
