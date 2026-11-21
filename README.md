[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rjrajput-web3/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/rjrajput-web3/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# VICE HEAT — Leonida Golden-Hour Cover Studio

An offline browser app that turns your photos and a caption into GTA 6-style
cover art: the multi-panel Leonida poster look with a Vice City golden-hour
grade, bold Anton lettering, a Pacifico script subtitle, and poster furniture
(synthwave sun, palms, five-star badge, Leonida banner, skyline, barcode and
price). Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
competition on make.fun.

## What it does

- **10 layouts** — Classic Grid, Hero Duo, Center Poster, Bottom Heavy,
  Magazine Spread, Duotone Split, Triptych, Big Sun, Diagonal Bands and
  Frame Story. Every layout is a real arrangement of photo panels, not a
  filter over one picture.
- **9 colour grades** — Golden Hour, Vice Neon, Sunset Heat, Duotone Pink,
  Teal Dusk, Noir, Palm Noir, Pastel Pop and Mono Gold.
- **6 photo treatments per panel** — Warm, Cool, Mono, Punch, Pastel and
  Noir, plus drag-to-pan and scroll-to-zoom on any panel.
- **5 named looks** — Vice Heat, Neon Nights, Golden Hour, Noir Drive and
  Pastel Vice: one-click presets that set layout, grade, words and
  furniture together.
- **Typography controls** — title and subtitle text, title size, letter
  spacing, and three subtitle styles (script, caps, condensed).
- **Poster furniture** — synthwave sun disc, palm silhouettes, five-star
  badge, Leonida banner, skyline, halftone dots, M rating box, barcode with
  $6.99 price, and a vignette. Each toggles on and off.
- **Fast workflow** — seeded Surprise Me, full undo/redo, keyboard
  shortcuts (1–0 layouts, G grade, S surprise, E export, Ctrl+Z / Ctrl+Y,
  arrow keys nudge the active panel), and one-click PNG export in four post
  sizes: 1080×1080, 1080×1350, 1920×1080 and 1080×1920 (story).
- **Fully offline** — every font, sample photo and script is a file in
  `app/`. Photos you load never leave your machine. No network request is
  made while the app runs.

## Run it

Requires Node.js 22 or later.

```sh
npm start
```

Then open <http://localhost:8080> in a desktop browser. Pick a sample photo
(or load your own), choose a layout and grade, type your title, and export.

To build the submission dossier locally:

```sh
npm run dossier
```

That writes the app, screenshots and `dossier.json` to `out/` (or to
`$MAKEFUN_OUTPUT_DIR` when set).

## Screenshots

`shots.json` lists the four fixed scenes used for `screenshots/`:
a square cover, the editor, and two more covers in different layouts and
grades. Re-render them with the headless browser of your choice against
`node serve.ts`.

## Fonts and photos

- Anton and Pacifico are SIL Open Font License 1.1 fonts, subset to the
  Latin ranges the app uses; their licences live in `app/fonts/`.
- The four sample photos in `app/samples/` were made for this entry with an
  image model and are free to use.

## License

MIT — see [LICENSE](LICENSE).
