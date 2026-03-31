import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./global.css";
import { Gallery } from "./Gallery";
import { WaterRipple } from "./demos/water-ripple/WaterRipple";
import { GlassPull } from "./demos/glass-pull/GlassPull";
import { MagneticButton } from "./demos/magnetic-button/MagneticButton";
import { TextScramble } from "./demos/text-scramble/TextScramble";
import { ElasticToggle } from "./demos/elastic-toggle/ElasticToggle";
import { FisheyeText } from "./demos/fisheye-text/FisheyeText";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/water-ripple" element={<WaterRipple />} />
        <Route path="/glass-pull" element={<GlassPull />} />
        <Route path="/magnetic-button" element={<MagneticButton />} />
        <Route path="/text-scramble" element={<TextScramble />} />
        <Route path="/elastic-toggle" element={<ElasticToggle />} />
        <Route path="/fisheye-text" element={<FisheyeText />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
