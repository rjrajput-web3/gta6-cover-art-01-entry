// VICE HEAT — studio UI: wires the toolbar, photo tray, caption fields,
// undo/redo and PNG export to the cover engine in cover.js. Runs only when
// the page is NOT in ?shot= mode (shots.js owns that mode).

import {
  LAYOUTS, GRADES, SIZES, SAMPLE_PHOTOS,
  defaultState, gradeById, sizeById, drawCover, loadPhotos,
} from './cover.js';

const params = new URLSearchParams(location.search);
if (params.has('shot')) {
  // Shot mode: shots.js renders the scene; the editor stays idle.
} else {
  boot().catch((err) => {
    console.error(err);
    document.title = 'VICE HEAT — error';
  });
}

async function boot() {
  await document.fonts.ready;
  const state = defaultState();
  const undoStack = [];
  const redoStack = [];
  let images = await loadPhotos(state.photos);
  // Fall back to the first sample if any photo fails to load.
  images = images.map((img, i) => img || images[0]);

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const sizeSel = document.getElementById('size');
  const titleInput = document.getElementById('title');
  const subtitleInput = document.getElementById('subtitle');
  const badgeInput = document.getElementById('badge');
  const heatInput = document.getElementById('heat');
  const heatVal = document.getElementById('heat-val');
  const layoutBar = document.getElementById('layouts');
  const gradeBar = document.getElementById('grades');
  const tray = document.getElementById('tray');
  const status = document.getElementById('status');

  function snapshot() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 40) undoStack.shift();
    redoStack.length = 0;
    syncUndoButtons();
  }

  function restore(json) {
    const next = JSON.parse(json);
    Object.assign(state, next);
    syncControls();
    render();
  }

  function syncUndoButtons() {
    document.getElementById('undo').disabled = undoStack.length === 0;
    document.getElementById('redo').disabled = redoStack.length === 0;
  }

  function render() {
    const size = sizeById(state.size);
    const scale = Math.min(1, 760 / Math.max(size.w, size.h));
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
    ctx.save();
    ctx.scale(scale, scale);
    drawCover(ctx, size.w, size.h, state, images);
    ctx.restore();
    status.textContent = `${gradeById(state.grade).name} · ${LAYOUTS.find((l) => l.id === state.layout).name} · ${size.name} ${size.w}×${size.h}`;
  }

  function syncControls() {
    titleInput.value = state.title;
    subtitleInput.value = state.subtitle;
    badgeInput.value = state.badge;
    heatInput.value = state.heat;
    heatVal.textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
    sizeSel.value = state.size;
    layoutBar.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.layout));
    gradeBar.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.grade));
  }

  // Layout + grade pickers.
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = l.id;
    b.textContent = l.name;
    b.title = l.blurb;
    b.addEventListener('click', () => { snapshot(); state.layout = l.id; syncControls(); render(); });
    layoutBar.appendChild(b);
  }
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = g.id;
    b.textContent = g.name;
    b.style.setProperty('--sw1', g.sky[0]);
    b.style.setProperty('--sw2', g.sky[1]);
    b.classList.add('swatch');
    b.addEventListener('click', () => { snapshot(); state.grade = g.id; syncControls(); render(); });
    gradeBar.appendChild(b);
  }

  // Size picker.
  for (const s of SIZES) {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = `${s.name} — ${s.w}×${s.h}`;
    sizeSel.appendChild(o);
  }
  sizeSel.addEventListener('change', () => { snapshot(); state.size = sizeSel.value; render(); });

  // Caption fields.
  titleInput.addEventListener('input', () => { state.title = titleInput.value; render(); });
  titleInput.addEventListener('change', snapshot);
  subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; render(); });
  subtitleInput.addEventListener('change', snapshot);
  badgeInput.addEventListener('input', () => { state.badge = badgeInput.value; render(); });
  badgeInput.addEventListener('change', snapshot);
  heatInput.addEventListener('input', () => {
    state.heat = Number(heatInput.value);
    heatVal.textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
    render();
  });
  heatInput.addEventListener('change', snapshot);

  // Photo tray: sample photos + uploads, click to shuffle which panel leads.
  function buildTray() {
    tray.innerHTML = '';
    state.photos.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'thumb';
      const img = document.createElement('img');
      img.src = p.src;
      img.alt = `Photo ${i + 1}`;
      d.appendChild(img);
      const label = document.createElement('span');
      label.textContent = `Panel ${i + 1}`;
      d.appendChild(label);
      d.addEventListener('click', () => {
        snapshot();
        const [first, ...rest] = state.photos;
        state.photos = [...rest, first];
        images.push(images.shift());
        render();
      });
      tray.appendChild(d);
    });
  }
  buildTray();

  document.getElementById('upload').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 4);
    if (!files.length) return;
    snapshot();
    for (const f of files) {
      const url = URL.createObjectURL(f);
      state.photos.push({ src: url, zoom: 1, ox: 0.5, oy: 0.5 });
      const img = await loadPhotos([{ src: url }]).then((a) => a[0]);
      if (img) images.push(img);
    }
    state.photos = state.photos.slice(0, 6);
    images = images.slice(0, 6);
    buildTray();
    render();
  });

  // Drag on the canvas pans the photo under the cursor; wheel zooms it.
  let drag = null;
  function panelAt(px, py) {
    const r = canvas.getBoundingClientRect();
    const x = ((px - r.left) / r.width) * sizeById(state.size).w;
    const y = ((py - r.top) / r.height) * sizeById(state.size).h;
    return { x, y };
  }
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const dx = (e.clientX - drag.x) / r.width;
    const dy = (e.clientY - drag.y) / r.height;
    drag = { x: e.clientX, y: e.clientY };
    const p = state.photos[0];
    p.ox = Math.min(1, Math.max(0, p.ox + dx));
    p.oy = Math.min(1, Math.max(0, p.oy + dy));
    render();
  });
  canvas.addEventListener('pointerup', () => { if (drag) { snapshot(); drag = null; } });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.photos[0];
    p.zoom = Math.min(2.5, Math.max(1, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    render();
  }, { passive: false });

  // Undo / redo.
  document.getElementById('undo').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(state));
    restore(undoStack.pop());
    syncUndoButtons();
  });
  document.getElementById('redo').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(state));
    restore(redoStack.pop());
    syncUndoButtons();
  });

  // Export: render at full size and download a PNG.
  async function exportPNG(sizeId) {
    const size = sizeById(sizeId);
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    const octx = off.getContext('2d');
    const saved = state.size;
    state.size = sizeId;
    drawCover(octx, size.w, size.h, state, images);
    state.size = saved;
    const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-heat-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => exportPNG(b.dataset.export));
  });
  document.getElementById('export-all').addEventListener('click', async () => {
    for (const s of ['square', 'portrait', 'wide']) {
      await exportPNG(s);
      await new Promise((r) => setTimeout(r, 250));
    }
  });

  document.getElementById('shuffle').addEventListener('click', () => {
    snapshot();
    const layouts = LAYOUTS.map((l) => l.id);
    const grades = GRADES.map((g) => g.id);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    syncControls();
    render();
  });

  syncControls();
  syncUndoButtons();
  render();
  document.title = 'VICE HEAT — Leonida Golden-Hour Cover Studio';
}
