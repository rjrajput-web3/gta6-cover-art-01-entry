// VICE HEAT — the cover renderer. Pure canvas drawing, no network, no
// randomness outside the seeded generator: the same state always draws the
// same cover, at any size. A "state" is plain JSON:
//
//   {
//     layout, grade, title, subtitle, subtitleStyle, titleSize,
//     letterSpacing, seed,
//     slots: [ {kind:'sample', name} | {kind:'upload', id} | null ] x4,
//     pans: [ {x, y, zoom} ] x4,          // per photo slot
//     treatments: [ 'warm' | ... ] x4,    // per photo slot
//     furniture: { sun, palms, stars, banner, skyline, halftone,
//                  rating, barcode, vignette }
//   }
//
// drawCover(canvas, state, images) paints it, where images is an array of
// four HTMLImageElement-or-null values lined up with the slots.

export const LAYOUTS = [
  {
    id: 'classic', name: 'Classic Grid',
    panels: [
      { slot: 0, rect: [0, 0, 0.494, 0.38] },
      { slot: 1, rect: [0.506, 0, 0.494, 0.38] },
      { slot: 2, rect: [0, 0.392, 0.494, 0.38] },
      { slot: 3, rect: [0.506, 0.392, 0.494, 0.38] },
    ],
    title: { rect: [0, 0.79, 1, 0.21], align: 'center' },
  },
  {
    id: 'hero-duo', name: 'Hero Duo',
    panels: [
      { slot: 0, rect: [0, 0, 0.61, 0.77] },
      { slot: 1, rect: [0.622, 0, 0.378, 0.379] },
      { slot: 2, rect: [0.622, 0.391, 0.378, 0.379] },
    ],
    title: { rect: [0, 0.79, 1, 0.21], align: 'center' },
  },
  {
    id: 'center-poster', name: 'Center Poster',
    panels: [
      { slot: 0, rect: [0, 0, 0.21, 0.77] },
      { slot: 1, rect: [0.222, 0, 0.556, 0.77] },
      { slot: 2, rect: [0.79, 0, 0.21, 0.77] },
    ],
    title: { rect: [0, 0.79, 1, 0.21], align: 'center' },
  },
  {
    id: 'bottom-heavy', name: 'Bottom Heavy',
    panels: [
      { slot: 0, rect: [0, 0, 0.494, 0.38] },
      { slot: 1, rect: [0.506, 0, 0.494, 0.38] },
      { slot: 2, rect: [0, 0.392, 1, 0.378] },
    ],
    title: { rect: [0, 0.79, 1, 0.21], align: 'center' },
  },
  {
    id: 'magazine', name: 'Magazine Spread',
    panels: [
      { slot: 0, rect: [0, 0.17, 0.4, 0.4] },
      { slot: 1, rect: [0, 0.58, 0.4, 0.4] },
      { slot: 2, rect: [0.412, 0.17, 0.588, 0.81] },
    ],
    title: { rect: [0, 0.015, 1, 0.14], align: 'left' },
  },
  {
    id: 'duotone-split', name: 'Duotone Split',
    panels: [
      { slot: 0, poly: [[0, 0], [1, 0], [0, 1]] },
      { slot: 1, poly: [[1, 0], [1, 1], [0, 1]] },
    ],
    title: { rect: [0, 0.78, 1, 0.22], align: 'center' },
  },
  {
    id: 'triptych', name: 'Triptych',
    panels: [
      { slot: 0, rect: [0, 0, 0.325, 0.77] },
      { slot: 1, rect: [0.337, 0, 0.326, 0.77] },
      { slot: 2, rect: [0.675, 0, 0.325, 0.77] },
    ],
    title: { rect: [0, 0.79, 1, 0.21], align: 'center' },
  },
  {
    id: 'big-sun', name: 'Big Sun',
    panels: [
      { slot: 0, rect: [0, 0, 1, 0.77] },
      { slot: 1, rect: [0.05, 0.55, 0.22, 0.18], inset: true },
    ],
    title: { rect: [0, 0.79, 1, 0.21], align: 'center' },
  },
  {
    id: 'diagonal', name: 'Diagonal Bands',
    panels: [
      { slot: 0, poly: [[0, 0], [1, 0], [0.9, 0.26], [0, 0.26]] },
      { slot: 1, poly: [[0, 0.26], [0.9, 0.26], [0.82, 0.52], [0, 0.52]] },
      { slot: 2, poly: [[0, 0.52], [0.82, 0.52], [0.74, 0.78], [0, 0.78]] },
    ],
    title: { rect: [0, 0.79, 1, 0.21], align: 'center' },
  },
  {
    id: 'frame-story', name: 'Frame Story',
    panels: [
      { slot: 0, rect: [0.07, 0.03, 0.86, 0.225] },
      { slot: 1, rect: [0.07, 0.275, 0.86, 0.225] },
      { slot: 2, rect: [0.07, 0.525, 0.86, 0.225] },
    ],
    title: { rect: [0, 0.78, 1, 0.22], align: 'center' },
  },
];

export const GRADES = [
  { id: 'golden', name: 'Golden Hour', base: '#2b0f2e', top: '#ff9a3d', bottom: '#ff2e88', glow: '#ffd166' },
  { id: 'vice-neon', name: 'Vice Neon', base: '#12082b', top: '#00e5ff', bottom: '#ff2ea6', glow: '#7b2fff' },
  { id: 'sunset-heat', name: 'Sunset Heat', base: '#2a0a12', top: '#ff6b35', bottom: '#c1121f', glow: '#ffb703' },
  { id: 'duotone-pink', name: 'Duotone Pink', base: '#1d0a2e', top: '#ff7ad9', bottom: '#7a2bff', glow: '#ff9de2' },
  { id: 'teal-dusk', name: 'Teal Dusk', base: '#0a1a2e', top: '#2ec4b6', bottom: '#1b3a6b', glow: '#80ed99' },
  { id: 'noir', name: 'Noir', base: '#0d0d0d', top: '#9a9a9a', bottom: '#111111', glow: '#e0e0e0' },
  { id: 'palm-noir', name: 'Palm Noir', base: '#06110c', top: '#2d6a4f', bottom: '#081c15', glow: '#74c69d' },
  { id: 'pastel-pop', name: 'Pastel Pop', base: '#3a2b4d', top: '#ffc8dd', bottom: '#a2d2ff', glow: '#fff3b0' },
  { id: 'mono-gold', name: 'Mono Gold', base: '#1a1a1a', top: '#d9d9d9', bottom: '#8a6d2f', glow: '#ffd700' },
];

export const TREATMENTS = {
  warm: { name: 'Warm', filter: 'sepia(0.35) saturate(1.35) contrast(1.05) brightness(1.02)' },
  cool: { name: 'Cool', filter: 'hue-rotate(-12deg) saturate(1.15) brightness(1.06) contrast(1.02)' },
  mono: { name: 'Mono', filter: 'grayscale(1) contrast(1.12) brightness(1.02)' },
  punch: { name: 'Punch', filter: 'saturate(1.65) contrast(1.28) brightness(1.03)' },
  pastel: { name: 'Pastel', filter: 'saturate(0.65) brightness(1.18) contrast(0.88)' },
  noir: { name: 'Noir', filter: 'grayscale(1) contrast(1.45) brightness(0.88)' },
};

export const PRESETS = [
  {
    id: 'vice-heat', name: 'Vice Heat', layout: 'classic', grade: 'golden',
    title: 'VICE HEAT', subtitle: 'Leonida Nights', subtitleStyle: 'script',
    treatments: ['warm', 'warm', 'warm', 'warm'],
    furniture: { sun: true, palms: true, stars: true, banner: true, skyline: true, halftone: true, rating: true, barcode: true, vignette: true },
  },
  {
    id: 'neon-nights', name: 'Neon Nights', layout: 'duotone-split', grade: 'vice-neon',
    title: 'NEON NIGHTS', subtitle: 'Vice City', subtitleStyle: 'caps',
    treatments: ['cool', 'punch', 'cool', 'punch'],
    furniture: { sun: true, palms: false, stars: true, banner: true, skyline: false, halftone: true, rating: false, barcode: true, vignette: true },
  },
  {
    id: 'golden-hour', name: 'Golden Hour', layout: 'big-sun', grade: 'golden',
    title: 'GOLDEN HOUR', subtitle: 'Leonida', subtitleStyle: 'script',
    treatments: ['warm', 'warm', 'warm', 'warm'],
    furniture: { sun: true, palms: true, stars: false, banner: false, skyline: true, halftone: true, rating: false, barcode: false, vignette: true },
  },
  {
    id: 'noir-drive', name: 'Noir Drive', layout: 'magazine', grade: 'noir',
    title: 'NOIR DRIVE', subtitle: 'Midnight in Leonida', subtitleStyle: 'condensed',
    treatments: ['noir', 'mono', 'noir', 'mono'],
    furniture: { sun: false, palms: false, stars: false, banner: true, skyline: true, halftone: false, rating: true, barcode: true, vignette: true },
  },
  {
    id: 'pastel-vice', name: 'Pastel Vice', layout: 'triptych', grade: 'pastel-pop',
    title: 'PASTEL VICE', subtitle: 'Vice City Days', subtitleStyle: 'script',
    treatments: ['pastel', 'pastel', 'pastel', 'pastel'],
    furniture: { sun: false, palms: true, stars: true, banner: true, skyline: false, halftone: true, rating: false, barcode: false, vignette: false },
  },
];

export const FURNITURE_LABELS = [
  ['sun', 'Sun disc'], ['palms', 'Palms'], ['stars', 'Five-star badge'],
  ['banner', 'Leonida banner'], ['skyline', 'Skyline'], ['halftone', 'Halftone'],
  ['rating', 'M rating box'], ['barcode', 'Barcode + price'], ['vignette', 'Vignette'],
];

export const SAMPLE_NAMES = ['rooftop', 'golden-mile', 'palm-dusk', 'boardwalk'];

export function defaultState() {
  return {
    layout: 'classic',
    grade: 'golden',
    title: 'VICE HEAT',
    subtitle: 'Leonida Nights',
    subtitleStyle: 'script',
    titleSize: 1,
    letterSpacing: 0.08,
    seed: 20261121,
    slots: SAMPLE_NAMES.map((name) => ({ kind: 'sample', name })),
    pans: [0, 1, 2, 3].map(() => ({ x: 0.5, y: 0.5, zoom: 1 })),
    treatments: ['warm', 'warm', 'warm', 'warm'],
    furniture: { sun: true, palms: true, stars: true, banner: true, skyline: true, halftone: true, rating: true, barcode: true, vignette: true },
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function applyPreset(state, presetId) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return state;
  const next = cloneState(state);
  next.layout = preset.layout;
  next.grade = preset.grade;
  next.title = preset.title;
  next.subtitle = preset.subtitle;
  next.subtitleStyle = preset.subtitleStyle;
  next.treatments = preset.treatments.slice();
  next.furniture = { ...preset.furniture };
  return next;
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** Deterministic generator: the same seed always draws the same cover. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function panelPath(ctx, panel, W, H) {
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([fx, fy], i) => {
      const x = fx * W;
      const y = fy * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    return;
  }
  const [fx, fy, fw, fh] = panel.rect;
  const x = fx * W;
  const y = fy * H;
  const w = fw * W;
  const h = fh * H;
  const r = Math.max(2, W * 0.008);
  ctx.roundRect(x, y, w, h, r);
}

function panelBox(panel, W, H) {
  if (panel.poly) {
    const xs = panel.poly.map(([fx]) => fx * W);
    const ys = panel.poly.map(([, fy]) => fy * H);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  }
  const [fx, fy, fw, fh] = panel.rect;
  return [fx * W, fy * H, fw * W, fh * H];
}

function drawPhoto(ctx, img, box, pan, treatment, W) {
  const [x, y, w, h] = box;
  if (!img || !img.naturalWidth) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3d1a4d');
    g.addColorStop(1, '#160a24');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(2, W * 0.004);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const s = Math.min(w, h) * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx, cy + s);
    ctx.stroke();
    return;
  }
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (pan?.zoom ?? 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const px = pan?.x ?? 0.5;
  const py = pan?.y ?? 0.5;
  const dx = x + (w - pw) / 2 - (px - 0.5) * Math.max(0, pw - w);
  const dy = y + (h - ph) / 2 - (py - 0.5) * Math.max(0, ph - h);
  const filter = TREATMENTS[treatment]?.filter ?? 'none';
  ctx.save();
  ctx.filter = filter;
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawPalm(ctx, x, y, s, flip, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // Trunk: a gently curving tapered shape.
  ctx.beginPath();
  ctx.moveTo(-s * 0.03, 0);
  ctx.quadraticCurveTo(s * 0.02, -s * 0.55, s * 0.1, -s * 0.95);
  ctx.quadraticCurveTo(s * 0.13, -s * 0.95, s * 0.1, -s * 0.9);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.5, s * 0.05, 0);
  ctx.closePath();
  ctx.fill();
  // Fronds: seven leaf shapes fanning from the crown.
  const crownX = s * 0.1;
  const crownY = -s * 0.95;
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 26) * (Math.PI / 180);
    const len = s * (0.42 + (i % 3) * 0.06);
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY + Math.sin(a) * len * 0.7;
    const midX = crownX + Math.cos(a) * len * 0.55;
    const midY = crownY + Math.sin(a) * len * 0.55 - s * 0.1;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + s * 0.03, midY + s * 0.06, crownX, crownY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSun(ctx, cx, cy, r, grade, W) {
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, grade.glow);
  g.addColorStop(0.55, grade.top);
  g.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slats across the lower half, in the grade's deep tone.
  ctx.fillStyle = grade.base;
  let yy = cy + r * 0.08;
  let gap = Math.max(2, r * 0.045);
  while (yy < cy + r) {
    ctx.fillRect(cx - r, yy, r * 2, gap);
    yy += gap * 2.4;
    gap *= 1.25;
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1.5, W * 0.0015);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSkyline(ctx, W, H, rng, color, baseY) {
  ctx.fillStyle = color;
  let x = 0;
  while (x < W) {
    const bw = W * (0.04 + rng() * 0.05);
    const bh = H * (0.03 + rng() * 0.07);
    ctx.fillRect(x, baseY - bh, bw, bh);
    // Lit windows.
    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    const cols = Math.max(1, Math.floor(bw / (W * 0.016)));
    const rows = Math.max(1, Math.floor(bh / (H * 0.022)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rng() < 0.35) {
          ctx.fillRect(x + W * 0.006 + c * W * 0.016, baseY - bh + H * 0.008 + r * H * 0.022, W * 0.006, H * 0.009);
        }
      }
    }
    ctx.fillStyle = color;
    x += bw + W * 0.004;
  }
}

function drawHalftone(ctx, x, y, cols, rows, cell, color) {
  ctx.fillStyle = color;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const t = (c + r) / (cols + rows);
      const rad = cell * (0.08 + 0.34 * t);
      ctx.beginPath();
      ctx.arc(x + c * cell, y + r * cell, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBanner(ctx, W, H, grade) {
  const bw = W * 0.34;
  const bh = H * 0.052;
  const bx = (W - bw) / 2;
  const by = H * 0.018;
  ctx.fillStyle = grade.bottom;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw - bh * 0.5, by + bh);
  ctx.lineTo(bx + bh * 0.5, by + bh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${bh * 0.52}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try {
    ctx.letterSpacing = `${bh * 0.14}px`;
  } catch { /* older canvas: tracking stays default */ }
  ctx.fillText('L E O N I D A', W / 2, by + bh * 0.54);
  try {
    ctx.letterSpacing = '0px';
  } catch { /* ignore */ }
}

function drawBarcode(ctx, x, y, w, h, rng) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - w * 0.06, y - h * 0.16, w * 1.12, h * 1.62);
  ctx.fillStyle = '#111111';
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.015 + rng() * 0.045);
    if (rng() < 0.72) ctx.fillRect(bx, y, bw, h);
    bx += bw + w * 0.012;
  }
  ctx.font = `${h * 0.42}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('$6.99', x, y + h * 1.38);
  ctx.font = `${h * 0.26}px Anton, sans-serif`;
  ctx.fillText('GTA VI', x + w * 0.52, y + h * 1.38);
}

function drawRating(ctx, x, y, s) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.strokeRect(x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92);
  ctx.fillStyle = '#111111';
  ctx.font = `${s * 0.62}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', x + s / 2, y + s * 0.52);
  ctx.font = `${s * 0.16}px Anton, sans-serif`;
  ctx.fillText('MATURE 17+', x + s / 2, y + s * 1.12);
}

function drawTitle(ctx, zone, state, W, H) {
  const [zx, zy, zw, zh] = zone.rect;
  const x = zx * W;
  const y = zy * H;
  const w = zw * W;
  const h = zh * H;
  const align = zone.align ?? 'center';
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;

  const anchorX = align === 'left' ? x + w * 0.04 : align === 'right' ? x + w * 0.96 : x + w / 2;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';

  if (title) {
    let size = h * 0.58 * (state.titleSize ?? 1);
    const setFont = (s) => {
      ctx.font = `${s}px Anton, sans-serif`;
      try {
        ctx.letterSpacing = `${s * (state.letterSpacing ?? 0.08)}px`;
      } catch { /* ignore */ }
    };
    setFont(size);
    let guard = 0;
    while (ctx.measureText(title).width > w * 0.94 && size > 10 && guard < 40) {
      size *= 0.92;
      setFont(size);
      guard++;
    }
    const baseline = y + h * (subtitle ? 0.56 : 0.68);
    ctx.save();
    ctx.shadowColor = 'rgba(10, 4, 16, 0.75)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.04;
    ctx.lineWidth = Math.max(1.5, size * 0.055);
    ctx.strokeStyle = 'rgba(20, 6, 24, 0.9)';
    ctx.strokeText(title, anchorX, baseline);
    const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#ffe9a8');
    ctx.fillStyle = grad;
    ctx.fillText(title, anchorX, baseline);
    ctx.restore();
    try {
      ctx.letterSpacing = '0px';
    } catch { /* ignore */ }
  }

  if (subtitle) {
    const titleSize = h * 0.58 * (state.titleSize ?? 1);
    const style = state.subtitleStyle ?? 'script';
    let size;
    let font;
    let spacing = 0;
    if (style === 'caps') {
      size = titleSize * 0.3;
      font = `${size}px Anton, sans-serif`;
      spacing = size * 0.22;
    } else if (style === 'condensed') {
      size = titleSize * 0.3;
      font = `${size}px Anton, sans-serif`;
      spacing = size * 0.02;
    } else {
      size = titleSize * 0.36;
      font = `${size}px Pacifico, cursive`;
    }
    ctx.font = font;
    try {
      ctx.letterSpacing = `${spacing}px`;
    } catch { /* ignore */ }
    const sub = style === 'caps' ? subtitle.toUpperCase() : subtitle;
    const baseline = y + h * 0.92;
    ctx.save();
    ctx.shadowColor = 'rgba(10, 4, 16, 0.7)';
    ctx.shadowBlur = size * 0.2;
    ctx.fillStyle = style === 'script' ? '#ffd166' : '#ffffff';
    ctx.fillText(sub, anchorX, baseline);
    ctx.restore();
    try {
      ctx.letterSpacing = '0px';
    } catch { /* ignore */ }
  }
}

/** Paints `state` onto `canvas` (any square-ish size) with `images` aligned to slots. */
export function drawCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const rng = mulberry32(state.seed ?? 20261121);
  const furn = state.furniture ?? {};

  ctx.save();
  ctx.filter = 'none';
  ctx.fillStyle = grade.base;
  ctx.fillRect(0, 0, W, H);

  // Panels.
  for (const panel of layout.panels) {
    const box = panelBox(panel, W, H);
    ctx.save();
    panelPath(ctx, panel, W, H);
    ctx.clip();
    const img = images?.[panel.slot] ?? null;
    drawPhoto(ctx, img, box, state.pans?.[panel.slot], state.treatments?.[panel.slot], W);
    ctx.restore();
    // Crisp white frame, heavier on the inset print.
    ctx.save();
    panelPath(ctx, panel, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = panel.inset ? Math.max(3, W * 0.006) : Math.max(2, W * 0.0035);
    ctx.stroke();
    ctx.restore();
  }

  // Grade wash: warm sky above, deep colour below, plus a glow.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, hexA(grade.top, 0.22));
  wash.addColorStop(0.55, hexA(grade.top, 0.05));
  wash.addColorStop(1, hexA(grade.bottom, 0.5));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.2, 0, W * 0.5, H * 0.2, W * 0.55);
  glow.addColorStop(0, hexA(grade.glow, 0.16));
  glow.addColorStop(1, hexA(grade.glow, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const titleZone = layout.title;
  const titleTop = titleZone.rect[1] * H;
  const titleAtBottom = titleZone.rect[1] > 0.5;

  if (furn.skyline) {
    const baseY = titleAtBottom ? titleTop + H * 0.02 : H * 0.985;
    drawSkyline(ctx, W, H, rng, 'rgba(12, 5, 20, 0.85)', baseY);
  }
  if (furn.sun) {
    const big = layout.id === 'big-sun';
    const r = big ? W * 0.17 : W * 0.085;
    const sunX = W * (big ? 0.5 : 0.82);
    const sunY = titleAtBottom ? titleTop - r * (big ? 0.35 : 0.55) : H * 0.86;
    drawSun(ctx, sunX, sunY, r, grade, W);
  }
  if (furn.palms) {
    drawPalm(ctx, W * 0.015, H * 0.985, W * 0.16, false, 'rgba(10, 4, 18, 0.9)');
    drawPalm(ctx, W * 0.985, H * 0.985, W * 0.13, true, 'rgba(10, 4, 18, 0.9)');
  }
  if (furn.halftone && layout.id !== 'magazine') {
    drawHalftone(ctx, W * 0.02, H * 0.02, 6, 5, W * 0.016, 'rgba(255,255,255,0.5)');
  }
  if (furn.banner && layout.id !== 'magazine') drawBanner(ctx, W, H, grade);
  if (furn.stars && titleAtBottom) {
    // A five-star badge pill in the free top-right corner, clear of the title.
    const starR = W * 0.011;
    const gap = starR * 2.7;
    const pillW = gap * 4 + starR * 2 + W * 0.02;
    const pillH = starR * 2 + H * 0.012;
    const px = W * 0.985 - pillW;
    const py = H * 0.02;
    ctx.fillStyle = 'rgba(12, 5, 20, 0.82)';
    ctx.beginPath();
    ctx.roundRect(px, py, pillW, pillH, pillH / 2);
    ctx.fill();
    const cy = py + pillH / 2;
    for (let i = 0; i < 5; i++) {
      starPath(ctx, px + W * 0.01 + starR + i * gap, cy, starR);
      ctx.fillStyle = '#ffd166';
      ctx.fill();
    }
  }
  if (furn.rating && layout.id !== 'magazine') drawRating(ctx, W * 0.02, H * 0.02, W * 0.052);

  drawTitle(ctx, titleZone, state, W, H);

  // Price sticker last, tucked in the bottom-right corner clear of the words.
  if (furn.barcode) {
    drawBarcode(ctx, W * 0.865, H * 0.938, W * 0.095, H * 0.028, rng);
  }

  if (furn.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(8, 2, 14, 0)');
    vg.addColorStop(1, 'rgba(8, 2, 14, 0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/** Renders `state` to a fresh canvas at the requested size. */
export function renderCover(state, images, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state, images);
  return canvas;
}

function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Panel rectangles in pixels, for click hit-testing in the editor. */
export function panelRectsPx(state, W, H) {
  return layoutById(state.layout).panels.map((panel) => {
    const [x, y, w, h] = panelBox(panel, W, H);
    return { slot: panel.slot, x, y, w, h };
  });
}
