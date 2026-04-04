# UI Playground

Interactive demos for social media. Two categories: extreme-craft interaction design, and witty product ideas (Soren Iverson-style).

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
