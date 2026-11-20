// VICE HEAT - cover rendering engine.
// Draws a GTA-style multi-panel cover onto a canvas from one photo plus a
// caption. Pure canvas code: no network, no Date, no Math.random in the
// render path, so the same state always paints the same pixels.

export const LAYOUTS = ['hero-split', 'trio', 'quad', 'solo', 'diagonal', 'filmstrip'];
export const LAYOUT_LABELS = {
  'hero-split': 'Hero Split',
  trio: 'Trio Strip',
  quad: 'Quad Grid',
  solo: 'Solo Poster',
  diagonal: 'Diagonal Slash',
  filmstrip: 'Filmstrip',
};

export const GRADES = {
  golden: { label: 'Golden Hour', filter: 'saturate(1.28) contrast(1.08) sepia(0.22) brightness(1.02)', tint: ['#ffb347', '#ff6b35'], blend: 'soft-light', alpha: 0.5 },
  haze: { label: 'Heat Haze', filter: 'saturate(1.12) brightness(1.1) contrast(0.98)', tint: ['#ffd9e8', '#fff3e0'], blend: 'overlay', alpha: 0.35 },
  noir: { label: 'Noir Vice', filter: 'grayscale(1) contrast(1.28) brightness(0.88)', tint: ['#2d1b4e', '#000000'], blend: 'multiply', alpha: 0.3 },
  pastel: { label: 'Pastel Dusk', filter: 'saturate(0.82) brightness(1.14) contrast(0.96)', tint: ['#ffc2d1', '#c5b3ff'], blend: 'overlay', alpha: 0.4 },
  mono: { label: 'Mono Chrome', filter: 'grayscale(1) contrast(1.12) brightness(1.02)', tint: ['#ffffff', '#8a8a8a'], blend: 'overlay', alpha: 0.18 },
  sunset: { label: 'Sunset Fade', filter: 'sepia(0.45) saturate(1.5) hue-rotate(-14deg) contrast(1.05)', tint: ['#ff2e63', '#ff9a3d'], blend: 'soft-light', alpha: 0.55 },
};

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const SAMPLES = [
  { id: 'golden-mile', label: 'Golden Mile' },
  { id: 'palm-dusk', label: 'Palm Dusk' },
  { id: 'boardwalk', label: 'Boardwalk' },
  { id: 'rooftop', label: 'Rooftop Sunset' },
];

export function defaultState() {
  return {
    caption: 'VICE HEAT',
    script: 'welcome to',
    sub: 'LEONIDA',
    layout: 'hero-split',
    grade: 'golden',
    size: 'square',
    sample: 'golden-mile',
    pan: { x: 0, y: 0 },
    zoom: 1,
    seed: 7,
    furniture: { sun: true, palms: true, stars: true, banner: true, barcode: true, halftone: true },
  };
}

// Deterministic PRNG: same seed, same bars, dots and offsets every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Cover-fit draw of img into rect, with pan (-1..1) and zoom (>=1), plus the
// grade's CSS filter and warm tint overlay. Variant shifts the crop window so
// repeated panels of one photo look like different shots.
export function drawPhoto(ctx, img, x, y, w, h, grade, pan, zoom, variant) {
  if (!img || !img.naturalWidth) {
    drawPlaceholder(ctx, x, y, w, h, variant);
    return;
  }
  const g = GRADES[grade] || GRADES.golden;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const sw = w / scale;
  const sh = h / scale;
  const ox = (variant * 0.14 + pan.x * 0.22) % 0.6;
  const oy = (variant * 0.09 + pan.y * 0.22) % 0.6;
  const sx = clamp(((iw - sw) / 2) * (1 + ox), 0, Math.max(0, iw - sw));
  const sy = clamp(((ih - sh) / 2) * (1 + oy), 0, Math.max(0, ih - sh));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = g.filter;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.filter = 'none';
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, g.tint[0]);
  grad.addColorStop(1, g.tint[1]);
  ctx.globalCompositeOperation = g.blend;
  ctx.globalAlpha = g.alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawPlaceholder(ctx, x, y, w, h, variant) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#ff9a3d');
  grad.addColorStop(0.55, '#ff2e63');
  grad.addColorStop(1, '#2d1b4e');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  const cx = x + w * (0.5 + variant * 0.06);
  const cy = y + h * 0.36;
  const r = Math.min(w, h) * 0.16;
  ctx.fillStyle = '#fff3e0';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,243,224,0.92)';
  ctx.font = `700 ${Math.round(h * 0.045)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD YOUR PHOTO', x + w / 2, y + h * 0.68);
  ctx.restore();
}

// Palm silhouette: one curved trunk with five drooping fronds.
export function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -52, 30, -96);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    const a = (-150 + i * 38) * (Math.PI / 180);
    const tx = 30 + Math.cos(a) * 52;
    const ty = -96 + Math.sin(a) * 30 + 12;
    ctx.beginPath();
    ctx.moveTo(30, -96);
    ctx.quadraticCurveTo(30 + Math.cos(a) * 30, -96 + Math.sin(a) * 16 - 8, tx, ty);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(30, -96, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSunDisc(ctx, x, y, r) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.6, '#ffb347');
  grad.addColorStop(1, '#ff6b35');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,243,224,0.85)';
  ctx.lineWidth = Math.max(2, r * 0.06);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 1.18, y + Math.sin(a) * r * 1.18);
    ctx.lineTo(x + Math.cos(a) * r * 1.42, y + Math.sin(a) * r * 1.42);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHalftone(ctx, x, y, w, h, seed) {
  const rand = mulberry32(seed + 99);
  const step = Math.max(10, Math.round(w / 72));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(45,27,78,0.28)';
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      const r = (step * 0.32 * (0.5 + rand() * 0.5) * (yy - y)) / h + step * 0.1;
      ctx.beginPath();
      ctx.arc(xx + step / 2, yy + step / 2, Math.max(0.6, r), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h, seed) {
  const rand = mulberry32(seed + 7);
  ctx.save();
  ctx.fillStyle = '#fff3e0';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = '#1d1033';
  let cx = x;
  while (cx < x + w) {
    const bw = 2 + Math.floor(rand() * 5);
    if (rand() > 0.42) ctx.fillRect(cx, y, bw, h);
    cx += bw + 2 + Math.floor(rand() * 3);
  }
  ctx.restore();
}

function drawStarsBadge(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1d1033';
  ctx.beginPath();
  ctx.roundRect(-s * 2.1, -s * 0.62, s * 4.2, s * 1.24, s * 0.62);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.font = `${Math.round(s)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★★★★★', 0, s * 0.06);
  ctx.restore();
}

function drawBanner(ctx, x, y, w, text, h) {
  ctx.save();
  ctx.fillStyle = '#ff2e63';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - h * 0.5, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3e0';
  ctx.font = `700 ${Math.round(h * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h * 0.54);
  ctx.restore();
}

// Big display title with outline, warm gradient fill and hard offset shadow.
// Shrinks until it fits the available width.
function drawTitle(ctx, text, cx, baselineY, maxW, size) {
  let fs = size;
  ctx.font = `${fs}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxW && fs > 12) {
    fs -= 4;
    ctx.font = `${fs}px Anton, sans-serif`;
  }
  const grad = ctx.createLinearGradient(0, baselineY - fs, 0, baselineY);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.55, '#ffb347');
  grad.addColorStop(1, '#ff6b35');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1d1033';
  ctx.lineWidth = Math.max(3, fs * 0.09);
  ctx.strokeText(text, cx + fs * 0.04, baselineY + fs * 0.04);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, baselineY);
  ctx.lineWidth = Math.max(1.5, fs * 0.03);
  ctx.strokeStyle = 'rgba(255,243,224,0.9)';
  ctx.strokeText(text, cx, baselineY);
  ctx.restore();
  return fs;
}

function panelRects(layout, W, H) {
  const gap = Math.round(Math.min(W, H) * 0.012);
  const t = Math.round(H * 0.16); // top band reserved for the title block in some layouts
  switch (layout) {
    case 'trio':
      return [
        { x: 0, y: 0, w: W / 3 - gap, h: H },
        { x: W / 3 + gap / 2, y: 0, w: W / 3 - gap, h: H },
        { x: (2 * W) / 3 + gap, y: 0, w: W / 3 - gap, h: H },
      ];
    case 'quad':
      return [
        { x: 0, y: 0, w: W / 2 - gap, h: H / 2 - gap },
        { x: W / 2 + gap, y: 0, w: W / 2 - gap, h: H / 2 - gap },
        { x: 0, y: H / 2 + gap, w: W / 2 - gap, h: H / 2 - gap },
        { x: W / 2 + gap, y: H / 2 + gap, w: W / 2 - gap, h: H / 2 - gap },
      ];
    case 'solo':
      return [{ x: 0, y: 0, w: W, h: H }];
    case 'diagonal':
      return [
        { x: 0, y: 0, w: W, h: H, clip: 'tl' },
        { x: 0, y: 0, w: W, h: H, clip: 'br' },
      ];
    case 'filmstrip':
      return [
        { x: 0, y: 0, w: W, h: H * 0.68 },
        { x: 0, y: H * 0.68, w: W, h: H * 0.32, strip: true },
      ];
    case 'hero-split':
    default:
      return [
        { x: 0, y: 0, w: W * 0.62, h: H },
        { x: W * 0.62 + gap, y: 0, w: W * 0.38 - gap, h: H / 2 - gap },
        { x: W * 0.62 + gap, y: H / 2 + gap, w: W * 0.38 - gap, h: H / 2 - gap },
      ];
  }
}

function drawDiagonal(ctx, img, W, H, grade, pan, zoom) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.clip();
  drawPhoto(ctx, img, 0, 0, W, H, grade, pan, zoom, 0);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.clip();
  drawPhoto(ctx, img, 0, 0, W, H, grade, pan, zoom, 3);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#fff3e0';
  ctx.lineWidth = Math.max(4, W * 0.008);
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(0, H);
  ctx.stroke();
  ctx.restore();
}

// Main entry: paint the whole cover for the given state.
export function drawCover(ctx, W, H, img, state) {
  const s = state;
  const u = Math.min(W, H) / 1080; // scale unit: artwork is authored at 1080
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1d1033';
  ctx.fillRect(0, 0, W, H);

  const panels = panelRects(s.layout, W, H);
  if (s.layout === 'diagonal') {
    drawDiagonal(ctx, img, W, H, s.grade, s.pan, s.zoom);
  } else if (s.layout === 'filmstrip') {
    drawPhoto(ctx, img, panels[0].x, panels[0].y, panels[0].w, panels[0].h, s.grade, s.pan, s.zoom, 0);
    const band = panels[1];
    const bg = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
    bg.addColorStop(0, '#2d1b4e');
    bg.addColorStop(1, '#1d1033');
    ctx.fillStyle = bg;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    const tw = band.w / 3;
    for (let i = 0; i < 3; i++) {
      const m = 14 * u;
      drawPhoto(ctx, img, band.x + i * tw + m, band.y + m, tw - m * 2, band.h - m * 2, s.grade, s.pan, s.zoom, i + 1);
      ctx.strokeStyle = '#fff3e0';
      ctx.lineWidth = 3 * u;
      ctx.strokeRect(band.x + i * tw + m, band.y + m, tw - m * 2, band.h - m * 2);
    }
  } else {
    panels.forEach((p, i) => {
      drawPhoto(ctx, img, p.x, p.y, p.w, p.h, s.grade, s.pan, s.zoom, i);
      ctx.strokeStyle = 'rgba(255,243,224,0.9)';
      ctx.lineWidth = Math.max(2, 3 * u);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    });
  }

  // Furniture: sun, palms, halftone.
  if (s.furniture.halftone) drawHalftone(ctx, 0, H * 0.78, W, H * 0.22, s.seed);
  if (s.furniture.sun) drawSunDisc(ctx, W * 0.82, H * 0.2, Math.min(W, H) * 0.075);
  if (s.furniture.palms) {
    drawPalm(ctx, W * 0.06, H * 0.98, 1.5 * u, '#1d1033');
    drawPalm(ctx, W * 0.94, H * 0.98, 1.1 * u, '#1d1033');
  }

  // Bottom title band: dark scrim, script accent, big Anton title, sub line.
  const bandH = H * 0.24;
  const bandY = H - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - H * 0.08, 0, H);
  scrim.addColorStop(0, 'rgba(29,16,51,0)');
  scrim.addColorStop(0.45, 'rgba(29,16,51,0.82)');
  scrim.addColorStop(1, 'rgba(29,16,51,0.96)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - H * 0.08, W, bandH + H * 0.08);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb347';
  ctx.font = `${Math.round(34 * u)}px Pacifico, cursive`;
  ctx.fillText(s.script || 'welcome to', W / 2, bandY + 44 * u);
  ctx.restore();
  const titleSize = Math.round(120 * u * (W > H ? 1.25 : 1));
  // Keep long titles clear of the barcode block in the bottom-right corner.
  const titleMaxW = s.furniture.barcode ? W * 0.8 : W * 0.92;
  drawTitle(ctx, (s.caption || 'VICE HEAT').toUpperCase(), W / 2, bandY + bandH * 0.62, titleMaxW, titleSize);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff3e0';
  ctx.font = `700 ${Math.round(30 * u)}px Anton, sans-serif`;
  ctx.fillText(`★  ${s.sub || 'LEONIDA'}  ★`, W / 2, bandY + bandH * 0.88);
  ctx.restore();

  // Corner furniture.
  if (s.furniture.banner) drawBanner(ctx, W * 0.04, H * 0.04, W * 0.3, s.sub || 'LEONIDA', 44 * u);
  if (s.furniture.stars) drawStarsBadge(ctx, W * 0.88, H * 0.07, 26 * u);
  if (s.furniture.barcode) {
    drawBarcode(ctx, W * 0.84, H * 0.9, W * 0.11, H * 0.045, s.seed);
    ctx.save();
    ctx.fillStyle = '#fff3e0';
    ctx.font = `${Math.round(18 * u)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('$6.99  •  LEONIDA', W * 0.895, H * 0.9 + H * 0.045 + 26 * u);
    ctx.restore();
  }
}
