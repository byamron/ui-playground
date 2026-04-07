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

## Approach

For non-trivial work (new demo, significant refactor, new infrastructure), briefly state your intended approach and wait for confirmation before writing code. One or two sentences is enough. For larger scope, use plan mode. This does not apply to small fixes or tweaks.

## Context

- Plan and roadmap: `.context/plan.md` and `.context/iteration-roadmap.md`
- Portfolio site (for backports): `/Users/benyamron/Desktop/coding/portfolio-site`
- Language app (slide-to-unlock source): `/Users/benyamron/Desktop/coding/language-app`
