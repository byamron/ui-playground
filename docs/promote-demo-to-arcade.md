# Promote a demo to the production Arcade

Per-demo playbook for adding a single demo to the production Arcade
at `benyamron.com/arcade` once its status in `DEMOS.md` flips to
**Ready**.

For the initial port (Arcade shell + first 9 demos), see
`.context/portfolio-arcade-port.md`. This doc handles incremental
additions after that initial port has shipped.

## Prereqs

- The demo's status in `DEMOS.md` is **Ready** (or being flipped to
  Ready as part of this promotion).
- The demo clears the quality bar in `CLAUDE.md` (extreme craft or
  novel/witty product thinking).
- The portfolio Arcade is already live (initial port merged).

## Steps

Run from `/Users/benyamron/dev/portfolio`.

### 1. Copy the demo file

```sh
mkdir -p src/demos/<slug>
cp /Users/benyamron/dev/ui-playground/src/demos/<slug>/<File>.tsx \
   src/demos/<slug>/<File>.tsx
```

Keep the demo's DevPanel intact — it ships in production. If the
demo imports utilities beyond `palette` (e.g., `utils/webgl.ts`),
copy those into `src/utils/playground-<name>.ts` and update the
imports in the copied demo file.

### 2. Verify or add the palette entry

Open `src/utils/playground-palette.ts`. If the demo's slug isn't in
`demoPalettes`, copy the entry from
`/Users/benyamron/dev/ui-playground/src/palette.ts`.

### 3. Add the route

In `src/App.tsx`, add:

```tsx
<Route path="/arcade/<slug>" element={<DemoComponent />} />
```

The `isStandalone` check already covers `/arcade/*` — no chrome
changes needed.

### 4. Add the cabinet

In `src/components/arcade/demos.ts`, add a new entry to
`galleryDemos`. Match the existing entries' field shape. Two rules:

- **`path` must be prefixed with `/arcade/`** so the gallery's
  `useNavigate()` routes correctly.
- **`catalogue` is the next sequential code in the appropriate
  family.** Families currently in production:

  | Code | Family | What it means |
  | --- | --- | --- |
  | MEC | Mecanica inertia | Physics |
  | LIQ | Liquida tactus | Fluid / glass |
  | CHR | Chromatica | Color tools |
  | SOR | Sorenidae | Witty product gags |
  | ALG | Algoricae | Data / algorithm |
  | TRN | Transitiones | Page transitions |
  | PNT | Pointiformes | Cursor |
  | LEN | Lensiformes | Typography lens |

  If the demo doesn't fit an existing family, mint a new one and
  assign `<NEW>·001`. Pick a faux-Linnaean Latin name in the spirit
  of the existing list. Do **not** renumber other demos' codes.

### 5. Verify in dev

- `npm run dev` in portfolio.
- Open `/arcade` and confirm the new cabinet appears.
- Drop a coin into it; the demo should load at `/arcade/<slug>` and
  behave identically to the playground version.
- `tsc -b` passes.
- Mobile viewport (375px) check.

### 6. Update DEMOS.md in ui-playground

Move the demo from the **Release roadmap** table to the **Released**
table. If the demo was a tagged anchor in the roadmap's ordering
principles paragraph, rewrite that paragraph to reflect the new
sequence. Open a PR in ui-playground with just this change.

### 7. Open the portfolio PR

- Branch: `arcade/add-<slug>`
- Commit per logical step (palette/util if any, demo file, route,
  cabinet entry)
- Title: `Add <Demo Title> to the production Arcade`
- Body: link the ui-playground DEMOS.md PR + a short screen recording
  of the new cabinet on `/arcade`
- Acceptance: 1 new cabinet, 1 new route, 1 new entry in `demos.ts`,
  nothing else

## Things NOT to do

- Don't strip the demo's DevPanel.
- Don't modify the Arcade shell, coin physics, or audio module.
- Don't touch other demos' catalogue codes. No renumbering during
  promotions — codes are fixed once assigned.
- Don't add the demo anywhere outside the Arcade (no new section on
  the home page, no separate route).
- Don't backport portfolio-only behavior (chrome bypass, redirects,
  project card) into ui-playground.

## Bug fixes after promotion

When a bug is found in a demo that's already in production:

- **Behavior bug in the demo itself.** Fix in ui-playground first
  (the workshop), then port the fix into portfolio.
- **Production-only bug** (chrome bypass on `/arcade`, redirect,
  cabinet layout, catalogue code). Fix in portfolio only.
- **Playground has drifted past production** (e.g., a v2 is in
  progress here that isn't in portfolio yet). Port just the minimal
  fix to portfolio. Leave a TODO in the PR description to reconcile
  when the next playground version graduates.
