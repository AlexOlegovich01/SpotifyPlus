<p align="center">
  <img src="logo.svg" width="128" alt="SpotifyPlus logo">
</p>

# SpotifyPlus

🇷🇺 [Русская версия](README.ru.md)

A [Tampermonkey](https://www.tampermonkey.net/) userscript that adds handy features to the Spotify Web Player (`open.spotify.com`): text selection, keyboard and mouse-wheel control of volume and seeking, and more.

## Features

| Action | Result |
| --- | --- |
| Hold **Shift** and drag | Select and copy any text on the page |
| **↑ / ↓** | Volume ±2% |
| **← / →** | Seek ±2 seconds |
| Mouse wheel over the **volume slider** | Volume ±5% |
| Mouse wheel over the **progress bar** | Seek ±20 seconds |
| **Space** | Play / pause |
| **Ctrl + → / Ctrl + ←** | Next / previous track |
| **Ctrl + C** (nothing selected) | Copy the current track as `Artist — Title` |

Hotkeys are ignored while you are typing in a text field (for example, the search box). If text is selected, **Ctrl + C** works as the normal copy command.

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Open [`SpotifyPlus.user.js`](SpotifyPlus.user.js) (use the **Raw** button on GitHub) — Tampermonkey will offer to install it. Alternatively, create a new script in the Tampermonkey dashboard and paste the file contents.
3. Open or reload [open.spotify.com](https://open.spotify.com/).

## Notes

- The script finds Spotify's controls through `data-testid` attributes (for example `volume-bar`, `playback-progressbar`, `control-button-playpause`). Spotify may change them in an update; if a feature stops working, check the selectors at the top of the script's second half with your browser's DevTools and adjust them.
- The script runs only on `https://open.spotify.com/*` and requires no special permissions (`@grant none`).

## Version

Current version: **1.2**
