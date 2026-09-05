(function () {
  if (window.__ytBookmarkerLoaded) return;
  window.__ytBookmarkerLoaded = true;

  const BUTTON_ID = "yt-bookmarker-player-btn";

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_VIDEO_STATE") {
      sendResponse(getVideoState());
      return false;
    }

    if (message?.type === "SEEK_AND_PLAY") {
      seekAndPlay(message.seconds)
        .then((ok) => sendResponse({ ok }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    return false;
  });

  function getVideoElement() {
    return document.querySelector("video.html5-main-video") || document.querySelector("video");
  }

  function getVideoId() {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const shorts = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shorts) return shorts[1];

    const embed = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embed) return embed[1];

    return null;
  }

  function getVideoTitle() {
    const selectors = [
      "h1.ytd-watch-metadata yt-formatted-string",
      "h1.ytd-video-primary-info-renderer yt-formatted-string",
      "yt-formatted-string.ytd-watch-metadata",
      "#title h1",
      "h2.ytShortsVideoTitleViewModelShortsVideoTitle",
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent?.trim();
      if (text) return text;
    }

    return document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim();
  }

  function getVideoState() {
    const video = getVideoElement();
    const videoId = getVideoId();

    if (!video || !videoId) {
      return {
        ok: false,
        reason: videoId ? "no-player" : "not-a-video",
      };
    }

    return {
      ok: true,
      videoId,
      title: getVideoTitle() || "YouTube video",
      seconds: Math.floor(video.currentTime || 0),
      duration: Math.floor(video.duration || 0),
      url: window.location.href,
    };
  }

  async function seekAndPlay(seconds) {
    const target = Math.max(0, Number(seconds) || 0);
    const started = Date.now();

    while (Date.now() - started < 8000) {
      const video = getVideoElement();
      if (video && video.readyState >= 1) {
        video.currentTime = target;
        try {
          await video.play();
        } catch {
          video.muted = false;
          await video.play().catch(() => {});
        }
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return false;
  }

  function createPlayerButton() {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) return existing;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.className = "ytp-button yt-bookmarker-btn";
    button.type = "button";
    button.title = "Bookmark this timestamp";
    button.setAttribute("aria-label", "Bookmark this timestamp");
    button.innerHTML = `
      <svg viewBox="0 0 36 36" width="100%" height="100%" aria-hidden="true">
        <path fill="#fff" d="M12 8h12c.6 0 1 .4 1 1v18.4c0 .6-.7.9-1.1.5L18 22.3l-5.9 5.6c-.4.4-1.1.1-1.1-.5V9c0-.6.4-1 1-1z"/>
      </svg>
    `;

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const state = getVideoState();
      if (!state.ok) {
        flash(button, false);
        return;
      }

      const saved = await chrome.runtime.sendMessage({
        type: "SAVE_BOOKMARK_FROM_PLAYER",
        payload: state,
      });
      flash(button, Boolean(saved?.ok));
    });

    return button;
  }

  function flash(button, success) {
    button.classList.toggle("is-success", success);
    button.classList.toggle("is-error", !success);
    setTimeout(() => {
      button.classList.remove("is-success", "is-error");
    }, 900);
  }

function injectPlayerButton() {
  try {
    const controls = getPlayerControls();
    if (!controls || !controls.isConnected) return;

    const button = createPlayerButton();
    const settings = controls.querySelector(".ytp-settings-button");
    const parent = settings?.parentElement || controls;

    if (!parent || !parent.isConnected) return;

    if (button.parentElement === parent) {
      if (!settings || button.nextElementSibling === settings) return;
    }

    if (settings && settings.parentNode === parent) {
      parent.insertBefore(button, settings);
    } else {
      parent.appendChild(button);
    }
  } catch (err) {
    console.debug("yt-bookmarker: injectPlayerButton skipped", err);
  }
}

  const observer = new MutationObserver(() => injectPlayerButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  injectPlayerButton();
})();
