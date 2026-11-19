// Vice Cover Studio — editor wiring.
// Owns the app state, the control panel, dragging a photo inside its panel,
// and the three one-click PNG exports. A `?shot=` query hands control to
// ./shots.js for a fixed screenshot scene instead.
import { drawCover, renderExport, GRADES, LAYOUTS, panelRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);

// One state object drives the preview and every export, so what you see is
// exactly what the PNG holds.
export const state = {
  layout: 'poster',
  grade: 'sunset',
  intensity: 0.8,
  gutter: 0.012,
  gutterColor: '#0d0714',
  grain: true,
  grainAmount: 0.6,
  vignette: true,
  title: 'Sunset Heist',
  subtitle: 'Vice City Nights',
  captionPos: 'bottom',
  captionSize: 0.11,
  letterSpacing: 0.02,
  panels: [
    { img: null, zoom: 1, ox: 0, oy: 0, flip: false, fit: 'cover' },
    { img: null, zoom: 1.15, ox: 0, oy: 0, flip: false, fit: 'cover' },
    { img: null, zoom: 1, ox: 0, oy: 0, flip: false, fit: 'cover' },
    { img: null, zoom: 1.1, ox: 0, oy: 0, flip: true, fit: 'cover' },
  ],
};

let samples = [];
let activePanel = 0;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples() {
  samples = await Promise.all([
    loadImage('samples/pier.jpg'),
    loadImage('samples/boulevard.jpg'),
  ]);
}

export function redraw() {
  drawCover(canvas, state, samples);
}

function setStatus(text) {
  status.textContent = text;
}

// --- control panel -------------------------------------------------------

function buildPanelList() {
  const list = $('panels');
  list.innerHTML = '';
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-chip' + (i === activePanel ? ' active' : '');
    btn.textContent = `Panel ${i + 1}`;
    btn.addEventListener('click', () => {
      activePanel = i;
      syncPanelControls();
      buildPanelList();
    });
    list.appendChild(btn);
  }
}

function syncPanelControls() {
  const p = state.panels[activePanel] || state.panels[0];
  $('zoom').value = p.zoom;
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('fit').value = p.fit;
  $('flip').checked = !!p.flip;
  $('panelNote').textContent = `Editing panel ${activePanel + 1} — drag the photo on the preview to reposition it.`;
}

function wireControls() {
  const layout = $('layout');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = def.label;
    layout.appendChild(opt);
  });
  layout.value = state.layout;
  layout.addEventListener('change', () => {
    state.layout = layout.value;
    activePanel = 0;
    buildPanelList();
    syncPanelControls();
    redraw();
  });

  const grade = $('grade');
  Object.entries(GRADES).forEach(([key, def]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = def.label;
    grade.appendChild(opt);
  });
  grade.value = state.grade;
  grade.addEventListener('change', () => { state.grade = grade.value; redraw(); });

  $('intensity').addEventListener('input', (e) => {
    state.intensity = Number(e.target.value) / 100;
    $('intensityVal').textContent = `${e.target.value}%`;
    redraw();
  });
  $('gutterColor').addEventListener('change', (e) => { state.gutterColor = e.target.value; redraw(); });
  $('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
  $('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });

  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('captionPos').addEventListener('change', (e) => { state.captionPos = e.target.value; redraw(); });
  $('captionSize').addEventListener('input', (e) => {
    state.captionSize = Number(e.target.value) / 100;
    $('captionSizeVal').textContent = `${e.target.value}%`;
    redraw();
  });

  $('zoom').addEventListener('input', (e) => {
    state.panels[activePanel].zoom = Number(e.target.value) / 100;
    $('zoomVal').textContent = `${e.target.value}%`;
    redraw();
  });
  $('fit').addEventListener('change', (e) => { state.panels[activePanel].fit = e.target.value; redraw(); });
  $('flip').addEventListener('change', (e) => { state.panels[activePanel].flip = e.target.checked; redraw(); });

  $('photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.panels[activePanel].img = await loadImage(URL.createObjectURL(file));
    setStatus(`Photo loaded into panel ${activePanel + 1}.`);
    redraw();
  });
  $('fillAll').addEventListener('click', async () => {
    const file = $('photo').files[0];
    if (!file) { setStatus('Pick a photo first, then Fill all panels.'); return; }
    const img = await loadImage(URL.createObjectURL(file));
    state.panels.forEach((p) => { p.img = img; });
    setStatus('One photo now fills every panel.');
    redraw();
  });
  $('useSamples').addEventListener('click', () => {
    state.panels.forEach((p) => { p.img = null; });
    setStatus('Sample photos loaded — pier and boulevard.');
    redraw();
  });

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      const blob = await renderExport(state, samples, w, h);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${w}x${h}.png`;
      a.click();
      setStatus(`Saved vice-cover-${w}x${h}.png`);
    });
  });
}

// --- drag to reposition ---------------------------------------------------

function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const px = ((clientX - box.left) / box.width) * canvas.width;
  const py = ((clientY - box.top) / box.height) * canvas.height;
  const gutter = Math.round(Math.min(canvas.width, canvas.height) * state.gutter);
  const rects = panelRects(state.layout, canvas.width, canvas.height, gutter);
  const idx = rects.findIndex((r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h);
  return { idx, px, py, rects };
}

function wireDrag() {
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (hit.idx < 0) return;
    activePanel = hit.idx;
    syncPanelControls();
    buildPanelList();
    const p = state.panels[hit.idx];
    drag = { idx: hit.idx, startX: hit.px, startY: hit.py, ox: p.ox, oy: p.oy };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const hit = panelAt(e.clientX, e.clientY);
    const rect = hit.rects[drag.idx];
    const p = state.panels[drag.idx];
    p.ox = drag.ox + (hit.px - drag.startX) / rect.w;
    p.oy = drag.oy + (hit.py - drag.startY) / rect.h;
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
}

// --- boot ------------------------------------------------------------------

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  if (shot === 'editor') {
    wireControls();
    buildPanelList();
    syncPanelControls();
    wireDrag();
  }
  document.fonts.load('16px Anton').catch(() => {});
  await loadSamples();
  await runShot(shot, params, state, canvas, samples, loadImage, redraw);
} else {
  wireControls();
  buildPanelList();
  syncPanelControls();
  wireDrag();
  await loadSamples();
  redraw();
  setStatus('Ready — pick a photo, choose a layout and grade, then export.');
}
