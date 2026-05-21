import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./global.css";
import { Gallery } from "./Gallery";
import { GlassPull } from "./demos/glass-pull/GlassPull";
import { FisheyeText } from "./demos/fisheye-text/FisheyeText";
import { CursorMorph } from "./demos/cursor-morph/CursorMorph";
import { ThemeSidebar } from "./demos/theme-sidebar/ThemeSidebar";
import { TaskRanking } from "./demos/task-ranking/TaskRanking";
import { DvdBounce } from "./demos/dvd-bounce/DvdBounce";
import { SlideUnlock } from "./demos/slide-unlock/SlideUnlock";
import { FigmaHighfive } from "./demos/figma-highfive/FigmaHighfive";
import { FrameGuide } from "./demos/frame-guide/FrameGuide";
import { AirpodsNC } from "./demos/airpods-nc/AirpodsNC";
import { SpotifyWrappedAds } from "./demos/spotify-wrapped-ads/SpotifyWrappedAds";
import { StravaFlights } from "./demos/strava-flights/StravaFlights";
import { SpotifyDJ } from "./demos/spotify-dj/SpotifyDJ";
import { CompanionZoo } from "./demos/companion-zoo/CompanionZoo";
import { ColorHoldPick } from "./demos/color-hold-pick/ColorHoldPick";
import { GithubSparkline } from "./demos/github-sparkline/GithubSparkline";
import { PageTransition } from "./demos/page-transition/PageTransition";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/glass-pull" element={<GlassPull />} />
        <Route path="/fisheye-text" element={<FisheyeText />} />
        <Route path="/cursor-morph" element={<CursorMorph />} />
        <Route path="/theme-sidebar" element={<ThemeSidebar />} />
        <Route path="/task-ranking" element={<TaskRanking />} />
        <Route path="/dvd-bounce" element={<DvdBounce />} />
        <Route path="/slide-unlock" element={<SlideUnlock />} />
        <Route path="/figma-highfive" element={<FigmaHighfive />} />
        <Route path="/frame-guide" element={<FrameGuide />} />
        <Route path="/airpods-nc" element={<AirpodsNC />} />
        <Route path="/spotify-wrapped-ads" element={<SpotifyWrappedAds />} />
        <Route path="/strava-flights" element={<StravaFlights />} />
        <Route path="/spotify-dj" element={<SpotifyDJ />} />
        <Route path="/companion-zoo" element={<CompanionZoo />} />
        <Route path="/color-hold-pick" element={<ColorHoldPick />} />
        <Route path="/github-sparkline" element={<GithubSparkline />} />
        <Route path="/page-transition" element={<PageTransition />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
