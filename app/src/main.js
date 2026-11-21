// VICE HEAT — wires the editor page: photo slots, layouts, grades, presets,
// typography, furniture, undo/redo, keyboard shortcuts, drag-to-pan, export.
// A `?shot=` query hands control to shots.js instead (fixed scenes).
import { drawCover, renderCover, defaultState, cloneState, applyPreset, LAYOUTS, GRADES, TREATMENTS, PRESETS, FURNITURE_LABELS, SAMPLE_NAMES, panelRectsPx } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const shot = new URLSearchParams(location.search).get('shot');

const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  { id: '1080x1920', label: 'Story 1080 × 1920', w: 1080, h: 1920 },
];

let state = defaultState();
let images = [null, null, null, null]; // HTMLImageElement per slot
let uploads = {}; // slot -> object URL of a user-uploaded photo
let activeSlot = 0;
let history = [];
let historyIndex = -1;
let dragging = null;

function setStatus(text) {
  statusEl.textContent = text;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function loadSlot(slot) {
  const ref = state.slots[slot];
  if (!ref) {
    images[slot] = null;
    return;
  }
  if (ref.kind === 'upload') {
    images[slot] = await loadImage(uploads[slot]);
    return;
  }
  images[slot] = await loadImage(`samples/${ref.name}.jpg`);
}

async function loadAllSlots() {
  await Promise.all([0, 1, 2, 3].map((s) => loadSlot(s).catch(() => { images[s] = null; })));
}

function redraw() {
  drawCover(canvas, state, images);
}

function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(state));
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  updateUndoButtons();
}

function restoreFromHistory(index) {
  state = JSON.parse(history[index]);
  historyIndex = index;
  syncControls();
  loadAllSlots().then(redraw);
  updateUndoButtons();
}

function undo() {
  if (historyIndex > 0) restoreFromHistory(historyIndex - 1);
}

function redo() {
  if (historyIndex < history.length - 1) restoreFromHistory(historyIndex + 1);
}

function updateUndoButtons() {
  document.getElementById('undo').disabled = historyIndex <= 0;
  document.getElementById('redo').disabled = historyIndex >= history.length - 1;
}

function commit(label) {
  pushHistory();
  redraw();
  if (label) setStatus(label);
}

function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('subtitleStyle').value = state.subtitleStyle;
  document.getElementById('titleSize').value = String(state.titleSize);
  document.getElementById('titleSizeOut').textContent = `${Math.round(state.titleSize * 100)}%`;
  document.getElementById('letterSpacing').value = String(state.letterSpacing);
  document.getElementById('letterSpacingOut').textContent = `${Math.round(state.letterSpacing * 1000) / 10}%`;
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
    b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout));
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
    b.setAttribute('aria-pressed', String(b.dataset.grade === state.grade));
  });
  document.querySelectorAll('#presets button').forEach((b) => {
    b.classList.toggle('active', false);
  });
  document.querySelectorAll('#furniture input').forEach((c) => {
    c.checked = Boolean(state.furniture[c.dataset.key]);
  });
  document.querySelectorAll('.photo-slot').forEach((slotEl) => {
    const slot = Number(slotEl.dataset.slot);
    slotEl.classList.toggle('active', slot === activeSlot);
    const ref = state.slots[slot];
    slotEl.querySelector('.slot-name').textContent = ref
      ? ref.kind === 'sample' ? ref.name : 'your photo'
      : 'empty';
    slotEl.querySelector('.slot-treatment').value = state.treatments[slot];
  });
  document.getElementById('seed').value = String(state.seed);
}

function buildControls() {
  const layoutsEl = document.getElementById('layouts');
  LAYOUTS.forEach((layout, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = layout.id;
    b.textContent = `${i + 1} · ${layout.name}`;
    b.title = `Layout ${i + 1}: ${layout.name}`;
    b.addEventListener('click', () => {
      state.layout = layout.id;
      commit(`Layout: ${layout.name}`);
    });
    layoutsEl.appendChild(b);
  });

  const gradesEl = document.getElementById('grades');
  GRADES.forEach((grade) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = grade.id;
    b.title = grade.name;
    b.setAttribute('aria-label', grade.name);
    b.style.background = `linear-gradient(135deg, ${grade.top}, ${grade.bottom})`;
    b.addEventListener('click', () => {
      state.grade = grade.id;
      commit(`Grade: ${grade.name}`);
    });
    gradesEl.appendChild(b);
  });

  const presetsEl = document.getElementById('presets');
  PRESETS.forEach((preset) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.preset = preset.id;
    b.textContent = preset.name;
    b.addEventListener('click', () => {
      state = applyPreset(state, preset.id);
      commit(`Look applied: ${preset.name}`);
      syncControls();
    });
    presetsEl.appendChild(b);
  });

  const furnitureEl = document.getElementById('furniture');
  FURNITURE_LABELS.forEach(([key, label]) => {
    const lab = document.createElement('label');
    lab.className = 'check';
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.dataset.key = key;
    c.checked = true;
    c.addEventListener('change', () => {
      state.furniture[key] = c.checked;
      commit(`${label} ${c.checked ? 'on' : 'off'}`);
    });
    lab.append(c, document.createTextNode(label));
    furnitureEl.appendChild(lab);
  });

  const photosEl = document.getElementById('photos');
  [0, 1, 2, 3].forEach((slot) => {
    const wrap = document.createElement('div');
    wrap.className = 'photo-slot';
    wrap.dataset.slot = String(slot);
    const head = document.createElement('div');
    head.className = 'slot-head';
    const name = document.createElement('span');
    name.className = 'slot-name';
    name.textContent = 'empty';
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'slot-pick';
    pick.textContent = `Panel ${slot + 1}`;
    pick.addEventListener('click', () => {
      activeSlot = slot;
      syncControls();
      setStatus(`Panel ${slot + 1} is active — drag it on the cover to pan, scroll to zoom.`);
    });
    head.append(pick, name);
    const sampleRow = document.createElement('div');
    sampleRow.className = 'slot-samples';
    SAMPLE_NAMES.forEach((sample) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = sample;
      b.addEventListener('click', async () => {
        state.slots[slot] = { kind: 'sample', name: sample };
        activeSlot = slot;
        await loadSlot(slot);
        commit(`Panel ${slot + 1}: ${sample}`);
        syncControls();
      });
      sampleRow.appendChild(b);
    });
    const fileLabel = document.createElement('label');
    fileLabel.className = 'file-btn';
    fileLabel.textContent = 'Upload your photo';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      uploads[slot] = URL.createObjectURL(f);
      state.slots[slot] = { kind: 'upload', id: `upload-${slot}` };
      activeSlot = slot;
      await loadSlot(slot);
      commit(`Panel ${slot + 1}: your photo loaded`);
      syncControls();
    });
    fileLabel.appendChild(file);
    const treat = document.createElement('select');
    treat.className = 'slot-treatment';
    treat.setAttribute('aria-label', `Treatment for panel ${slot + 1}`);
    Object.entries(TREATMENTS).forEach(([id, t]) => {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = t.name;
      treat.appendChild(o);
    });
    treat.addEventListener('change', () => {
      state.treatments[slot] = treat.value;
      commit(`Panel ${slot + 1} treatment: ${TREATMENTS[treat.value].name}`);
    });
    wrap.append(head, sampleRow, fileLabel, treat);
    photosEl.appendChild(wrap);
  });

  const sizeSel = document.getElementById('exportSize');
  EXPORT_SIZES.forEach((s) => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.label;
    sizeSel.appendChild(o);
  });
}

function wireStaticControls() {
  document.getElementById('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    redraw();
  });
  document.getElementById('title').addEventListener('change', () => pushHistory());
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  document.getElementById('subtitle').addEventListener('change', () => pushHistory());
  document.getElementById('subtitleStyle').addEventListener('change', (e) => {
    state.subtitleStyle = e.target.value;
    commit(`Subtitle style: ${e.target.value}`);
  });
  document.getElementById('titleSize').addEventListener('input', (e) => {
    state.titleSize = Number(e.target.value);
    document.getElementById('titleSizeOut').textContent = `${Math.round(state.titleSize * 100)}%`;
    redraw();
  });
  document.getElementById('titleSize').addEventListener('change', () => pushHistory());
  document.getElementById('letterSpacing').addEventListener('input', (e) => {
    state.letterSpacing = Number(e.target.value);
    document.getElementById('letterSpacingOut').textContent = `${Math.round(state.letterSpacing * 1000) / 10}%`;
    redraw();
  });
  document.getElementById('letterSpacing').addEventListener('change', () => pushHistory());
  document.getElementById('seed').addEventListener('change', (e) => {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) {
      state.seed = n;
      commit(`Seed: ${n}`);
    }
  });
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);
  document.getElementById('surprise').addEventListener('click', surprise);
  document.getElementById('export').addEventListener('click', exportPng);
  document.getElementById('reset').addEventListener('click', () => {
    const keepSeed = state.seed;
    state = defaultState();
    state.seed = keepSeed;
    loadAllSlots().then(() => {
      commit('Reset to the Vice Heat look.');
      syncControls();
    });
  });
}

function surprise() {
  const rng = Math.random;
  const layout = LAYOUTS[Math.floor(rng() * LAYOUTS.length)];
  const grade = GRADES[Math.floor(rng() * GRADES.length)];
  const keys = Object.keys(TREATMENTS);
  state.layout = layout.id;
  state.grade = grade.id;
  state.treatments = [0, 1, 2, 3].map(() => keys[Math.floor(rng() * keys.length)]);
  state.seed = Math.floor(rng() * 100000);
  commit(`Surprise: ${layout.name} + ${grade.name} (seed ${state.seed})`);
  syncControls();
}

function exportPng() {
  const size = EXPORT_SIZES.find((s) => s.id === document.getElementById('exportSize').value) ?? EXPORT_SIZES[0];
  const out = renderCover(state, images, size.w, size.h);
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — the canvas was empty.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-heat-${size.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-heat-${size.id}.png (${size.w} × ${size.h}).`);
  }, 'image/png');
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function wireCanvas() {
  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(event);
    const hit = panelRectsPx(state, canvas.width, canvas.height)
      .find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (!hit) return;
    activeSlot = hit.slot;
    const pan = state.pans[activeSlot];
    dragging = { startX: p.x, startY: p.y, panX: pan.x, panY: pan.y };
    canvas.setPointerCapture(event.pointerId);
    syncControls();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const p = canvasPoint(event);
    const pan = state.pans[activeSlot];
    const rects = panelRectsPx(state, canvas.width, canvas.height);
    const rect = rects.find((r) => r.slot === activeSlot);
    if (!rect) return;
    const img = images[activeSlot];
    if (!img) return;
    const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * pan.zoom;
    const overflowX = Math.max(1, (img.naturalWidth * scale - rect.w) / 2);
    const overflowY = Math.max(1, (img.naturalHeight * scale - rect.h) / 2);
    pan.x = Math.min(1, Math.max(0, dragging.panX - (p.x - dragging.startX) / overflowX / 2));
    pan.y = Math.min(1, Math.max(0, dragging.panY - (p.y - dragging.startY) / overflowY / 2));
    redraw();
  });
  const endDrag = () => {
    if (dragging) {
      dragging = null;
      pushHistory();
      setStatus(`Panel ${activeSlot + 1} repositioned.`);
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const p = canvasPoint(event);
    const hit = panelRectsPx(state, canvas.width, canvas.height)
      .find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (!hit) return;
    activeSlot = hit.slot;
    const pan = state.pans[activeSlot];
    pan.zoom = Math.min(3, Math.max(1, pan.zoom * (event.deltaY < 0 ? 1.12 : 0.89)));
    redraw();
    syncControls();
  }, { passive: false });
}

function wireKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, select, textarea')) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'y') {
      event.preventDefault();
      redo();
      return;
    }
    if (key >= '1' && key <= '9') {
      const layout = LAYOUTS[Number(key) - 1];
      if (layout) {
        state.layout = layout.id;
        commit(`Layout: ${layout.name}`);
        syncControls();
      }
      return;
    }
    if (key === '0') {
      state.layout = LAYOUTS[9].id;
      commit(`Layout: ${LAYOUTS[9].name}`);
      syncControls();
      return;
    }
    if (key === 'g') {
      const i = GRADES.findIndex((g) => g.id === state.grade);
      const next = GRADES[(i + 1) % GRADES.length];
      state.grade = next.id;
      commit(`Grade: ${next.name}`);
      syncControls();
      return;
    }
    if (key === 's') {
      surprise();
      return;
    }
    if (key === 'e') {
      exportPng();
      return;
    }
    if (key.startsWith('arrow')) {
      event.preventDefault();
      const pan = state.pans[activeSlot];
      const step = 0.05;
      if (key === 'arrowleft') pan.x = Math.max(0, pan.x - step);
      if (key === 'arrowright') pan.x = Math.min(1, pan.x + step);
      if (key === 'arrowup') pan.y = Math.max(0, pan.y - step);
      if (key === 'arrowdown') pan.y = Math.min(1, pan.y + step);
      redraw();
    }
  });
}

async function boot() {
  buildControls();
  wireStaticControls();
  wireCanvas();
  wireKeyboard();
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      setState(next) {
        state = next;
        syncControls();
      },
      load,
      redraw,
    });
    return;
  }
  await loadAllSlots();
  redraw();
  pushHistory();
  syncControls();
  setStatus('Vice Heat is ready — pick a panel, a layout and a grade, then export.');
}

async function load(sampleName, caption) {
  state.slots[0] = { kind: 'sample', name: sampleName };
  state.title = caption;
  await loadAllSlots();
  syncControls();
}

document.fonts?.ready.then(() => {
  if (!shot) redraw();
});
boot().catch((error) => {
  console.error(error);
  setStatus(`Could not start: ${error.message}`);
});
