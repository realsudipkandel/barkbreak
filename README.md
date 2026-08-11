# Bark Break

Your browser's good-boy gatekeeper. A privacy-first Manifest V3 Chrome extension: a customisable dog lives in the side panel and gently guards user-selected distracting sites.

## Features

- Adopt Biscuit (or rename): coats, ears, personality, motion, sound
- Guard sites one origin at a time (runtime permission)
- Engaged-time meter (visible + focused + recent activity only)
- Gentle warning and reversible Shadow DOM gate
- 1 / 3 / 5 / 10 minute breaks with short care ritual then away timer
- Focus Fetch sessions with biscuit rewards
- Urgent pass, quiet hours, global pause
- Biscuits, bond, unlockable toys/outfits/room items
- Local export / clear / reset — no account, no remote analytics

## Load unpacked

```bash
node scripts/generate-icons.js
# optional Pillow path:
# python3 scripts/generate_icons.py
# chrome://extensions → Developer mode → Load unpacked → this folder
```

Or via monorepo helper:

```bash
node ../scripts/prepare-local-dev.js --only barkbreak
```

## Tests

```bash
node scripts/shared.test.js
# coverage (optional):
npx --yes c8 --check-coverage --lines 80 --functions 80 --branches 70 node scripts/shared.test.js
```

## Store

See [`store/`](./store/) for listing copy, privacy policy, publish checklist, and policy compliance notes.

## Privacy

See [PRIVACY.md](./PRIVACY.md) and [store/PRIVACY_POLICY.md](./store/PRIVACY_POLICY.md).
