// ─── Orbit Sync — Content Script ─────────────────────────────────────────────
// Runs on ChatGPT, Claude, Gemini, Mistral
// Scans conversation, detects job-related content, syncs to backend

const SCAN_INTERVAL_MS = 20_000; // 20 seconds
const JOB_KEYWORDS = [
  "job", "intern", "internship", "apply", "hiring", "role",
  "position", "career", "salary", "resume", "interview",
  "work", "company", "engineer", "developer", "analyst",
  "fresher", "placement", "opportunity", "opening",
];

let lastHash = null;
let scanTimer = null;

// ─── Message Extraction ───────────────────────────────────────────────────────

function extractMessages() {
  const hostname = window.location.hostname;
  let messages = [];

  // ChatGPT
  if (hostname.includes("chatgpt.com")) {
    const nodes = document.querySelectorAll("[data-message-author-role]");
    nodes.forEach((node) => {
      const role = node.getAttribute("data-message-author-role");
      const text = node.innerText?.trim();
      if (text) messages.push({ role, text });
    });
  }

  // Claude
  if (hostname.includes("claude.ai")) {
    const human = document.querySelectorAll('[data-testid="human-turn"]');
    const ai = document.querySelectorAll('[data-testid="ai-turn"]');
    // Interleave in DOM order
    const allNodes = [...document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]')];
    allNodes.forEach((node) => {
      const role = node.getAttribute("data-testid") === "human-turn" ? "user" : "assistant";
      const text = node.innerText?.trim();
      if (text) messages.push({ role, text });
    });
  }

  // Gemini
  if (hostname.includes("gemini.google.com")) {
    const userNodes = document.querySelectorAll(".user-query-text");
    const modelNodes = document.querySelectorAll(".model-response-text");
    // Try to interleave by DOM position
    const allNodes = [
      ...document.querySelectorAll(".user-query-text, .model-response-text"),
    ];
    allNodes.forEach((node) => {
      const role = node.classList.contains("user-query-text") ? "user" : "assistant";
      const text = node.innerText?.trim();
      if (text) messages.push({ role, text });
    });
  }

  // Mistral
  if (hostname.includes("mistral.ai")) {
    // Mistral uses role-based message containers
    const allNodes = document.querySelectorAll(
      '[class*="message"], [class*="Message"], [class*="chat-message"]'
    );
    allNodes.forEach((node) => {
      const text = node.innerText?.trim();
      if (text && text.length > 10) {
        const isUser =
          node.className.includes("user") ||
          node.className.includes("human") ||
          node.querySelector('[class*="user"]');
        messages.push({ role: isUser ? "user" : "assistant", text });
      }
    });
  }

  // Generic fallback — alternating message divs
  if (messages.length === 0) {
    const candidates = document.querySelectorAll(
      '[role="presentation"] p, [class*="message"] p, [class*="chat"] p'
    );
    candidates.forEach((node, i) => {
      const text = node.innerText?.trim();
      if (text && text.length > 20) {
        messages.push({ role: i % 2 === 0 ? "user" : "assistant", text });
      }
    });
  }

  // Return last 8 messages as plain text array
  return messages
    .slice(-8)
    .map((m) => `[${m.role}]: ${m.text.slice(0, 800)}`);
}

// ─── Keyword Detection ────────────────────────────────────────────────────────

function hasJobKeywords(messages) {
  if (!messages.length) return false;
  const last3 = messages.slice(-3).join(" ").toLowerCase();
  return JOB_KEYWORDS.some((kw) => last3.includes(kw));
}

// ─── Hashing (lightweight change detection) ──────────────────────────────────

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

// ─── Main Scan Loop ───────────────────────────────────────────────────────────

async function scan() {
  // Check if auto-sync is enabled
  const { autoSync } = await chrome.storage.sync.get({ autoSync: true });
  if (!autoSync) return;

  const messages = extractMessages();
  if (!messages.length) return;

  const hash = simpleHash(messages.join("|"));

  // Load persisted hash
  const { lastSyncedHash } = await chrome.storage.local.get({
    lastSyncedHash: null,
  });

  if (hash === lastSyncedHash) return; // No change

  if (!hasJobKeywords(messages)) return; // Not job-related

  // Save new hash before sending to avoid race conditions
  await chrome.storage.local.set({ lastSyncedHash: hash });

  chrome.runtime.sendMessage({
    type: "SYNC_CONVERSATION",
    messages,
    source: window.location.hostname,
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

function startScanner() {
  scan(); // run immediately on load
  scanTimer = setInterval(scan, SCAN_INTERVAL_MS);
}

// Listen for manual sync trigger from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "MANUAL_SYNC") {
    scan().then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async
  }
});

startScanner();
