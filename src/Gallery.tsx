import { useState } from "react";
import { Link } from "react-router-dom";
import { bg, demoPalettes, text } from "./palette";
import { previews } from "./previews";
import { useInView } from "./previews/_shared";

type DemoSlug = keyof typeof demoPalettes;

interface Demo {
  slug: DemoSlug;
  path: string;
  title: string;
  description: string;
  bg: string;
}

const demos: Demo[] = [
  {
    slug: "dvd-bounce",
    path: "/dvd-bounce",
    title: "DVD Bounce",
    description: "Classic bouncing logo with squash physics, corner celebrations, and mouse influence",
    bg: bg(demoPalettes["dvd-bounce"]),
  },
  {
    slug: "slide-unlock",
    path: "/slide-unlock",
    title: "Slide to Unlock",
    description: "Drag with fluid WebGL shader trail, spring snap-back, and switchable patterns",
    bg: bg(demoPalettes["slide-unlock"]),
  },
  {
    slug: "glass-pull",
    path: "/glass-pull",
    title: "Glass Pull",
    description: "Hover between items — glass pill stretches and follows",
    bg: bg(demoPalettes["glass-pull"]),
  },
  {
    slug: "fisheye-text",
    path: "/fisheye-text",
    title: "Fisheye Text",
    description: "Type freely — letters stretch wide on hover with spring physics",
    bg: bg(demoPalettes["fisheye-text"]),
  },
  {
    slug: "cursor-morph",
    path: "/cursor-morph",
    title: "Cursor Morph",
    description: "Inverted circle collapses into an arrow on card hover",
    bg: bg(demoPalettes["cursor-morph"]),
  },
  {
    slug: "theme-sidebar",
    path: "/theme-sidebar",
    title: "Theme Sidebar",
    description: "Color, intensity, and mode — expandable sidebar with glass pills",
    bg: bg(demoPalettes["theme-sidebar"]),
  },
  {
    slug: "task-ranking",
    path: "/task-ranking",
    title: "Task Ranking",
    description: "Binary search pairwise comparison to prioritize tasks",
    bg: bg(demoPalettes["task-ranking"]),
  },
  {
    slug: "figma-highfive",
    path: "/figma-highfive",
    title: "Figma High-Five",
    description: "FigJam share modal with a very useful permission level",
    bg: bg(demoPalettes["figma-highfive"]),
  },
  {
    slug: "airpods-nc",
    path: "/airpods-nc",
    title: "AirPods Contact NC",
    description: "Noise cancellation settings, but per contact",
    bg: bg(demoPalettes["airpods-nc"]),
  },
  {
    slug: "spotify-wrapped-ads",
    path: "/spotify-wrapped-ads",
    title: "Spotify Wrapped for Ads",
    description: "Your year in review — but for all the ads you endured",
    bg: bg(demoPalettes["spotify-wrapped-ads"]),
  },
  {
    slug: "strava-flights",
    path: "/strava-flights",
    title: "Strava → Flights",
    description: "Redeem your running miles as airline miles",
    bg: bg(demoPalettes["strava-flights"]),
  },
  {
    slug: "spotify-dj",
    path: "/spotify-dj",
    title: "Spotify DJ Call-In",
    description: "Call in to the AI DJ like a radio station",
    bg: bg(demoPalettes["spotify-dj"]),
  },
  {
    slug: "companion-zoo",
    path: "/companion-zoo",
    title: "Companion Zoo",
    description: "Software companion animals through the ages",
    bg: bg(demoPalettes["companion-zoo"]),
  },
  {
    slug: "page-transition",
    path: "/page-transition",
    title: "Page Transition",
    description: "Click → arrow winds up and flies off as the page fades, back arrow mirrors on return",
    bg: bg(demoPalettes["page-transition"]),
  },
];

const galleryBg = bg({ hue: 220, mode: "dark", intensity: 0 });

function Tile({ demo }: { demo: Demo }) {
  const [ref, inView] = useInView<HTMLAnchorElement>();
  const [hover, setHover] = useState(false);
  const Preview = previews[demo.slug];
  const palette = demoPalettes[demo.slug];
  const isLight = palette.mode === "light";
  const titleColor = isLight ? text.light.primary : text.dark.primary;
  const descColor = isLight ? text.light.tertiary : text.dark.tertiary;
  const borderIdle = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const borderHover = isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.15)";

  return (
    <Link
      ref={ref}
      to={demo.path}
      style={{
        textDecoration: "none",
        color: "inherit",
        background: demo.bg,
        borderRadius: 12,
        border: `1px solid ${hover ? borderHover : borderIdle}`,
        transition: "border-color 0.2s, transform 0.2s",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{
          width: "100%",
          height: 140,
          position: "relative",
          overflow: "hidden",
          borderBottom: `1px solid ${borderIdle}`,
        }}
      >
        {Preview ? <Preview active={inView} intense={hover} /> : null}
      </div>
      <div style={{ padding: "20px 24px 24px" }}>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 6,
            color: titleColor,
          }}
        >
          {demo.title}
        </h2>
        <p
          style={{
            fontSize: 12.5,
            color: descColor,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {demo.description}
        </p>
      </div>
    </Link>
  );
}

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
          <Tile key={demo.path} demo={demo} />
        ))}
      </div>
    </div>
  );
}
