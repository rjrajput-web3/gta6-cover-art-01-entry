// Neon Coast Cover Studio - editor wiring.
//
// Loads the bundled photographs and fonts, keeps the studio state, and
// paints the live preview through cover.js. All editing features live
// here: the photo library, panel dealing, drag-to-position, undo/redo,
// Surprise-me presets and the PNG exports.

import { EXPORT_SIZES, GRADES, LAYOUTS, drawCover, layoutById, panelShapes } from './cover.js';
import { publishShotPng, readShotRequest } from './shots.js';

const SAMPLE_FILES = ['boulevard.jpg', 'pier.jpg', 'friends-neon.jpg', 'rooftop.jpg'];

const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');

// ------------------------------------------------------------- state

function blankPlacement(photo) {
  return { photo, ox: 0, oy: 0, zoom: 1, flip: false };
}

function dealPhotos(layoutId, keep) {
  const count = layoutById(layoutId).panels().length;
  const panels = [];
  for (let i = 0; i < count; i += 1) {
    const old = keep && keep[i];
    panels.push(old ? { ...old } : blankPlacement(i % SAMPLE_FILES.length));
  }
  return panels;
}

const state = {
  layout: 'classic',
  grade: 'sunset',
  caption: 'Neon Coast',
  subtitle: 'Vice City Nights',
  quote: 'Neon nights, no regrets.',
  tags: ['Vice City', 'Est. 2026', 'Neon Coast'],
  panels: dealPhotos('classic', null),
  selected: 0,
};

const library = []; // loaded Image objects, samples first, uploads after
let armedPhoto = null; // library index waiting to be dealt into a panel

// ------------------------------------------------------------- history

const undoStack = [];
const redoStack = [];

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, caption: state.caption,
    subtitle: state.subtitle, quote: state.quote, tags: state.tags,
    panels: state.panels, selected: state.selected,
  });
}

function restore(text) {
  const s = JSON.parse(text);
  Object.assign(state, s);
  syncControls();
  render();
}

function recordHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}

function syncHistoryButtons() {
  document.getElementById('undo-btn').disabled = undoStack.length === 0;
  document.getElementById('redo-btn').disabled = redoStack.length === 0;
}

document.getElementById('undo-btn').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncHistoryButtons();
});
document.getElementById('redo-btn').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncHistoryButtons();
});

// ------------------------------------------------------------- render

function render() {
  drawCover(ctx, canvas.width, canvas.height, state, library);
}

// ------------------------------------------------------------- choosers

function buildChooser(elId, items, current, onPick) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.name;
    if (item.id === current) b.classList.add('active');
    b.addEventListener('click', () => onPick(item.id));
    el.appendChild(b);
  });
}

function buildChoosers() {
  buildChooser('layout-grid', LAYOUTS, state.layout, (id) => {
    if (id === state.layout) return;
    recordHistory();
    state.layout = id;
    state.panels = dealPhotos(id, state.panels);
    state.selected = Math.min(state.selected, state.panels.length - 1);
    buildChoosers();
    syncPanelTools();
    render();
  });
  buildChooser('grade-grid', GRADES, state.grade, (id) => {
    if (id === state.grade) return;
    recordHistory();
    state.grade = id;
    buildChoosers();
    render();
  });
}

// ------------------------------------------------------------- photo library

function buildPhotoStrip() {
  const strip = document.getElementById('photo-strip');
  strip.innerHTML = '';
  library.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    if (armedPhoto === i) b.classList.add('active');
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    b.appendChild(thumb);
    b.addEventListener('click', () => {
      if (armedPhoto === i) {
        armedPhoto = null;
      } else if (state.panels[state.selected]) {
        recordHistory();
        state.panels[state.selected] = blankPlacement(i);
        armedPhoto = null;
        render();
      }
      buildPhotoStrip();
    });
    strip.appendChild(b);
  });
}

document.getElementById('photo-input').addEventListener('change', (ev) => {
  const files = [...ev.target.files];
  if (!files.length) return;
  recordHistory();
  let pending = files.length;
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      library.push(img);
      pending -= 1;
      if (pending === 0) {
        buildPhotoStrip();
        render();
      }
    };
    img.src = url;
  });
  ev.target.value = '';
});

// ------------------------------------------------------------- words

function bindText(id, key, splitTags) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    state[key] = splitTags
      ? el.value.split('|').map((t) => t.trim()).filter(Boolean)
      : el.value;
    render();
  });
  el.addEventListener('change', () => recordHistory());
}

bindText('caption', 'caption', false);
bindText('subtitle', 'subtitle', false);
bindText('quote', 'quote', false);
bindText('tags', 'tags', true);

// ------------------------------------------------------------- panel tools

function syncPanelTools() {
  const place = state.panels[state.selected];
  document.getElementById('panel-label').textContent = `Panel ${state.selected + 1}`;
  document.getElementById('zoom').value = place ? place.zoom : 1;
}

document.getElementById('zoom').addEventListener('input', (ev) => {
  const place = state.panels[state.selected];
  if (!place) return;
  place.zoom = Number(ev.target.value);
  render();
});
document.getElementById('zoom').addEventListener('change', () => recordHistory());
document.getElementById('flip-btn').addEventListener('click', () => {
  const place = state.panels[state.selected];
  if (!place) return;
  recordHistory();
  place.flip = !place.flip;
  render();
});
document.getElementById('center-btn').addEventListener('click', () => {
  const place = state.panels[state.selected];
  if (!place) return;
  recordHistory();
  place.ox = 0;
  place.oy = 0;
  render();
});

// ------------------------------------------------------------- canvas gestures

function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) / r.width,
    y: (ev.clientY - r.top) / r.height,
  };
}

function panelAt(pt) {
  const shapes = panelShapes(state.layout);
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const s = shapes[i];
    if (pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (ev) => {
  const idx = panelAt(canvasPoint(ev));
  if (idx < 0) return;
  if (armedPhoto !== null) {
    recordHistory();
    state.panels[idx] = blankPlacement(armedPhoto);
    armedPhoto = null;
    buildPhotoStrip();
  }
  if (idx !== state.selected) {
    state.selected = idx;
    syncPanelTools();
  }
  recordHistory();
  drag = { last: canvasPoint(ev) };
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const pt = canvasPoint(ev);
  const place = state.panels[state.selected];
  place.ox = Math.max(-1, Math.min(1, place.ox + (pt.x - drag.last.x) * 2));
  place.oy = Math.max(-1, Math.min(1, place.oy + (pt.y - drag.last.y) * 2));
  drag.last = pt;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// ------------------------------------------------------------- surprise presets

const PRESETS = [
  { layout: 'slash', grade: 'heatwave', caption: 'Neon Coast', subtitle: 'Vice City Nights', quote: 'Neon nights, no regrets.', tags: ['Vice City', 'Est. 2026', 'Neon Coast'] },
  { layout: 'nine', grade: 'sunset', caption: 'Sunset Strip', subtitle: 'Golden Hour', quote: 'Chasing the last light.', tags: ['Vice City', 'Golden Hour', 'Sunset Strip'] },
  { layout: 'tilt', grade: 'neon', caption: 'Palm Royale', subtitle: 'Neon Nights', quote: 'Two friends. One city.', tags: ['Vice City', 'Neon Nights', 'Palm Royale'] },
  { layout: 'strip', grade: 'palmwave', caption: 'Rooftop Kings', subtitle: 'Skyline Stories', quote: 'Above it all.', tags: ['Vice City', 'Est. 2026', 'Rooftop Kings'] },
  { layout: 'classic', grade: 'gold', caption: 'Ocean Drive', subtitle: 'After Dark', quote: 'The city pays in gold.', tags: ['Vice City', 'Ocean Drive', 'Gold Rush'] },
  { layout: 'duo', grade: 'noir', caption: 'Palm Noir', subtitle: 'Midnight Confidential', quote: 'Some stories stay buried.', tags: ['Vice City', 'Palm Noir', 'After Midnight'] },
];

document.getElementById('surprise-btn').addEventListener('click', () => {
  recordHistory();
  const pick = PRESETS[Math.floor(Math.random() * PRESETS.length)];
  const deal = [...Array(library.length).keys()];
  for (let i = deal.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deal[i], deal[j]] = [deal[j], deal[i]];
  }
  Object.assign(state, JSON.parse(JSON.stringify(pick)));
  state.panels = layoutById(state.layout).panels()
    .map((_, i) => blankPlacement(deal[i % deal.length]));
  state.selected = 0;
  syncControls();
  render();
});

// ------------------------------------------------------------- export

function exportPng(w, h) {
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCover(out.getContext('2d'), w, h, state, library);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

document.querySelectorAll('.export-btn').forEach((b) => {
  b.addEventListener('click', () => exportPng(Number(b.dataset.w), Number(b.dataset.h)));
});
document.getElementById('export-all').addEventListener('click', () => {
  EXPORT_SIZES.forEach((s, i) => setTimeout(() => exportPng(s.w, s.h), i * 350));
});

// ------------------------------------------------------------- control sync

function syncControls() {
  document.getElementById('caption').value = state.caption;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('quote').value = state.quote;
  document.getElementById('tags').value = state.tags.join(' | ');
  buildChoosers();
  syncPanelTools();
}

// ------------------------------------------------------------- boot

async function boot() {
  const shot = readShotRequest();
  await Promise.all([
    document.fonts.load('400 80px Anton'),
    document.fonts.load('400 40px Pacifico'),
    ...SAMPLE_FILES.map((name) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { library.push(img); resolve(); };
      img.onerror = () => resolve();
      img.src = `samples/${name}`;
    })),
  ]);
  // Samples must sit in SAMPLE_FILES order whatever order they loaded in.
  library.sort((a, b) => SAMPLE_FILES.indexOf(fileNameOf(a)) - SAMPLE_FILES.indexOf(fileNameOf(b)));

  if (shot) {
    Object.assign(state, shot.state);
    if (shot.state.panels) state.panels = shot.state.panels;
    else state.panels = dealPhotos(state.layout, null);
    state.selected = 0;
    if (shot.mode === 'cover') {
      document.body.classList.add('shot-cover');
      const size = shot.size || EXPORT_SIZES[2];
      canvas.width = size.w;
      canvas.height = size.h;
      render();
      publishShotPng(canvas);
      return;
    }
  }
  buildPhotoStrip();
  syncControls();
  syncHistoryButtons();
  render();
}

function fileNameOf(img) {
  return decodeURIComponent(img.src.split('/').pop());
}

boot();
