import type { ComponentType } from "react";
import type { PreviewProps } from "./_shared";

import DvdBouncePreview from "./dvd-bounce";
import SlideUnlockPreview from "./slide-unlock";
import GlassPullPreview from "./glass-pull";
import FisheyeTextPreview from "./fisheye-text";
import CursorMorphPreview from "./cursor-morph";
import ThemeSidebarPreview from "./theme-sidebar";
import TaskRankingPreview from "./task-ranking";
import FigmaHighfivePreview from "./figma-highfive";
import AirpodsNcPreview from "./airpods-nc";
import SpotifyWrappedAdsPreview from "./spotify-wrapped-ads";
import StravaFlightsPreview from "./strava-flights";
import SpotifyDjPreview from "./spotify-dj";
import CompanionZooPreview from "./companion-zoo";
import PageTransitionPreview from "./page-transition";

export type { PreviewProps } from "./_shared";

export const previews: Record<string, ComponentType<PreviewProps>> = {
  "dvd-bounce": DvdBouncePreview,
  "slide-unlock": SlideUnlockPreview,
  "glass-pull": GlassPullPreview,
  "fisheye-text": FisheyeTextPreview,
  "cursor-morph": CursorMorphPreview,
  "theme-sidebar": ThemeSidebarPreview,
  "task-ranking": TaskRankingPreview,
  "figma-highfive": FigmaHighfivePreview,
  "airpods-nc": AirpodsNcPreview,
  "spotify-wrapped-ads": SpotifyWrappedAdsPreview,
  "strava-flights": StravaFlightsPreview,
  "spotify-dj": SpotifyDjPreview,
  "companion-zoo": CompanionZooPreview,
  "page-transition": PageTransitionPreview,
};
