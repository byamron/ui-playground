---
description: When building demos that reference or spoof real product UIs (Figma, Spotify, iOS Settings, etc.)
globs: src/demos/**/*
---

# Pixel-Perfect App Mimicry

When a demo spoofs or references a real product UI, the mimicry must be exact. This is make or break — wrong font weight, spacing, or color kills the illusion and the humor.

## Requirements

- **Research first.** Before building, find screenshots or inspect the real app's UI. Identify exact fonts, font weights, sizes, colors, spacing, border radii, and icon styles.
- **Match the design system.** Use the product's actual design language — not a generic approximation. If Figma uses Inter, use Inter. If iOS Settings uses SF Pro with specific cell heights, match those cell heights.
- **Test by comparison.** Place a screenshot of the real product next to your demo. If someone can tell which is which at a glance, the mimicry isn't close enough.
- **Don't over-build.** Only reproduce the parts of the UI needed for the joke/interaction. A pixel-perfect share modal doesn't need pixel-perfect menu bars behind it.
- **Icons and assets.** Use the actual product's icon style. SF Symbols for iOS, Phosphor/custom for Figma, etc. Don't substitute with generic icons.
