# Deploy

How to publish the playground to a public URL so demos work on your phone (or anyone's phone) without the local dev server running.

## Recommended: Vercel

Vercel auto-detects Vite, builds on every push, free hobby tier. Setup takes about a minute.

### One-time setup

```bash
cd /path/to/algiers-v1
npx vercel login
```

In the prompt, pick **Continue with GitHub** (or Google / email). A browser tab opens — authorize, return to the terminal. You should see `Success!`.

### First deploy

```bash
npx vercel --prod
```

You'll be walked through a few prompts (all defaults are fine):

| Prompt | Answer |
| --- | --- |
| Set up and deploy? | `Y` |
| Which scope? | your personal account |
| Link to existing project? | `N` |
| Project name? | press enter (defaults to the repo directory name) |
| In which directory is your code? | `./` (just press enter) |
| Want to modify settings? | `N` — Vite is auto-detected, build command + output dir inferred |

Vercel builds, deploys, and prints a URL like `https://algiers-v1-abc123.vercel.app`. Copy it.

### Subsequent deploys

Once the project is linked, `npx vercel --prod` from this directory ships a new build in seconds. Or hook up the GitHub repo in Vercel's dashboard — every push to `main` then auto-deploys.

## On your phone

1. Open Safari, navigate to the deployed URL + the demo path, e.g. `https://algiers-v1-abc123.vercel.app/color-hold-pick`.
2. If you previously added a `192.168.1.x` version to the home screen, delete that icon (long-press → Delete Bookmark) — it points at the dev server which won't be running.
3. Tap Share → **Add to Home Screen** → Add.
4. Launch from the new icon. The PWA loads from Vercel's CDN — works on any network, anywhere.

## Optional: full offline support

Vercel alone gives you "server-independent" — works as long as the phone has internet. For airplane-mode-grade offline (cached JS, no network round-trip on launch), add a service worker via `vite-plugin-pwa`:

```bash
npm i -D vite-plugin-pwa
```

Then register it in `vite.config.ts`:

```ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: false, // we already have public/manifest.webmanifest
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
      },
    }),
  ],
  // ...
});
```

Redeploy. The PWA now caches its bundle on install and works offline.

## Alternatives

- **Cloudflare Pages** — same flow as Vercel, slightly faster edge network. Connect the GitHub repo at <https://pages.cloudflare.com>.
- **Netlify** — similar. `npx netlify deploy --prod` after `netlify init`.
- **GitHub Pages** — free but requires `vite build` + manual base-path config; less ergonomic for SPAs with client-side routing.

For this project's needs (a phone-pinned PWA), Vercel is the simplest path.
