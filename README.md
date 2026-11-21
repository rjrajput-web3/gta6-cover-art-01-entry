# VICE HEAT — Leonida Golden-Hour Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rjrajput-web3/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/rjrajput-web3/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Bounty: https://make.fun/bounty/gta6-cover-art-01

A cover-art studio for a fictional sun-drenched crime saga set in Leonida.
Build angled-collage game covers that look like they came off a print run:
white-keyline panels sliced on the diagonal, per-panel duotone grades,
halation glow bleeding off the highlights, real film grain, a gradient
display masthead with a neon script accent, and the full retail furniture
set — rating box, barcode, price burst, pull-quote and platform band.

## What's inside

- **12 collage layouts** — Vice Wedge, Shards, Skyline Split, Diagonal Heat,
  Triptych Tilt, Hero Frame, Crossfire, Boulevard Fan, Night Stack,
  Swamp Cut, Carnival Pop and Golden Hour Mono, all drawn as angled
  polygons with white keyline borders.
- **12 colour grades** — Golden Hour, Neon Noir, Vice Teal, Sunset Bleach,
  Midnight Chrome, Tropical Punch, Swamp Haze, Carnival Glow, Desert
  Mirage, Ultraviolet, Harbor Dusk and Print Poster. Each grade is a
  filter chain plus an S-curve duotone remap toward its own shadow and
  highlight colours.
- **6 per-panel treatments** (Clean, Duotone, Bleach, Noir, Warm Push,
  Cool Push) so neighbouring panels never grade the same way twice.
- **5 title looks** with gradient Anton mastheads, heavy outline and a
  glowing Pacifico script accent.
- **Five brand-new cinematic sample photos**: a neon beach at night, a
  muscle car on a sunset boulevard, a rooftop skyline at dusk, a boardwalk
  carnival and an airboat tearing through a dawn swamp.
- **A real editor**: click a panel chip to select it, drag on the cover to
  pan its photo, scroll to zoom, click the chip again to cycle its photo,
  upload your own photo, undo/redo history, a seeded Surprise Me that
  remixes layout × grade × look × photo order, and grain / halation /
  keyline sliders.
- **Print-ready PNG export** in four sizes, up to 2160 × 2700.
- **Fully offline**: no libraries, no network requests, fonts and photos
  ship inside `app/`.

## Run it

```sh
node serve.ts          # studio on http://localhost:8080
node main.ts           # build the hand-in dossier into /output
```

## Layout of the repo

- `app/index.html` — the studio page
- `app/src/cover.js` — the renderer: layouts, grades, treatments, title, furniture
- `app/src/main.js` — editor wiring, history, drag/zoom, export
- `app/src/shots.js` — reproducible screenshot scenes from the URL query
- `app/samples/` — the five sample photos
- `app/fonts/` — Anton and Pacifico, subset, SIL Open Font License
- `screenshots/` — the four judged renders
- `main.ts` / `serve.ts` — hand-in builder and local dev server

Fonts are licensed under the SIL Open Font License 1.1 (see
`app/fonts/OFL.txt` and `app/fonts/Pacifico-OFL.txt`). Everything else is
MIT — see `LICENSE`.
