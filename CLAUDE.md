# UI Playground

Interactive demos for social media. Two categories: extreme-craft interaction design, and witty product ideas (Soren Iverson-style).

## Dev Panel

Most demos ship with a dev panel. When a project has one:

- Use the dedicated dev panel component. Title it correctly and lay out inputs with correct spacing guidelines.
- Defaults should produce a clean, classic result.
- Slider ranges should cap where the resulting interaction is no longer viable (e.g., squash so drastic the screen is jarring, or an element so large the demo stops making sense).
- Presets are optional -- add them when appropriate for the demo and the request, not by default.
- Preset names and palette names must not be identical.

## Dev Server

After completing a new request or iterating on feedback, always start a dev server and share a working localhost link if there's something visual to show. Don't wait to be asked.

Before starting a server:
1. Check which ports are already in use (`lsof -iTCP -sTCP:LISTEN`).
2. If this project already has a running dev server, kill only that one and reuse its port.
3. If not, pick the first available port in the 5173-5178 range. Don't kill servers belonging to other projects.
4. After starting, verify the server is actually responding (e.g., curl the URL) before sharing the link. Never send a dead link.

## Quality Bar

Every demo must clear one of two bars:
1. **Extreme craft** — physics-accurate, pixel-perfect, tasteful interaction design a level above professional apps. Not verbose or over the top.
2. **Novel/witty product thinking** — a concept that is funny, surprising, or genuinely clever. Not merely useful.

Do not propose or ship work that clears neither bar. When in doubt, cut.

## Surface Area

Keep demo flows minimal. Each demo targets a <10 second video capture — one tight, satisfying interaction loop. If a feature adds surface area without meaningfully raising the craft bar, cut it. Resist the urge to add controls, settings, or multi-step flows. The message should hit immediately.

## Video-First Design

The final output is short screen recordings for Twitter. Design for this:
- Think about **flow and timing**, not just static visuals. The interaction should have a clear beat: setup, action, payoff.
- The punchline (for witty demos) or the "wow" moment (for craft demos) must land within the first few seconds.
- Consider what the recording frame looks like — centered content, clean backgrounds, no distracting UI chrome.

## Physics

Physics (springs, momentum, deformation, fluid dynamics) is a brand differentiator across the collection. Shoot for physically accurate, satisfying motion. But be pragmatic:
- Good physics that **feels right** > perfect simulation that's buggy or slow.
- Don't let physics accuracy become a rabbit hole that blocks shipping. Performance and craft come first.
- For app-mimicry demos (Soren-style), follow the source app's behavior — don't add physics where the real product doesn't have it.

## Craft Corrections

When the user gives a craft correction (spacing, timing, color, feel), implement it immediately without restating the problem or explaining your approach. Confirm with the result, not the plan. Exception: if the correction would conflict with an established design pattern, regress another aspect of the demo, or has a non-obvious tradeoff, flag it briefly before implementing.

## Approach

For non-trivial work (new demo, significant refactor, new infrastructure), briefly state your intended approach and wait for confirmation before writing code. One or two sentences is enough. For larger scope, use plan mode. This does not apply to small fixes or tweaks.

## Two-repo workflow

This repo (ui-playground) is the experimental workshop. New demos get
built, tuned, and iterated on here regardless of status — finished,
in progress, archived, internal. The Museum, Arcade, and Cursor
Curious gallery variants and the wrapping dev panel exist for that
exploration.

The portfolio repo (`/Users/benyamron/dev/portfolio`) ships the
production Arcade at `benyamron.com/arcade` — Ready/Released demos
only, the Arcade gallery alone, no mode-switcher panel wrapping the
shell. Demo-internal dev panels stay in production.

Both repos are first-class with different roles in the pipeline:

- **Build/iterate here.** Behavior changes and bugs in a demo
  originate as fixes here, then port forward to portfolio.
- **Polish/ship there.** Production-only behavior (the `/arcade`
  chrome bypass, redirects, the home-page project card) lives only
  in portfolio.
- **Drift handling.** If a demo bug surfaces in production but
  this repo's version has drifted (e.g., v2 in progress), port
  just the minimal fix to portfolio and leave a TODO to reconcile
  when the next playground version graduates.

When a demo's status in `DEMOS.md` flips to **Ready**, promote it to
the portfolio Arcade. See `docs/promote-demo-to-arcade.md` for the
per-demo playbook.

## Context

- Plan and roadmap: `.context/plan.md` and `.context/iteration-roadmap.md`
- Portfolio (production Arcade): `/Users/benyamron/dev/portfolio`
- Language app (slide-to-unlock source): `/Users/benyamron/dev/language-app`
