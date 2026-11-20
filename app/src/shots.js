// VICE HEAT — fixed screenshot scenes for ?shot= mode.
// ?shot=cover shows the cover alone, full viewport. ?shot=editor shows the
// same cover with a studio banner across the top. `photo` picks the sample
// (samples/<photo>.jpg) and `caption` the title words. The editor in main.js
// stays idle while a shot is set up, so this module owns the whole scene:
// it builds the state, loads the photos, draws the cover at viewport size
// and sets window.__shotReady once it has painted.

import { defaultState, drawCover, loadPhotos } from './cover.js';

// One scene per sample photo, so each screenshot shows a different layout
// and grade: the hero layout in Vice Sunset, the four-panel grid in Neon
// Night, the nine-panel mosaic in Palm Fade and the tilted snaps in
// Golden Hour.
const SCENES = {
  'golden-mile': { layout: 'hero3', grade: 'sunset' },
  rooftop: { layout: 'grid4', grade: 'neon' },
  'palm-dusk': { layout: 'grid9', grade: 'palm' },
  boardwalk: { layout: 'tilt', grade: 'golden' },
};

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

if (shot) {
  runShot().catch((err) => {
    console.error(err);
    document.title = 'VICE HEAT — shot error';
  });
}

async function runShot() {
  const photo = params.get('photo') || 'golden-mile';
  const caption = params.get('caption') || 'Vice Heat';
  const scene = SCENES[photo] || { layout: 'hero3', grade: 'sunset' };

  const state = defaultState();
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.title = caption;
  state.subtitle = shot === 'editor' ? 'drag · zoom · export' : 'welcome to leonida';
  state.badge = 'LEONIDA';
  state.heat = 5;

  // Lead with the chosen photo, keep the rest in their usual order.
  const lead = `samples/${photo}.jpg`;
  state.photos = [
    { src: lead, zoom: 1, ox: 0.5, oy: 0.5 },
    ...state.photos.filter((p) => p.src !== lead),
  ];

  document.body.classList.add(shot === 'editor' ? 'shot-editor' : 'shot-cover');

  if (shot === 'editor') {
    const banner = document.createElement('div');
    banner.className = 'shot-banner';
    const name = document.createElement('strong');
    name.textContent = 'VICE HEAT · STUDIO';
    const features = document.createElement('span');
    features.textContent = '6 layouts · 6 grades · drag to crop · export PNG';
    banner.append(name, features);
    document.body.append(banner);
  }

  await document.fonts.ready;
  let images = await loadPhotos(state.photos);
  images = images.map((img, i) => img || images[0]);

  // Draw the cover at exactly the viewport size, so the screenshot frame
  // is the cover with nothing cropped and nothing letterboxed.
  const canvas = document.getElementById('stage');
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, w, h, state, images);

  const status = document.getElementById('status');
  if (status) status.textContent = `${state.grade} · ${state.layout} · ${w}×${h}`;

  // Two frames after painting, so the capture sees the finished cover.
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
  document.documentElement.dataset.shotReady = 'true';
}
