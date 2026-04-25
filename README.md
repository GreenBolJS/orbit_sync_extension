# orbit_sync_extension

Chrome extension for Orbit — passively monitors your AI conversations and automatically syncs your career interests to your personal job alert agent.

---

## What This Does

This extension runs silently in the background while you use ChatGPT, Claude, Gemini, or Mistral. When it detects career-related conversation, it extracts your interests and sends them to the Orbit backend — which then searches for matching jobs and notifies you on Telegram.

No manual input required. Just chat naturally with any AI.

---

## How It Works

```
You chat with ChatGPT/Claude/Gemini about jobs
            ↓
content.js scans page every 20 seconds
            ↓
Detects career keywords in last 3 messages
            ↓
Sends conversation to background.js
            ↓
background.js POSTs to Orbit /chat-sync endpoint
            ↓
Orbit extracts your profile and triggers job search
            ↓
Chrome notification: "Orbit updated your job profile 🎯"
```

---

## Supported Platforms

- **ChatGPT** (chatgpt.com)
- **Claude** (claude.ai)
- **Gemini** (gemini.google.com)
- **Mistral** (chat.mistral.ai)

---

## Installation

Since this extension is not yet on the Chrome Web Store, load it manually:

1. Clone or download this repo
2. Open Chrome → go to `chrome://extensions`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `orbit_sync_extension` folder
6. Click the Orbit icon in your toolbar
7. Set your backend URL and click **Save**

---

## Configuration

Click the extension icon to open the popup:

- **Backend URL** — your Orbit backend URL (Railway deployment)
- **Auto-sync** — toggle automatic syncing on/off
- **Notifications** — toggle Chrome notifications on/off
- **Sync Current Page Now** — manually trigger a sync

Default backend URL points to the live Orbit instance. Change this if you're running your own deployment.

---

## File Structure

```
orbit_sync_extension/
├── manifest.json     # Chrome extension config (Manifest V3)
├── content.js        # Scans AI platform pages for conversation
├── background.js     # Receives messages, calls Orbit API
├── popup.html        # Extension popup UI
├── popup.js          # Popup logic and settings
└── icon.png          # Extension icon
```

---

## Permissions Used

| Permission | Reason |
|---|---|
| `activeTab` | Read conversation from current AI platform tab |
| `storage` | Save backend URL and sync stats |
| `scripting` | Inject content script into AI platform pages |
| `notifications` | Show sync confirmation notifications |

---

## Privacy

- Conversation text is only sent to your own Orbit backend
- No data is sent to any third party
- You control the backend URL — point it to your own instance
- Syncing can be paused at any time from the popup

---

## Part of Orbit

| Repo | Description |
|---|---|
| [orbit-backend](https://github.com/GreenBolJS/orbit-backend) | FastAPI pipeline |
| [orbit-your-career-compass](https://github.com/GreenBolJS/orbit-your-career-compass) | React dashboard |
| **orbit_sync_extension** | This repo — Chrome extension |

---

**Daksh Chawla** — BTech, IIT Roorkee · [GitHub](https://github.com/GreenBolJS)
