# Policy compliance — Bark Break

Maps product behaviour to Chrome Web Store program policies.

## Single purpose

Bark Break supports intentional browser breaks through a virtual dog companion, user-selected site limits, focus timers, and break-linked pet care. Pet care, rewards, and cosmetics exist only to reinforce that break loop.

## User data

| Data | Remote? | Purpose |
| --- | --- | --- |
| Pet + settings | No (local) | Companion UI |
| Guarded origins + budgets | No (local) | Site limits |
| Aggregate domain engaged seconds | No (local) | Timer / gate |
| Break/focus aggregates | No (local) | Progress / scrapbook |

No sale of data. No unrelated secondary use.

## Permissions

Narrow required set (`storage`, `alarms`, `sidePanel`, `scripting`, `activeTab`). Host access is optional and requested per origin at runtime. Notifications optional.

## Code

Manifest V3. Extension pages CSP restricts to `'self'`. No `eval`, no remote scripts, no dynamically downloaded executable code. Content UI mounts in a Shadow DOM; host page treated as untrusted.

## Deceptive / harmful behaviour

- Urgent pass always available; no shame language
- Dog never dies, sickens, or loses bond
- Overlay is supportive and reversible, not marketed as unbreakable parental control
- Food/drink UI includes game-not-advice disclaimer; no dangerous real-world drink rewards

## Accessibility

Keyboard operation, focus management on gate, ARIA live announcements, motion/contrast/text controls, sound off by default.
