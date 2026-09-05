# YouTube Bookmarker

A Chrome extension that lets you bookmark specific timestamps in YouTube videos, so you can jump straight back to the exact moment that mattered — without scrubbing through the whole video again.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome Web Store](https://img.shields.io/badge/platform-Chrome-yellow.svg)

## Features

- ⏱️ **Timestamp bookmarking** — Save the current playback position with one click
- 🏷️ **Notes & labels** — Add a short note to each bookmark so you remember why you saved it
- 📺 **Per-video bookmark list** — See all bookmarks for the video you're currently watching
- 🔎 **Search & filter** — Quickly find a bookmark across all your saved videos
- 🚀 **Jump to timestamp** — Click a bookmark to seek the video instantly
- 💾 **Local storage sync** — Bookmarks are saved via Chrome Storage and sync across your signed-in devices
- 📤 **Export / Import** — Back up your bookmarks as JSON or move them between browsers

> Note: Adjust the feature list above to match what your extension actually does — this is a starting template.

## Installation

### From the Chrome Web Store
1. Visit the [Chrome Web Store listing](#) *(add your link here)*
2. Click **Add to Chrome**
3. Pin the extension icon for quick access

### Manual installation (developer mode)
1. Clone this repository:
   ```bash
   git clone https://github.com/nikhilrautan/Youtube-Bookmarker.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the cloned project folder
5. The extension icon should now appear in your toolbar

## Usage

1. Open any YouTube video
2. Click the extension icon or use the injected on-page button to bookmark the current timestamp
3. Optionally add a note describing the moment
4. Open the extension popup to view, search, or jump to any saved bookmark
5. Click a bookmark to seek the video to that exact time

## Project Structure

```
youtube-bookmarker/
├── manifest.json        # Extension manifest (Manifest V3)
├── background.js        # Service worker
├── content.js           # Injected into YouTube pages
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.js
│   └── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save bookmarks locally and sync across devices |
| `activeTab` | Read the current YouTube video and playback time |
| `scripting` | Inject the bookmark button/UI into YouTube pages |
| Host permission: `*://*.youtube.com/*` | Detect video timestamps and control playback |

> Update this table to match your actual `manifest.json` permissions.

## Tech Stack

- JavaScript (Vanilla / or specify framework, e.g. React)
- Chrome Extension Manifest V3
- Chrome Storage API

## Roadmap

- [ ] Sync bookmarks across devices via cloud backend
- [ ] Keyboard shortcuts for bookmarking
- [ ] Folder/playlist organization for bookmarks
- [ ] Dark mode for popup UI

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements


Built with ❤️ for people who watch a lot of YouTube and hate scrubbing through timelines.