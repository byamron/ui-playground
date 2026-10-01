# Demos

Inventory of every demo in the repo, plus the release roadmap for social.

The production Arcade ships from `/Users/benyamron/dev/portfolio` at
`benyamron.com/arcade`. To promote a Ready demo to the Arcade, see
`docs/promote-demo-to-arcade.md`. The architectural relationship
between the two repos is documented in `CLAUDE.md` under
"Two-repo workflow."

## Statuses

Release tracks two independent channels:

- **Twitter** — *Posted* once it's gone out on social.
- **Portfolio** — *Live* once it's reachable from the Arcade gallery at `benyamron.com/arcade`. *URL only* if it's been promoted to the portfolio repo but the Arcade entry point hasn't shipped yet, so it's only reachable by direct URL.

Roadmap statuses (for demos not yet shipped on either channel):

- **Ready** — meets the quality bar (extreme craft or novel/witty product thinking). Cleared for recording and/or portfolio promotion.
- **In progress** — exists in the codebase but not yet ready.
- **Deferred** — paused, will revisit later.
- **Internal** — tool for personal use, not part of the release plan.
- **Archived** — cut from the release plan; code may remain in `src/demos/archived`.

## Types

- **Craft** — extreme-craft interaction design.
- **Witty** — novel/witty product concept (Soren-style).

## Shipped

Demos that have gone out on at least one channel. No demos are *Live* in the Arcade gallery yet — the Arcade entry point is still pending. Once it ships, the *URL only* demos flip to *Live* automatically; the others need to be promoted to the portfolio repo first (see `docs/promote-demo-to-arcade.md`).

| Demo | Route | Type | Tag | Twitter | Portfolio |
| --- | --- | --- | --- | --- | --- |
| DVD Bounce | `/dvd-bounce` | Craft | — | Posted | URL only |
| Slide to Unlock | `/slide-unlock` | Craft | — | Posted | URL only |
| Theme Sidebar | `/theme-sidebar` | Craft | @Dia | Posted | — |
| Page Transition | `/page-transition` | Craft | — | Posted | — |
| GitHub Sparkline | `/github-sparkline` | Craft | — | Posted | — |
| Color Hold Pick | `/color-hold-pick` | Craft | — | Posted | — |
| Flock | `/flock` | Witty | — | Posted | — |

## Release roadmap

| # | Demo | Route | Type | Tag | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Figma High-Five | `/figma-highfive` | Witty | @Soren, @Figma | Ready |
| 2 | Git Toggle | `/git-toggle` | Witty | @GitHub | Ready |
| 3 | Glass Pull | `/glass-pull` | Craft | @Gavin Nelson | Ready |
| 4 | Strava → Flights | `/strava-flights` | Witty | @Soren, @Strava | In progress |
| 5 | Cursor Morph | `/cursor-morph` | Craft | — | In progress |
| 6 | AirPods Contact NC | `/airpods-nc` | Witty | @Soren, @Apple | In progress |
| 7 | Fisheye Text | `/fisheye-text` | Craft | — | In progress |
| 8 | Spotify DJ Call-In | `/spotify-dj` | Witty | @Soren, @Spotify | In progress |
| 9 | Spotify Wrapped for Ads | `/spotify-wrapped-ads` | Witty | @Soren, @Spotify | In progress |
| 10 | Record Toggle | `/record-toggle` | Craft | — | In progress |
| flex | Companion Zoo | `/companion-zoo` | Witty | — | Deferred |

Ordering principles: lead the next Ready batch with @Soren/@Figma to break the recent craft streak, then close out with the two strongest tagged pieces (Git Toggle @GitHub, Glass Pull @Gavin Nelson). Spotify Wrapped is held for the finale.

### Record Toggle — before Ready / Arcade promotion

Open items from the staff review (2026-10-01):

- **Licensing.** Default track is now *Martini Sunset* (Kevin MacLeod, CC0 via FreePD) — no credit required. *Smooth Lovin'* (CC BY 3.0) is still in the picker; if it's ever used on camera, credit it in the post with title, author, source and licence. Sources and licences for every track are in `public/audio/record-toggle/CREDITS.md`.
- **Trim the dev panel.** It has 16 controls; the tuning-only ones (Off delay, Arm fade size, Breath detail, Fade in, Vinyl detail) can become named constants, and the unused glow variants (Spectrum, Breath → Layers) can be cut, since demo panels ship to production.
- **Perf on mobile.** The loop still writes styles every frame while idle; add an early-out when springs are settled, speed is 0 and the glow is dark. The blurred arm shadow re-filters every frame during playback (warp); consider moving the warp to the body only.
- **Asset weight.** ~2.4 MB per mp3; decoded buffers are ~55 MB each on iOS. Consider shorter loops or mono before promotion.
- **Spring/threshold constants.** Move the approved stiffness/damping pairs and arm/needle thresholds into a named table so they port to the portfolio intact.
- **Device checks (iPhone).** Verify drag-to-on audio unlock; that the silent switch doesn't mute playback (`navigator.audioSession`); that the `<input switch>` haptic fires on toggle and at the needle drop (iOS 18+, undocumented); and how the first-play "Ringer on" hint reads.

## Internal

| Demo | Route | Notes |
| --- | --- | --- |
| Frame Guide | `/frame-guide` | Personal tool, not for release. |

## Archived

| Demo | Route | Notes |
| --- | --- | --- |
| Task Ranking | `/task-ranking` | Cut from the release plan. |
