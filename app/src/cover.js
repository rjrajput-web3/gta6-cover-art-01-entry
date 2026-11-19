// Vice Cover Studio — cover renderer.
// Draws a multi-panel GTA-style poster cover onto a canvas from a plain state
// object. Every step is deterministic: fixed-seed grain, no Date, no random,
// no network. The same state on the same canvas size always paints the same
// pixels, so an exported PNG is byte-identical when rendered twice.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['rgba(255, 122, 26, 0.55)', 'rgba(255, 45, 120, 0.45)', 'rgba(88, 28, 135, 0.5)'],
    warm: 'rgba(255, 140, 60, 0.28)',
    cool: 'rgba(120, 40, 160, 0.22)',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['rgba(0, 229, 255, 0.5)', 'rgba(255, 0, 153, 0.42)', 'rgba(20, 10, 60, 0.55)'],
    warm: 'rgba(255, 0, 170, 0.22)',
    cool: 'rgba(0, 220, 255, 0.3)',
  },
  noir: {
    label: 'Palm Noir',
    sky: ['rgba(0, 128, 128, 0.45)', 'rgba(212, 175, 55, 0.35)', 'rgba(6, 20, 24, 0.55)'],
    warm: 'rgba(212, 175, 55, 0.2)',
    cool: 'rgba(0, 90, 100, 0.28)',
  },
};

export const LAYOUTS = {
  poster: { label: 'Poster grid', panels: 4 },
  duo: { label: 'Split duo', panels: 2 },
  hero: { label: 'Single hero', panels: 1 },
  grid: { label: 'Four square', panels: 4 },
};

// Panel rectangles for a layout, in canvas pixels, with a gutter gap between
// panels. Poster: one wide hero strip over three small panels.
export function panelRects(layout, w, h, gutter) {
  const g = gutter;
  if (layout === 'hero') return [{ x: 0, y: 0, w, h }];
  if (layout === 'duo') {
    const half = (w - g) / 2;
    return [
      { x: 0, y: 0, w: half, h },
      { x: half + g, y: 0, w: half, h },
    ];
  }
  if (layout === 'grid') {
    const cw = (w - g) / 2;
    const ch = (h - g) / 2;
    return [
      { x: 0, y: 0, w: cw, h: ch },
      { x: cw + g, y: 0, w: cw, h: ch },
      { x: 0, y: ch + g, w: cw, h: ch },
      { x: cw + g, y: ch + g, w: cw, h: ch },
    ];
  }
  // poster
  const heroH = Math.round(h * 0.54);
  const rowH = h - heroH - g;
  const cw = (w - 2 * g) / 3;
  return [
    { x: 0, y: 0, w, h: heroH },
    { x: 0, y: heroH + g, w: cw, h: rowH },
    { x: cw + g, y: heroH + g, w: cw, h: rowH },
    { x: 2 * (cw + g), y: heroH + g, w: cw, h: rowH },
  ];
}

// A tiny seeded generator so the film grain is identical on every render.
function seededNoise(size, seed) {
  const data = new Uint8ClampedArray(size * size * 4);
  let s = seed >>> 0;
  for (let i = 0; i < size * size; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = 118 + (s % 40);
    const o = i * 4;
    data[o] = v; data[o + 1] = v; data[o + 2] = v; data[o + 3] = 255;
  }
  return data;
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 128;
  const tile = document.createElement('canvas');
  tile.width = size; tile.height = size;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(size, size);
  img.data.set(seededNoise(size, 20261119));
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

function drawPanel(ctx, rect, panel, fallback) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const img = panel && panel.img ? panel.img : fallback;
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const zoom = (panel && panel.zoom) || 1;
    const fit = (panel && panel.fit) || 'cover';
    let scale;
    if (fit === 'contain') scale = Math.min(w / iw, h / ih) * zoom;
    else scale = Math.max(w / iw, h / ih) * zoom;
    const pw = iw * scale;
    const ph = ih * scale;
    const ox = (panel && panel.ox) || 0;
    const oy = (panel && panel.oy) || 0;
    let cx = x + (w - pw) / 2 + ox * w;
    let cy = y + (h - ph) / 2 + oy * h;
    // Clamp so the photo always covers its panel: dragging or a big offset
    // can never open a gap at a panel edge.
    if (pw >= w) cx = Math.max(x + w - pw, Math.min(x, cx));
    if (ph >= h) cy = Math.max(y + h - ph, Math.min(y, cy));
    if (panel && panel.flip) {
      ctx.translate(cx + pw / 2, cy + ph / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
    } else {
      ctx.drawImage(img, cx, cy, pw, ph);
    }
  } else {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#3d1c54');
    grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }
  // A soft bottom shade inside every panel so the caption stays readable.
  const shade = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function applyGrade(ctx, w, h, grade, intensity) {
  const g = GRADES[grade] || GRADES.sunset;
  const k = Math.max(0, Math.min(1, intensity));
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, g.sky[0]);
  sky.addColorStop(0.55, g.sky[1]);
  sky.addColorStop(1, g.sky[2]);
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.55 * k;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = g.warm;
  ctx.fillRect(0, 0, w, h * 0.6);
  ctx.fillStyle = g.cool;
  ctx.fillRect(0, h * 0.4, w, h * 0.6);
  ctx.restore();
}

function applyGrain(ctx, w, h, amount) {
  if (amount <= 0) return;
  const tile = getGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.05 + 0.09 * amount;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function drawCaption(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;
  const pos = state.captionPos || 'bottom';
  const scale = Math.min(w, h);
  let size = Math.round(scale * (state.captionSize || 0.11));
  const font = (px) => `${px}px Anton, 'Arial Narrow', sans-serif`;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    ctx.font = font(size);
    try { ctx.letterSpacing = `${Math.round(size * (state.letterSpacing ?? 0.02))}px`; } catch { /* older canvas */ }
    while (ctx.measureText(title).width > w * 0.92 && size > 14) {
      size -= 2;
      ctx.font = font(size);
    }
    const ty = pos === 'top' ? h * 0.06 + size : h - h * 0.055;
    const tx = w / 2;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.14);
    ctx.strokeStyle = 'rgba(10, 4, 18, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(title, tx, ty);
    const grad = ctx.createLinearGradient(0, ty - size, 0, ty);
    grad.addColorStop(0, '#fff7e6');
    grad.addColorStop(0.55, '#ffd166');
    grad.addColorStop(1, '#ff5e7a');
    ctx.fillStyle = grad;
    ctx.fillText(title, tx, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (subtitle) {
      const subSize = Math.max(12, Math.round(size * 0.32));
      ctx.font = `bold ${subSize}px system-ui, sans-serif`;
      try { ctx.letterSpacing = `${Math.round(subSize * 0.12)}px`; } catch { /* older canvas */ }
      const sy = pos === 'top' ? ty + subSize * 1.5 : ty - size * 1.18;
      ctx.lineWidth = Math.max(2, subSize * 0.18);
      ctx.strokeStyle = 'rgba(10, 4, 18, 0.85)';
      ctx.strokeText(subtitle.toUpperCase(), tx, sy);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(subtitle.toUpperCase(), tx, sy);
    }
  }
  ctx.restore();
}

// Paints the whole cover. `state.panels` holds one entry per layout panel;
// `fallbackImages` is the sample list used when a panel has no photo of its own.
export function drawCover(canvas, state, fallbackImages) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const gutter = Math.round(Math.min(w, h) * (state.gutter ?? 0.012));
  ctx.fillStyle = state.gutterColor || '#0d0714';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout || 'poster', w, h, gutter);
  const fallbacks = fallbackImages || [];
  rects.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || {};
    const fallback = fallbacks[i % Math.max(1, fallbacks.length)] || null;
    drawPanel(ctx, rect, panel, fallback);
  });
  applyGrade(ctx, w, h, state.grade || 'sunset', state.intensity ?? 0.8);
  if (state.vignette !== false) applyVignette(ctx, w, h);
  if (state.grain !== false) applyGrain(ctx, w, h, state.grainAmount ?? 0.6);
  drawCaption(ctx, w, h, state);
}

// Renders a cover at an exact export size and returns a PNG blob.
export function renderExport(state, fallbackImages, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state, fallbackImages);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
