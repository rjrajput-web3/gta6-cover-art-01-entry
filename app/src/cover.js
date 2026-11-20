// VICE HEAT — Leonida Golden-Hour Cover Studio
// Cover engine: draws a GTA VI poster-style cover on a 2D canvas from any
// photos, a layout, a grade and caption text. Pure canvas, no network, and
// fully deterministic: the grain uses a fixed-seed PRNG, so the same state
// always renders the same pixels.

export const SAMPLE_PHOTOS = [
  'samples/boardwalk.jpg',
  'samples/golden-mile.jpg',
  'samples/palm-dusk.jpg',
  'samples/rooftop.jpg',
];

export const LAYOUTS = [
  { id: 'hero', name: 'Full Bleed', blurb: 'One photo, edge to edge, title band over it.' },
  { id: 'hero3', name: 'Hero + Three', blurb: 'A big hero panel with three strips below.' },
  { id: 'grid4', name: 'Four Panel', blurb: 'Classic two-by-two poster grid.' },
  { id: 'grid9', name: 'Nine Panel', blurb: 'Three-by-three mosaic, title band on top.' },
  { id: 'tilt', name: 'Tilted Snaps', blurb: 'Polaroid-style tilted snapshots on a backdrop.' },
  { id: 'split', name: 'Split Diptych', blurb: 'Two tall halves, title riding the seam.' },
];

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', sky: ['#ff9a3d', '#ff2e88'], tint: '#ff7a18', wash: 0.16 },
  { id: 'neon', name: 'Neon Night', sky: ['#2b0a4d', '#ff2e88'], tint: '#c400ff', wash: 0.20 },
  { id: 'golden', name: 'Golden Hour', sky: ['#ffd76a', '#ff5e3a'], tint: '#ffb347', wash: 0.18 },
  { id: 'teal', name: 'Teal Noir', sky: ['#062a33', '#0fb5a6'], tint: '#0fb5a6', wash: 0.18 },
  { id: 'palm', name: 'Palm Fade', sky: ['#7fe0c3', '#ff8fb1'], tint: '#ff8fb1', wash: 0.14 },
  { id: 'mono', name: 'Mono Heat', sky: ['#3a3a3a', '#111111'], tint: '#ffffff', wash: 0.10 },
];

export const SIZES = [
  { id: 'square', name: 'Square Post', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait Post', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide Banner', w: 1920, h: 1080 },
  { id: 'story', name: 'Story', w: 1080, h: 1920 },
];

export function defaultState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    title: 'VICE HEAT',
    subtitle: 'welcome to leonida',
    badge: 'LEONIDA',
    heat: 5,
    size: 'square',
    photos: SAMPLE_PHOTOS.map((src) => ({ src, zoom: 1, ox: 0.5, oy: 0.5 })),
  };
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) || SIZES[0];
}

// Fixed-seed PRNG so grain is identical on every render.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function panelRects(layout, w, h) {
  const g = Math.max(6, Math.round(w * 0.008)); // gutter
  const titleH = Math.round(h * 0.20);
  const bodyH = h - titleH;
  switch (layout) {
    case 'hero':
      return [{ x: 0, y: 0, w, h: bodyH, rot: 0 }];
    case 'hero3': {
      const top = Math.round(bodyH * 0.62);
      const bw = (w - g * 4) / 3;
      return [
        { x: 0, y: 0, w, h: top, rot: 0 },
        { x: g, y: top + g, w: bw, h: bodyH - top - g, rot: 0 },
        { x: g * 2 + bw, y: top + g, w: bw, h: bodyH - top - g, rot: 0 },
        { x: g * 3 + bw * 2, y: top + g, w: bw, h: bodyH - top - g, rot: 0 },
      ];
    }
    case 'grid4': {
      const cw = (w - g * 3) / 2, ch = (bodyH - g * 3) / 2;
      return [
        { x: g, y: g, w: cw, h: ch, rot: 0 },
        { x: g * 2 + cw, y: g, w: cw, h: ch, rot: 0 },
        { x: g, y: g * 2 + ch, w: cw, h: ch, rot: 0 },
        { x: g * 2 + cw, y: g * 2 + ch, w: cw, h: ch, rot: 0 },
      ];
    }
    case 'grid9': {
      const cw = (w - g * 4) / 3, ch = (bodyH - g * 4) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({ x: g + c * (cw + g), y: g + r * (ch + g), w: cw, h: ch, rot: 0 });
        }
      }
      return out;
    }
    case 'tilt': {
      const bw = w * 0.30, bh = bodyH * 0.62;
      return [
        { x: 0, y: 0, w, h: bodyH, rot: 0, backdrop: true },
        { x: w * 0.06, y: bodyH * 0.16, w: bw, h: bh, rot: -0.07 },
        { x: w * 0.36, y: bodyH * 0.10, w: bw, h: bh, rot: 0.05 },
        { x: w * 0.66, y: bodyH * 0.16, w: bw, h: bh, rot: -0.04 },
      ];
    }
    case 'split': {
      const cw = (w - g * 3) / 2;
      return [
        { x: g, y: g, w: cw, h: bodyH - g * 2, rot: 0 },
        { x: g * 2 + cw, y: g, w: cw, h: bodyH - g * 2, rot: 0 },
      ];
    }
    default:
      return [{ x: 0, y: 0, w, h: bodyH, rot: 0 }];
  }
}

function drawPhotoCover(ctx, img, rect, photo) {
  const { x, y, w, h } = rect;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * (photo?.zoom || 1);
  const dw = iw * scale, dh = ih * scale;
  const ox = (photo?.ox ?? 0.5), oy = (photo?.oy ?? 0.5);
  const dx = x + (w - dw) * ox;
  const dy = y + (h - dh) * oy;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function applyGrade(ctx, w, h, grade) {
  // Sunset sky wash over the top, warm tint overall, then a soft vignette.
  const sky = ctx.createLinearGradient(0, 0, w * 0.35, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(1, grade.sky[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = grade.wash;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function halftoneBand(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  const step = Math.max(10, Math.round(w * 0.014));
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    const row = Math.round((yy - y) / step);
    for (let xx = x + step / 2 + (row % 2 ? step / 2 : 0); xx < x + w; xx += step) {
      const r = step * 0.16 * (1 + ((yy - y) / h) * 0.9);
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function grain(ctx, w, h, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  const n = Math.round((w * h) / 900);
  for (let i = 0; i < n; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < n; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
  ctx.restore();
}

function vignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function drawTitleBlock(ctx, w, h, state, grade) {
  const titleH = Math.round(h * 0.20);
  const y0 = h - titleH;
  // Deep ink band with a neon top rule.
  ctx.fillStyle = '#0b0612';
  ctx.fillRect(0, y0, w, titleH);
  ctx.fillStyle = grade.sky[1];
  ctx.fillRect(0, y0, w, Math.max(4, Math.round(h * 0.004)));
  halftoneBand(ctx, 0, y0 + Math.round(titleH * 0.62), w, Math.round(titleH * 0.38), 'rgba(255,46,136,0.20)');

  // Badge ribbon, top-left of the band.
  const pad = Math.round(w * 0.035);
  const badge = (state.badge || 'LEONIDA').toUpperCase();
  ctx.font = `700 ${Math.round(titleH * 0.20)}px Anton, sans-serif`;
  const bw = ctx.measureText(badge).width + pad * 0.9;
  const bh = Math.round(titleH * 0.26);
  const by = y0 + Math.round(titleH * 0.12);
  ctx.fillStyle = grade.sky[1];
  ctx.beginPath();
  ctx.moveTo(pad, by);
  ctx.lineTo(pad + bw, by);
  ctx.lineTo(pad + bw - bh * 0.5, by + bh);
  ctx.lineTo(pad, by + bh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, pad + pad * 0.45, by + bh / 2 + 1);

  // Heat meter: five stars, filled by state.heat.
  const starR = Math.round(titleH * 0.085);
  const sx = w - pad - starR * 10;
  const sy = by + bh / 2;
  for (let i = 0; i < 5; i++) {
    const cx = sx + i * starR * 2.1;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const ang = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 === 0 ? starR : starR * 0.45;
      const px = cx + Math.cos(ang) * rr;
      const py = sy + Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = i < state.heat ? '#ffd76a' : 'rgba(255,255,255,0.22)';
    ctx.fill();
  }

  // Main title: Anton, sunset gradient fill, dark outline.
  const title = (state.title || 'VICE HEAT').toUpperCase();
  const fs = Math.round(titleH * 0.52);
  ctx.font = `${fs}px Anton, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(fs * 0.02)}px`; } catch { /* older canvas */ }
  const ty = y0 + Math.round(titleH * 0.62);
  const grad = ctx.createLinearGradient(0, ty - fs * 0.75, 0, ty + fs * 0.3);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.45, grade.sky[0]);
  grad.addColorStop(1, grade.sky[1]);
  ctx.lineWidth = Math.max(3, Math.round(fs * 0.06));
  ctx.strokeStyle = '#12041f';
  ctx.lineJoin = 'round';
  ctx.strokeText(title, pad, ty);
  ctx.fillStyle = grad;
  ctx.fillText(title, pad, ty);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }

  // Neon script subtitle in Pacifico.
  const sub = (state.subtitle || '').toLowerCase();
  if (sub) {
    const sfs = Math.round(titleH * 0.21);
    ctx.font = `${sfs}px Pacifico, cursive`;
    ctx.shadowColor = grade.sky[1];
    ctx.shadowBlur = Math.round(sfs * 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, pad + 2, y0 + titleH - Math.round(titleH * 0.10));
    ctx.shadowBlur = 0;
  }
}

function drawPanelFrame(ctx, rect, grade) {
  const { x, y, w, h, rot } = rect;
  ctx.save();
  if (rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -10, w + 20, h + 20);
    ctx.fillStyle = '#0b0612';
    ctx.fillRect(-6, -6, w + 12, h + 12);
    ctx.translate(0, 0);
    ctx.restore();
    return;
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, Math.round(w * 0.004));
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// Draw the cover into ctx at size w x h. images: array of loaded HTMLImageElements
// aligned with state.photos. Deterministic for a fixed state + images.
export function drawCover(ctx, w, h, state, images) {
  const grade = gradeById(state.grade);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b0612';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  const photos = state.photos || [];
  rects.forEach((rect, i) => {
    const img = images[i % Math.max(1, images.length)];
    const photo = photos[i % Math.max(1, photos.length)];
    if (!img) return;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-12, -12, rect.w + 24, rect.h + 24);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, rect.w, rect.h);
      ctx.clip();
      drawPhotoCover(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, photo);
      ctx.restore();
      ctx.restore();
    } else {
      drawPhotoCover(ctx, img, rect, photo);
    }
    ctx.restore();
  });

  applyGrade(ctx, w, h, grade);

  // White keylines between panels.
  rects.forEach((rect) => {
    if (rect.backdrop) return;
    if (rect.rot) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(w * 0.004));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });

  drawTitleBlock(ctx, w, h, state, grade);
  grain(ctx, w, h, 1337);
  vignette(ctx, w, h);
}

// Load an image src; resolves with the element (or null on failure).
export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadPhotos(photos) {
  const out = [];
  for (const p of photos) {
    out.push(await loadImage(p.src));
  }
  return out;
}
