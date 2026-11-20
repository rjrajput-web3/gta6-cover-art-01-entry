# VICE HEAT — Leonida Golden-Hour Cover Studio

A free offline web app that turns any photo and a caption into GTA VI
poster-style cover art — the multi-panel poster and loading-screen look with
a Vice City neon-sunset grade — exported as a share-ready PNG.

## What it does

- **6 layouts** — Full Bleed, Hero + Three, Four Panel, Nine Panel, Tilted
  Snapshots (polaroid-style), Split Diptych.
- **6 grades** — Vice Sunset, Neon Night, Golden Hour, Teal Noir, Palm Fade,
  Mono Heat. Each grade washes the photos in a sunset sky gradient plus a
  warm tint, then grain and vignette finish the poster look.
- **Any photo** — drop in your own photos, or use the four built-in Leonida
  samples. Drag on the cover to pan the lead photo, scroll to zoom, click a
  thumbnail to lead with a different photo.
- **Caption lettering** — Anton display title with a sunset gradient fill and
  ink outline, a neon Pacifico script subtitle, a LEONIDA badge ribbon and a
  five-star heat meter, over a halftone-dot title band.
- **Export** — one click exports 1080×1080, 1080×1350 and 1920×1080 PNGs, or
  all three at once. Undo/redo and a Shuffle look button included.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Everything runs in the browser. No network requests, no uploads, no account:
photos never leave the machine. Fonts (Anton, Pacifico) are vendored under
`app/fonts/` under the SIL Open Font License, texts beside them.

## Shots

`shots.json` lists the four screenshots (the first by name is the cover).
Render them headless against the local server, e.g. with Chromium:

```sh
chromium --headless --screenshot=screenshots/1-cover.jpg \
  --window-size=1080,1080 \
  "http://localhost:8080/?shot=cover&photo=golden-mile&caption=Vice%20Heat"
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

## Credits

VICE HEAT is an original fan-made cover tool, not affiliated with Rockstar
Games. No official artwork, logos or fonts are used. Sample photos were made
for this project with an image model; no real person is pictured. License:
MIT (see LICENSE).
