// Neon Coast Cover Studio — editor.
//
// This file owns everything interactive: loading the bundled photos,
// the state the renderer paints from, panel selection and dragging,
// undo/redo, the Surprise-me presets and PNG export. Painting itself
// lives in cover.js (renderCover); this file never draws poster pixels
// directly, it only hands renderCover the canvas, the loaded images
// and the current state — which is { layout, grade, photos, views,
// caption, subtitle, quote, tags }, photos being library indices (one
// per panel, dealt cyclically) and views the per-panel
// { ox, oy, zoom, flip } framing for that panel.

import { GRADES, LAYOUTS, panelsFor, renderCover } from "./cover.js";
import { publishShotPng, readShotRequest } from "./shots.js";

// Sample order is load-bearing: shot URLs and presets name photos by
// their index in this list.
const SAMPLES = ["boulevard.jpg", "pier.jpg", "friends-neon.jpg", "rooftop.jpg"];
const EXPORTS = [
  { w: 1080, h: 1080 },
  { w: 1080, h: 1350 },
  { w: 1920, h: 1080 },
];

const canvas = document.getElementById("poster");
const ctx = canvas.getContext("2d");
const images = []; // sample Images first, user uploads appended
let armed = null; // library index clicked in the strip, awaiting a panel

// ---- state -------------------------------------------------------

function freshView() {
  return { ox: 0, oy: 0, zoom: 1, flip: false };
}

function panelCount(layoutId) {
  return panelsFor(layoutId, 1, 1).length;
}

// Make photos/views cover exactly `count` panels: keep the existing
// deal where it still fits, fill new panels by cycling the library.
function deal(layoutId, photos, views) {
  const count = panelCount(layoutId);
  const nextPhotos = [];
  const nextViews = [];
  for (let i = 0; i < count; i++) {
    nextPhotos.push(photos && i < photos.length ? photos[i] : i % SAMPLES.length);
    nextViews.push(views && i < views.length ? { ...views[i] } : freshView());
  }
  return { photos: nextPhotos, views: nextViews };
}

const start = deal("classic", null, null);
const state = {
  layout: "classic",
  grade: "sunset",
  caption: "Neon Coast",
  subtitle: "Vice City Nights",
  quote: "Neon nights, no regrets.",
  tags: ["Vice City", "Est. 2026", "Neon Coast"],
  photos: start.photos,
  views: start.views,
};
let selected = 0;

function paint() {
  renderCover(ctx, canvas.width, canvas.height, images, state);
}

// ---- undo / redo ---------------------------------------------------

const past = [];
const future = [];

function snapshot() {
  return JSON.stringify({ state, selected });
}
function applySnapshot(text) {
  const saved = JSON.parse(text);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, saved.state);
  selected = Math.min(saved.selected, state.photos.length - 1);
  syncAll();
  paint();
}
function checkpoint() {
  past.push(snapshot());
  if (past.length > 60) past.shift();
  future.length = 0;
  syncHistory();
}
function syncHistory() {
  document.getElementById("undo-btn").disabled = past.length === 0;
  document.getElementById("redo-btn").disabled = future.length === 0;
}
document.getElementById("undo-btn").addEventListener("click", () => {
  if (!past.length) return;
  future.push(snapshot());
  applySnapshot(past.pop());
  syncHistory();
});
document.getElementById("redo-btn").addEventListener("click", () => {
  if (!future.length) return;
  past.push(snapshot());
  applySnapshot(future.pop());
  syncHistory();
});

// ---- chooser grids (layout + grade) --------------------------------

function fillGrid(id, items, current, pick) {
  const grid = document.getElementById(id);
  grid.textContent = "";
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.name;
    btn.classList.toggle("active", item.id === current);
    btn.addEventListener("click", () => pick(item.id));
    grid.appendChild(btn);
  }
}
function fillChoosers() {
  fillGrid("layout-grid", LAYOUTS, state.layout, (id) => {
    if (id === state.layout) return;
    checkpoint();
    state.layout = id;
    const dealt = deal(id, state.photos, state.views);
    state.photos = dealt.photos;
    state.views = dealt.views;
    selected = Math.min(selected, state.photos.length - 1);
    fillChoosers();
    syncPanelTools();
    paint();
  });
  fillGrid("grade-grid", GRADES, state.grade, (id) => {
    if (id === state.grade) return;
    checkpoint();
    state.grade = id;
    fillChoosers();
    paint();
  });
}

// ---- photo library -------------------------------------------------

function fillStrip() {
  const strip = document.getElementById("photo-strip");
  strip.textContent = "";
  images.forEach((img, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.toggle("active", armed === i);
    const thumb = document.createElement("img");
    thumb.src = img.src;
    thumb.alt = "Photo " + (i + 1);
    btn.appendChild(thumb);
    btn.addEventListener("click", () => {
      if (armed === i) {
        armed = null;
      } else {
        // A panel is always selected, so a photo click deals straight
        // into it; arming only matters for the next canvas click when
        // the user clicks a photo and then a different panel — the
        // deal below already covers the common path, so also arm it.
        checkpoint();
        state.photos[selected] = i;
        state.views[selected] = freshView();
        armed = i;
        paint();
      }
      fillStrip();
    });
    strip.appendChild(btn);
  });
}

document.getElementById("photo-input").addEventListener("change", (ev) => {
  const files = Array.from(ev.target.files || []);
  ev.target.value = "";
  if (!files.length) return;
  checkpoint();
  let left = files.length;
  for (const file of files) {
    const img = new Image();
    img.onload = () => {
      images.push(img);
      left -= 1;
      if (left === 0) { fillStrip(); paint(); }
    };
    img.onerror = () => { left -= 1; };
    img.src = URL.createObjectURL(file);
  }
});

// ---- words -----------------------------------------------------------

function bindWord(id, apply) {
  const el = document.getElementById(id);
  el.addEventListener("input", () => { apply(el.value); paint(); });
  el.addEventListener("change", () => checkpoint());
}
bindWord("caption", (v) => { state.caption = v; });
bindWord("subtitle", (v) => { state.subtitle = v; });
bindWord("quote", (v) => { state.quote = v; });
bindWord("tags", (v) => {
  state.tags = v.split("|").map((t) => t.trim()).filter(Boolean);
});

// ---- panel tools -----------------------------------------------------

function syncPanelTools() {
  document.getElementById("panel-label").textContent = "Panel " + (selected + 1);
  const view = state.views[selected];
  document.getElementById("zoom").value = view ? view.zoom : 1;
}
document.getElementById("zoom").addEventListener("input", (ev) => {
  const view = state.views[selected];
  if (!view) return;
  view.zoom = Number(ev.target.value);
  paint();
});
document.getElementById("zoom").addEventListener("change", () => checkpoint());
document.getElementById("flip-btn").addEventListener("click", () => {
  const view = state.views[selected];
  if (!view) return;
  checkpoint();
  view.flip = !view.flip;
  paint();
});
document.getElementById("center-btn").addEventListener("click", () => {
  const view = state.views[selected];
  if (!view) return;
  checkpoint();
  view.ox = 0;
  view.oy = 0;
  syncPanelTools();
  paint();
});

// ---- canvas: select a panel, drag its photo --------------------------

function pointerFraction(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
}
function panelIndexAt(pt) {
  const rects = panelsFor(state.layout, 1, 1);
  for (let i = rects.length - 1; i >= 0; i--) {
    const p = rects[i];
    if (pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h) return i;
  }
  return -1;
}

let dragFrom = null;
canvas.addEventListener("pointerdown", (ev) => {
  const idx = panelIndexAt(pointerFraction(ev));
  if (idx < 0) return;
  checkpoint();
  if (armed !== null && armed !== state.photos[idx]) {
    state.photos[idx] = armed;
    state.views[idx] = freshView();
  }
  armed = null;
  fillStrip();
  selected = idx;
  syncPanelTools();
  dragFrom = pointerFraction(ev);
  canvas.setPointerCapture(ev.pointerId);
  paint();
});
canvas.addEventListener("pointermove", (ev) => {
  if (!dragFrom) return;
  const pt = pointerFraction(ev);
  const view = state.views[selected];
  if (view) {
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    view.ox = clamp(view.ox + (pt.x - dragFrom.x) * 2);
    view.oy = clamp(view.oy + (pt.y - dragFrom.y) * 2);
  }
  dragFrom = pt;
  paint();
});
canvas.addEventListener("pointerup", () => { dragFrom = null; });
canvas.addEventListener("pointercancel", () => { dragFrom = null; });

// ---- Surprise me -------------------------------------------------------
// Six hand-built presets; picking one is an editor action, so it may
// use Math.random — the paint path itself never does.

const PRESETS = [
  { layout: "slash", grade: "heatwave", caption: "Neon Coast", subtitle: "Vice City Nights", quote: "Neon nights, no regrets.", tags: ["Vice City", "Est. 2026", "Neon Coast"], photos: [1, 2, 3, 0] },
  { layout: "nine", grade: "sunset", caption: "Sunset Strip", subtitle: "Golden Hour", quote: "Chasing the last light.", tags: ["Vice City", "Golden Hour", "Sunset Strip"], photos: [1, 3, 2, 0, 1, 2, 3, 0, 1] },
  { layout: "tilt", grade: "neon", caption: "Palm Royale", subtitle: "Neon Nights", quote: "Two friends. One city.", tags: ["Vice City", "Neon Nights", "Palm Royale"], photos: [2, 1, 3] },
  { layout: "strip", grade: "palmwave", caption: "Rooftop Kings", subtitle: "Skyline Stories", quote: "Above it all.", tags: ["Vice City", "Est. 2026", "Rooftop Kings"], photos: [3, 1, 2, 0, 1] },
  { layout: "classic", grade: "gold", caption: "Ocean Drive", subtitle: "After Dark", quote: "The city pays in gold.", tags: ["Vice City", "Ocean Drive", "Gold Rush"], photos: [0, 1, 2, 3] },
  { layout: "duo", grade: "noir", caption: "Palm Noir", subtitle: "Midnight Confidential", quote: "Some stories stay buried.", tags: ["Vice City", "Palm Noir", "After Midnight"], photos: [3, 0] },
];

document.getElementById("surprise-btn").addEventListener("click", () => {
  checkpoint();
  const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.caption = preset.caption;
  state.subtitle = preset.subtitle;
  state.quote = preset.quote;
  state.tags = [...preset.tags];
  const dealt = deal(preset.layout, preset.photos, null);
  state.photos = dealt.photos;
  state.views = dealt.views;
  selected = 0;
  armed = null;
  syncAll();
  paint();
});

// ---- export ------------------------------------------------------------

function downloadPng(w, h) {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  renderCover(off.getContext("2d"), w, h, images, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "neon-coast-cover-" + w + "x" + h + ".png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }, "image/png");
}
document.querySelectorAll(".export-btn").forEach((btn) => {
  btn.addEventListener("click", () => downloadPng(Number(btn.dataset.w), Number(btn.dataset.h)));
});
document.getElementById("export-all").addEventListener("click", () => {
  EXPORTS.forEach((size, i) => setTimeout(() => downloadPng(size.w, size.h), i * 350));
});

// ---- sync + boot ---------------------------------------------------------

function syncAll() {
  document.getElementById("caption").value = state.caption;
  document.getElementById("subtitle").value = state.subtitle;
  document.getElementById("quote").value = state.quote;
  document.getElementById("tags").value = state.tags.join(" | ");
  fillChoosers();
  fillStrip();
  syncPanelTools();
}

function loadSample(name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "samples/" + name;
  });
}

async function boot() {
  const shot = readShotRequest();
  const loaded = await Promise.all([
    document.fonts.load("400 80px Anton"),
    document.fonts.load("400 40px Pacifico"),
    ...SAMPLES.map(loadSample),
  ]);
  // Indexed assignment keeps the library in SAMPLES order no matter
  // which file finished loading first.
  loaded.slice(2).forEach((img, i) => { if (img) images[i] = img; });

  if (shot) {
    const merged = { ...state, ...shot.state };
    const dealt = deal(merged.layout, shot.state.photos || null, shot.state.views || null);
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, merged, dealt);
    selected = 0;
    if (shot.mode === "cover") {
      document.body.classList.add("shot-cover");
      const size = shot.size || EXPORTS[2];
      canvas.width = size.w;
      canvas.height = size.h;
      paint();
      publishShotPng(canvas);
      return;
    }
  }
  syncAll();
  syncHistory();
  paint();
}

boot();
