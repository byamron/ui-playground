import { Link } from "react-router-dom";
import { bg, demoPalettes, text } from "./palette";

const demos = [
  {
    path: "/water-ripple",
    title: "Water Ripple",
    description: "Click anywhere — ripples propagate like water",
    bg: bg(demoPalettes["water-ripple"]),
  },
  {
    path: "/glass-pull",
    title: "Glass Pull",
    description: "Hover between items — glass pill stretches and follows",
    bg: bg(demoPalettes["glass-pull"]),
  },
  {
    path: "/magnetic-button",
    title: "Magnetic Button",
    description: "Cursor proximity warps the button toward you",
    bg: bg(demoPalettes["magnetic-button"]),
  },
  {
    path: "/text-scramble",
    title: "Text Scramble",
    description: "Characters randomize then resolve into words",
    bg: bg(demoPalettes["text-scramble"]),
  },
  {
    path: "/elastic-toggle",
    title: "Elastic Toggle",
    description: "Bouncy physics-driven switch with overshoot",
    bg: bg(demoPalettes["elastic-toggle"]),
  },
  {
    path: "/fisheye-text",
    title: "Fisheye Text",
    description: "Type freely — letters stretch wide on hover with spring physics",
    bg: bg(demoPalettes["fisheye-text"]),
  },
];

const galleryBg = bg({ hue: 220, mode: "dark", intensity: 0 });

export function Gallery() {
  return (
    <div
      style={{
        minHeight: "100%",
        background: galleryBg,
        color: text.dark.primary,
        padding: "80px 40px",
      }}
    >
      <h1
        style={{
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: text.dark.tertiary,
          marginBottom: 48,
        }}
      >
        UI Craft Demos
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {demos.map((demo) => (
          <Link
            key={demo.path}
            to={demo.path}
            style={{
              textDecoration: "none",
              color: "inherit",
              background: demo.bg,
              borderRadius: 12,
              padding: "32px 28px",
              border: "1px solid rgba(255,255,255,0.06)",
              transition: "border-color 0.2s, transform 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {demo.title}
            </h2>
            <p style={{ fontSize: 13, color: text.dark.tertiary, lineHeight: 1.5 }}>
              {demo.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
