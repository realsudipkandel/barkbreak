# Resubmit Paw Pause after Yellow Nickel

Yellow Nickel = **Spam and Placement**.

## Critical rule

**Do not create a second Chrome Web Store item** named Paw Pause (or another pet/cat/dog clone).

What Google allows after rejection: submit a **new draft on the existing item**.

| Wrong | Right |
| --- | --- |
| `fresh-publish-barkbreak.js` / “New item” in dashboard | Update package + listing on kept ID, then Submit for review |
| Second “Paw Pause” / “cat companion” listing | One product, one listing, multiple looks inside it |
| PDF micro-extensions still live under same publisher | Archive leftover PDF micros; keep only the Real PDF suite if needed |

## Kept item

| Field | Value |
| --- | --- |
| Extension ID | `dgiiimlolaeeanohfaekmkahelfkanee` |
| Name | Paw Pause |
| Package | **2.4.4** |
| Former duplicate | `lbgdmjhkkhcjblhndkicecknfphnliic` (archived) |

## Policy checklist before submit

1. Publisher hygiene: no duplicate pet listings; PDF micros archived.
2. Category: **Just for Fun** (not Well-being).
3. Short description says **virtual companion** — never “real dog” / “real cat”.
4. Single purpose: on-page virtual companion only; dog/cat looks are one product.
5. ZIP is runtime-only (no `store/`, `scripts/`, attribution catalogs with remote URLs).
6. Screenshots match the shipped UI (page companion, popup, onboarding).
7. Privacy: local-only data; no remote hosts; privacy policy URL live.
8. Permissions justified; optional hosts only after user approval.

## Build + upload packet

```bash
cd barkbreak
node scripts/shared.test.js
node scripts/sounds.test.js
node scripts/capture-store-screenshots.js
bash scripts/package-extension.sh

cd ../scripts/cws-assets
cp ../../barkbreak/dist/barkbreak-2.4.4.zip upload-packets/barkbreak/
cp ../../barkbreak/store/LISTING.md upload-packets/barkbreak/
cp ../../barkbreak/store/PRIVACY_POLICY.md upload-packets/barkbreak/
cp ../../barkbreak/store/POLICY_COMPLIANCE.md upload-packets/barkbreak/
rm -rf upload-packets/barkbreak/screenshots
cp -R ../../barkbreak/store/screenshots upload-packets/barkbreak/screenshots
cp ../../barkbreak/icons/icon-128.png upload-packets/barkbreak/store-icon-128.png
```

## Publisher hygiene, then republish kept ID

```bash
cd scripts/cws-assets
node fix-barkbreak-yellow-nickel.js
node republish-one.js barkbreak
```

Dry-run first if you want to inspect without submit:

```bash
node republish-one.js barkbreak --dry-run
```

## Forbidden

- Creating another Paw Pause / Bark Break / pet companion item
- Leaving PDF clone listings active under the same publisher
- Keyword stuffing or “real animal” claims in the store listing
