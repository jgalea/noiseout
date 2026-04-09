# NoiseOut

Hide LinkedIn distractions — puzzles, ads, upsells, promoted posts, "People you may know", sidebar junk, and more. Chrome extension, Manifest V3, no dependencies, no network calls, no tracking.

## Install (unpacked)

1. Clone this repo.
2. Open `chrome://extensions/` and enable Developer mode.
3. Click "Load unpacked" and select the repo folder.
4. Click the NoiseOut icon to open the dashboard.

## What it hides

21 toggles across 7 categories. Turn on only what bothers you.

| Category | Toggles |
|---|---|
| Visual | Black & White (grayscale the whole site) |
| Feed | Main feed, Sponsored posts, Offers / promo cards, Post composer, Post metrics, Post comments |
| Feed Sidebar | Puzzles / games, "Add to your feed", LinkedIn News, Sidebar ads, Footer |
| Navigation | Notification badges, Messaging popup, Premium upsell, "For Business" nav, Jobs nav |
| Left Sidebar | Profile card, Company page links |
| My Network | "People you may know" (grow page + profiles + search) |
| Services | Premium requests |

The dashboard has a search box, per-category master switches, reset to defaults, and import/export as JSON. Settings are synced across devices via `chrome.storage.sync`.

## How it works

A content script runs at `document_start` on every `https://*.linkedin.com/*` page. It injects CSS rules for selectors that can be expressed as stable attribute matches (`data-testid`, `aria-label`), and runs JavaScript finder functions for elements that need DOM traversal. A debounced MutationObserver keeps hiding new elements as the feed lazy-loads. Pathname polling catches SPA navigation so finders re-run when you click from one LinkedIn page to another.

Hides are sticky by default — once hidden, elements stay hidden. A few selectors opt into dynamic re-evaluation via a `stillValid(el)` predicate so things like the Services marketplace detail panel can reappear when you click a non-premium request.

## Permissions

- `storage` — to sync toggle state
- `activeTab` — to read the current LinkedIn tab's pathname for per-page highlighting
- `https://*.linkedin.com/*` host permission — the extension only runs on LinkedIn

No remote code, no analytics, no network requests of any kind.

## Adding a new toggle

1. Add an entry to `SELECTORS` in `selectors.js` with either a `css` array (selectors that get `display: none`) or a `find()` function returning elements to hide.
2. Add the toggle key to `TOGGLE_META` in `presets.js` with a label, category, and `pages` array (URL pathname prefixes where it's relevant, or `['*']` for global).
3. Add it to `DEFAULT_TOGGLES` with the default state.

## License

MIT
