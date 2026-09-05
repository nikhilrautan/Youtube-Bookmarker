const STORAGE_KEY = "ytBookmarks";
const pendingSeeks = new Map();

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== "complete" || !pendingSeeks.has(tabId)) return;
  const seconds = pendingSeeks.get(tabId);
  pendingSeeks.delete(tabId);
  chrome.tabs
    .sendMessage(tabId, { type: "SEEK_AND_PLAY", seconds })
    .catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_TIMESTAMP") {
    openTimestamp(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "SAVE_BOOKMARK_FROM_PLAYER") {
    saveBookmark(message.payload)
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});

async function saveBookmark(state) {
  if (!state?.ok || !state.videoId) return false;

  const data = await chrome.storage.local.get(STORAGE_KEY);
  const bookmarks = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  const exists = bookmarks.some(
    (item) => item.videoId === state.videoId && item.seconds === state.seconds
  );
  if (exists) return true;

  bookmarks.unshift({
    id: crypto.randomUUID(),
    videoId: state.videoId,
    title: state.title || "YouTube video",
    seconds: Math.floor(Number(state.seconds) || 0),
    createdAt: Date.now(),
  });

  await chrome.storage.local.set({ [STORAGE_KEY]: bookmarks });
  return true;
}

async function openTimestamp({ videoId, seconds }) {
  const time = Math.max(0, Math.floor(Number(seconds) || 0));
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${time}s`;

  const tabs = await chrome.tabs.query({
    url: ["https://www.youtube.com/*", "https://m.youtube.com/*"],
  });

  const matchingTab = tabs.find((tab) => extractVideoId(tab.url) === videoId);

  if (matchingTab?.id) {
    await chrome.tabs.update(matchingTab.id, { active: true, url });
    if (matchingTab.windowId != null) {
      await chrome.windows.update(matchingTab.windowId, { focused: true });
    }

    const seek = () =>
      chrome.tabs.sendMessage(matchingTab.id, {
        type: "SEEK_AND_PLAY",
        seconds: time,
      });

    try {
      await seek();
    } catch {
      setTimeout(() => {
        seek().catch(() => {});
      }, 1200);
    }
    return;
  }

  const tab = await chrome.tabs.create({ url, active: true });
  if (tab?.id) pendingSeeks.set(tab.id, time);
}

function extractVideoId(urlString) {
  try {
    const url = new URL(urlString);
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const shorts = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shorts) return shorts[1];
    const embed = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embed) return embed[1];
  } catch {
    return null;
  }
  return null;
}
