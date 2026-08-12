# Policy compliance — Paw Pause

Maps the **current** on-page companion product to Chrome Web Store program policies.

## Single purpose

Paw Pause shows a virtual companion on user-approved websites, with local care interactions and an optional short walkies reminder. Care, moods, and finds exist only to support that companion experience. Multiple looks (dogs and cats, including black and black & white) are part of the **same** product — not separate listings.

## Spam / repetitive content (Yellow Nickel)

**Never create a second Paw Pause (or pet/cat/dog) item.** After rejection, submit a **new draft on the kept ID** only.

Paw Pause is **not** a PDF converter and must not ship alongside near-identical PDF micro-extensions from the same publisher. Before resubmitting:

1. Archive / unpublish leftover single-tool PDF listings (keep only the Real PDF suite if needed).
2. Confirm the old duplicate companion listing (`lbgdmjhkkhcjblhndkicecknfphnliic`) stays archived.
3. Keep one Paw Pause listing only — do not publish alternate “pet”, “cat”, or “gatekeeper” variants.
4. Do not run `fresh-publish-barkbreak.js` while the kept ID still exists.

## Keyword / metadata

- Title: **Paw Pause** (no keyword stuffing).
- Category: **Just for Fun** (not Well-being / Lifestyle — avoids clustering with break-timer listings).
- Short description: factual; say **virtual companion**, never “a real dog” or “a real cat”.
- Description: clear feature list; no fake testimonials; no repeated SEO phrases.
- Explicitly state it is not a PDF tool or break-timer suite, and that dog/cat looks are one product.
- Screenshots and promo tiles must show the **same** product as the uploaded ZIP:
  companion on page, hydrated popup, Name & look onboarding.

## User data

| Data | Remote? | Purpose |
| --- | --- | --- |
| Preferences, mood, finds, light counters | No (local) | Companion UI |
| Approved origins | No (local) | Where the overlay may run |

No sale of data. No unrelated secondary use. No page-content scraping.

## Permissions

Required: `storage`, `alarms`, `scripting`, `activeTab`.  
Optional host access requested per origin at runtime.  
Do not request `sidePanel` or `notifications` unless the shipped build uses them.

## Code

Manifest V3. Extension pages CSP restricts to `'self'`. No `eval`, no remote scripts. Overlay mounts in a Shadow DOM; host page treated as untrusted. Sound samples load only from packaged `chrome-extension://` URLs (no remote audio CDN).

## Functionality

- Companion appears only after the user approves a site.
- Core care actions work offline / without network.
- Urgent hide / pause always available so the overlay is reversible.
