# VICE HEAT — Leonida Golden-Hour Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rjrajput-web3/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/rjrajput-web3/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

VICE HEAT turns your photos into GTA VI poster-style cover art: multi-panel
layouts, bold Anton lettering with a neon Pacifico script subtitle, a heat
rating, a badge ribbon and a golden-hour sunset or neon colour grade. Pick a
layout and a grade, drag the lead photo to crop it, scroll to zoom, type a
caption, and export the cover as a PNG in Square, Portrait or Wide post sizes.

Built for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01)
on make.fun. The app runs entirely offline in a desktop browser from its own
static files — your photos never leave the machine.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Node 22 or later, no dependencies to install.

## How it works

- **6 layouts** — Full Bleed, Hero + Three, Four Panel, Nine Panel, Tilted
  Snaps and Split Diptych — and **6 grades** — Vice Sunset, Neon Night,
  Golden Hour, Teal Noir, Palm Fade and Mono Heat.
- **Photos** — four Vice City sample photos ship with the app; you can add
  your own from the photo tray. Click a photo to lead with it, drag the cover
  to pan the lead photo, scroll to zoom.
- **Caption** — title, script subtitle, badge ribbon and a 1–5 heat rating.
  The title block is drawn with a halftone band, a gradient fill and a dark
  outline, exactly like a poster.
- **Export** — one click exports the cover at 1080×1080, 1080×1350 or
  1920×1080 PNG. Rendering is deterministic: the same state always draws the
  same pixels.
- **Undo / redo** and a **Shuffle look** button for random layout + grade.

## Files

- `app/index.html` — the studio page.
- `app/style.css` — the golden-hour studio stylesheet.
- `app/src/cover.js` — the cover engine (layouts, grades, canvas drawing).
- `app/src/main.js` — the editor UI: toolbar, tray, caption fields, export.
- `app/src/shots.js` — fixed `?shot=` scenes for the screenshots.
- `app/samples/` — the four sample photos; `app/fonts/` — Anton and Pacifico
  under the SIL Open Font License.
- `main.ts` — hands the app and screenshots to the make.fun grader.
- `shots.json` — the four screenshot scenes (cover × 3, editor × 1).

## Screenshots

`screenshots/1-cover.jpg` is the cover; `screenshots/2-editor.jpg` shows the
studio scene; `screenshots/3-cover.jpg` and `screenshots/4-cover.jpg` show
the Nine Panel and Tilted Snaps layouts.

VICE HEAT is an original fan-made cover tool, not affiliated with Rockstar
Games. No official artwork, logos or fonts are used.
