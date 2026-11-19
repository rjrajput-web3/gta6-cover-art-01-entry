// Neon Coast Cover Studio — editor wiring, v2.
// Owns the app state, the control panel, dragging a photo inside its panel,
// the four-photo sample library, deterministic Surprise presets, undo/redo
// and the three one-click PNG exports (plus export-all). A `?shot=` query
// hands control to ./shots.js for a fixed screenshot scene instead.
import { drawCover, renderExport, GRADES, LAYOUTS, panelRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);

// One state object drives the preview and every export, so what you see is
// exactly what the PNG holds. `panels` is a pool of nine: a layout uses its
// first N entries, so switching layouts never loses a panel's photo.
function blankPanel() {
  return { img: null, zoom: 1, ox: 0, oy: 0, flip: false, fit: 'cover' };
}

export const state = {
  layout: 'slash',
  grade: 'heatwave',
  intensity: 0.85,
  gutter: 0.012,
  gutterColor: '#0d0714',
  grain: true,
  grainAmount: 0.6,
  vignette: true,
  title: 'Neon Coast',
  subtitle: 'Vice City Nights',
  quote: 'Neon nights, no regrets.',
  tags: ['Vice City', 'Est. 2026', 'Neon Coast'],
  stars: 5,
  furniture: { band: true, stars: true, seal: true },
  captionPos: 'bottom',
  captionSize: 0.11,
  letterSpacing: 0.02,
  panels: Array.from({ length: 9 }, blankPanel),
};

// Six curated looks, cycled in order by Surprise me — deterministic, so the
// same clicks always land on the same cover.
const PRESETS = [
  { layout: 'slash', grade: 'heatwave', title: 'Neon Coast', subtitle: 'Vice City Nights', quote: 'Neon nights, no regrets.' },
  { layout: 'nine', grade: 'sunset', title: 'Sunset Strip', subtitle: 'Golden Hour', quote: 'Chasing the last light.' },
  { layout: 'tilt', grade: 'neon', title: 'Palm Royale', subtitle: 'Neon Nights', quote: 'Two friends. One city.' },
  { layout: 'strip', grade: 'palmwave', title: 'Rooftop Kings', subtitle: 'Skyline Stories', quote: 'Above it all.' },
  { layout: 'poster', grade: 'goldrush', title: 'Boulevard Queen', subtitle: 'Vice City Nights', quote: 'Queen of the boulevard.' },
  { layout: 'grid', grade: 'noir', title: 'Palm Noir', subtitle: 'Golden Hour', quote: 'Shadows wear gold.' },
];
let presetIdx = 0;

let samples = [];
let sampleNames = ['Pier day', 'Boulevard', 'Neon friends', 'Rooftop'];
let activePanel = 0;

// --- undo / redo ---------------------------------------------------------
// Snapshots hold photo indexes (not Image objects), so they round-trip
// through JSON. The stack is capped; every user edit pushes one entry.
const undoStack = [];
const redoStack = [];
function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, intensity: state.intensity,
    gutterColor: state.gutterColor, grain: state.grain, vignette: state.vignette,
    title: state.title, subtitle: state.subtitle, quote: state.quote,
    tags: state.tags, stars: state.stars, furniture: state.furniture,
    captionPos: state.captionPos, captionSize: state.captionSize,
    panels: state.panels.map((p) => ({
      photo: samples.indexOf(p.img), zoom: p.zoom, ox: p.ox, oy: p.oy,
      flip: p.flip, fit: p.fit,
    })),
  });
}
function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, {
    layout: s.layout, grade: s.grade, intensity: s.intensity,
    gutterColor: s.gutterColor, grain: s.grain, vignette: s.vignette,
    title: s.title, subtitle: s.subtitle, quote: s.quote, tags: s.tags,
    stars: s.stars, furniture: s.furniture, captionPos: s.captionPos,
    captionSize: s.captionSize,
  });
  s.panels.forEach((sp, i) => {
    state.panels[i] = {
      img: sp.photo >= 0 ? samples[sp.photo] : null,
      zoom: sp.zoom, ox: sp.ox, oy: sp.oy, flip: sp.flip, fit: sp.fit,
    };
  });
}
function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}
function syncUndoButtons() {
  $('undo').disabled = undoStack.length === 0;
  $('redo').disabled = redoStack.length === 0;
}

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
    loadImage('samples/friends-neon.jpg'),
    loadImage('samples/rooftop.jpg'),
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

function buildLibrary() {
  const lib = $('library');
  lib.innerHTML = '';
  samples.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lib-thumb';
    btn.title = sampleNames[i];
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = sampleNames[i];
    btn.appendChild(thumb);
    const cap = document.createElement('span');
    cap.textContent = sampleNames[i];
    btn.appendChild(cap);
    btn.addEventListener('click', () => {
      pushUndo();
      state.panels[activePanel].img = img;
      setStatus(`${sampleNames[i]} loaded into panel ${activePanel + 1}.`);
      redraw();
    });
    lib.appendChild(btn);
  });
}

function syncPanelControls() {
  const p = state.panels[activePanel] || state.panels[0];
  $('zoom').value = Math.round(p.zoom * 100);
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('fit').value = p.fit;
  $('flip').checked = !!p.flip;
  $('panelNote').textContent = `Editing panel ${activePanel + 1} — drag the photo on the preview to reposition it, or tap a sample below.`;
}

function syncAllControls() {
  $('layout').value = state.layout;
  $('grade').value = state.grade;
  $('intensity').value = Math.round(state.intensity * 100);
  $('intensityVal').textContent = `${Math.round(state.intensity * 100)}%`;
  $('gutterColor').value = state.gutterColor;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('quote').value = state.quote;
  $('tags').value = state.tags.join(', ');
  $('captionPos').value = state.captionPos;
  $('captionSize').value = Math.round(state.captionSize * 100);
  $('captionSizeVal').textContent = `${Math.round(state.captionSize * 100)}%`;
  $('band').checked = state.furniture.band !== false;
  $('starsToggle').checked = state.furniture.stars !== false;
  $('sealToggle').checked = state.furniture.seal !== false;
  buildPanelList();
  syncPanelControls();
}

function wireControls() {
  const layout = $('layout');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${def.label} (${def.panels} panel${def.panels > 1 ? 's' : ''})`;
    layout.appendChild(opt);
  });
  layout.value = state.layout;
  layout.addEventListener('change', () => {
    pushUndo();
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
  grade.addEventListener('change', () => { pushUndo(); state.grade = grade.value; redraw(); });

  $('intensity').addEventListener('input', (e) => {
    state.intensity = Number(e.target.value) / 100;
    $('intensityVal').textContent = `${e.target.value}%`;
    redraw();
  });
  $('intensity').addEventListener('change', pushUndo);
  $('gutterColor').addEventListener('change', (e) => { pushUndo(); state.gutterColor = e.target.value; redraw(); });
  $('grain').addEventListener('change', (e) => { pushUndo(); state.grain = e.target.checked; redraw(); });
  $('vignette').addEventListener('change', (e) => { pushUndo(); state.vignette = e.target.checked; redraw(); });

  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('title').addEventListener('change', pushUndo);
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('subtitle').addEventListener('change', pushUndo);
  $('quote').addEventListener('input', (e) => { state.quote = e.target.value; redraw(); });
  $('quote').addEventListener('change', pushUndo);
  $('tags').addEventListener('input', (e) => {
    state.tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4);
    redraw();
  });
  $('tags').addEventListener('change', pushUndo);
  $('captionPos').addEventListener('change', (e) => { pushUndo(); state.captionPos = e.target.value; redraw(); });
  $('captionSize').addEventListener('input', (e) => {
    state.captionSize = Number(e.target.value) / 100;
    $('captionSizeVal').textContent = `${e.target.value}%`;
    redraw();
  });
  $('captionSize').addEventListener('change', pushUndo);

  $('band').addEventListener('change', (e) => { pushUndo(); state.furniture.band = e.target.checked; redraw(); });
  $('starsToggle').addEventListener('change', (e) => { pushUndo(); state.furniture.stars = e.target.checked; redraw(); });
  $('sealToggle').addEventListener('change', (e) => { pushUndo(); state.furniture.seal = e.target.checked; redraw(); });

  $('zoom').addEventListener('input', (e) => {
    state.panels[activePanel].zoom = Number(e.target.value) / 100;
    $('zoomVal').textContent = `${e.target.value}%`;
    redraw();
  });
  $('zoom').addEventListener('change', pushUndo);
  $('fit').addEventListener('change', (e) => { pushUndo(); state.panels[activePanel].fit = e.target.value; redraw(); });
  $('flip').addEventListener('change', (e) => { pushUndo(); state.panels[activePanel].flip = e.target.checked; redraw(); });

  $('photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pushUndo();
    state.panels[activePanel].img = await loadImage(URL.createObjectURL(file));
    setStatus(`Your photo loaded into panel ${activePanel + 1}.`);
    redraw();
  });
  $('fillAll').addEventListener('click', async () => {
    const file = $('photo').files[0];
    if (!file) { setStatus('Pick a photo first, then Fill all panels.'); return; }
    pushUndo();
    const img = await loadImage(URL.createObjectURL(file));
    state.panels.forEach((p) => { p.img = img; });
    setStatus('One photo now fills every panel.');
    redraw();
  });
  $('useSamples').addEventListener('click', () => {
    pushUndo();
    // Deal the four samples across the panels in order: every panel shows
    // a different photo, like a real multi-panel poster.
    state.panels.forEach((p, i) => { p.img = samples[i % samples.length]; });
    setStatus('Sample photos dealt across the panels — four different shots.');
    redraw();
  });

  $('surprise').addEventListener('click', () => {
    pushUndo();
    const preset = PRESETS[presetIdx % PRESETS.length];
    presetIdx += 1;
    Object.assign(state, {
      layout: preset.layout, grade: preset.grade, title: preset.title,
      subtitle: preset.subtitle, quote: preset.quote,
    });
    activePanel = 0;
    syncAllControls();
    redraw();
    setStatus(`Surprise: ${preset.title} — ${LAYOUTS[preset.layout].label}, ${GRADES[preset.grade].label}.`);
  });

  $('undo').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    syncAllControls();
    syncUndoButtons();
    redraw();
    setStatus('Undone.');
  });
  $('redo').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    syncAllControls();
    syncUndoButtons();
    redraw();
    setStatus('Redone.');
  });

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      const blob = await renderExport(state, samples, w, h);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-cover-${w}x${h}.png`;
      a.click();
      setStatus(`Saved neon-coast-cover-${w}x${h}.png`);
    });
  });
  $('exportAll').addEventListener('click', async () => {
    for (const [w, h] of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
      const blob = await renderExport(state, samples, w, h);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-cover-${w}x${h}.png`;
      a.click();
    }
    setStatus('Saved all three sizes: 1080x1080, 1080x1350, 1920x1080.');
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
    drag = { idx: hit.idx, startX: hit.px, startY: hit.py, ox: p.ox, oy: p.oy, pushed: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.pushed) { pushUndo(); drag.pushed = true; }
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
  await Promise.all([
    document.fonts.load('80px Anton').catch(() => {}),
    document.fonts.load('40px Pacifico').catch(() => {}),
  ]);
  await loadSamples();
  buildLibrary();
  await runShot(shot, params, state, canvas, samples, loadImage, redraw);
  if (shot === 'editor') {
    // runShot changes the layout, so rebuild the panel chips to match it.
    buildPanelList();
    syncPanelControls();
    redraw();
  }
} else {
  wireControls();
  buildPanelList();
  syncPanelControls();
  syncUndoButtons();
  wireDrag();
  await Promise.all([
    document.fonts.load('80px Anton').catch(() => {}),
    document.fonts.load('40px Pacifico').catch(() => {}),
  ]);
  await loadSamples();
  buildLibrary();
  // Default view: deal the four samples across the panels in order.
  state.panels.forEach((p, i) => { p.img = samples[i % samples.length]; });
  redraw();
  setStatus('Ready — pick a photo, choose a layout and grade, then export.');
}
