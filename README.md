<p align="center">
  <img src="icons/logo-512.png" width="128" alt="FB Feed Only logo" />
</p>

<h1 align="center">FB Feed Only</h1>

<p align="center">A Chrome extension that hides Messenger, chat popups and contacts on Facebook — leaving only the News Feed. Or hide (or show) messages from just the people you pick.</p>

---

## Features

- **Four message modes**
  - **Show normally** — the extension leaves Messenger alone
  - **Hide all** (default) — hides the Messenger button, every link to `/messages` or messenger.com, floating chat windows, the "New message" button and the right sidebar (contacts, group conversations); `facebook.com/messages/...` redirects to the home page
  - **Hide selected people** — only the conversations you pick disappear
  - **Show only selected people** — every conversation except the ones you pick disappears
- **People picker** with search (diacritic-insensitive: `nguyen` finds "Nguyễn"); groups can be picked too
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

Click the extension icon in the toolbar to open the popup, then pick a message mode. The status badge (**Đang bật** = on / **Đang tắt** = off) shows whether anything is active.

### Hiding or showing specific people

Facebook doesn't let extensions read your friend list, so the extension **remembers the conversations it sees** on the page: the Messenger dropdown, `facebook.com/messages` and open chat windows. Your ~14 most recent conversations are picked up automatically, because Facebook pre-renders the Messenger dropdown.

1. Choose **Ẩn người đã chọn** (hide selected) with nobody ticked yet, so every conversation stays visible
2. Open `facebook.com/messages` and scroll the conversation list once to record everyone
3. Open the popup, search by name and tick the people (or groups) you want
4. Optionally switch to **Chỉ hiện người đã chọn** (show only selected)
5. Someone not in the list? Paste their conversation link (`facebook.com/messages/t/…`) or numeric ID into **Dán link cuộc trò chuyện**; the name fills in once the conversation shows up on Facebook

Start in hide-selected mode with nobody ticked. In show-only mode with nobody ticked, every row is hidden, so there's nothing to scroll. **Hiện bình thường** (show normally) doesn't record anything.

In these modes the extension hides matching rows in the conversation lists, hides their chat windows, and leaves their conversation page if you open it.

> The popup UI is currently in Vietnamese.

## Privacy

- Uses only the `storage` permission
- Settings (mode, left-menu toggle) sync via your Chrome account
- The people list (conversation ID + display name) is stored **only on this device** (`chrome.storage.local`) and can be wiped with **Xoá danh sách**
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
| Conversation row | `a[href="/messages/(e2ee/)t/<id>"]`; the first text leaf is the name; the row is its `[role="row"]` |
| Chat window (per person) | The window's `[role="log"]` `aria-label` contains the contact's name (longest known name wins) |

A `MutationObserver` scans newly added elements (Facebook is a SPA and loads content continuously) and tags matches with `data-fbfo-hidden`. Per-person filtering uses a separate `data-fbfo-person-hidden` tag. CSS hides elements only while `<html>` carries the matching class, so switching modes takes effect immediately.

### Limitations

- Facebook changes its UI often — if something stops being hidden, its `aria-label` has probably changed. The label lists live in [`src/rules.js`](src/rules.js).
- Hiding the right sidebar also hides ads, birthdays and anything else in that column.
- Only the English and Vietnamese Facebook UI are supported for now.
- Per-person modes only hide things **on your screen in this browser** — the other person can still message you, and the Messenger app on your phone shows everything. To really stop someone, use Facebook's own *Ignore messages*, *Restrict* or *Block*.
- The unread count on the Messenger button still includes hidden conversations.
- Chat windows are matched by name, so two contacts with the same name are treated alike. A minimized chat bubble may stay visible.
- Opening a hidden conversation sends you back to `/messages/`; if Facebook then auto-opens another hidden one, you land on the home page.

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
│   ├── rules.js           # Pure settings + Messenger matching rules
│   ├── people-rules.js    # Pure per-person rules: thread IDs, search, merge, hide decisions
│   ├── storage.js         # chrome.storage access (settings in sync, people in local)
│   ├── dom.js             # Facebook DOM lookups: chat dock, conversation rows, chat windows
│   ├── hide-all.js        # "Hide all" mode tagging
│   ├── person-filter.js   # Per-person tagging
│   ├── content.js         # Orchestration: settings, MutationObserver, redirects, harvesting
│   └── content.css        # Hide rules keyed on classes on <html>
├── popup/                 # Mode picker, people picker, left-menu toggle
├── icons/                 # 16/32/48/128 icons + 512 logo
├── scripts/generate-icons.py
└── tests/                 # node:test unit tests for the pure rules
```

### Adding labels for another language

Add the lowercase labels to `MESSAGE_BUTTON_LABELS`, `CHAT_DOCK_LABELS` and `MESSAGE_INPUT_LABELS` in [`src/rules.js`](src/rules.js), add matching cases to [`tests/rules.test.js`](tests/rules.test.js), then run `npm test`.
