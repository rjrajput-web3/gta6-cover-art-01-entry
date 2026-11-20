# VICE HEAT — Leonida Golden-Hour Cover Studio

Turn any photo and a caption into GTA 6-style multi-panel cover art, in a
golden-hour Leonida mood: warm amber sunsets, palm silhouettes, chrome
lettering and poster furniture — then export it as a PNG to share.

## What it does

- **6 layouts** — Hero Split, Trio Strip, Quad Grid, Solo Poster, Diagonal
  Slash, Filmstrip. Every layout re-crops your one photo into several
  panels, so a single shot becomes a full poster.
- **6 grades** — Golden Hour, Heat Haze, Noir Vice, Pastel Dusk, Mono Chrome,
  Sunset Fade. Each grade is a canvas filter plus a warm tint overlay.
- **Poster furniture** — sun disc, palm silhouettes, five-star badge, Leonida
  banner, barcode with price, halftone dots. Toggle each one.
- **Words** — a Pacifico script line, a big Anton title and a banner line,
  all editable. Drag the preview to pan the photo; zoom with the slider.
- **Export** — PNG at 1080 x 1080, 1080 x 1350 or 1920 x 1080, plus undo /
  redo and a seeded Surprise Me button. The same state always renders the
  same pixels: no clock or unseeded randomness in the render path.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a sample photo (or upload your own), set the words, layout and grade,
then Export PNG. Your photos never leave the machine: the app is static
files under `app/` and works with no network once loaded.

## Screenshots

`shots.json` lists the four shots; each one is a real headless-Chromium
render of the app at the listed size:

- `1-cover.jpg` — exported cover, Golden Mile sample
- `2-editor.jpg` — the editor with a photo loaded
- `3-cover.jpg` — trio-strip cover, Boardwalk sample
- `4-cover.jpg` — quad-grid cover, Rooftop sample

## Handing it in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
into the output directory and writes `dossier.json` with `buildDossier`
from `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Running it twice writes byte-identical output.

## Fonts and credit

Anton and Pacifico are licensed under the SIL Open Font License 1.1 — see
`app/fonts/OFL.txt` and `app/fonts/Pacifico-OFL.txt`. The four sample
photos are original procedural art made for this entry. No Rockstar Games
logo, artwork or fonts are used.

## License

MIT — see `LICENSE`.
