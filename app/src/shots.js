// VICE HEAT — shot scenes: when the page loads with ?shot=cover or
// ?shot=editor it renders one deterministic scene straight onto the stage
// canvas (no user input needed), so headless Chromium can screenshot it.
// Query: ?shot=cover|editor&photo=<sample id>&caption=<title>&w=1080&h=1080
// Sets document.title to SHOT-READY when the frame is drawn, or SHOT-ERROR
// with the reason. Any page error also lands in the title.

import { defaultState, drawCover, loadPhotos } from './cover.js';

window.addEventListener('error', (e) => {
  document.title = `SHOT-ERROR: ${e.message}`;
});

const params = new URLSearchParams(location.search);
if (params.has('shot')) {
  renderShot().catch((err) => {
    document.title = `SHOT-ERROR: ${err.message}`;
  });
}

async function renderShot() {
  document.body.classList.add('shot-mode');
  await document.fonts.ready;
  const shot = params.get('shot') || 'cover';
  const photo = params.get('photo') || 'golden-mile';
  const caption = params.get('caption') || 'Vice Heat';
  const w = Number(params.get('w') || window.innerWidth || 1080);
  const h = Number(params.get('h') || window.innerHeight || 1080);

  const state = defaultState();
  state.title = caption;
  state.subtitle = shot === 'editor' ? 'drag · zoom · export' : 'welcome to leonida';
  state.badge = 'LEONIDA';
  state.heat = 5;
  // Size comes from the viewport (the screenshot window); the query may
  // override it. This keeps the canvas exactly filling the frame.
  if (shot === 'editor') {
    state.layout = 'grid4';
    state.grade = 'neon';
  } else if (photo === 'palm-dusk') {
    state.layout = 'grid9';
    state.grade = 'palm';
  } else if (photo === 'boardwalk') {
    state.layout = 'tilt';
    state.grade = 'golden';
  } else if (photo === 'rooftop') {
    state.layout = 'hero3';
    state.grade = 'teal';
  } else {
    state.layout = 'hero3';
    state.grade = 'sunset';
  }

  // Lead with the requested sample photo, keep the rest as the panel pool.
  const ordered = [
    { src: `samples/${photo}.jpg`, zoom: 1, ox: 0.5, oy: 0.5 },
    ...state.photos.filter((p) => !p.src.includes(photo)),
  ];
  state.photos = ordered;
  const images = await loadPhotos(state.photos);
  const usable = images.filter(Boolean);
  if (!usable.length) throw new Error('no sample photo loaded');

  const canvas = document.getElementById('stage');
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, w, h, state, usable);

  if (shot === 'editor') {
    // Editor chrome: dim the stage edges and stamp the toolbar labels so the
    // screenshot reads as the working studio, not just a cover.
    ctx.save();
    ctx.fillStyle = 'rgba(11,6,18,0.55)';
    ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px Anton, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('VICE HEAT  ·  STUDIO', 18, 24);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#ff8fb1';
    ctx.fillText('6 layouts · 6 grades · drag to crop · export PNG', w - 430, 24);
    ctx.restore();
  }

  document.title = 'SHOT-READY';
}
