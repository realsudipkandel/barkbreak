# Privacy Policy — Bark Break

**Last updated:** 11 August 2026

Bark Break (“the extension”) is a Manifest V3 Chrome extension that helps you take intentional browser breaks with a local virtual dog companion.

## What we store

All data stays in `chrome.storage.local` on your device:

- Dog appearance, name, pronouns, personality, mood readiness, bond, inventory, and trick progress
- Your settings (mode, break length, quiet hours, accessibility preferences)
- User-selected guarded site origins and budgets
- Aggregate engaged seconds per guarded domain per day (domain host only)
- Break/focus completion totals and optional refresh check-ins
- A short local event log for scrapbook sentences

## What we do not store

- Full URLs, paths, query strings, page titles, page text, forms, messages, searches, or video titles
- General browser history or unselected domains
- Keystrokes or pointer coordinates beyond transient in-page activity detection
- Identity, email, contacts, location, or advertising identifiers
- Private urgent-pass intention notes (discarded by default)

## Network

The extension does not send browsing activity, pet state, or analytics to a remote server. There is no account and no cloud sync in the MVP.

## Permissions

- **storage** — local persistence
- **alarms** — reliable break/focus deadlines
- **sidePanel** — kennel UI
- **scripting** / **activeTab** — inject the meter and gate only after you approve a site
- **optional host permissions** — requested one origin at a time
- **optional notifications** — only if you enable them

## Retention and controls

- Aggregate history uses a rolling 30-day window
- Settings include export JSON, clear today, clear progress, and erase everything / reset pet
- Incognito is not enabled by default

## Contact

Open an issue at https://github.com/realsudipkandel/barkbreak

## Changes

Material privacy changes will be reflected in this document and the extension version notes.
