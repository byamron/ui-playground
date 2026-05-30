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
| Flock | `/flock` | Witty | @Twitter | Posted | — |

## Release roadmap

| # | Demo | Route | Type | Tag | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | GitHub Sparkline | `/github-sparkline` | Craft | — | Ready |
| 2 | Color Hold Pick | `/color-hold-pick` | Craft | — | Ready |
| 3 | Figma High-Five | `/figma-highfive` | Witty | @Soren, @Figma | Ready |
| 4 | Git Toggle | `/git-toggle` | Witty | @GitHub | Ready |
| 5 | Glass Pull | `/glass-pull` | Craft | @Gavin Nelson | Ready |
| 6 | Strava → Flights | `/strava-flights` | Witty | @Soren, @Strava | In progress |
| 7 | Cursor Morph | `/cursor-morph` | Craft | — | In progress |
| 8 | AirPods Contact NC | `/airpods-nc` | Witty | @Soren, @Apple | In progress |
| 9 | Fisheye Text | `/fisheye-text` | Craft | — | In progress |
| 10 | Spotify DJ Call-In | `/spotify-dj` | Witty | @Soren, @Spotify | In progress |
| 11 | Spotify Wrapped for Ads | `/spotify-wrapped-ads` | Witty | @Soren, @Spotify | In progress |
| flex | Companion Zoo | `/companion-zoo` | Witty | — | Deferred |

Ordering principles: open with two untagged craft pieces (GitHub Sparkline, Color Hold Pick) to keep profile depth, break to @Soren/@Figma at #3, then close out the Ready batch with the two strongest tagged pieces (Git Toggle @GitHub, Glass Pull @Gavin Nelson). Spotify Wrapped is held for the finale.

## Internal

| Demo | Route | Notes |
| --- | --- | --- |
| Frame Guide | `/frame-guide` | Personal tool, not for release. |

## Archived

| Demo | Route | Notes |
| --- | --- | --- |
| Task Ranking | `/task-ranking` | Cut from the release plan. |
