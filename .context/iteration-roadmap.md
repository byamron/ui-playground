# UI Craft Demos — Iteration Roadmap

## Context

The bar for sharing demos publicly has been raised: AI makes building something table stakes. Only two categories clear the bar:
1. **Extreme craft** — tasteful, beyond professional grade
2. **Novel product thinking** — witty, clever, or genuinely surprising

**Brand theme: Physics.** Spring dynamics, fluid simulation, deformation, momentum — these should be the signature differentiator across the collection.

**Additional goals:**
- Improvements to portfolio-origin components should be backportable to the portfolio site (`/Users/benyamron/Desktop/coding/portfolio-site`)
- Explore shaders (WebGL/GLSL) where they genuinely elevate craft — don't force it
- Performance must stay excellent (60fps, no jank)

**Current tech stack:** React + Vite + Framer Motion. No WebGL/shader deps yet — will need to add for shader work (likely raw WebGL or a lightweight lib like OGL).

---

## Priority Order

Balanced for **impact** (Twitter/portfolio presence — how cool or thoughtful is it?) and **speed** (ship fast, nothing posted yet). Shader infra is prioritized early because it unblocks multiple later demos.

---

### #1. DVD Bounce (Craft) — SHIP FIRST
**File:** `src/demos/dvd-bounce/DvdBounce.tsx` (688 lines)
**Why first:** Already 90% built. Universal nostalgia + "will it hit the corner?" is Twitter gold. Just needs a polish pass.

**Current state:** Canvas-based bouncing DVD logo with spring deformation, confetti on corner hits, mouse attraction, trajectory-aiming algorithm, tuning panel. Already the strongest demo — has both concept (shared cultural nostalgia) and technical depth.

**Designer take:** Witty concept everyone connects with. The mouse attraction creates a game. Corner payoff is satisfying. Camp #2 with camp #1 potential.

**Engineer take:** Most technically ambitious demo. Custom spring integration, volume-preserving deformation, particle system, corner-aiming trajectory math. Solid foundation.

**Options to raise the bar:**
- **Squash/stretch feel:** Push deformation further — more dramatic squash on wall impact, more elastic recovery. The spring params (stiffness 300-700, damping 8-33) could be tuned for more satisfying bounce feel.
- **Confetti upgrade:** Current confetti is rectangles/circles with gravity. Could add: ribbon shapes, spiral trajectories, more dramatic burst patterns, color-coordinated confetti.
- **Screen shake:** Subtle camera shake on corner hit (canvas translate) for more impact.
- **Trail/afterimage:** Subtle motion trail behind the logo at higher speeds.
- **Sound design consideration:** If demoed as video, sound would massively amplify impact (bounce thuds, corner celebration). Not in-browser, but worth noting for recording.
- **Panel polish:** The tuning panel is functional but could be more beautiful. Slider thumb animations, value labels, grouping.

**Shader opportunity:** Logo glow could use a simple radial blur shader instead of canvas shadowBlur. Not high priority — canvas approach works.

**Performance notes:** Already canvas-based, very performant. Confetti particle count (80+16 per corner) is fine.

**Portfolio backport:** N/A — standalone demo.

**Future: Mobile support.** The sidebar DevPanel doesn't work on mobile. Add a floating "Tune" button (top-right) that opens the controls as a modal/overlay, so the logo keeps the full screen to bounce behind it. The canvas already uses container-based sizing, so the bounce area wouldn't need changes — just the panel presentation layer.

---

### #2. Figma High-Five Permissions (Unhinged) — QUICK WIN
**File:** New — `src/demos/figma-highfive/FigmaHighfive.tsx`
**Why second:** 1 screen, buildable in an afternoon. Designer crowd will screenshot and repost.

**Concept:** Permissions modal where someone only has "Can high-five" access.

**Flow (~1 screen):** Figma share modal already open. Click the permissions dropdown → see "Can high-five" option. Select it. Done. Maybe the cursor briefly changes to a high-five on selection for the payoff.

**Craft challenge:** Pixel-perfect Figma share modal. The dropdown is the entire joke. Must use Figma's exact fonts, spacing, colors, and interaction patterns.

**Note:** Very strong for the designer crowd. "If you know, you know."

---

### #3. Slide to Unlock + WebGL Infra (Craft/Shader) — DONE
**Source files:**
- `SlideToCallControl.swift` — SwiftUI component with drag gesture, threshold detection, spring reset
- `FluidMotion.metal` — Metal shader: 3D simplex noise + FBM for flowing green fluid trail
- `FluidMotionShader.swift` — SwiftUI bridge with configurable speed/scale/intensity

**File:** New — `src/demos/slide-unlock/SlideUnlock.tsx`
**Why third:** Creates shared WebGL infrastructure (`src/utils/webgl.ts`) that Theme Sidebar (#12) and Cursor Morph (#11) need. The demo itself is also impressive and postable.

**Current state:** SHIPPED. Full web port complete with extended shader system.

**Designer take:** High craft with product meaning. The fluid trail building behind the handle as you drag, the threshold color change, the spring reset — it has intention. The shader gives it a quality that's immediately distinctive.

**Engineer take:** The Metal shader is genuinely beautiful. 3D simplex noise -> FBM (3 octaves, lacunarity 2.0, gain 0.5) -> flowing organic greens. Very portable to WebGL — simplex and FBM are well-established GLSL patterns.

**Implementation plan:**
- **Shader approach:** WebGL canvas for the fluid trail, overlaid with DOM elements for handle/text. Use raw WebGL (no Three.js needed — it's a 2D fullscreen quad with a fragment shader).
- **GLSL port:** Translate the Metal `fluidMotionTrail` function to GLSL. The math is identical — simplex noise, FBM, edge fade, color mixing.
- **Drag interaction:** Pointer events with spring-based reset (custom spring solver, not CSS transitions).
- **Threshold behavior:** Visual feedback at 85% (handle color change, haptic via navigator.vibrate if available).
- **Text:** Typewriter reveal + shimmer overlay (CSS animation, no shader needed).
- **Capsule track:** CSS border-radius, positioned behind the WebGL canvas.
- **Shared infra:** Create `src/utils/webgl.ts` with context creation, shader compilation, uniform helpers, resize handling. Reuse across all shader demos.

**Performance notes:** WebGL fragment shader runs on GPU — very performant even on mobile. The shader is simple (3 octaves of noise). Main concern: WebGL context creation overhead. Use a single persistent context.

**Portfolio backport:** N/A — this is from the language app, not portfolio.

---

### #4. AirPods Contact Noise Cancelling (Unhinged)
**File:** New — `src/demos/airpods-nc/AirpodsNC.tsx`
**Why here:** 1 screen, universal humor (everyone relates to wanting to mute someone). Fast to build.

**Concept:** Tune out specific people in your life.

**Flow (~1 screen):** iOS Settings page for AirPods with a contacts list. Each contact has a noise cancellation mode toggle. The humor is in the contact names + settings combos ("Manager (standup): Noise Cancellation" / "Mom: Transparency"). Drag a slider or two.

**Craft challenge:** Must look exactly like iOS Settings. SF Pro font, exact cell heights, segmented controls, toggle switches.

---

### #5. Glass Pull — Springs (Craft)
**File:** `src/demos/glass-pull/GlassPull.tsx` (385 lines)
**Why here:** Spring conversion on existing code. Impressive to design engineers. Good "craft" post to alternate with funny ones.

**Current state:** Imperative glass highlight system with lerp-based position tracking, volume-preserving stretch/squash via Web Animations API, cursor edge-pull with power curves, full glass recipe (radial highlight + 6 directional inset shadows). Ported from portfolio's `useGlassHighlight` hook.

**Designer take:** Morphing pill navs exist (Apple, Vercel, Linear), but the physics-based deformation and edge-pull add genuine physicality. The feel could differentiate it if pushed hard enough.

**Engineer take:** Production-grade implementation. But the lerp (0.15) is smooth, not *physical*. Springs would give overshoot, settle, breathing — that alive, weighted quality.

**Options to raise the bar:**
- **Convert lerp to spring physics:** Replace the linear interpolation with a proper spring solver (like the one already in FisheyeText). Springs give overshoot and settle that lerp can't. This is the single biggest improvement.
- **Velocity-aware stretch:** Currently uses Web Animations API keyframes (ease-out) for stretch. Replace with spring-driven stretch that responds to actual velocity magnitude. More speed = more stretch, with natural spring recovery.
- **Vertical pill pull:** The edge-pull uses power curves — could feel more alive with spring-based pull that overshoots slightly when you reverse direction.
- **Content context:** The demo shows generic design buzzwords. Putting it in a real nav context (actual links, icons) would make it feel more like a real product.

**Shader opportunity:** Low. Glass effect is CSS backdrop-filter, which is the right tool.

**Performance notes:** Single RAF loop, imperative DOM updates, no React re-renders during animation. Already optimal. Springs add negligible overhead.

**Portfolio backport:** Yes — the spring conversion should be backported to `useGlassHighlight.ts` at `/Users/benyamron/Desktop/coding/portfolio-site/src/hooks/useGlassHighlight.ts`. Must verify it performs well within the full portfolio site context (more DOM, other animations running).

---

### #6. Spotify Wrapped for Ads (Unhinged)
**File:** New — `src/demos/spotify-wrapped-ads/SpotifyWrappedAds.tsx`
**Why here:** Funniest idea in the collection. Highest virality potential. More effort than 1-screen demos but worth it.

**Concept:** Your year in review, but for all the ads you endured.

**Flow (~3-4 cards):** Swipeable Wrapped-style story cards. Keep it to the 3-4 funniest stats: total ads, top ad genre, most-repeated line, longest streak. End card: "Go Premium?" CTA.

**Craft challenge:** Must nail Spotify Wrapped's exact visual language — the bold gradients, the typography, the card-swipe transitions.

---

### #7. Strava → Flight Redemption (Unhinged)
**File:** New — `src/demos/strava-flights/StravaFlights.tsx`
**Why here:** App-switch concept is instantly funny. 2 screens + transition.

**Concept:** Redeem your running/cycling miles as airline miles.

**Flow (~2 screens):** Strava activity summary showing a "Redeem Miles" CTA → tap → app-switch animation to Delta/Spirit showing your Strava miles as balance, one flight option ready to book. The app-switch moment IS the joke — two worlds colliding.

**Craft challenge:** Both Strava and the airline app need to look native. The transition between them sells it.

---

### #8. Task Ranking (Craft)
**File:** `src/demos/task-ranking/TaskRanking.tsx` (325 lines)
**Why here:** Solid product thinking but niche appeal. Needs significant craft uplift on existing code.

**Current state:** Binary search pairwise comparison UI. Async generator bridges algorithm with user input. Keyboard shortcuts (1/2). Clean AnimatePresence transitions. Staggered result reveal.

**Designer take:** Genuine product thinking — O(log n) ranking via binary comparison is algorithmically elegant and UX-focused. Camp #2. But the visual craft is prototype-level.

**Engineer take:** The async generator pattern is clever. But the UI is flat — standard cards, basic fade transitions, static "or" divider. The craft needs to match the concept's ambition.

**Options to raise the bar:**
- **Physical card transitions:** When you choose one card, the other should physically react — fall away, compress, deflate, swing out. Spring-driven exit animations with rotation and scale.
- **Card entrance physics:** New comparison pairs should arrive with momentum — slide in from edges, slight overshoot, settle into position.
- **The "or" moment:** Instead of dead text, the "or" could be a visual beat — a line that stretches between the cards, a breathing pause, something that creates tension.
- **Result list with gravity:** As the ranked list builds, items could drop in with weight — spring-based stacking where each new item pushes existing ones down with physical response.
- **Progress indication:** The binary search step counter could be more visual — a narrowing beam, converging lines, something that communicates "getting closer."
- **Keyboard feel:** When pressing 1 or 2, add a visual pulse on the chosen card before it exits.

**Shader opportunity:** Low priority. CSS can handle background gradients.

**Performance notes:** DOM-based with Framer Motion. Should stay DOM — the card count is small. Springs are cheap.

**Portfolio backport:** N/A — standalone demo (from Trio app).

---

### #9. Fisheye Text (Craft)
**File:** `src/demos/fisheye-text/FisheyeText.tsx` (243 lines)
**Why here:** Needs concept frame + variable font + visual design. Medium on both impact and speed.

**Current state:** Custom spring physics solver driving per-character scaleX and x-position. Hidden textarea for input capture. 4-neighbor push range with falloff. Already has real physics (force/velocity/position integration).

**Designer take:** The only demo where there's a *verb* — you type, text responds. The mechanic (interactive typography + proximity distortion) is genuinely interesting. But needs a concept frame — "why does text behave this way?"

**Engineer take:** Custom spring solver is solid. But the distortion is crude — horizontal `scaleX` stretches letterforms. Variable font with width axis would look dramatically better.

**Options to raise the bar:**
- **Variable font:** Use a font with a `wdth` axis (e.g., Inter Variable, Recursive). Interpolate width instead of `scaleX` — the letterforms stay optically correct.
- **Concept frame:** Could be "a text editor that breathes" or "words that feel your presence." The frame gives it meaning.
- **Vertical dimension:** Add Y-axis distortion — characters lift slightly toward cursor, creating a dome effect.
- **Visual design:** Move beyond white monospace on dark. Considered typography, color, composition.
- **Gravity/settle:** When you stop hovering, characters could settle with weight — slight downward overshoot before returning to baseline.

**Shader opportunity:** Could use a shader for lens distortion, but DOM-based per-character springs may feel more tactile. Evaluate case by case.

**Performance notes:** Per-character spring solver running at 60fps. For typical text lengths (<100 chars) this is fine.

**Portfolio backport:** N/A — standalone demo.

---

### #10. Spotify DJ Call-In (Unhinged)
**File:** New — `src/demos/spotify-dj/SpotifyDJ.tsx`
**Why here:** Fun but less punchy than Wrapped or Strava. 2 beats.

**Concept:** Call in to the AI DJ like a radio station.

**Flow (~2 beats):** Tap "Call DJ" button in Spotify player → iOS call screen appears (ringing → DJ picks up with a one-liner about your taste). The call screen crossover is the punchline.

**Craft challenge:** Spotify player → iOS call screen transition must feel like a real app switch.

---

### #11. Cursor Morph + Shader (Craft/Shader)
**File:** `src/demos/cursor-morph/CursorMorph.tsx` (208 lines)
**Why here:** Depends on WebGL infra from #3. Derivative concept needs the shader to stand out.

**Current state:** 80px white circle with mix-blend-mode:difference follows cursor. On card hover, circle scales to 0 revealing an arrow. Debounce between cards.

**Designer take:** Derivative (agency portfolio staple since ~2018). But if the morph becomes *physical* — the circle deforms, stretches, and reshapes through spring dynamics — it becomes a physics showcase.

**Engineer take:** Currently uses CSS cubic-bezier for the scale transition. No spring physics, no velocity awareness. Needs full physics rewrite to be on-brand.

**Options to raise the bar:**
- **Spring-driven morph:** Replace CSS scale(0) with spring physics. The circle should squash, stretch, and organically reshape.
- **Velocity-aware cursor:** The circle should stretch in the direction of movement, squash on direction changes. Gives it life.
- **Shape morphing:** Instead of scale(0) → reveal arrow, actually morph the circle shape into an arrow shape through interpolation. SVG path morphing or canvas-based.
- **Inertia on stop:** When the cursor stops, the circle should overshoot slightly and settle — like it has mass.

**Shader opportunity — Dynamic cursor effects (high potential):** Replace flat `mix-blend-mode: difference` with a WebGL shader that creates richer optical effects:
- **Displacement/distortion lens:** Content behind the cursor warps like a glass lens — push away on movement, settle when still. Physics-driven distortion radius.
- **Chromatic aberration:** RGB channel split based on velocity vector — faster = more separation. Channels converge back with spring dynamics on stop.
- **Fluid morph transition:** Shape melts and reforms through noise-based dissolve instead of scale(0).
- **Selective color shifting:** Context-aware hue rotation instead of simple inversion.
- **Technical approach:** WebGL canvas that samples content behind cursor. Fragment shader with displacement, chromatic aberration, and noise threshold dissolve.

**Performance notes:** WebGL canvas following cursor is lightweight. Main concern: capturing content behind cursor — may need CSS `backdrop-filter` fallback. Test both approaches.

**Portfolio backport:** CursorMorph was described as ported from portfolio's CustomCursor.tsx, but no matching file found. Investigate before backporting.

**Depends on:** WebGL infra from #3 (Slide to Unlock).

---

### #12. Theme Sidebar + Shader (Craft/Shader)
**File:** `src/demos/theme-sidebar/ThemeSidebar.tsx` (355 lines)
**Why here:** Depends on WebGL infra from #3. More of a portfolio backport than a standalone Twitter post.

**Current state:** Hover-reveal sidebar with color swatches, intensity gradient strip (drag), appearance mode icons. Glass pill hover feedback. Stagger animations. Background color transitions.

**Designer take:** Functional settings UI, not a standalone concept. But within a richer context (where you can see the *results* of changing theme), it becomes more compelling.

**Engineer take:** Well-implemented but not pushing boundaries. The pointer capture slider, glass pills, and stagger timing are solid production code.

**Options to raise the bar:**
- **Theme image change:** Add a preview area that shows a hero image or content block that visually responds to the theme changes. When you change accent color, the image/content tints. When you change intensity, the atmosphere shifts. When you toggle light/dark, everything adapts.
- **Physical color transitions:** Instead of CSS `transition: background 500ms`, use spring-driven color interpolation that overshoots slightly in saturation before settling.
- **Intensity strip physics:** The drag thumb could have spring momentum — flick it and it overshoots, settles back.

**Shader opportunity — Pulsing border (high potential):** Inspired by Paper Design's pulsing-border shader (`shaders.paper.design/pulsing-border`):
- **Cursor-reactive color spots:** Colored spots along a rounded-box SDF border, each corresponding to a theme accent color. Spots gravitate toward cursor position.
- **Selection pulse:** Border pulses with selected accent color via sine-wave intensity modulation.
- **Intensity slider → shader uniforms:** Dragging the intensity strip directly controls the border's glow.
- **Smoke/noise layer:** Procedural noise adds organic movement.
- **Technical approach:** Small WebGL canvas behind sidebar. Fragment shader with rounded-box SDF, angular color blending, cursor position uniform.

**Performance notes:** DOM-based sidebar + small WebGL canvas. Shader is lightweight.

**Portfolio backport:** Yes — applicable to `SidebarThemeControls.tsx` at `/Users/benyamron/Desktop/coding/portfolio-site/src/components/SidebarThemeControls.tsx`.

**Depends on:** WebGL infra from #3 (Slide to Unlock).

---

### #13. Software Companion Zoo (Craft/Concept) — BIGGEST PROJECT
**File:** `src/demos/figpal-cursor/FigpalCursor.tsx` (117 lines) — to be significantly expanded
**Why last:** Highest potential but biggest investment. Research, assets, multiple behaviors. Save for when the foundation is solid.

**Current state:** Simple lerp-following SVG companion. Minimal implementation.

**Designer take:** The concept reframe is the breakthrough. Not "a cursor companion" — but a **zoo for software companion animals through the ages.** Figpal, Claude buddies, Clippy, maybe Bonzi Buddy, the macOS Finder face, etc. Each behaves the way it did in its original context. Camp #2 — witty, nostalgic, "if you know you know."

**Engineer take:** More content/concept than pure craft. The challenge is giving each companion its *authentic behavior*:

**Companion roster & behaviors:**
- **Clippy (Office '97):** Appears in corner, taps on window, suggests things. Sprite-based animation. Parks at bottom-right.
- **Figpal (Figma):** Follows cursor with lerp, parks on bottom menu bar. Can be picked up and carried. Already partially implemented.
- **Claude Buddies (Anthropic, recent):** The newest addition. Research exact behavior.
- **Bonzi Buddy (early 2000s):** Purple gorilla, text-to-speech era. Sits on edge of screen, waves.
- **macOS Finder face (classic Mac):** The smiling Mac icon whose eyes follow your cursor.

**Implementation approach:**
- Gallery/stage view where companions coexist — each in its natural habitat zone
- Ability to interact with each one according to its original interaction pattern
- Possibly a timeline/evolution framing — "companions through the ages"
- Each companion needs its own sprite/SVG assets and behavior logic

**Shader opportunity:** Low. This is about character and interaction, not visual effects.

**Performance notes:** Multiple animated sprites + lerp loops. Use a single RAF loop for all companions.

**Portfolio backport:** N/A — standalone concept piece.

---

## To Kill

Remove from gallery, don't delete code:
- **Water Ripple** — Decade-old pattern, tutorial-level
- **Magnetic Button** — Agency portfolio cliche
- **Text Scramble** — Exhausted concept, zero interactivity
- **Elastic Toggle** — "Hello world" of spring animations

---

## Shader Strategy

Three demos have meaningful shader opportunities. Ordered by implementation priority:

### Shader 1: Slide to Unlock (#3) — Fluid FBM trail
Port Metal `fluidMotionTrail` to GLSL. 3D simplex noise → FBM (3 octaves) → flowing green organic motion. Simplest shader to port (direct math translation). **Establishes WebGL infrastructure.**

### Shader 2: Theme Sidebar (#12) — Cursor-reactive pulsing border
Rounded-box SDF border with angular color sectors that react to cursor position. Reference Paper Design's pulsing-border pattern. Adds: cursor-distance weighting, selection pulse, intensity slider → shader uniform mapping, procedural noise.

### Shader 3: Cursor Morph (#11) — Displacement lens + chromatic aberration
Content distortion behind cursor driven by velocity springs. RGB channel splitting on movement. Noise-based fluid dissolve for circle→arrow morph. Most complex shader.

### Shader infrastructure
- **Tech approach:** Raw WebGL for all three. Fullscreen quad with fragment shader. No Three.js/OGL needed.
- **Shared utilities:** `src/utils/webgl.ts` — context creation, shader compilation, uniform helpers, resize handling.
- **Dependency:** None. Raw WebGL API.
- **Fallbacks:** For cursor morph content sampling, may need CSS `backdrop-filter` fallback. Test Chrome and Safari.

---

## Portfolio Backport Candidates

| Demo | Portfolio file | Condition |
|------|---------------|-----------|
| Glass Pull #5 (springs) | `src/hooks/useGlassHighlight.ts` | Must verify performance in full site context |
| Theme Sidebar #12 (image change, physics, shader) | `src/components/SidebarThemeControls.tsx` | Must work within existing layout |
| Cursor Morph #11 (spring deformation) | Not found in portfolio — investigate | Only if component still exists |

---

## Dependency Chain

```
#3 Slide to Unlock (creates WebGL infra)
  ├── #11 Cursor Morph + shader
  └── #12 Theme Sidebar + shader

All other demos are independent and can run in parallel.
```

---

## Unhinged Product Ideas — Shared Notes

**Presentation principles:**
- **Keep it tight.** Deliver the joke within ~10 seconds / a couple clicks. No extended flows.
- **Interactive > static.** The step above Soren. Interactivity serves the joke, not scope creep.
- **Pixel-perfect mimicry.** Must look indistinguishable from the real product UI.

**Implementation notes:**
- Each idea needs product-specific UI research first (fonts, colors, spacing, icons).
- These can share an "Unhinged" gallery/section separate from the craft demos.
- Verify ideas aren't already taken by Soren or others. Interactive angle is the differentiator.
- Surface area discipline: the joke lands in the first interaction, not after a tutorial.

---

## Verification

For each demo iteration:
1. `npm run dev` — verify demo loads and runs
2. Test at 60fps — Chrome DevTools Performance panel, record interaction, verify no frame drops
3. Test interaction feel — does the physics feel *weighted* and *alive*, not floaty or mechanical?
4. Screenshot/record before and after for comparison
5. For portfolio backports: test in the portfolio site context with other animations running
6. For unhinged product ideas: screenshot-compare against the real product UI — if it doesn't look native, the joke doesn't land
