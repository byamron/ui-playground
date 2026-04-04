# UI Playground — Plan

## What this project is

A collection of interactive demos for Twitter/social sharing. Two categories:
1. **Craft demos** — extreme interaction design with physics as the brand (springs, fluid sim, deformation)
2. **Unhinged product ideas** — witty Soren Iverson-style concepts, but interactive instead of static screenshots

**Quality bar:** Only publish what either (a) has craft beyond professional-grade apps, or (b) is genuinely novel/witty in product thinking. AI makes building table stakes — only taste and originality differentiate.

## Key locations

| What | Path |
|------|------|
| This project | `/Users/benyamron/conductor/workspaces/ui-playground/tianjin` |
| Portfolio site (for backports) | `/Users/benyamron/Desktop/coding/portfolio-site` |
| Language app (slide-to-unlock source) | `/Users/benyamron/Desktop/coding/language-app` |
| Full detailed roadmap | `.context/iteration-roadmap.md` |

## Tech stack

React + Vite + Framer Motion + TypeScript. Shaders use raw WebGL (no Three.js). Shared WebGL utils go in `src/utils/webgl.ts` (to be created with slide-to-unlock workspace).

---

## Workstreams & Status

### Priority Order

Balanced for impact (Twitter presence) and speed (ship fast). Shader infra (#3) is prioritized early because it unblocks multiple later demos.

| Priority | Demo | Category | Status | What needs doing | Key file(s) | Depends on |
|----------|------|----------|--------|-----------------|-------------|------------|
| **1** | DVD Bounce | Craft | Ready to polish | Push squash/stretch feel, upgrade confetti (ribbons, spirals), add screen shake on corner, polish tuning panel. Already 90% built. | `src/demos/dvd-bounce/DvdBounce.tsx` | — |
| **2** | Figma High-Five | Unhinged | Not started | 1 screen — pixel-perfect Figma share modal with "Can high-five" dropdown. Quickest win, designer crowd catnip. | new file | — |
| **3** | Slide to Unlock + WebGL infra | Craft/Shader | Not started | Port Swift/Metal shader to web. GLSL FBM fluid trail. Spring-based drag reset. **Creates shared WebGL infra** (`src/utils/webgl.ts`). Source: `SlideToCallControl.swift` + `FluidMotion.metal` in language-app | `src/demos/slide-unlock/SlideUnlock.tsx` (new) | — |
| **4** | AirPods Contact NC | Unhinged | Not started | 1 screen — iOS Settings with per-contact noise cancellation sliders. Universal humor. | new file | — |
| **5** | Glass Pull (springs) | Craft | Ready to iterate | Convert lerp → spring physics, spring-driven stretch/squash, spring-based edge pull. Prep portfolio backport. | `src/demos/glass-pull/GlassPull.tsx` | — |
| **6** | Spotify Wrapped for Ads | Unhinged | Not started | 3-4 swipeable Wrapped-style story cards. Highest virality potential. | new file | — |
| **7** | Strava → Flights | Unhinged | Not started | 2 screens with app-switch animation. Strava → Delta/Spirit. | new file | — |
| **8** | Task Ranking | Craft | Ready to iterate | Physical card transitions (spring exits with rotation/scale), entrance physics, gravity-based result list. | `src/demos/task-ranking/TaskRanking.tsx` | — |
| **9** | Fisheye Text | Craft | Ready to iterate | Variable font (wdth axis), concept frame, vertical dome distortion, visual design overhaul. | `src/demos/fisheye-text/FisheyeText.tsx` | — |
| **10** | Spotify DJ Call-In | Unhinged | Not started | 2 beats — player → iOS call screen. | new file | — |
| **11** | Cursor Morph + shader | Craft/Shader | Ready to iterate | Spring-driven morph, velocity-aware stretch. Shader: displacement lens, chromatic aberration, fluid dissolve. | `src/demos/cursor-morph/CursorMorph.tsx` | WebGL infra (#3) |
| **12** | Theme Sidebar + shader | Craft/Shader | Ready to iterate | Theme image preview, cursor-reactive pulsing border shader, intensity physics. Portfolio backport. | `src/demos/theme-sidebar/ThemeSidebar.tsx` | WebGL infra (#3) |
| **13** | Companion Zoo | Craft/Concept | Not started — concept phase | "Zoo for software companion animals" — Clippy, Figpal, Claude Buddies, etc. Biggest project. | `src/demos/figpal-cursor/FigpalCursor.tsx` (expand) | — |

### To Kill (remove from gallery, don't delete code)

Water Ripple, Magnetic Button, Text Scramble, Elastic Toggle — all generic, tutorial-level.

---

## Principles for implementation

- **Physics brand:** Springs everywhere. Things should feel weighted, overshoot, settle. Never use CSS transitions where a spring would feel better.
- **Performance:** 60fps or bust. Use Chrome DevTools Performance panel to verify. Prefer imperative DOM updates + RAF loops over React re-renders for animation.
- **Shaders:** Raw WebGL, fragment shaders on fullscreen quads. Shared utils in `src/utils/webgl.ts`. Don't force shaders where CSS/canvas is sufficient.
- **Portfolio backports:** Glass Pull and Theme Sidebar improvements should be portable back to portfolio site. Test in full site context before applying.
- **Unhinged ideas:** Pixel-perfect product mimicry is non-negotiable. Research real app UI (fonts, colors, spacing, icons) before building. The joke only lands if the UI looks legitimate.
- **Surface area:** Keep demos focused. One interaction, one moment. Resist scope creep.

---

## How to pick up a workstream

1. Read this file for context and status
2. Read `.context/iteration-roadmap.md` for the detailed breakdown of your specific demo (designer/engineer perspectives, specific options, shader details, performance notes)
3. Check the current code — `git log` for recent changes, read the demo file
4. Implement, keeping the principles above in mind
5. Test: `npm run dev`, verify 60fps, verify the interaction feels *alive*
