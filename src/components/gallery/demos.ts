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
  // Arcade-mode flavor
  highScore: string;
  genre: string;
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
    highScore: "999,999",
    genre: "ARCADE · PHYSICS",
  },
  {
    path: "/slide-unlock",
    title: "Slide to Unlock",
    description: "Slide to open.",
    ...palette("slide-unlock"),
    family: "Liquida tactus",
    catalogue: "LIQ·001",
    highScore: "874,210",
    genre: "PUZZLE · LIQUID",
  },
  {
    path: "/glass-pull",
    title: "Glass Pull",
    description: "Stretch the glass.",
    ...palette("glass-pull"),
    family: "Liquida tactus",
    catalogue: "LIQ·002",
    highScore: "612,488",
    genre: "ACTION · GLASS",
  },
  {
    path: "/fisheye-text",
    title: "Fisheye Text",
    description: "Type. Watch it bend.",
    ...palette("fisheye-text"),
    family: "Lensiformes",
    catalogue: "LEN·001",
    highScore: "440,902",
    genre: "TYPING · LENS",
  },
  {
    path: "/cursor-morph",
    title: "Cursor Morph",
    description: "The cursor changes shape.",
    ...palette("cursor-morph"),
    family: "Pointiformes",
    catalogue: "PNT·001",
    highScore: "388,114",
    genre: "ACTION · CURSOR",
  },
  {
    path: "/theme-sidebar",
    title: "Theme Sidebar",
    description: "Tune the light.",
    ...palette("theme-sidebar"),
    family: "Chromatica",
    catalogue: "CHR·001",
    highScore: "265,034",
    genre: "TOOL · COLOR",
  },
  {
    path: "/task-ranking",
    title: "Task Ranking",
    description: "Rank by feel.",
    ...palette("task-ranking"),
    family: "Algoricae",
    catalogue: "ALG·001",
    highScore: "192,777",
    genre: "PUZZLE · LOGIC",
  },
  {
    path: "/figma-highfive",
    title: "Figma High-Five",
    description: "High-five in Figma.",
    ...palette("figma-highfive"),
    family: "Sorenidae",
    catalogue: "SOR·001",
    highScore: "501,820",
    genre: "GAG · MOCK-UI",
  },
  {
    path: "/airpods-nc",
    title: "AirPods Contact NC",
    description: "Mute one. Hear another.",
    ...palette("airpods-nc"),
    family: "Sorenidae",
    catalogue: "SOR·002",
    highScore: "447,310",
    genre: "GAG · MOCK-UI",
  },
  {
    path: "/spotify-wrapped-ads",
    title: "Spotify Wrapped for Ads",
    description: "Your year in ads.",
    ...palette("spotify-wrapped-ads"),
    family: "Sorenidae",
    catalogue: "SOR·003",
    highScore: "722,019",
    genre: "GAG · MOCK-UI",
  },
  {
    path: "/strava-flights",
    title: "Strava → Flights",
    description: "Run, then fly.",
    ...palette("strava-flights"),
    family: "Sorenidae",
    catalogue: "SOR·004",
    highScore: "330,512",
    genre: "GAG · MOCK-UI",
  },
  {
    path: "/spotify-dj",
    title: "Spotify DJ Call-In",
    description: "Call the AI DJ.",
    ...palette("spotify-dj"),
    family: "Sorenidae",
    catalogue: "SOR·005",
    highScore: "289,777",
    genre: "GAG · MOCK-UI",
  },
  {
    path: "/companion-zoo",
    title: "Companion Zoo",
    description: "Meet your old pets.",
    ...palette("companion-zoo"),
    family: "Mascotidae",
    catalogue: "MAS·001",
    highScore: "612,400",
    genre: "EXHIBIT · MASCOTS",
  },
  {
    path: "/color-hold-pick",
    title: "Color Hold Pick",
    description: "Press and hold for color.",
    ...palette("color-hold-pick"),
    family: "Chromatica",
    catalogue: "CHR·002",
    highScore: "412,330",
    genre: "TOOL · COLOR",
  },
  {
    path: "/github-sparkline",
    title: "GitHub Sparkline",
    description: "Unfold the year.",
    ...palette("github-sparkline"),
    family: "Algoricae",
    catalogue: "ALG·002",
    highScore: "276,118",
    genre: "TOOL · DATA",
  },
  {
    path: "/page-transition",
    title: "Page Transition",
    description: "Click. Watch it fly.",
    ...palette("page-transition"),
    family: "Transitiones",
    catalogue: "TRN·001",
    highScore: "199,802",
    genre: "ACTION · TRANSITION",
  },
];

const ROMAN = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII",
  "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI",
];

export const roman = (i: number) => ROMAN[i] ?? String(i + 1);
