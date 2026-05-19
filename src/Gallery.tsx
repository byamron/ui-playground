import { Link } from "react-router-dom";
import { bg, demoPalettes, text } from "./palette";

const demos = [
  {
    path: "/dvd-bounce",
    title: "DVD Bounce",
    description: "Classic bouncing logo with squash physics, corner celebrations, and mouse influence",
    bg: bg(demoPalettes["dvd-bounce"]),
  },
  {
    path: "/slide-unlock",
    title: "Slide to Unlock",
    description: "Drag with fluid WebGL shader trail, spring snap-back, and switchable patterns",
    bg: bg(demoPalettes["slide-unlock"]),
  },
  {
    path: "/glass-pull",
    title: "Glass Pull",
    description: "Hover between items — glass pill stretches and follows",
    bg: bg(demoPalettes["glass-pull"]),
  },
  {
    path: "/fisheye-text",
    title: "Fisheye Text",
    description: "Type freely — letters stretch wide on hover with spring physics",
    bg: bg(demoPalettes["fisheye-text"]),
  },
  {
    path: "/cursor-morph",
    title: "Cursor Morph",
    description: "Inverted circle collapses into an arrow on card hover",
    bg: bg(demoPalettes["cursor-morph"]),
  },
  {
    path: "/theme-sidebar",
    title: "Theme Sidebar",
    description: "Color, intensity, and mode — expandable sidebar with glass pills",
    bg: bg(demoPalettes["theme-sidebar"]),
  },
  {
    path: "/task-ranking",
    title: "Task Ranking",
    description: "Binary search pairwise comparison to prioritize tasks",
    bg: bg(demoPalettes["task-ranking"]),
  },
  {
    path: "/figma-highfive",
    title: "Figma High-Five",
    description: "FigJam share modal with a very useful permission level",
    bg: bg(demoPalettes["figma-highfive"]),
  },
  {
    path: "/airpods-nc",
    title: "AirPods Contact NC",
    description: "Noise cancellation settings, but per contact",
    bg: bg(demoPalettes["airpods-nc"]),
  },
  {
    path: "/spotify-wrapped-ads",
    title: "Spotify Wrapped for Ads",
    description: "Your year in review — but for all the ads you endured",
    bg: bg(demoPalettes["spotify-wrapped-ads"]),
  },
  {
    path: "/strava-flights",
    title: "Strava → Flights",
    description: "Redeem your running miles as airline miles",
    bg: bg(demoPalettes["strava-flights"]),
  },
  {
    path: "/spotify-dj",
    title: "Spotify DJ Call-In",
    description: "Call in to the AI DJ like a radio station",
    bg: bg(demoPalettes["spotify-dj"]),
  },
  {
    path: "/companion-zoo",
    title: "Companion Zoo",
    description: "Software companion animals through the ages",
    bg: bg(demoPalettes["companion-zoo"]),
  },
  {
    path: "/github-sparkline",
    title: "GitHub Sparkline",
    description: "Sparkline hints at the heatmap — bars shake-and-settle on expand",
    bg: bg(demoPalettes["github-sparkline"]),
  },
  {
    path: "/page-transition",
    title: "Page Transition",
    description: "Click → arrow winds up and flies off as the page fades, back arrow mirrors on return",
    bg: bg(demoPalettes["page-transition"]),
  },
];

const galleryBg = bg({ hue: 220, mode: "dark", intensity: 0 });

export function Gallery() {
  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100%",
        background: galleryBg,
        color: text.dark.primary,
        padding: "80px 40px",
        overflowY: "auto",
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
        Playground
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
