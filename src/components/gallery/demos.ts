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
    description: "Hit the corner.",
    ...palette("dvd-bounce"),
    family: "Mecanica inertia",
    catalogue: "MEC·001",
  },
  {
    path: "/slide-unlock",
    title: "Slide to Unlock",
    description: "Slide to open.",
    ...palette("slide-unlock"),
    family: "Liquida tactus",
    catalogue: "LIQ·001",
  },
  {
    path: "/glass-pull",
    title: "Glass Pull",
    description: "Stretch the glass.",
    ...palette("glass-pull"),
    family: "Liquida tactus",
    catalogue: "LIQ·002",
  },
  {
    path: "/fisheye-text",
    title: "Fisheye Text",
    description: "Type. Watch it bend.",
    ...palette("fisheye-text"),
    family: "Lensiformes",
    catalogue: "LEN·001",
  },
  {
    path: "/cursor-morph",
    title: "Cursor Morph",
    description: "The cursor changes shape.",
    ...palette("cursor-morph"),
    family: "Pointiformes",
    catalogue: "PNT·001",
  },
  {
    path: "/theme-sidebar",
    title: "Theme Sidebar",
    description: "Tune the light.",
    ...palette("theme-sidebar"),
    family: "Chromatica",
    catalogue: "CHR·001",
  },
  {
    path: "/task-ranking",
    title: "Task Ranking",
    description: "Rank by feel.",
    ...palette("task-ranking"),
    family: "Algoricae",
    catalogue: "ALG·001",
  },
  {
    path: "/figma-highfive",
    title: "Figma High-Five",
    description: "High-five in Figma.",
    ...palette("figma-highfive"),
    family: "Sorenidae",
    catalogue: "SOR·001",
  },
  {
    path: "/airpods-nc",
    title: "AirPods Contact NC",
    description: "Mute one. Hear another.",
    ...palette("airpods-nc"),
    family: "Sorenidae",
    catalogue: "SOR·002",
  },
  {
    path: "/spotify-wrapped-ads",
    title: "Spotify Wrapped for Ads",
    description: "Your year in ads.",
    ...palette("spotify-wrapped-ads"),
    family: "Sorenidae",
    catalogue: "SOR·003",
  },
  {
    path: "/strava-flights",
    title: "Strava → Flights",
    description: "Run, then fly.",
    ...palette("strava-flights"),
    family: "Sorenidae",
    catalogue: "SOR·004",
  },
  {
    path: "/spotify-dj",
    title: "Spotify DJ Call-In",
    description: "Call the AI DJ.",
    ...palette("spotify-dj"),
    family: "Sorenidae",
    catalogue: "SOR·005",
  },
  {
    path: "/companion-zoo",
    title: "Companion Zoo",
    description: "Meet your old pets.",
    ...palette("companion-zoo"),
    family: "Mascotidae",
    catalogue: "MAS·001",
  },
  {
    path: "/color-hold-pick",
    title: "Color Hold Pick",
    description: "Press and hold for color.",
    ...palette("color-hold-pick"),
    family: "Chromatica",
    catalogue: "CHR·002",
  },
  {
    path: "/github-sparkline",
    title: "GitHub Sparkline",
    description: "Unfold the year.",
    ...palette("github-sparkline"),
    family: "Algoricae",
    catalogue: "ALG·002",
  },
  {
    path: "/page-transition",
    title: "Page Transition",
    description: "Click. Watch it fly.",
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
