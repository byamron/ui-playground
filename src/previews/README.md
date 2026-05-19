# Gallery Tile Previews — WIP

> **Status: work in progress. Not ready to ship.**

Live mini-previews mounted into each tile on the homepage gallery. Each preview
imports real sub-components, constants, and physics systems from its source
demo so the homepage doubles as a showreel.

## Design

- **Idle = silent.** Tiles render their content at rest with no animation.
- **Hover-gated autoplay.** On hover (`intense=true`), each preview runs a
  canonical interaction loop (synthetic mouse events, scripted state changes,
  RAF-driven simulation).
- **Pause when offscreen.** Wrapped in `IntersectionObserver` via
  `useInView` so previews unmount their RAF when scrolled out of view.
- **Same code as the demo.** Each demo file exposes minimal additive exports
  (sub-components, constants, hooks) that the preview composes for the
  ~320×140 tile frame. No demo behavior was changed.

## Known issues / WIP

- **Companion Zoo:** Clippy's speech bubble overflows the 140px tile on hover
  and gets clipped at the top. The text + tail are still readable but the top
  of the bubble is cut off.
- **Slide Unlock:** Uses the real WebGL fluid shader but the handle is driven
  by a simple ease curve instead of the demo's full spring+completion timeline.
  No threshold-crossing detent, no completion flash.
- **Cursor Morph:** Uses container-local coords instead of viewport-fixed; the
  cursor's `mixBlendMode: difference` reads differently against the small tile
  background than against the full demo page.
- **Fisheye Text:** Lens sweep is timed (not cursor-following) — the sweep
  doesn't respond to where the real cursor is over the tile.
- **Page Transition:** Only the forward arrow plays; no return-arrow loop, no
  skeleton page swap. Just a quick wind-up→fly→reset.
- **DVD Bounce:** No corner celebrations, no mouse gravity, no trail. Just
  bounce + color cycle + squash. Initial paint relies on a `complete` check
  that may flash briefly on first mount.
- **AirPods NC, Wrapped Ads, Strava, DJ, Task Ranking:** These cycle through a
  static script; they don't react to where in the tile the cursor is.
- **No `prefers-reduced-motion` handling.**

## Files

- `_shared.ts` — `useClock`, `useInView`, `PreviewProps`, easing helpers
- `index.ts` — slug → component manifest used by `Gallery.tsx`
- `<slug>.tsx` — one preview per demo, default export
