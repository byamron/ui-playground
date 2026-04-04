---
description: Capture visual craft and execution feedback to memory for cross-workspace enforcement
globs: "**/*"
---

# Proactive Feedback Logging

When the user gives feedback about visual craft, interaction quality, or execution standards — especially corrections or strong approvals — log it to memory so it applies across all future workspaces.

## What to capture

- **Craft corrections:** "That animation feels floaty," "The spacing is off," "That transition is too slow" — these indicate taste preferences that apply everywhere.
- **Craft approvals:** "That feels great," "Perfect," "Yes, exactly like that" — capture what worked and why, so you can reproduce the quality.
- **Execution standards:** "Don't ship without testing at 60fps," "Always check on Safari too" — process expectations.
- **Physics tuning:** Specific spring constants, damping ratios, or timing values that the user confirms feel right.

## Where to log

Save to the project's memory system at `/Users/benyamron/.claude/projects/-Users-benyamron-Desktop-coding-ui-playground/memory/` as `feedback_*.md` files. These persist across conversations and workspaces.

## How to apply

Before implementing visual or interaction work, check existing feedback memories for relevant guidance. Prior feedback about spring feel, animation timing, visual spacing, etc. should inform current work without the user needing to repeat themselves.
