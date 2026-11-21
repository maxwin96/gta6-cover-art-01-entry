# Vice Sunset Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/maxwin96/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/maxwin96/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your own photos into a poster-style cover with the look of a
Vice City sunset: warm oranges, neon pinks, big condensed lettering.
Everything runs in your browser, and your photos never leave your
machine.

Built for make.fun's "Make GTA 6 Cover Art" bounty — see the bounty at
[https://make.fun/bounty/gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Photo panels** — upload your own photos (several at once) or use the
  bundled samples. Pick one of four layouts: Hero (one full-bleed
  panel), Duo (two side-by-side panels), Trio (one large panel over two
  small ones), or Quad (a 2×2 grid). Click a panel to place the selected
  photo, drag inside it to pan, and use the zoom slider to zoom.
- **Colour grades** — Sunset, Neon, Vice, Gold and Noir. Each one is a
  gradient overlay plus a contrast and saturation shift painted on the
  canvas.
- **Caption** — a main title and a subtitle in heavy condensed system
  lettering, with a size slider, top or bottom placement, three title
  colours, a thick outline, a drop shadow, and optional grain and
  vignette.
- **Export** — render the finished cover at 1080×1080, 1080×1350 or
  1920×1080 and download it as a PNG.

## How to run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. No build step,
no install, no account.

## How to export a cover

1. Load photos (upload, or "Use sample photo").
2. Choose a layout and a grade, place photos in the panels, and set the
   caption.
3. Pick an export size and press **Download PNG**.

## Offline and licensing

The app is a set of static files under `app/` and makes no network
requests at all: no web fonts, no scripts from a CDN, no uploads. The
two sample photos ship with the app so it works out of the box.

Released under the MIT License — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
