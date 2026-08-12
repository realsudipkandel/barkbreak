# Paw Pause

A calm virtual companion that lives on your websites.

Kabs walks along the bottom of the page, sits, sleeps, finds treats, asks for food or a short walk, and reacts when you pet them. No shop, coins, account, or dashboard.

## Load unpacked

```bash
# chrome://extensions → Developer mode → Load unpacked → this folder
node ../scripts/prepare-local-dev.js --only barkbreak
```

## Tests

```bash
node scripts/shared.test.js
node scripts/sounds.test.js
```

## Companion assets

Pose frames live in `assets/dog/` and `assets/cat/` (transparent PNGs). Walk motion uses `requestAnimationFrame`, GPU transforms, and crossfaded frames. Cat looks include ginger, black, and black & white (CSS filters on the cat set).

Icons: `node scripts/generate-icons.js` (toolbar sizes). Designed mark source: `icons/paw-pause-icon-source.png`.

## Privacy

Local preferences only. Does not read page content or send browsing data.
