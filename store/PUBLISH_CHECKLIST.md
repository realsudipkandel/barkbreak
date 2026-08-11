# Chrome Web Store Publish Checklist — Bark Break

Policy reference: https://developer.chrome.com/docs/webstore/program-policies/policies

## Before you start (account)

1. Developer fee paid; **2-Step Verification** enabled.
2. Privacy policy public:
   `https://raw.githubusercontent.com/realsudipkandel/barkbreak/main/store/PRIVACY_POLICY.md`
3. Confirm publisher contact email receives Google mail.

## Review-readiness checklist (§15.5)

- [ ] Manifest V3
- [ ] Clear single purpose (see LISTING.md)
- [ ] Every permission used and justified
- [ ] No broad host access at installation (optional hosts only)
- [ ] No remotely hosted code
- [ ] Accurate privacy policy and store disclosures
- [ ] Browsing activity collected only for selected-site engaged-time feature (domain aggregates)
- [ ] All main functionality testable without an account or payment
- [ ] Support contact and deletion/reset instructions
- [ ] Screenshots match submitted behaviour

## Local QA

```bash
node scripts/generate-icons.js
node scripts/shared.test.js
```

1. Open `chrome://extensions` → Developer mode → **Load unpacked** → `barkbreak/`
2. Complete onboarding: adopt dog → choose site → grant permission → finish rehearsal
3. Open side panel: Pet / Water / Play / Feed; biscuits/bond update
4. On a guarded site, wait for engaged time (or temporarily lower budget in Options)
5. Confirm warning paw, then gate; try **Take a break**, **Urgent pass**, **Close tab**
6. Complete break care → away timer → return reward + refresh check-in
7. Start Focus Fetch; badge shows focus; end or wait for alarm completion
8. Quiet hours / Pause 1 hour suppress gates
9. Options: export JSON, clear today, reset all → returns to onboarding
10. Network panel for the extension: no unexpected remote requests

## Design QA

Confirm UI matches [DESIGN.md](../DESIGN.md):

1. One main idea and primary action per screen
2. Short titles; specific button labels
3. Status not colour-only; screen-reader labels present
4. Reduced/static motion and high contrast work

## Upload package

ZIP extension root so `manifest.json` is top-level. Suggested: `barkbreak-1.0.0.zip`

Include runtime files and `icons/`. Exclude `.git`, coverage, and local-only junk.

## Store listing

Copy name, summary, detailed description, single purpose, and permission justifications from `LISTING.md`.

Category: **Productivity** · Language: **English**

## Privacy tab

- Collects user data remotely? **No**
- Remote code? **No**
- Privacy policy URL as above

## After approval

Bump `manifest.json` `version` for every future upload.
