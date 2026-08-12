# Design — Paw Pause (browser pet)

Simple realistic companion overlay. Not a productivity game.

## Brand
- Name: **Paw Pause**
- Default companion: **Kabs**
- Mark: teal paw on cream tile (toolbar icon)
- Store listing promo / screenshots: mint teal (`#0D3D38` / `#145A52` / `#f0faf7`) — regenerate with `node scripts/capture-store-screenshots.js`

## Surfaces
- Onboarding: meet Kabs, sound/size/attention, where to appear
- Page overlay: walking companion + speech bubbles + care menu + walk discoveries
- Toolbar popup: show/hide, sound, size, attention, pause, sites

## Motion
Bottom of the viewport by default. Mostly walks, finds treats with unique story lines, looks, sits/sleeps lightly. Driven by `requestAnimationFrame`, GPU `translate3d`, and crossfaded walk frames with a light bob. Drag to move. Flee typing, password fields, fullscreen.

## Assets
Transparent PNG pose frames in `assets/dog/` and `assets/cat/`. Prefer filmed WebM loops when available.
Companion looks are selected in onboarding/popup. Cat looks (ginger, black, black & white) share the cat frames with CSS filters and a larger on-page height scale.
