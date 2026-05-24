# Cross-repo sync: ui-playground ↔ portfolio

> **Status:** Active. Supersedes
> `ui-playground/docs/promote-demo-to-arcade.md` (3-line pointer
> retained for breadcrumb continuity per D6).
>
> Mirror location:
> - portfolio → `core-docs/playground-sync.md`
> - ui-playground → `docs/cross-repo-sync.md` (this file)
>
> Both copies must stay in lockstep except for §8 (workshop-side
> responsibilities), which is playground-only. When the doc changes,
> open a PR pair updating both — same content, same commit message
> reference.

---

## 1. What the two repos are

| Repo | Role | URL | Audience |
| --- | --- | --- | --- |
| **ui-playground** | Workshop. Every demo lives here — Ready, In progress, Internal, Deferred, Archived. Iteration happens fast on `main`; the wrapping shell switches between Museum / Arcade / Cursor Curious galleries for exploration. | `github.com/byamron/ui-playground` | Ben (development), captured into recordings |
| **portfolio** | Production site at `benyamron.com`. Consumes a curated subset of playground demos via `/arcade`. No In progress demos, no internal tools, no mode-switcher. | `github.com/byamron/portfolio` (private) | Public visitors |

One product, two surfaces. Playground = workshop bench. Portfolio = showcase wall.

**Rationale.** The hard split exists because the playground's value comes
from being a fearless place to try things, and the portfolio's value
comes from being a polished public surface. Fusing the repos would push
the playground toward conservatism (every dev branch one merge away from
production) or the portfolio toward sprawl. Keeping them separate with a
controlled bridge preserves both.

---

## 2. How the connection works

The portfolio consumes the playground via a **git submodule**, with a
**portfolio-side allowlist** controlling which demos surface publicly.

```
portfolio/
├── ui-playground/                          ← git submodule (pinned SHA)
│   └── src/
│       ├── demos/<slug>/<Component>.tsx    ← per-demo source
│       ├── palette.ts                      ← shared color system
│       ├── utils/webgl.ts                  ← shared WebGL helper
│       └── components/DevPanel.tsx         ← shared dev panel primitive
├── src/
│   ├── App.tsx                             ← mounts /arcade, /arcade/:slug, vanity routes
│   ├── pages/
│   │   ├── Arcade.tsx                      ← mounts ArcadeGallery + theme bridge
│   │   └── ArcadeDemo.tsx                  ← per-slug loader (allowlist gate)
│   ├── components/
│   │   ├── arcade/
│   │   │   ├── ArcadeGallery.tsx           ← gallery shell (copied from submodule)
│   │   │   ├── demos.ts                    ← portfolio allowlist + catalogue codes
│   │   │   └── arcade-internal/            ← coinPhysics, audio, arcade-themes.css (copied)
│   │   ├── PlaygroundWrapper.tsx           ← scoped style reset (full-viewport, hidden overflow)
│   │   └── PlaygroundDemo.tsx              ← wrapper used by vanity routes
│   └── types/
│       └── playground.d.ts                 ← declare module '@playground/*';
├── scripts/generate-sitemap.ts             ← contains arcade slug allowlist
├── vite.config.ts                          ← alias '@playground' → ui-playground/src
└── tsconfig.app.json                       ← does NOT path-map '@playground/*' (intentional)
```

### Submodule config

- Path: `portfolio/ui-playground/`
- URL: `https://github.com/byamron/ui-playground.git`
- Current pin: a specific commit SHA on playground `main`. Advances
  intentionally per portfolio PR.

### The two ship gates

A demo only surfaces on `benyamron.com/arcade` if **both** gates pass:

1. **Submodule pointer.** The demo's source files must exist at the
   pinned SHA. Half-finished work added to playground `main` after the
   last bump stays hidden.
2. **Portfolio-side allowlist.** The demo's slug must appear in **three
   portfolio files that must agree**:
   - `src/components/arcade/demos.ts` — gallery card (title, description, catalogue code, palette)
   - `src/pages/ArcadeDemo.tsx` — `arcadeDemos` map (lazy import)
   - `scripts/generate-sitemap.ts` — `arcadeSlugs` array

Either gate alone is sufficient to hide a demo. This is a deliberate
defense-in-depth design — accidentally bumping the submodule doesn't
expose in-progress demos because the allowlist hasn't been updated;
accidentally adding to the allowlist doesn't crash the build because
`safeLazy()` swallows missing-module errors with `.catch()`.

**Rationale.** A single gate would couple "what I'm iterating on" too
tightly to "what I'm shipping." The submodule pointer is the natural
"what's available" boundary; the allowlist is the natural "what's ready"
boundary. They map to different mental modes (build vs publish) and
should be controlled separately.

### Shared surface (playground-side stability contract)

The portfolio depends on these submodule exports keeping their current
shape. Renaming, restructuring, or changing exports breaks the portfolio
without a corresponding PR pair. The contract is the same either way,
but the direct/transitive split below tells you *where* the break
surfaces — useful for debugging and for grepping the portfolio.

**Direct surface** — imported by name in portfolio source:

- `@playground/palette` — named exports `bg`, `text`, `demoPalettes`
  (`bg`, `demoPalettes` directly in `src/components/arcade/demos.ts`;
  `text` also used transitively)
- `@playground/demos/<slug>/<Component>` — each demo's named export
  matches its file name (e.g. `PageTransition` in `PageTransition.tsx`).
  Imported directly by `src/pages/ArcadeDemo.tsx` and
  `src/components/PlaygroundDemo.tsx`.

**Transitive surface** — reached only through the demos themselves or
the gallery shell. Zero direct imports in portfolio code, but a break
still cascades into production:

- `@playground/components/DevPanel` — `DevPanel`, `DevSlider`,
  `DevToggle`, `DevButtonGroup`, `DevButton`, `DevTextInput`,
  `DevDivider`. Consumed by most demos and by the playground's own
  gallery shell.
- `@playground/utils/webgl` — WebGL helper signatures. Currently used
  internally by the `slide-unlock` demo.

When a playground PR changes any of these, the PR description must flag
it so the corresponding portfolio bump includes the matching allowlist
or import update. Direct vs transitive doesn't change whether you flag —
only where you'd look for the break (direct → search portfolio src for
the import; transitive → smoke-test the consuming demos / gallery).

**Rationale.** The submodule is a build-time dependency, but the
playground's typecheck doesn't catch portfolio breakage. Without an
explicit contract, a routine rename on the workshop side becomes a
production incident on the showcase side. Listing the shared surface
makes the contract visible to anyone (including future agent sessions)
editing the playground. Splitting direct/transitive prevents the common
mistake of grepping the portfolio for `DevPanel`, finding nothing, and
concluding the contract claim is wrong.

### Vite alias + TypeScript boundary

```ts
// portfolio/vite.config.ts
alias: { '@playground': path.resolve(__dirname, './ui-playground/src') }
```

`@playground/*` resolves at runtime via Vite. Notably, the matching
`paths` entry in `tsconfig.app.json` is **intentionally omitted** and
`@playground/*` is declared as a wildcard module in
`src/types/playground.d.ts`:

```ts
declare module '@playground/*';
```

**Rationale.** Portfolio's tsconfig enables `noUncheckedIndexedAccess`
and other strict flags. The playground's tsconfig doesn't. When TS
follows a path-mapped import into the submodule's source, the
submodule's demo code surfaces ~200 false "possibly undefined" errors
that don't appear in the playground's own typecheck. Treating
`@playground/*` as opaque from the portfolio's compiler is the right
boundary — the submodule is a build-time dependency, not part of the
portfolio's type-checked surface area. Imports of `@playground/*`
become implicit `any` in portfolio code, which is fine because all
consumers wrap them in `safeLazy()` / typed destructures.

### The gallery shell copy

`src/components/arcade/ArcadeGallery.tsx` (~2,100 lines) +
`arcade-internal/{coinPhysics.ts, audio.ts, arcade-themes.css}` are
**copies** from the submodule at the SHA the submodule was first pinned
to for arcade (playground commit `1289c5a` — recorded here so the
canonical-base lineage stays inspectable). They are not symlinks, not
aliases, not re-exports.

**Why copy.** `ArcadeGallery` hardcodes `import { galleryDemos } from
"./demos"`. There is no prop to pass a different demo list and no
Vite trick that overrides a relative import. To filter to the
portfolio's allowlist (and renumber catalogue codes, and prefix paths
with `/arcade/`) without modifying submodule source, the gallery shell
must live portfolio-side with its own `demos.ts`.

**The drift cost.** Edits to the gallery shell in one repo don't reach
the other. This is acceptable because:
- The gallery shell is stable. Most playground iteration is per-demo.
- Portfolio's gallery is the canonical public version.
- The playground's gallery shell stays active for workshop use (Museum
  / Arcade / Cursor Curious mode-switching), so the two are *forked*,
  not in a deprecation relationship.

A gallery-shell fix that affects both repos: edit in playground first,
bump submodule, then `cp ui-playground/src/components/gallery/{...}
src/components/arcade/{...}` and re-apply the portfolio-specific
adjustments (the relative imports were rewired from `./arcade/...` to
`./arcade-internal/...`; the demos.ts import points at the
portfolio-side allowlist; nothing else changed).

### Theme bridge

`src/pages/Arcade.tsx` wires portfolio's `useTheme()` ↔ `ArcadeGallery`'s
accent/appearance props. Picking a swatch inside `/arcade` mutates the
portfolio's `ThemeContext` (and vice versa). The portfolio and the
arcade share the same theme state — by design, so the visual identity
stays consistent across the surface.

The Theme Sidebar **demo** is sandboxed because it's submodule-side and
uses `@playground/palette`'s local state, not portfolio's `ThemeContext`.
The general rule: demo-internal theming is always sandboxed; the gallery
shell is bridged.

### Routes

`portfolio/src/App.tsx` mounts:

- `/arcade` → `<Arcade />` (production gallery, no portfolio chrome)
- `/arcade/:slug` → `<ArcadeDemo />` (allowlist-gated per-demo loader)
- `/slide-to-unlock`, `/high-five` → vanity routes via `<PlaygroundDemo slug="…" />`
- `/dvd` → `<Navigate to="/arcade/dvd-bounce" replace />` (the canonical
  example of vanity-route stickiness — see D4)

`isStandalone` is true for `/arcade`, `/arcade/*`, and any vanity demo
route — suppresses portfolio chrome (custom cursor, sidebar controls,
right column).

### Two route families, two purposes

- **`/arcade` + `/arcade/<slug>`** — the **public** production surface.
  Linked from the portfolio's "Building tools on the side" section.
  Allowlist-controlled. No mode switcher.
- **`/slide-to-unlock`, `/high-five`** — **vanity routes** for
  individual demos with intentional pretty URLs (typically for sharing
  in posts). Independent decision per demo (see D4).

**`/playground/*` is deprecated.** It was an engineering browsing
surface that referenced demos via a broken `import.meta.glob` gate
(see D2 rationale). The `PlaygroundRoutes.tsx` and `PlaygroundGallery.tsx`
files that backed it are slated for deletion in the same PR that lands
arcade — they were dead code in production. If a dev-only browsing
surface is wanted later, rebuild it on the working `PlaygroundDemo`
direct-import pattern. The workshop browsing surface Ben actually uses
is the playground repo's own dev server, not a route inside the
portfolio.

---

## 3. Source of truth: ui-playground `DEMOS.md`

`DEMOS.md` is the **engineering inventory**. Every demo has exactly one
status:

| Status | Meaning | Eligible for portfolio? |
| --- | --- | --- |
| **Released** | Already posted publicly | ✅ Yes |
| **Ready** | Meets the quality bar; cleared for recording | ✅ Yes |
| **In progress** | Exists in code, not yet ready | ❌ No |
| **Deferred** | Paused, will revisit | ❌ No |
| **Internal** | Personal tool, never ships | ❌ No |
| **Archived** | Cut; code may remain under `src/demos/archived/` | ❌ No |

**Rule:** Released + Ready → *eligible for* portfolio. Eligibility is
not exposure — the portfolio-side allowlist still has to opt the demo in.

**Why `DEMOS.md` is the inventory and not the source of truth for the
portfolio.** Status changes in the playground don't (and shouldn't)
auto-propagate to the portfolio. A demo flipping Ready means "this is
shippable" — not "ship this now." Portfolio publishing is a deliberate
decision per demo. See D1 below.

---

## 4. Update workflows

Four categories of change. Treat them independently.

### 4a. Behavior change in an existing /arcade demo (most common)

Example: a PR polishing `page-transition`.

1. **Playground:** make the change on a feature branch, open PR, merge to `main`.
2. **Portfolio:** bump the submodule pointer.
   ```sh
   cd ui-playground
   git fetch origin
   git checkout main && git pull
   cd ..
   git add ui-playground
   git commit -m "Bump ui-playground submodule (<short description>)"
   ```
3. **Portfolio:** verify locally — `npm run dev`, open the demo at
   `/arcade/<slug>`, confirm the new behavior renders and nothing else
   regressed.
4. **Portfolio:** PR into `next-update`. Body links the playground PR(s)
   and shows `git submodule summary`.

No allowlist edit needed — the slug already exists in all three places.

> ⚠️ **Shared-primitive callout.** If the bumped commits touch a shared
> primitive (`palette`, `webgl`, `DevPanel` — see §2 "Shared surface"),
> additionally verify the arcade gallery, theme bridge, and any other
> demos that use the primitive. Most demos use `DevPanel`; a breaking
> change there cascades. The playground PR description should already
> flag this per the workshop-side responsibilities in §8 — if it
> doesn't, that's worth a callback before bumping.

### 4b. New demo promoted to /arcade

Example: a demo moves from In progress → Ready in `DEMOS.md` and Ben
decides to publish it.

1. **Playground:** flip the status in `DEMOS.md`, merge.
2. **Portfolio:** bump the submodule pointer (as in 4a).
3. **Portfolio:** register the demo in **all three allowlist files**:
   - `src/components/arcade/demos.ts` — add entry with title,
     description, palette, family, catalogue code. Renumber sibling
     catalogue codes if needed (e.g., adding a third Chromatica demo
     becomes `CHR·003`).
   - `src/pages/ArcadeDemo.tsx` — add a `safeLazy` entry mapping slug
     to the submodule's component path + export name.
   - `scripts/generate-sitemap.ts` — add the slug to `arcadeSlugs`.
4. **Portfolio:** verify all three places agree (lint isn't checking
   this — read them side by side). Smoke-test the new demo at
   `/arcade/<slug>` and confirm it appears in the gallery.
5. **Portfolio:** PR into `next-update`.

> See D1 rationale for why all three files are hand-maintained.

### 4c. Demo demoted

Rare, but: a demo that previously qualified for /arcade no longer does.

1. **Playground:** update `DEMOS.md`, merge.
2. **Portfolio:** bump the submodule pointer.
3. **Portfolio:** remove the demo from all three allowlist files (4b
   reversed).
4. **Portfolio:** if the demo had a vanity route, decide explicitly
   (see D4). Most likely: 301 it to `/arcade` or to `/`.
5. **Portfolio:** verify, PR into `next-update`.

### 4d. Vanity route promotion (independent)

A demo is granted a top-level URL like `/page-transition` for sharing.
This is **per-demo, intentional, decoupled from arcade status changes**.

1. Decide the URL intentionally (Ben).
2. Add a `<Route>` in `App.tsx` mounting `<PlaygroundDemo slug="…" />`
   (or a `<Navigate>` if it's a redirect to `/arcade/<slug>`).
3. Add to `isStandalone` if needed.
4. Add the new path to the `staticRoutes` array in
   `scripts/generate-sitemap.ts`.

**Vanity routes are submodule-gated only.** They do not need an entry
in `demos.ts`, `ArcadeDemo.tsx`, or `arcadeSlugs` — `PlaygroundDemo`
imports directly from `@playground/...`, so the only requirement is
that the slug exists at the pinned submodule SHA. This is intentional:
vanity routes are a different publication channel from `/arcade` and
shouldn't have to pass the arcade allowlist's curation gate.

Vanity-route demotion is the same process in reverse, with the
additional decision in D4.

---

## 5. Drift handling

The portfolio drifted significantly from playground reality during the
pre-arcade era — `PlaygroundGallery.tsx` listed demos that no longer
existed in playground (`water-ripple`, `magnetic-button`, etc.) and was
missing demos that became Ready (`page-transition`, `color-hold-pick`,
`github-sparkline`, `git-toggle`).

**The arcade-demos-setup migration reconciled all of this in one PR.**
Going forward, drift should only accumulate one demo at a time and gets
caught by the workflows in §4.

If drift accumulates again (e.g., several playground PRs land without a
portfolio bump), reconcile in one PR:

1. Bump submodule to current playground `main`.
2. Diff playground `DEMOS.md` (Released + Ready) against the three
   portfolio allowlist files.
3. Add missing eligible demos. Remove stale demos. (Per the §3 rule,
   "eligible" is necessary but not sufficient — Ben still chooses what
   to publish.)
4. Verify all `/arcade/<slug>` routes load.
5. PR into `next-update`.

---

## 6. Decisions made

These shaped the workflow above. Recorded for reference.

### D1. Manual vs scripted sync — **Manual.**

Portfolio's allowlist is hand-maintained across three files. Reason:

- Allowlist is small (9 entries) and per-demo addition is rare —
  measured in months, not days.
- Parsing hand-edited `DEMOS.md` is brittle (markdown tables aren't a
  contract).
- A typed `demos.json` manifest in playground would solve robustness
  but doesn't solve description-ownership (D3) — descriptions are
  public-facing copy and belong portfolio-side regardless.
- Three hand-edited files is genuinely faster than the maintenance
  cost of a generator until the allowlist grows past ~20 demos.

**Revisit if** the allowlist grows past ~20 demos. Skip markdown
parsing; jump straight to a `demos.json` manifest in playground that
the portfolio imports (descriptions still stay portfolio-side).

### D2. The `hasDemo()` / `import.meta.glob` mystery — **Resolved by deletion.**

`PlaygroundRoutes.tsx` checked `import.meta.glob('@playground/demos/*/index.{ts,tsx}')`
for demo existence. The playground never shipped `index.{ts,tsx}` shims
— each folder has `<Component>.tsx` directly. So `hasDemo()` returned
`false` for every demo, and `/playground/<slug>` was blank for any
user who hit it.

Nobody noticed because `/playground/*` wasn't linked publicly. The
working code path for vanity routes (`PlaygroundDemo.tsx`) used direct
imports with `safeLazy() + .catch()` and never touched the broken glob.

**Resolution:** delete `PlaygroundRoutes.tsx` and `PlaygroundGallery.tsx`
in the arcade landing PR. Both are dead code. The direct-import pattern
in `PlaygroundDemo.tsx` and `ArcadeDemo.tsx` is the only pattern going
forward. If a dev-only browsing surface is wanted later, rebuild it on
the working pattern — but Ben's actual workshop browsing happens in the
playground repo itself, not in a portfolio route.

### D3. Gallery descriptions — **Portfolio-side.**

The descriptions ("Drag the thumb across a track. A fluid WebGL shader
follows it.") are public-facing copy. They live in
`src/components/arcade/demos.ts` alongside the catalogue codes, family
names, and palette — also portfolio-side concerns.

**Rationale.** `DEMOS.md` is engineering inventory; editorial copy
belongs where editorial decisions about the public site are made. This
also means a future D1 change (manifest in playground) wouldn't import
descriptions — they stay portfolio-owned regardless of how the slug
list is sourced.

### D4. Vanity routes are sticky — **Agreed.**

A vanity URL is a public commitment. External links and social posts
may reference it. Demoting a vanity-routed demo never happens
automatically.

When a vanity-routed demo gets archived in playground, the portfolio
makes an explicit decision:

- Delete the route (acceptable if nothing external links to it).
- 301 to `/arcade` (best default for "keep the URL alive").
- 301 to `/` (fallback if even /arcade isn't appropriate).

`/dvd` is the canonical example: it's a 301 to `/arcade/dvd-bounce`
because an external Twitter post references it. If DVD Bounce ever gets
archived, `/dvd` would need an explicit call — probably `301 → /`.

### D5. Branching asymmetry stays — **Agreed.**

- **Portfolio:** feature branches merge into `next-update`. `next-update
  → main` is the deploy gate.
- **Playground:** feature branches merge directly to `main`. No staging.

The asymmetry is deliberate. Portfolio gets deployed; playground
doesn't. Submodule-bump PRs go into `next-update` like any other
portfolio change. See `core-docs/workflow.md` § Branching for the
portfolio-side detail.

### D6. Obsolete `promote-demo-to-arcade.md` — **Mark superseded, don't delete.**

Replace its contents with a 3-line pointer:

```md
# Promote demo to arcade — superseded

The file-copy workflow this doc described is obsolete. The portfolio
now consumes playground demos via a git submodule + allowlist. See
`docs/cross-repo-sync.md` for the current process.
```

**Rationale.** Anyone who finds the old doc via search, git history, or
a stale link should land somewhere useful. Deleting it makes the
breadcrumb dead-end. 3 lines is cheap insurance against repeating the
file-copy mistake.

### D7. Gallery shell relationship — **Fork, not deprecate.**

The portfolio's `src/components/arcade/ArcadeGallery.tsx` is a copy of
the playground's `src/components/gallery/ArcadeGallery.tsx` taken at
playground commit `1289c5a`. The two are intentionally divergent:

- **Portfolio's copy** is the canonical *production* gallery. Locked
  to allowlist demos, /arcade-prefixed paths, no mode switcher.
- **Playground's original** stays active as part of the workshop's
  mode-switching shell (Museum / Arcade / Cursor Curious). Iterates
  freely.

Cross-cutting gallery improvements use the copy-and-reapply pass
described in §2 "The gallery shell copy." Don't deprecate the
playground's gallery shell — it's still doing useful workshop work.

---

## 7. Verification checklist for any sync PR

Before merging a portfolio PR that bumps the submodule or edits the
allowlist:

- [ ] Submodule advances to a specific commit on playground `main`,
      not a feature branch.
- [ ] The three allowlist files agree
      (`src/components/arcade/demos.ts`, `src/pages/ArcadeDemo.tsx`,
      `scripts/generate-sitemap.ts`).
- [ ] `npm test` passes.
- [ ] `npm run build` clean.
- [ ] `npm run dev`, smoke-test:
  - [ ] `/arcade` gallery renders all allowlisted cabinets.
  - [ ] Every cabinet's demo loads at `/arcade/<slug>`.
  - [ ] Each vanity route still works (`/slide-to-unlock`,
        `/high-five`).
  - [ ] `/dvd` redirects to `/arcade/dvd-bounce`.
  - [ ] Portfolio chrome (cursor, sidebar) doesn't leak into
        `/arcade/*` (`isStandalone` working).
  - [ ] Picking an accent inside `/arcade` syncs back to the portfolio
        (visit `/` after to confirm).
- [ ] Mobile viewport (375px) check on `/arcade` and at least one demo.
- [ ] If demos were added/removed: `DEMOS.md` status matches the
      portfolio allowlist intent.
- [ ] PR body links the playground PR(s) included in the submodule
      bump and shows `git submodule summary`.

---

## 8. Workshop-side responsibilities (playground mirror only)

> This section is included in the playground copy of this doc; omit
> from the portfolio copy when mirroring.

The playground is fearless by design, but a few playground-side
behaviors directly protect the portfolio from breaking. Treat them as
load-bearing.

### Don't break the shared surface (§2) without warning

If a playground PR renames a `palette` export, changes a `DevPanel`
prop signature, alters a demo component's named export, or restructures
`utils/webgl`, **flag it explicitly in the PR description** with the
text "Touches shared surface — portfolio bump must include matching
update." The portfolio's typecheck won't catch the regression because
of the intentional TS boundary (§2 "Vite alias + TypeScript boundary"),
so the only safety net is the bumper noticing.

**Rationale.** A routine rename on the workshop side becomes a
production incident on the showcase side. The flag costs nothing to
add and makes the contract enforceable in code review.

### `src/components/gallery/ArcadeGallery.tsx` is workshop-local

It powers the playground's mode-switching shell (Museum / Arcade /
Cursor Curious). The portfolio took a *copy* into
`src/components/arcade/` and the two have intentionally diverged
(D7). Iterate freely here; cross-cutting gallery improvements that
should reach production require an explicit copy-and-reapply pass
on the portfolio side (§2 "The gallery shell copy").

**Don't** treat the playground gallery as deprecated, and **don't**
try to make it production-shaped — it has a different job.

### `DEMOS.md` status changes don't auto-propagate

Flipping a demo to Ready signals *eligibility*, not *exposure*. The
portfolio publishing decision is separate and explicit (§3, D1). After
flipping a status, don't assume anything happens until a portfolio PR
acts on it.

### Archiving a demo with a vanity route

Vanity routes are sticky (D4). If you archive a demo that currently has
a portfolio vanity route, raise it in the archive PR description so the
portfolio side knows to plan the URL's fate (delete / 301 / leave).
Don't expect the portfolio to discover the archival on its next bump.
