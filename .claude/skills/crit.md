---
name: crit
description: Run a multi-perspective craft review of a demo against the project quality bar. Produces a structured rubric evaluation from four senior/staff-level reviewers.
user_invocable: true
---

# Craft Review

Run a rigorous, multi-perspective review of a demo implementation. The review evaluates whether the demo clears the project's quality bar (extreme craft OR novel/witty product thinking) and identifies specific, actionable improvements.

## Setup

1. **Identify the target demo.** If the user specifies a demo, review that one. Otherwise, review the currently open or most recently modified demo.
2. **Read the full implementation** — all source files for the demo, including components, utilities, shaders, and styles.
3. **Read project context** — `CLAUDE.md`, `.context/plan.md`, `.context/iteration-roadmap.md`, and any relevant memory files (feedback, project). This grounds the review in the project's stated goals.
4. **Determine demo category.** Is this an "extreme craft" demo, a "novel/witty product thinking" demo, or both? This determines which rubric dimensions are weighted most heavily.

## Rubric

Score each dimension 1-5. **3 = professional quality (ships at a good startup). 4 = impressive (stands out on Twitter). 5 = exceptional (people screenshot and share the detail itself).**

A demo must score 4+ on its primary bar (craft or product thinking) to clear the quality gate. Secondary dimensions should be 3+ minimum.

### For ALL demos:

**1. Surface Discipline** (Does it respect the 10-second rule?)
- 5: One tight beat — setup, action, payoff — no wasted surface. Immediately legible.
- 3: Clear interaction but has unnecessary steps or controls that dilute focus.
- 1: Multi-step flow, unclear what to do, or too much going on.

**2. Video-First Readiness** (Will this capture well for Twitter?)
- 5: Fills the frame, clean background, clear focal point, timing works for recording. Looks great as a thumbnail.
- 3: Needs some framing work but the core reads on video.
- 1: Would look small, cluttered, or confusing in a Twitter embed.

**3. Dev Panel Integration** (Fourth-wall break for technical audience)
- 5: Panel adds a layer of exploration — defaults are the "classic" experience, cranking reveals craft depth. Panel itself is well-designed.
- 3: Panel exists and works but doesn't add much to the experience.
- 1: No panel, or panel feels like debug UI rather than shipped feature.

### For CRAFT demos (physics, interaction design, animation):

**4. Physics Feel** (Does the motion feel weighted, alive, physically accurate?)
- 5: Indistinguishable from a native app or better. Springs have correct parameters, momentum carries through, interactions feel tangible. Motion matches or exceeds the best production apps.
- 3: Physics are present and reasonable but feel slightly off — missing velocity carry-over, springs feel generic, motion doesn't quite have weight.
- 1: Floaty, jerky, or mechanical. CSS transitions where springs should be.

**5. Animation Choreography** (Timing, sequencing, dramatic arc of the full interaction loop)
- 5: Every transition has clear intent. The sequence has a beat structure (setup → action → payoff). Easing curves are intentional. Nothing feels rushed or lingering.
- 3: Animations work but timing could be tighter. Some transitions feel default or untuned.
- 1: Animations feel random or afterthought. No sense of choreography.

**6. Visual Polish** (Pixel-level craft — colors, spacing, shadows, typography, contrast)
- 5: Could pass for a shipped product detail from Apple, Linear, or Stripe. Every pixel is intentional. Color palette is cohesive.
- 3: Looks good but has some rough edges — generic shadows, slightly off spacing, font choices that don't fully commit.
- 1: Looks like a prototype or tutorial project.

**7. Shader / GPU Craft** (If applicable — quality of procedural graphics, WebGL work)
- 5: Shader work is genuinely beautiful, performant, and integrated seamlessly with the interaction. Not just "cool effect" but serves the demo's purpose.
- 3: Shader works and looks decent but feels disconnected from the interaction or has visible artifacts.
- 1: Shader feels bolted on or has performance issues.

### For PRODUCT THINKING demos (witty concepts, Soren-style):

**8. Concept Sharpness** (Is the idea genuinely clever, funny, or surprising?)
- 5: Makes you laugh or think "why doesn't this exist?" on first view. The concept is immediately legible and shareable.
- 3: Amusing but expected. The joke doesn't quite land or needs explanation.
- 1: Not clever enough to share. Generic or obvious.

**9. UI Mimicry** (How closely does it match the spoofed product?)
- 5: Pixel-perfect. Correct fonts, weights, spacing, colors, icon styles. Side-by-side with the real product, it's hard to tell which is which.
- 3: Recognizable as the product but has tells — wrong font, generic icons, slightly off spacing.
- 1: Vaguely resembles the product. Would not fool anyone.

**10. Punchline Timing** (Does the joke land in the interaction flow?)
- 5: The reveal, transition, or interaction payoff lands perfectly. You get it instantly.
- 3: The concept is clear but the timing of the reveal could be sharper.
- 1: The joke requires explanation or multiple interactions to understand.

## Perspectives

Run the review from four distinct perspectives. Each reviewer focuses on their domain but scores ALL applicable rubric dimensions. The perspectives are:

### 1. UI/Motion Designer (Staff level)
**Lens:** Visual systems, animation timing, color theory, spatial relationships, typography, easing curves, choreography.
**Biases:** Cares most about whether motion has intent, whether the color system is cohesive, whether typography choices are deliberate. Will notice if a spring curve feels generic, if shadows don't match the light model, if spacing isn't systematic.
**Key question:** "Would I put this in my portfolio as a motion design piece?"

### 2. Design Engineer (Staff level)
**Lens:** Implementation craft, physics accuracy, shader quality, performance, architecture. The bridge between design intent and code reality.
**Biases:** Cares about whether the physics model is correct (not just "looks okay"), whether the shader work is elegant, whether the architecture supports iteration. Notices if Euler integration would be unstable, if there are unnecessary re-renders, if the spring parameters are derived vs. guessed.
**Key question:** "Is this engineered with the same rigor as the best native experiences?"

### 3. Software Engineer (Staff level)
**Lens:** Code quality, state management, performance, edge cases, maintainability. Concerned with robustness under real conditions.
**Biases:** Cares about race conditions, animation frame management, memory leaks, state consistency. Will notice if multiple RAF loops could conflict, if setTimeout cascades are fragile, if the component is too monolithic.
**Key question:** "Would this survive real users on real devices without jank or bugs?"

### 4. UX Designer (Staff level)
**Lens:** Interaction flow, affordances, feedback loops, accessibility, the completeness of the experience as a user encounters it.
**Biases:** Cares about whether the interaction is immediately discoverable, whether feedback is proportional and timely, whether edge cases (overshooting, releasing mid-drag) feel handled. Notices if the demo assumes familiarity rather than teaching through affordance.
**Key question:** "Does every moment of the interaction communicate clearly and feel intentional?"

## Output Format

For each perspective, produce:

1. **Score card** — Score for each applicable rubric dimension (number + one-line justification)
2. **Standout detail** — One specific thing this demo does exceptionally well, from this perspective
3. **Top 3 improvements** — Specific, actionable changes ordered by impact. Include enough detail to act on (e.g., "capture gesture velocity on pointerUp and feed it into the spring's initial velocity" not just "improve physics").

Then produce a **synthesis**:
- **Overall verdict:** Does this demo clear the quality bar? Which bar (craft / product thinking / both)?
- **Composite scores** — Average across perspectives for each dimension
- **Must-fix** — Changes required before this demo is share-worthy (if any)
- **Could-elevate** — Changes that would push this from "good" to "people share the detail itself"
- **Cut list** — Anything that should be removed to tighten the demo
