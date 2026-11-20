// VICE HEAT - shot driver for screenshots.
// Reads ?shot=cover|editor&photo=<sample>&caption=<text>&layout=<id>&grade=<id>
// and renders that exact scene, then marks the page ready. Cover shots paint
// straight onto the preview canvas at viewport size with a fixed seed, so a
// re-run paints the same pixels.

import { SIZES, defaultState, drawCover } from './cover.js';

const params = new URLSearchParams(location.search);
const mode = params.get('shot') || 'cover';

function stateFromParams() {
  const s = defaultState();
  if (params.get('caption')) s.caption = params.get('caption');
  if (params.get('script')) s.script = params.get('script');
  if (params.get('sub')) s.sub = params.get('sub');
  if (params.get('layout')) s.layout = params.get('layout');
  if (params.get('grade')) s.grade = params.get('grade');
  if (params.get('size') && SIZES[params.get('size')]) s.size = params.get('size');
  s.seed = 7;
  s.pan = { x: 0, y: 0 };
  s.zoom = 1;
  return s;
}

async function loadFonts() {
  try {
    await Promise.all([document.fonts.load('80px Anton'), document.fonts.load('40px Pacifico')]);
    await document.fonts.ready;
  } catch (err) {
    // Fall back to sans-serif if a local font fails to load.
  }
}

function loadPhoto(id) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `samples/${id}.jpg`;
  });
}

async function coverShot() {
  document.body.classList.add('shot-cover');
  const state = stateFromParams();
  const size = SIZES[state.size];
  const canvas = document.querySelector('#preview');
  // Viewport is set to the shot size by the screenshot tool; paint at the
  // export size when the viewport matches it, else at viewport size.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const W = vw === size.w && vh === size.h ? size.w : vw;
  const H = vw === size.w && vh === size.h ? size.h : vh;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  await loadFonts();
  const img = await loadPhoto(params.get('photo') || state.sample);
  drawCover(canvas.getContext('2d'), W, H, img, state);
  canvas.dataset.ready = '1';
  document.documentElement.dataset.ready = '1';
}

async function editorShot() {
  document.body.classList.add('shot-editor');
  const mod = await import('./main.js');
  const vh = window.__viceHeat;
  const state = stateFromParams();
  vh.state.caption = state.caption;
  vh.state.script = state.script;
  vh.state.sub = state.sub;
  vh.state.layout = state.layout;
  vh.state.grade = state.grade;
  vh.state.size = state.size;
  // Keep the visible controls in step with the shot's state.
  document.querySelector('#captionInput').value = state.caption;
  document.querySelector('#scriptInput').value = state.script;
  document.querySelector('#subInput').value = state.sub;
  document.querySelector('#sizeSelect').value = state.size;
  await loadFonts();
  await vh.loadSample(params.get('photo') || state.sample);
  vh.render();
  document.documentElement.dataset.ready = '1';
}

if (mode === 'editor') {
  editorShot();
} else {
  coverShot();
}
