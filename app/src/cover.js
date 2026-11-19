// Neon Coast Cover Studio — cover renderer, v2.
//
// Draws a multi-panel GTA-style poster cover onto a canvas from a plain
// state object. Everything is deterministic: a fixed-seed grain tile, no
// Date, no Math.random, no network. The same state on the same canvas size
// always paints the same pixels, so an exported PNG is byte-identical when
// rendered twice.
//
// v2 adds: six colour grades, eight layouts (including slanted, tilted and
// nine-panel poster grids), a poster title band with halftone dots, a neon
// script subtitle, a five-star heat pill, a circular seal and tag chips —
// the furniture that makes an exported cover read as finished key art.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['rgba(255, 122, 26, 0.55)', 'rgba(255, 45, 120, 0.45)', 'rgba(88, 28, 135, 0.5)'],
    warm: 'rgba(255, 140, 60, 0.28)',
    cool: 'rgba(120, 40, 160, 0.22)',
    title: ['#fff7e6', '#ffd166', '#ff5e7a'],
  },
  neon: {
    label: 'Neon Nights',
    sky: ['rgba(0, 229, 255, 0.5)', 'rgba(255, 0, 153, 0.42)', 'rgba(20, 10, 60, 0.55)'],
    warm: 'rgba(255, 0, 170, 0.22)',
    cool: 'rgba(0, 220, 255, 0.3)',
    title: ['#eaffff', '#7df9ff', '#ff2e9a'],
  },
  noir: {
    label: 'Palm Noir',
    sky: ['rgba(0, 128, 128, 0.45)', 'rgba(212, 175, 55, 0.35)', 'rgba(6, 20, 24, 0.55)'],
    warm: 'rgba(212, 175, 55, 0.2)',
    cool: 'rgba(0, 90, 100, 0.28)',
    title: ['#fdf6d8', '#f5d76e', '#2ec4b6'],
  },
  heatwave: {
    label: 'Heatwave',
    sky: ['rgba(255, 60, 10, 0.6)', 'rgba(255, 170, 0, 0.45)', 'rgba(120, 10, 40, 0.5)'],
    warm: 'rgba(255, 90, 20, 0.3)',
    cool: 'rgba(160, 20, 60, 0.25)',
    title: ['#fff3d6', '#ffb703', '#fb8500'],
  },
  palmwave: {
    label: 'Palmwave',
    sky: ['rgba(0, 200, 180, 0.5)', 'rgba(255, 214, 90, 0.4)', 'rgba(8, 40, 70, 0.55)'],
    warm: 'rgba(255, 210, 80, 0.24)',
    cool: 'rgba(0, 190, 170, 0.3)',
    title: ['#f0fff4', '#b7f7c9', '#06d6a0'],
  },
  goldrush: {
    label: 'Gold Rush',
    sky: ['rgba(255, 200, 60, 0.55)', 'rgba(200, 90, 20, 0.45)', 'rgba(60, 20, 5, 0.5)'],
    warm: 'rgba(255, 190, 60, 0.3)',
    cool: 'rgba(120, 60, 10, 0.25)',
    title: ['#fffbe6', '#ffe066', '#e07b39'],
  },
};

export const LAYOUTS = {
  poster: { label: 'Poster grid', panels: 4 },
  duo: { label: 'Split duo', panels: 2 },
  hero: { label: 'Single hero', panels: 1 },
  grid: { label: 'Four square', panels: 4 },
  slash: { label: 'Slash trio', panels: 3 },
  nine: { label: 'Nine-panel grid', panels: 9 },
  strip: { label: 'Hero + four', panels: 5 },
  tilt: { label: 'Tilted snapshots', panels: 3 },
};

// Panel rectangles for a layout, in canvas pixels. A panel may carry a
// `poly` (polygon clip, for slanted panels) or a `rot` (radians, for the
// tilted-snapshot layout); plain panels are axis-aligned rectangles.
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
  if (layout === 'nine') {
    const cw = (w - 2 * g) / 3;
    const ch = (h - 2 * g) / 3;
    const out = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out.push({ x: c * (cw + g), y: r * (ch + g), w: cw, h: ch });
      }
    }
    return out;
  }
  if (layout === 'strip') {
    const heroH = Math.round(h * 0.58);
    const rowH = h - heroH - g;
    const cw = (w - 3 * g) / 4;
    const out = [{ x: 0, y: 0, w, h: heroH }];
    for (let i = 0; i < 4; i++) out.push({ x: i * (cw + g), y: heroH + g, w: cw, h: rowH });
    return out;
  }
  if (layout === 'slash') {
    // Three tall panels split by diagonal gutters: each panel is a
    // quadrilateral whose left edge leans right as it goes down.
    const lean = Math.round(w * 0.06);
    const cw = (w - 2 * g) / 3;
    const mk = (i) => {
      const x0 = i * (cw + g);
      return {
        x: x0 - lean, y: 0, w: cw + 2 * lean, h,
        poly: [
          [x0 + lean, 0], [x0 + cw + lean, 0],
          [x0 + cw - lean, h], [x0 - lean, h],
        ],
      };
    };
    return [mk(0), mk(1), mk(2)];
  }
  if (layout === 'tilt') {
    // Three overlapping snapshots, each rotated a few degrees.
    const cw = Math.round(w * 0.36);
    const ch = Math.round(h * 0.78);
    const y = Math.round((h - ch) / 2);
    return [
      { x: Math.round(w * 0.03), y: y + 8, w: cw, h: ch, rot: -0.045 },
      { x: Math.round(w * 0.32), y: y - 6, w: cw, h: ch, rot: 0.02 },
      { x: Math.round(w * 0.61), y: y + 8, w: cw, h: ch, rot: 0.05 },
    ];
  }
  // poster: one wide hero strip over three small panels.
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

function clipRect(ctx, rect) {
  ctx.beginPath();
  if (rect.poly) {
    ctx.moveTo(rect.poly[0][0], rect.poly[0][1]);
    for (let i = 1; i < rect.poly.length; i++) ctx.lineTo(rect.poly[i][0], rect.poly[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.clip();
}

function drawPanel(ctx, rect, panel, fallback) {
  const { x, y, w, h } = rect;
  ctx.save();
  // Local origin: absolute canvas coords, or (0, 0) inside a rotated frame.
  const ox0 = rect.rot ? 0 : x;
  const oy0 = rect.rot ? 0 : y;
  if (rect.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rect.rot);
    ctx.translate(-w / 2, -h / 2);
  }
  clipRect(ctx, { x: ox0, y: oy0, w, h, poly: rect.poly || null });
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
    let cx = ox0 + (w - pw) / 2 + ox * w;
    let cy = oy0 + (h - ph) / 2 + oy * h;
    // Clamp so the photo always covers its panel: dragging or a big offset
    // can never open a gap at a panel edge.
    if (pw >= w) cx = Math.max(ox0 + w - pw, Math.min(ox0, cx));
    if (ph >= h) cy = Math.max(oy0 + h - ph, Math.min(oy0, cy));
    // Poster pop: a fixed saturate/contrast lift, identical every render.
    try { ctx.filter = 'saturate(1.28) contrast(1.1)'; } catch { /* older canvas */ }
    if (panel && panel.flip) {
      ctx.translate(cx + pw / 2, cy + ph / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
    } else {
      ctx.drawImage(img, cx, cy, pw, ph);
    }
    try { ctx.filter = 'none'; } catch { /* older canvas */ }
  } else {
    const grad = ctx.createLinearGradient(ox0, oy0, ox0 + w, oy0 + h);
    grad.addColorStop(0, '#3d1c54');
    grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad;
    ctx.fillRect(ox0, oy0, w, h);
  }
  // A soft bottom shade inside every panel so lettering stays readable.
  const shade = ctx.createLinearGradient(0, oy0 + h * 0.55, 0, oy0 + h);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(ox0, oy0, w, h);
  // A thin white frame edge on tilted snapshots, like printed photos.
  if (rect.rot) {
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
    ctx.strokeStyle = '#fdf6ec';
    ctx.strokeRect(0, 0, w, h);
  }
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
  ctx.globalAlpha = 0.34 + 0.55 * k;
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

// One five-pointed star, centred at (cx, cy) with outer radius r.
function starPath(ctx, cx, cy, r) {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + rad * Math.cos(a);
    const py = cy + rad * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// A row of halftone dots across a band edge: the printed-poster cue.
function halftoneRow(ctx, x0, x1, y, dot, gap, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let x = x0; x <= x1; x += gap) {
    ctx.beginPath();
    ctx.arc(x, y, dot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHeatPill(ctx, w, h, stars) {
  const s = Math.min(w, h);
  const pillH = Math.round(s * 0.042);
  const pad = Math.round(pillH * 0.45);
  const starR = Math.round(pillH * 0.32);
  const label = 'HEAT';
  ctx.save();
  ctx.font = `bold ${Math.round(pillH * 0.52)}px system-ui, sans-serif`;
  const labelW = ctx.measureText(label).width;
  const pillW = Math.round(pad * 2 + labelW + pad + stars * (starR * 2 + 3));
  const x = w - pillW - Math.round(s * 0.03);
  const y = Math.round(s * 0.03);
  ctx.fillStyle = 'rgba(13, 7, 20, 0.88)';
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(2, pillH * 0.06);
  ctx.beginPath();
  ctx.roundRect(x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + pad, y + pillH / 2 + 1);
  let sx = x + pad + labelW + pad + starR;
  for (let i = 0; i < stars; i++) {
    starPath(ctx, sx, y + pillH / 2, starR);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(13, 7, 20, 0.6)';
    ctx.stroke();
    sx += starR * 2 + 3;
  }
  ctx.restore();
}

function arcText(ctx, text, cx, cy, radius, startAngle, endAngle) {
  const step = (endAngle - startAngle) / Math.max(1, text.length - 1);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < text.length; i++) {
    const a = startAngle + step * i;
    ctx.save();
    ctx.translate(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawSeal(ctx, w, h) {
  const s = Math.min(w, h);
  const r = Math.round(s * 0.075);
  const cx = w - r - Math.round(s * 0.035);
  const cy = h - r - Math.round(s * 0.035);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(46, 24, 68, 0.95)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = '#ffd166';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.7)';
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.font = `${Math.round(r * 0.52)}px Anton, 'Arial Narrow', sans-serif`;
  arcText(ctx, 'VICE CITY', cx, cy, r * 0.62, -Math.PI * 0.78, -Math.PI * 0.22);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(r * 0.34)}px Anton, 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VC', cx, cy + r * 0.05);
  ctx.font = `bold ${Math.round(r * 0.2)}px system-ui, sans-serif`;
  ctx.fillText('EST. 2026', cx, cy + r * 0.42);
  ctx.restore();
}

function drawCaption(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const quote = (state.quote || '').trim();
  const tags = (state.tags || []).filter(Boolean);
  const furniture = state.furniture || {};
  if (!title && !subtitle && !quote) return;
  const g = GRADES[state.grade] || GRADES.sunset;
  const scale = Math.min(w, h);
  let size = Math.round(scale * (state.captionSize || 0.11));
  const font = (px) => `${px}px Anton, 'Arial Narrow', sans-serif`;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Measure the title first: the band, quote and tags are laid out from it.
  if (title) {
    ctx.font = font(size);
    try { ctx.letterSpacing = `${Math.round(size * (state.letterSpacing ?? 0.02))}px`; } catch { /* older canvas */ }
    while (ctx.measureText(title).width > w * 0.92 && size > 14) {
      size -= 2;
      ctx.font = font(size);
    }
  }
  const pos = state.captionPos || 'bottom';
  const bandH = furniture.band === false
    ? 0
    : Math.round(size * (subtitle ? 2.35 : 1.75) + (tags.length ? size * 0.62 : 0) + size * 0.5);
  const bandY = pos === 'top' ? 0 : h - bandH;
  if (bandH > 0) {
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    band.addColorStop(0, 'rgba(13, 7, 20, 0.82)');
    band.addColorStop(1, 'rgba(13, 7, 20, 0.94)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, w, bandH);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, bandY, w, Math.max(2, size * 0.045));
    halftoneRow(ctx, w * 0.06, w * 0.94, bandY + bandH - Math.max(3, size * 0.05), Math.max(2, size * 0.028), Math.max(9, size * 0.16), 'rgba(255, 209, 102, 0.5)');
  }
  // Quote line in neon script, just above the band.
  if (quote) {
    const qSize = Math.max(14, Math.round(size * 0.42));
    ctx.font = `${qSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = qSize * 0.2;
    ctx.shadowOffsetY = qSize * 0.06;
    const qy = bandH > 0 ? bandY - qSize * 0.55 : (pos === 'top' ? h * 0.06 + qSize : h - h * 0.055);
    ctx.fillText(quote, w / 2, qy);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (title) {
    const ty = bandH > 0
      ? bandY + size * 1.12
      : (pos === 'top' ? h * 0.06 + size : h - h * 0.055);
    const tx = w / 2;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.14);
    ctx.strokeStyle = 'rgba(10, 4, 18, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
    ctx.font = font(size);
    try { ctx.letterSpacing = `${Math.round(size * (state.letterSpacing ?? 0.02))}px`; } catch { /* older canvas */ }
    ctx.strokeText(title, tx, ty);
    const grad = ctx.createLinearGradient(0, ty - size, 0, ty);
    grad.addColorStop(0, g.title[0]);
    grad.addColorStop(0.55, g.title[1]);
    grad.addColorStop(1, g.title[2]);
    ctx.fillStyle = grad;
    ctx.fillText(title, tx, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (subtitle) {
      const subSize = Math.max(13, Math.round(size * 0.4));
      ctx.font = `${subSize}px Pacifico, cursive`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = subSize * 0.2;
      ctx.shadowOffsetY = subSize * 0.06;
      const sy = bandH > 0 ? ty + subSize * 1.25 : (pos === 'top' ? ty + subSize * 1.5 : ty - size * 1.18);
      ctx.fillText(subtitle, tx, sy);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    if (tags.length && bandH > 0) {
      const tagSize = Math.max(11, Math.round(size * 0.24));
      ctx.font = `bold ${tagSize}px system-ui, sans-serif`;
      try { ctx.letterSpacing = `${Math.round(tagSize * 0.14)}px`; } catch { /* older canvas */ }
      const widths = tags.map((t) => ctx.measureText(t.toUpperCase()).width);
      const gap = Math.round(tagSize * 0.9);
      const padX = Math.round(tagSize * 0.9);
      const padY = Math.round(tagSize * 0.42);
      const total = widths.reduce((a, b) => a + b, 0) + padX * 2 * tags.length + gap * (tags.length - 1);
      let tx0 = (w - total) / 2;
      const tagY = bandY + bandH - padY * 2 - tagSize - Math.max(4, size * 0.06);
      tags.forEach((t, i) => {
        const chipW = widths[i] + padX * 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tx0, tagY, chipW, tagSize + padY * 2, (tagSize + padY * 2) / 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(t.toUpperCase(), tx0 + chipW / 2, tagY + tagSize + padY * 0.4);
        tx0 += chipW + gap;
      });
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
  const furniture = state.furniture || {};
  if (furniture.stars !== false) drawHeatPill(ctx, w, h, state.stars ?? 5);
  if (furniture.seal !== false) drawSeal(ctx, w, h);
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
