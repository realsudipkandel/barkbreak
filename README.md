# Bark Break

A real dog that lives on your websites.

Biscuit walks along the bottom of the page, sits, sleeps, asks for food or a short walk, and reacts when you pet him. No shop, coins, account, or dashboard.

## Load unpacked

```bash
# chrome://extensions → Developer mode → Load unpacked → this folder
node ../scripts/prepare-local-dev.js --only barkbreak
```

## Tests

```bash
node scripts/shared.test.js
```

## Dog assets

Pose frames live in `assets/dog/` (transparent PNGs). Swap in filmed green-screen WebM loops later using the same behavior names (`walk-right-*`, `sit`, `sleep`, `eat`, …).

## Privacy

Local preferences only. Does not read page content or send browsing data.
