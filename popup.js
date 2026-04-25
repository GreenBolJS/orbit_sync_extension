// ─── Orbit Sync — Popup Script ────────────────────────────────────────────────

const DEFAULT_BACKEND = "https://orbit-backend-production-26a0.up.railway.app";

const PLATFORM_MAP = {
  "chatgpt.com":      { name: "ChatGPT",  emoji: "🤖" },
  "claude.ai":        { name: "Claude",   emoji: "🟠" },
  "gemini.google.com":{ name: "Gemini",   emoji: "♊" },
  "chat.mistral.ai":  { name: "Mistral",  emoji: "🌀" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ms) {
  if (!ms) return "Never";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function $(id) { return document.getElementById(id); }

// ─── Backend Health Check ──────────────────────────────────────────────────────

async function checkHealth(backendUrl) {
  try {
    const url = `${backendUrl.replace(/\/$/, "")}/health`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Platform Detection ───────────────────────────────────────────────────────

async function detectCurrentPlatform() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.url) return resolve(null);
      const url = new URL(tabs[0].url);
      const match = Object.entries(PLATFORM_MAP).find(([domain]) =>
        url.hostname.includes(domain)
      );
      resolve(match ? { domain: match[0], ...match[1] } : null);
    });
  });
}

// ─── Manual Sync ──────────────────────────────────────────────────────────────

async function triggerManualSync() {
  const btn = $("sync-now");
  btn.textContent = "Syncing…";
  btn.classList.add("syncing");
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    // Inject and run the sync
    await chrome.tabs.sendMessage(tab.id, { type: "MANUAL_SYNC" });
    btn.textContent = "✓ Synced!";
  } catch (err) {
    btn.textContent = "⚠ Not on AI page";
  }

  setTimeout(() => {
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M12 7A5 5 0 1 1 7 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M7 0l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Sync Current Page Now`;
    btn.classList.remove("syncing");
    btn.disabled = false;
  }, 2000);
}

// ─── Main Init ────────────────────────────────────────────────────────────────

async function init() {
  // 1. Load stored settings
  const { backendUrl, autoSync, showNotifications } = await chrome.storage.sync.get({
    backendUrl: DEFAULT_BACKEND,
    autoSync: true,
    showNotifications: true,
  });

  const { syncCount, lastSynced } = await chrome.storage.local.get({
    syncCount: 0,
    lastSynced: null,
  });

  // 2. Populate settings inputs
  $("backend-url").value = backendUrl;
  $("auto-sync").checked = autoSync;
  $("show-notifs").checked = showNotifications;

  // 3. Update stats
  $("sync-count").textContent = syncCount;
  $("last-synced").textContent = timeAgo(lastSynced);

  // 4. Check backend health
  const isOnline = await checkHealth(backendUrl);
  const dot = $("status-dot");
  const statusText = $("status-text");
  if (isOnline) {
    dot.classList.add("online");
    statusText.textContent = "Agent Active";
  } else {
    dot.classList.add("offline");
    statusText.textContent = "Backend Offline";
  }

  // 5. Detect current platform
  const platform = await detectCurrentPlatform();
  const badge = $("platform-badge");
  const syncState = $("sync-state");

  if (platform) {
    badge.textContent = `${platform.emoji} ${platform.name}`;
    badge.classList.remove("inactive");
    syncState.textContent = autoSync ? "Syncing enabled" : "Auto-sync off";
    syncState.classList.toggle("active", autoSync);
  } else {
    badge.textContent = "Not an AI platform";
    badge.classList.add("inactive");
    syncState.textContent = "—";
  }

  // 6. Save URL button
  $("save-url").addEventListener("click", async () => {
    const newUrl = $("backend-url").value.trim();
    if (!newUrl) return;
    await chrome.storage.sync.set({ backendUrl: newUrl });
    const feedback = $("save-feedback");
    feedback.textContent = "✓ Saved";
    setTimeout(() => (feedback.textContent = ""), 2000);

    // Re-check health with new URL
    const ok = await checkHealth(newUrl);
    dot.className = "dot " + (ok ? "online" : "offline");
    statusText.textContent = ok ? "Agent Active" : "Backend Offline";
  });

  // 7. Toggle: auto-sync
  $("auto-sync").addEventListener("change", async (e) => {
    await chrome.storage.sync.set({ autoSync: e.target.checked });
    syncState.textContent = e.target.checked ? "Syncing enabled" : "Auto-sync off";
    syncState.classList.toggle("active", e.target.checked);
  });

  // 8. Toggle: notifications
  $("show-notifs").addEventListener("change", async (e) => {
    await chrome.storage.sync.set({ showNotifications: e.target.checked });
  });

  // 9. Manual sync button
  $("sync-now").addEventListener("click", triggerManualSync);
}

document.addEventListener("DOMContentLoaded", init);
