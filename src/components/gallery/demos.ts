import { bg, demoPalettes } from "../../palette";

export type GalleryMode = "museum" | "arcade" | "curious";

export interface GalleryDemo {
  path: string;
  title: string;
  description: string;
  bg: string;
  hue: number;
  // Museum-mode taxonomy (mock-Linnaean for the natural-history frame)
  family: string;
  catalogue: string;
}

const palette = (slug: keyof typeof demoPalettes) => ({
  bg: bg(demoPalettes[slug]),
  hue: demoPalettes[slug].hue,
});

export const galleryDemos: GalleryDemo[] = [
  {
    path: "/dvd-bounce",
    title: "DVD Bounce",
    description:
      "Bouncing logo with squash physics and corner celebrations.",
    ...palette("dvd-bounce"),
    family: "Mecanica inertia",
    catalogue: "MEC·001",
  },
  {
    path: "/slide-unlock",
    title: "Slide to Unlock",
    description:
      "Drag the thumb across a track. A fluid WebGL shader follows it.",
    ...palette("slide-unlock"),
    family: "Liquida tactus",
    catalogue: "LIQ·001",
  },
  {
    path: "/glass-pull",
    title: "Glass Pull",
    description:
      "A glass pill stretches between items as your cursor hops between them.",
    ...palette("glass-pull"),
    family: "Liquida tactus",
    catalogue: "LIQ·002",
  },
  {
    path: "/fisheye-text",
    title: "Fisheye Text",
    description:
      "Type freely. Letters bulge under a lens that follows the cursor.",
    ...palette("fisheye-text"),
    family: "Lensiformes",
    catalogue: "LEN·001",
  },
  {
    path: "/cursor-morph",
    title: "Cursor Morph",
    description:
      "Hover a card. The cursor inverts and collapses into an arrow.",
    ...palette("cursor-morph"),
    family: "Pointiformes",
    catalogue: "PNT·001",
  },
  {
    path: "/theme-sidebar",
    title: "Theme Sidebar",
    description:
      "Pick color, intensity, and mode from an expandable glass-pill sidebar.",
    ...palette("theme-sidebar"),
    family: "Chromatica",
    catalogue: "CHR·001",
  },
  {
    path: "/figma-highfive",
    title: "Figma High-Five",
    description:
      "The FigJam share modal, with a permission level no one asked for.",
    ...palette("figma-highfive"),
    family: "Sorenidae",
    catalogue: "SOR·001",
  },
  {
    path: "/airpods-nc",
    title: "AirPods Contact NC",
    description:
      "Per-contact noise cancellation: mute one person, hear another.",
    ...palette("airpods-nc"),
    family: "Sorenidae",
    catalogue: "SOR·002",
  },
  {
    path: "/spotify-wrapped-ads",
    title: "Spotify Wrapped for Ads",
    description:
      "Your year in review — but it's all the ads you sat through.",
    ...palette("spotify-wrapped-ads"),
    family: "Sorenidae",
    catalogue: "SOR·003",
  },
  {
    path: "/strava-flights",
    title: "Strava → Flights",
    description:
      "Redeem the miles you ran as actual airline miles.",
    ...palette("strava-flights"),
    family: "Sorenidae",
    catalogue: "SOR·004",
  },
  {
    path: "/spotify-dj",
    title: "Spotify DJ Call-In",
    description:
      "Call into the AI DJ like a radio station, request a song.",
    ...palette("spotify-dj"),
    family: "Sorenidae",
    catalogue: "SOR·005",
  },
  {
    path: "/companion-zoo",
    title: "Companion Zoo",
    description:
      "Software mascots through the ages, each in their own habitat.",
    ...palette("companion-zoo"),
    family: "Mascotidae",
    catalogue: "MAS·001",
  },
  {
    path: "/color-hold-pick",
    title: "Color Hold Pick",
    description:
      "Press and hold a rainbow swatch — the card becomes a live HSB canvas.",
    ...palette("color-hold-pick"),
    family: "Chromatica",
    catalogue: "CHR·002",
  },
  {
    path: "/github-sparkline",
    title: "GitHub Sparkline",
    description:
      "A sparkline hints at the heatmap; click and the bars shake into place.",
    ...palette("github-sparkline"),
    family: "Algoricae",
    catalogue: "ALG·002",
  },
  {
    path: "/page-transition",
    title: "Page Transition",
    description:
      "Click and the arrow winds up, flies off, and the page fades through.",
    ...palette("page-transition"),
    family: "Transitiones",
    catalogue: "TRN·001",
  },
];

const ROMAN = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII",
  "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI",
];

export const roman = (i: number) => ROMAN[i] ?? String(i + 1);
