# Chrome Web Store Listing — barkbreak

Copy these fields into the Chrome Web Store Developer Dashboard.
Aligned with the [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

## Item information

| Field | Value |
| --- | --- |
| Name | Bark Break |
| Version | 1.0.0 (from `manifest.json`) |
| Language | English |
| Category | Productivity |
| Visibility | Public |
| Homepage | https://github.com/realsudipkandel/barkbreak |
| Support | GitHub Issues on https://github.com/realsudipkandel/barkbreak/issues |

## Short description (manifest / summary, max 132 characters)

A funny virtual dog who guards distracting sites, reminds you to pause, and grows through healthy breaks.

Character count: 108



## Detailed description

```text
Meet Biscuit, your browser's good-boy gatekeeper. Choose the sites where you lose track of time. When your limit arrives, Biscuit closes a tiny gate and invites you to take a short break, refill a water bowl, throw a ball, or return with an urgent-use pass. Care for your dog, decorate the kennel, learn tricks, and build a kinder browsing routine—without an account or cloud history.

How it works
1. Adopt and name your dog.
2. Grant access to one distracting site at a time.
3. Bark Break counts only engaged, visible time on those sites.
4. When your budget ends, a reversible gate appears with break, close-tab, and urgent-pass choices.
5. Completed breaks and Focus Fetch sessions earn biscuits and permanent bond points.

Privacy
Everything stays on your device. No account, no ads, no page-content reading, no browsing profile.

Note
Bark Break is a wellbeing aid and game, not medical treatment or real-world pet feeding advice. Fresh water is free; fantasy drinks are labelled as in-game items.
```



## Single purpose statement (dashboard field)

Bark Break supports intentional browser breaks through a virtual dog companion, user-selected site limits, focus timers, and break-linked pet care.

## Permission justification

| Permission | Justification |
| --- | --- |
| `storage` | Saves your dog, settings, selected sites, and aggregate progress locally. |
| `alarms` | Ends focus and break timers reliably even when the extension panel is closed. |
| `sidePanel` | Gives your dog a persistent home beside the current page. |
| `scripting` | Adds the warning paw and break gate to sites you approve. |
| `activeTab` | Lets you choose “guard this site” from the toolbar / onboarding. |
| Optional host access | Requested one site at a time so Bark Break can measure engaged time and display the gate there. |
| Optional `notifications` | Announces the end of a break or focus session only if enabled. |

## Design guidelines

UI follows **Less text, more visual guidance**. See [DESIGN.md](../DESIGN.md) in this repository.

- One main idea and one primary action per screen
- Short titles, brief status text, specific button labels
- Show with visuals first; keep accessibility labels

## Privacy practices answers

| Question | Answer |
| --- | --- |
| Does this item collect or use user data? | **No** (nothing is sent off-device; local aggregates only) |
| Personally identifiable information | Not collected |
| Health information | Not collected |
| Financial and payment information | Not collected |
| Authentication information | Not collected |
| Personal communications | Not collected |
| Location | Not collected |
| Web history | Not collected remotely; optional local domain-level engaged-time aggregates for sites you guard |
| User activity | Not collected remotely; local pet progress and break/focus aggregates only |
| Website content | Not collected |
| Does this item sell user data? | **No** |
| Does this item use remote code? | **No** |
| Does this item communicate with a remote host? | **No** |
| Data usage certification | Certify compliance with the Chrome Web Store User Data Policy |

## Assets to upload

| Asset | Path |
| --- | --- |
| Store icon | `icons/icon-128.png` |
| Screenshot 1 | Kennel / side panel |
| Screenshot 2 | Onboarding |
| Screenshot 3 | Options |

## Privacy policy URL

https://raw.githubusercontent.com/realsudipkandel/barkbreak/main/store/PRIVACY_POLICY.md
