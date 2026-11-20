// VICE HEAT - editor wiring.
// Owns the UI state, the preview canvas, upload / pan / zoom, undo-redo and
// the PNG export. The render itself lives in cover.js.

import { LAYOUTS, LAYOUT_LABELS, GRADES, SIZES, SAMPLES, defaultState, drawCover, mulberry32 } from './cover.js';

const $ = (sel) => document.querySelector(sel);
const state = defaultState();
let photo = null; // HTMLImageElement of the loaded photo (sample or upload)
let undoStack = [];
let redoStack = [];
let renderQueued = false;

const preview = $('#preview');
const pctx = preview.getContext('2d');

function snapshot() {
  return JSON.stringify(state);
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function restore(json) {
  const next = JSON.parse(json);
  Object.assign(state, next);
  state.pan = next.pan;
  state.furniture = next.furniture;
  syncControls();
  queueRender();
}

function syncUndoButtons() {
  $('#undoBtn').disabled = undoStack.length === 0;
  $('#redoBtn').disabled = redoStack.length === 0;
}

export function render() {
  const size = SIZES[state.size];
  const box = $('#stage');
  const avail = Math.min(box.clientWidth || 640, 860);
  const scale = avail / size.w;
  preview.width = Math.round(size.w * scale);
  preview.height = Math.round(size.h * scale);
  pctx.save();
  pctx.scale(preview.width / size.w, preview.height / size.h);
  drawCover(pctx, size.w, size.h, photo, state);
  pctx.restore();
  preview.dataset.ready = '1';
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function loadSample(id) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      photo = img;
      state.sample = id;
      queueRender();
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = `samples/${id}.jpg`;
  });
}

function loadUpload(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photo = img;
      state.sample = 'upload';
      state.pan = { x: 0, y: 0 };
      state.zoom = 1;
      queueRender();
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function buildButtons() {
  const layoutBox = $('#layoutBox');
  layoutBox.innerHTML = '';
  for (const id of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = LAYOUT_LABELS[id];
    b.dataset.layout = id;
    b.addEventListener('click', () => {
      pushUndo();
      state.layout = id;
      syncControls();
      queueRender();
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = $('#gradeBox');
  gradeBox.innerHTML = '';
  for (const [id, g] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = g.label;
    b.dataset.grade = id;
    b.addEventListener('click', () => {
      pushUndo();
      state.grade = id;
      syncControls();
      queueRender();
    });
    gradeBox.appendChild(b);
  }
  const sampleBox = $('#sampleBox');
  sampleBox.innerHTML = '';
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.label;
    b.dataset.sample = s.id;
    b.addEventListener('click', async () => {
      pushUndo();
      await loadSample(s.id);
      syncControls();
    });
    sampleBox.appendChild(b);
  }
}

function syncControls() {
  document.querySelectorAll('#layoutBox button').forEach((b) =>
    b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeBox button').forEach((b) =>
    b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('#sampleBox button').forEach((b) =>
    b.classList.toggle('on', b.dataset.sample === state.sample));
  document.querySelectorAll('[data-furniture]').forEach((c) => {
    c.checked = !!state.furniture[c.dataset.furniture];
  });
  $('#captionInput').value = state.caption;
  $('#scriptInput').value = state.script;
  $('#subInput').value = state.sub;
  $('#sizeSelect').value = state.size;
  $('#zoomRange').value = String(state.zoom);
  $('#zoomVal').textContent = `${state.zoom.toFixed(2)}x`;
}

function bindControls() {
  $('#captionInput').addEventListener('input', (e) => { state.caption = e.target.value; queueRender(); });
  $('#captionInput').addEventListener('change', pushUndo);
  $('#scriptInput').addEventListener('input', (e) => { state.script = e.target.value; queueRender(); });
  $('#scriptInput').addEventListener('change', pushUndo);
  $('#subInput').addEventListener('input', (e) => { state.sub = e.target.value; queueRender(); });
  $('#subInput').addEventListener('change', pushUndo);
  $('#sizeSelect').addEventListener('change', (e) => { pushUndo(); state.size = e.target.value; syncControls(); queueRender(); });
  $('#zoomRange').addEventListener('input', (e) => { state.zoom = parseFloat(e.target.value); $('#zoomVal').textContent = `${state.zoom.toFixed(2)}x`; queueRender(); });
  $('#zoomRange').addEventListener('change', pushUndo);
  document.querySelectorAll('[data-furniture]').forEach((c) => {
    c.addEventListener('change', () => { pushUndo(); state.furniture[c.dataset.furniture] = c.checked; queueRender(); });
  });
  $('#uploadInput').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    pushUndo();
    await loadUpload(f);
    syncControls();
  });
  $('#surpriseBtn').addEventListener('click', () => {
    pushUndo();
    const rand = mulberry32(state.seed + 1);
    state.seed += 1;
    state.layout = LAYOUTS[Math.floor(rand() * LAYOUTS.length)];
    const grades = Object.keys(GRADES);
    state.grade = grades[Math.floor(rand() * grades.length)];
    for (const k of Object.keys(state.furniture)) state.furniture[k] = rand() > 0.25;
    state.pan = { x: rand() * 0.6 - 0.3, y: rand() * 0.6 - 0.3 };
    state.zoom = 1 + rand() * 0.7;
    syncControls();
    queueRender();
  });
  $('#undoBtn').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    syncUndoButtons();
  });
  $('#redoBtn').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    syncUndoButtons();
  });
  $('#exportBtn').addEventListener('click', async () => {
    const size = SIZES[state.size];
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    drawCover(off.getContext('2d'), size.w, size.h, photo, state);
    const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-heat-${state.size}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    $('#status').textContent = `Exported PNG ${size.w} x ${size.h} - share it anywhere.`;
  });
  // Drag the preview to pan the photo.
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, pan: { ...state.pan } };
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = preview.getBoundingClientRect();
    state.pan = {
      x: Math.max(-1, Math.min(1, drag.pan.x + (e.clientX - drag.x) / r.width)),
      y: Math.max(-1, Math.min(1, drag.pan.y + (e.clientY - drag.y) / r.height)),
    };
    queueRender();
  });
  preview.addEventListener('pointerup', () => { if (drag) { pushUndo(); drag = null; } });
  window.addEventListener('resize', queueRender);
}

async function init() {
  buildButtons();
  bindControls();
  syncControls();
  syncUndoButtons();
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    // Fonts are local files; if one fails the canvas falls back to sans-serif.
  }
  await loadSample(state.sample);
  render();
  $('#status').textContent = 'Photo loaded. Pick a layout and a grade, then export your PNG.';
}

// Handle for the shot driver and for tests.
window.__viceHeat = { state, render, loadSample, queueRender };

init();
