const STORAGE_KEY = "ytBookmarks";

const saveBtn = document.getElementById("save-btn");
const nowPlaying = document.getElementById("now-playing");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("bookmark-list");
const searchEl = document.getElementById("search");

let currentState = null;
let bookmarks = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bookmarks = await loadBookmarks();
  await detectCurrentVideo();
  render();

  saveBtn.addEventListener("click", saveCurrentTimestamp);
  searchEl.addEventListener("input", render);
}

async function detectCurrentVideo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isYouTubeUrl(tab.url)) {
    nowPlaying.textContent = "Open a YouTube video, then click the button to save this moment.";
    saveBtn.disabled = true;
    return;
  }

  const state = await readVideoState(tab.id);
  if (!state?.ok) {
    nowPlaying.textContent = "Play a YouTube watch or Shorts video to bookmark a timestamp.";
    saveBtn.disabled = true;
    return;
  }

  currentState = state;
  nowPlaying.textContent = `${state.title} · ${formatTime(state.seconds)}`;
  saveBtn.disabled = false;
}

async function saveCurrentTimestamp() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const state = await readVideoState(tab.id);

  if (!state?.ok) {
    setStatus("No playable YouTube video found in this tab.");
    return;
  }

  const bookmark = {
    id: crypto.randomUUID(),
    videoId: state.videoId,
    title: state.title,
    seconds: state.seconds,
    createdAt: Date.now(),
  };

  const duplicate = bookmarks.some(
    (item) => item.videoId === bookmark.videoId && item.seconds === bookmark.seconds
  );
  if (duplicate) {
    setStatus("That timestamp is already saved.");
    return;
  }

  bookmarks = [bookmark, ...bookmarks];
  await chrome.storage.local.set({ [STORAGE_KEY]: bookmarks });
  currentState = state;
  nowPlaying.textContent = `${state.title} · ${formatTime(state.seconds)}`;
  setStatus(`Saved ${formatTime(state.seconds)}.`);
  render();
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const filtered = bookmarks.filter((item) => item.title.toLowerCase().includes(query));

  if (!filtered.length) {
    listEl.innerHTML = `<p class="empty">${bookmarks.length ? "No matching bookmarks." : "No timestamps yet. Save one from a playing video."}</p>`;
    return;
  }

  const groups = new Map();
  for (const item of filtered) {
    if (!groups.has(item.videoId)) {
      groups.set(item.videoId, { title: item.title, items: [] });
    }
    groups.get(item.videoId).items.push(item);
  }

  listEl.innerHTML = "";
  for (const [videoId, group] of groups) {
    const section = document.createElement("section");
    section.className = "group";
    section.innerHTML = `
      <div class="group-head">
        <img class="thumb" alt="" src="https://i.ytimg.com/vi/${videoId}/mqdefault.jpg" />
        <div class="group-title">${escapeHtml(group.title)}</div>
      </div>
    `;

    const stamps = [...group.items].sort((a, b) => a.seconds - b.seconds);
    for (const item of stamps) {
      const wrap = document.createElement("div");
      wrap.className = "stamp-row";

      const openBtn = document.createElement("button");
      openBtn.className = "stamp";
      openBtn.type = "button";
      openBtn.innerHTML = `
        <span class="stamp-main">
          <span class="time">${formatTime(item.seconds)}</span>
          <span class="meta">Opens YouTube and plays from this moment</span>
        </span>
      `;
      openBtn.addEventListener("click", () => openBookmark(item));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.type = "button";
      deleteBtn.title = "Delete bookmark";
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", () => deleteBookmark(item.id));

      wrap.append(openBtn, deleteBtn);
      section.append(wrap);
    }

    listEl.append(section);
  }
}

async function openBookmark(item) {
  await chrome.runtime.sendMessage({
    type: "OPEN_TIMESTAMP",
    payload: { videoId: item.videoId, seconds: item.seconds },
  });
}

async function deleteBookmark(id) {
  bookmarks = bookmarks.filter((item) => item.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: bookmarks });
  render();
}

async function readVideoState(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "GET_VIDEO_STATE" });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["content.css"],
      });
      return await chrome.tabs.sendMessage(tabId, { type: "GET_VIDEO_STATE" });
    } catch {
      return null;
    }
  }
}

async function loadBookmarks() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

function isYouTubeUrl(url = "") {
  return /https?:\/\/(www\.|m\.)?youtube\.com\//.test(url) || url.includes("youtu.be/");
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const mm = String(minutes).padStart(hours ? 2 : 1, "0");
  const ss = String(rest).padStart(2, "0");
  return hours ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
