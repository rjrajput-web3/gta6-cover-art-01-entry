// VICE HEAT studio wiring: state, history, panel editing, export, shots.
import { SAMPLES, LAYOUTS, GRADES, LOOKS, TREATMENTS, DEFAULT_STATE, drawCover, mulberry } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);

let state = structuredClone(DEFAULT_STATE);
let images = [];
let activePanel = 0;
let history = [], hIndex = -1;

async function loadImage(src) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
  return img;
}

export function orderedImages() {
  const order = state.photoOrder || SAMPLES.map((_, i) => i);
  return order.map(i => images[i % images.length]);
}

function render() {
  drawCover(ctx, canvas.width, canvas.height, state, orderedImages());
}

function pushHistory() {
  history = history.slice(0, hIndex + 1);
  history.push(JSON.stringify(state));
  if (history.length > 60) history.shift();
  hIndex = history.length - 1;
}
function restore(json) {
  state = JSON.parse(json);
  syncControls(); render(); buildPanelChips();
}

function fillSelect(el, items, value) {
  el.innerHTML = '';
  items.forEach((it, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = `${i + 1}. ${it.name}`;
    el.appendChild(o);
  });
  el.value = value;
}

function buildPanelChips() {
  const wrap = $('panels'); wrap.innerHTML = '';
  const layout = LAYOUTS[state.layout];
  layout.panels.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === activePanel ? ' active' : '');
    const sample = SAMPLES[(state.photoOrder || SAMPLES.map((_, k) => k))[p.slot % SAMPLES.length] % SAMPLES.length];
    b.textContent = `Panel ${i + 1}: ${sample.label} · ${TREATMENTS[p.treat].name}`;
    b.title = 'Select panel, then drag / scroll on the cover. Click again to cycle its photo.';
    b.addEventListener('click', () => {
      if (activePanel === i) {
        const order = [...(state.photoOrder || SAMPLES.map((_, k) => k))];
        order[p.slot] = (order[p.slot] + 1) % SAMPLES.length;
        state.photoOrder = order; pushHistory(); render(); buildPanelChips();
      } else { activePanel = i; buildPanelChips(); }
    });
    wrap.appendChild(b);
  });
}

function syncControls() {
  fillSelect($('layout'), LAYOUTS, state.layout);
  fillSelect($('grade'), GRADES, state.grade);
  fillSelect($('look'), LOOKS, state.look);
  for (const k of ['titleA', 'titleB', 'script', 'sub', 'quote', 'source']) $(k).value = state[k];
  $('grain').value = state.grain; $('halation').value = state.halation; $('keyline').value = state.keyline;
}

function bind() {
  const on = (id, ev, fn) => $(id).addEventListener(ev, fn);
  on('layout', 'change', e => { state.layout = +e.target.value; activePanel = 0; pushHistory(); render(); buildPanelChips(); });
  on('grade', 'change', e => { state.grade = +e.target.value; pushHistory(); render(); });
  on('look', 'change', e => { state.look = +e.target.value; pushHistory(); render(); });
  for (const k of ['titleA', 'titleB', 'script', 'sub', 'quote', 'source'])
    on(k, 'input', e => { state[k] = e.target.value; render(); });
  for (const k of ['titleA', 'titleB', 'script', 'sub', 'quote', 'source'])
    on(k, 'change', () => pushHistory());
  on('grain', 'input', e => { state.grain = +e.target.value; render(); });
  on('halation', 'input', e => { state.halation = +e.target.value; render(); });
  on('keyline', 'input', e => { state.keyline = +e.target.value; render(); });
  on('grain', 'change', () => pushHistory());
  on('halation', 'change', () => pushHistory());
  on('keyline', 'change', () => pushHistory());

  on('surprise', 'click', () => {
    const rnd = mulberry((state.seed = Math.floor(Math.random() * 1e9)));
    state.layout = Math.floor(rnd() * LAYOUTS.length);
    state.grade = Math.floor(rnd() * GRADES.length);
    state.look = Math.floor(rnd() * LOOKS.length);
    state.grain = 0.3 + rnd() * 0.5; state.halation = 0.3 + rnd() * 0.6;
    const order = SAMPLES.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    state.photoOrder = order; state.offsets = {};
    pushHistory(); syncControls(); render(); buildPanelChips();
    status.textContent = `Surprise: ${LAYOUTS[state.layout].name} × ${GRADES[state.grade].name} × ${LOOKS[state.look].name}`;
  });
  on('undo', 'click', () => { if (hIndex > 0) { hIndex--; restore(history[hIndex]); } });
  on('redo', 'click', () => { if (hIndex < history.length - 1) { hIndex++; restore(history[hIndex]); } });

  on('upload', 'change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    const img = await loadImage(url);
    images.push(img);
    SAMPLES.push({ id: 'custom', label: 'Your photo' });
    const order = [...(state.photoOrder || SAMPLES.map((_, k) => k - 1))];
    order[LAYOUTS[state.layout].panels[activePanel].slot] = images.length - 1;
    state.photoOrder = order;
    pushHistory(); render(); buildPanelChips();
    status.textContent = 'Your photo is in the selected panel.';
  });

  on('export', 'click', () => {
    const scale = parseFloat($('size').value);
    const out = document.createElement('canvas');
    out.width = Math.round(1080 * scale); out.height = Math.round(1350 * scale);
    drawCover(out.getContext('2d'), out.width, out.height, state, orderedImages());
    const a = document.createElement('a');
    a.download = `vice-heat-${out.width}x${out.height}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
    status.textContent = `Exported PNG ${out.width} × ${out.height}.`;
  });

  // Drag to pan / wheel to zoom the active panel's photo
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const key = activePanel;
    const cur = state.offsets[key] || { x: 0, y: 0, zoom: 1 };
    cur.x += (e.clientX - drag.x) / r.width; cur.y += (e.clientY - drag.y) / r.height;
    state.offsets[key] = cur; drag = { x: e.clientX, y: e.clientY };
    render();
  });
  canvas.addEventListener('pointerup', () => { if (drag) { drag = null; pushHistory(); } });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = state.offsets[activePanel] || { x: 0, y: 0, zoom: 1 };
    cur.zoom = Math.min(3, Math.max(0.6, cur.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    state.offsets[activePanel] = cur; render();
  }, { passive: false });
}

async function boot() {
  await Promise.all([
    document.fonts.load('100px Anton'), document.fonts.load('40px Pacifico'),
  ]).catch(() => {});
  images = await Promise.all(SAMPLES.map(s => loadImage(`samples/${s.id}.jpg`)));
  bind(); syncControls(); buildPanelChips(); pushHistory();

  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, async (shotState) => {
      state = shotState; syncControls(); buildPanelChips(); render();
    });
  } else {
    render();
    status.textContent = 'Pick a layout and grade — or hit Surprise Me.';
  }
}
boot();
