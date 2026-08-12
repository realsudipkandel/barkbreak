# Paw Pause — Chrome Web Store listing

Copy these fields into the Chrome Web Store Developer Dashboard.

**Resubmit the existing item only** (`dgiiimlolaeeanohfaekmkahelfkanee`). Do not create a second Paw Pause listing.

## Item information

| Field | Value |
| --- | --- |
| Name | Paw Pause |
| Version | 2.4.4 (from `manifest.json`) |
| Language | English |
| Category | Just for Fun |
| Visibility | Public |
| Homepage | https://github.com/realsudipkandel/barkbreak |
| Support | https://github.com/realsudipkandel/barkbreak/issues |

## Short description (manifest / summary, max 132 characters)

Calm virtual companion for sites you approve. Care, play, walk, and keep finds on-device — no account or ads.

Character count: 109

## Detailed description

```text
Paw Pause puts a calm virtual companion on websites you approve. Kabs stays on your device and only appears where you allow.

What you get
• A companion that walks the bottom of the page, finds treats with little stories, rests, sleeps, and reacts to you
• Choose a look: dogs or cats (including black and black & white)
• Pet, nose boop, belly rub, feed, water, and play
• Ball fetch, squeaky toy, and tug rope
• Move, hide, or pause when the companion is in the way
• Light local collection of found objects in the toolbar popup
• Four moods and light local memory (favourite food, toy, corner)
• Optional short walkies reminder after you have been active a while

Private by design
No account, shop, coins, leaderboard, or ads. Preferences and finds stay on your device. Paw Pause does not read page content. Sound stays off until you enable it.

How to use
1. Open the extension and complete onboarding
2. Approve a website where Kabs may appear
3. Visit that site — Kabs walks in along the bottom
4. Click the companion to care and play; use the toolbar popup for collection and settings

Paw Pause is not a PDF tool, dark mode tool, or break-timer suite. Its single purpose is the on-page virtual companion. This is one product with multiple looks — not a separate cat or dog extension.
```

## Single purpose statement (dashboard field)

Shows a virtual companion overlay on websites the user approves, with local care interactions and local-only progression. Does not modify search, replace the new tab, convert files, show ads, or send data off the device.

## Permission justification

| Permission | Justification |
| --- | --- |
| storage | Saves local preferences, mood, finds, and light daily counters on the device only |
| alarms | Ends the optional walkies timer when the popup is closed |
| scripting | Injects the local companion overlay script on approved pages |
| activeTab | Helps grant access when the user chooses the current site |
| Optional host access | Requested only for origins the user approves so the companion can appear there; page content is not read or transmitted |

## Privacy practices answers

| Question | Answer |
| --- | --- |
| Does this item collect or use user data? | Yes — locally only (preferences, mood, finds). No remote transmission |
| Personally identifiable information | Not collected |
| Health information | Not collected |
| Financial and payment information | Not collected |
| Authentication information | Not collected |
| Personal communications | Not collected |
| Location | Not collected |
| Web history | Not collected |
| User activity | Not collected |
| Website content | Not collected |
| Remote code? | No |
| Communicates with remote host? | No |
| Sells user data? | No |
| Privacy policy URL | https://raw.githubusercontent.com/realsudipkandel/barkbreak/main/store/PRIVACY_POLICY.md |

## Graphics

Store promo palette (mint teal — distinct from the older navy parchment set):

- Store icon: `icons/icon-128.png`
- Screenshots (in order):
  1. `store/screenshots/screenshot-page-1280x800.png` — companion on an approved page with care menu
  2. `store/screenshots/screenshot-popup-1280x800.png` — toolbar popup with collection + looks
  3. `store/screenshots/screenshot-onboarding-1280x800.png` — Name & look onboarding step
- Small promo: `store/screenshots/promo-small-440x280.png` (no transparency)

Regenerate with:

```bash
node scripts/capture-store-screenshots.js
```

## Test instructions (dashboard)

1. Install the extension and complete onboarding (name the companion; optionally pick a cat look).
2. Approve the current site (or example.com).
3. Open that site and confirm Kabs walks in along the bottom.
4. Click the companion, choose Pet once, then use Hide or Pause from the popup.
5. Confirm nothing is sent to a remote server (local-only).
