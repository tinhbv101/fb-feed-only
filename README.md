<p align="center">
  <img src="icons/logo-512.png" width="128" alt="FB Feed Only logo" />
</p>

<h1 align="center">FB Feed Only</h1>

<p align="center">A Chrome extension that hides Messenger, chat popups and contacts on Facebook — leaving only the News Feed.</p>

---

## Features

- **Hide messages & chat** (on by default)
  - The Messenger button in the top bar and every link to `/messages` or messenger.com
  - Floating chat windows in the bottom-right corner and the "New message" button
  - The right sidebar (contacts, group conversations)
  - Redirects to the home page when opening `facebook.com/messages/...`
- **Hide left menu** (off by default) — only the News Feed stays in the middle
- Toggle from the popup; changes apply instantly without reloading the page
- Works with both the English and Vietnamese Facebook UI
- Popup follows the system light/dark theme

## Installation

1. Download or clone this repository
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right corner)
4. Click **Load unpacked** → select the `fb-feed-only` folder
5. Reload your Facebook tab

Works on any Chromium-based browser (Chrome, Edge, Brave, Cốc Cốc…).

**Updating** after code changes: go to `chrome://extensions` → click ↻ on the FB Feed Only card → reload the Facebook tab.

## Usage

Click the extension icon in the toolbar to open the popup and toggle each option. The status badge (**Đang bật** = on / **Đang tắt** = off) shows whether any option is active.

> The popup UI is currently in Vietnamese.

## Privacy

- Uses only the `storage` permission, to save the two toggles (synced via your Chrome account)
- Runs only on `*.facebook.com`
- Never reads message content and never sends data anywhere

## How it works

Facebook uses randomized CSS class names that change frequently, so the extension identifies elements through more stable signals:

| Element | Detected by |
| --- | --- |
| Messenger button | `aria-label` such as "Messenger", "Chats", "Đoạn chat" |
| Message links | `href` pointing to `/messages`, `/messenger` or messenger.com |
| Chat popups | A textbox labelled "Message" / "Tin nhắn" → hide its enclosing `position: fixed` dock |
| Contacts sidebar | `[role="complementary"]` |
| Left menu | `[role="navigation"]` outside the top bar |

A `MutationObserver` scans newly added elements (Facebook is a SPA and loads content continuously) and tags matches with `data-fbfo-hidden`. CSS hides them only while `<html>` carries the matching class, so turning an option off reveals everything immediately.

### Limitations

- Facebook changes its UI often — if something stops being hidden, its `aria-label` has probably changed. The label lists live in [`src/rules.js`](src/rules.js).
- Hiding the right sidebar also hides ads, birthdays and anything else in that column.
- Only the English and Vietnamese Facebook UI are supported for now.

## Development

Requirements: Node.js 20+ (tests), Python 3 + Pillow (regenerating icons).

```bash
npm test                          # unit tests + coverage (node:test, no dependencies)
python3 scripts/generate-icons.py # redraw icons into icons/
```

### Project structure

```
fb-feed-only/
├── manifest.json          # Manifest V3
├── src/
│   ├── rules.js           # Pure matching rules (shared by content script, popup and tests)
│   ├── content.js         # DOM scanning, element tagging, redirect away from /messages
│   └── content.css        # Hide rules keyed on classes on <html>
├── popup/                 # Toggle UI
├── icons/                 # 16/32/48/128 icons + 512 logo
├── scripts/generate-icons.py
└── tests/rules.test.js
```

### Adding labels for another language

Add the lowercase labels to `MESSAGE_BUTTON_LABELS`, `CHAT_DOCK_LABELS` and `MESSAGE_INPUT_LABELS` in [`src/rules.js`](src/rules.js), add matching cases to [`tests/rules.test.js`](tests/rules.test.js), then run `npm test`.
