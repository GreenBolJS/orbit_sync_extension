// ─── Orbit Sync — Background Service Worker ───────────────────────────────────

const DEFAULT_BACKEND = "https://orbit-backend-production-26a0.up.railway.app";
const DEBOUNCE_MS = 15 * 60 * 1000; // 15 minutes per conversation source

// Track last sync time per source to debounce
const lastSyncTime = {};

// ─── Sync Handler ─────────────────────────────────────────────────────────────

async function handleSync({ messages, source }) {
  // Debounce per source
  const now = Date.now();
  if (lastSyncTime[source] && now - lastSyncTime[source] < DEBOUNCE_MS) {
    console.log(`[Orbit] Debouncing sync for ${source} — too soon`);
    return;
  }

  const { backendUrl } = await chrome.storage.sync.get({
    backendUrl: DEFAULT_BACKEND,
  });

  const url = `${backendUrl.replace(/\/$/, "")}/chat-sync`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, source }),
    });

    if (!response.ok) {
      console.warn(`[Orbit] Backend returned ${response.status}`);
      return;
    }

    const data = await response.json();
    lastSyncTime[source] = now;

    // Update stats
    const { syncCount = 0 } = await chrome.storage.local.get({ syncCount: 0 });
    await chrome.storage.local.set({
      syncCount: syncCount + 1,
      lastSynced: now,
    });

    console.log(`[Orbit] Synced from ${source}`, data);

    // Notify if profile was updated
    if (data.profile_updated) {
      const { showNotifications } = await chrome.storage.sync.get({
        showNotifications: true,
      });

      if (showNotifications) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Orbit Sync",
          message: "Orbit updated your job profile 🎯",
          priority: 1,
        });
      }
    }
  } catch (err) {
    console.error("[Orbit] Sync failed:", err.message);
  }
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SYNC_CONVERSATION") {
    handleSync(msg);
    // No response needed — fire and forget
  }

  if (msg.type === "GET_STATUS") {
    // Popup asking for current state
    chrome.storage.local.get(
      { lastSynced: null, syncCount: 0 },
      (data) => sendResponse(data)
    );
    return true;
  }
});
