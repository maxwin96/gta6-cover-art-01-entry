# Vice Sunset Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/maxwin96/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/maxwin96/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA 6 style cover art. Pick a layout, pick a colour grade, write your title, then export a PNG ready to post.

## Features

- **4 layouts** — Hero (1 panel), Duo (2 panels), Trio (1 large + 2 stacked), Quad (2×2 grid).
- **5 colour grades** — Sunset, Neon, Vice, Gold, Noir.
- **Caption** — title + subtitle, size slider, top / center / bottom position, 5 colours, outline + shadow, grain + vignette.
- **Photo panels** — click a panel to select it, drag the photo to pan, zoom slider, upload your own photo, or fill all panels with a sample.
- **Export PNG** — 1080×1080, 1080×1350, and 1920×1080.
- **Fully offline** — no network requests, system fonts only, no bundled fonts.

## Run it

```sh
node serve.ts
```

Then open `http://localhost:8080` in your browser.

## Build the entry

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json`. The build never deletes the output directory itself — it only creates it and writes inside it — so it is safe when the output directory is a mount point.
