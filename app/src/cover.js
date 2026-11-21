// VICE HEAT — Leonida Golden-Hour Cover Studio (Round 9 engine)
// A canvas renderer for angled-collage, poster-grade game cover art.
// Everything is drawn locally: panels, duotone grades, halation, grain,
// gradient display type and retail furniture. No network, no libraries.

export const SAMPLES = [
  { id: 'neon-beach', label: 'Neon Beach Night' },
  { id: 'muscle-sunset', label: 'Muscle Car Sunset Blvd' },
  { id: 'rooftop-dusk', label: 'Rooftop Skyline Dusk' },
  { id: 'boardwalk', label: 'Boardwalk Carnival' },
  { id: 'swamp-run', label: 'Swamp Airboat Run' },
];

// ---- deterministic rng -------------------------------------------------
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- layouts: angled collage panels, authentic cover geometry ----------
// Each panel: polygon in 0..1 cover space, photo slot, treatment index.
const P = (pts, slot, treat = 0) => ({ pts, slot, treat });
export const LAYOUTS = [
  { name: 'Vice Wedge', panels: [
    P([[0,0],[1,0],[1,0.52],[0,0.66]], 0),
    P([[0,0.66],[1,0.52],[1,1],[0.52,1]], 1, 1),
    P([[0,0.66],[0.52,1],[0,1]], 2, 2) ] },
  { name: 'Shards', panels: [
    P([[0,0],[0.58,0],[0.38,0.55],[0,0.62]], 0),
    P([[0.58,0],[1,0],[1,0.48],[0.38,0.55]], 1, 3),
    P([[0,0.62],[0.38,0.55],[1,0.48],[1,1],[0,1]], 2, 1) ] },
  { name: 'Skyline Split', panels: [
    P([[0,0],[1,0],[1,0.4],[0,0.46]], 0),
    P([[0,0.46],[1,0.4],[0.62,1],[0,1]], 1, 0),
    P([[1,0.4],[1,1],[0.62,1]], 2, 4) ] },
  { name: 'Diagonal Heat', panels: [
    P([[0,0],[1,0],[0.3,1],[0,1]], 0, 1),
    P([[1,0],[1,1],[0.3,1]], 1, 0) ] },
  { name: 'Triptych Tilt', panels: [
    P([[0,0],[0.4,0],[0.3,1],[0,1]], 0),
    P([[0.4,0],[0.72,0],[0.66,1],[0.3,1]], 1, 2),
    P([[0.72,0],[1,0],[1,1],[0.66,1]], 2, 3) ] },
  { name: 'Hero Frame', panels: [
    P([[0,0],[1,0],[1,1],[0,1]], 0),
    P([[0.06,0.55],[0.46,0.5],[0.42,0.94],[0.06,0.97]], 1, 4) ] },
  { name: 'Crossfire', panels: [
    P([[0,0],[0.55,0],[0.45,0.5],[0,0.55]], 0),
    P([[0.55,0],[1,0],[1,0.55],[0.45,0.5]], 1, 1),
    P([[0,0.55],[0.45,0.5],[0.55,1],[0,1]], 2, 3),
    P([[0.45,0.5],[1,0.55],[1,1],[0.55,1]], 3, 0) ] },
  { name: 'Boulevard Fan', panels: [
    P([[0,0],[1,0],[0.5,0.42]], 0, 2),
    P([[0,0],[0.5,0.42],[0,1]], 1, 0),
    P([[1,0],[1,1],[0.5,0.42]], 2, 1),
    P([[0,1],[0.5,0.42],[1,1]], 3, 4) ] },
  { name: 'Night Stack', panels: [
    P([[0,0],[1,0],[1,0.34],[0,0.38]], 0),
    P([[0,0.38],[1,0.34],[1,0.66],[0,0.7]], 1, 3),
    P([[0,0.7],[1,0.66],[1,1],[0,1]], 2, 0) ] },
  { name: 'Swamp Cut', panels: [
    P([[0,0],[0.7,0],[0.55,0.6],[0,0.5]], 4),
    P([[0.7,0],[1,0],[1,0.62],[0.55,0.6]], 0, 1),
    P([[0,0.5],[0.55,0.6],[1,0.62],[1,1],[0,1]], 1, 2) ] },
  { name: 'Carnival Pop', panels: [
    P([[0,0],[1,0],[1,0.58],[0.62,0.44],[0,0.6]], 3),
    P([[0,0.6],[0.62,0.44],[1,0.58],[1,1],[0,1]], 1, 0),
    P([[0.62,0.44],[1,0.58],[1,1],[0.78,1]], 2, 5) ] },
  { name: 'Golden Hour Mono', panels: [
    P([[0,0],[1,0],[1,1],[0,1]], 1, 0),
    P([[0,0.62],[0.38,0.56],[0.36,1],[0,1]], 0, 4) ] },
];

// ---- grades: filter chain + duotone pair + mood ------------------------
export const GRADES = [
  { name: 'Golden Hour', filter: 'saturate(1.35) contrast(1.12) brightness(1.05)', duo: ['#1a0b2e', '#ffb347'], duoAmt: 0.16, vig: 0.32 },
  { name: 'Neon Noir', filter: 'saturate(1.5) contrast(1.25) brightness(0.98)', duo: ['#050914', '#ff2e88'], duoAmt: 0.22, vig: 0.45 },
  { name: 'Vice Teal', filter: 'saturate(1.3) contrast(1.15) hue-rotate(-8deg)', duo: ['#02141a', '#2ee6c8'], duoAmt: 0.18, vig: 0.36 },
  { name: 'Sunset Bleach', filter: 'saturate(1.15) contrast(1.05) brightness(1.14) sepia(0.25)', duo: ['#2b0f1e', '#ffd9a0'], duoAmt: 0.12, vig: 0.24 },
  { name: 'Midnight Chrome', filter: 'saturate(0.9) contrast(1.3) brightness(1.02)', duo: ['#04060f', '#9fd8ff'], duoAmt: 0.2, vig: 0.5 },
  { name: 'Tropical Punch', filter: 'saturate(1.65) contrast(1.18) brightness(1.06)', duo: ['#160a2e', '#ffe14d'], duoAmt: 0.14, vig: 0.3 },
  { name: 'Swamp Haze', filter: 'saturate(1.1) contrast(1.08) brightness(1.0) hue-rotate(12deg)', duo: ['#0a1a0c', '#b6ff7a'], duoAmt: 0.15, vig: 0.42 },
  { name: 'Carnival Glow', filter: 'saturate(1.55) contrast(1.14) brightness(1.1)', duo: ['#1c0530', '#ff9de2'], duoAmt: 0.17, vig: 0.3 },
  { name: 'Desert Mirage', filter: 'saturate(1.25) contrast(1.1) sepia(0.35) brightness(1.08)', duo: ['#241103', '#ffc46b'], duoAmt: 0.13, vig: 0.34 },
  { name: 'Ultraviolet', filter: 'saturate(1.45) contrast(1.22) hue-rotate(-18deg)', duo: ['#0d0221', '#b18cff'], duoAmt: 0.21, vig: 0.44 },
  { name: 'Harbor Dusk', filter: 'saturate(1.2) contrast(1.16) brightness(0.96)', duo: ['#06121f', '#7ac7ff'], duoAmt: 0.16, vig: 0.4 },
  { name: 'Print Poster', filter: 'saturate(1.4) contrast(1.32) brightness(1.04)', duo: ['#12041f', '#ff7847'], duoAmt: 0.26, vig: 0.28 },
];

// Per-panel treatments layered over the base grade.
export const TREATMENTS = [
  { name: 'Clean', extra: '', duoBoost: 0 },
  { name: 'Duotone', extra: 'grayscale(0.55) contrast(1.15)', duoBoost: 0.4 },
  { name: 'Bleach', extra: 'brightness(1.18) saturate(0.82)', duoBoost: -0.05 },
  { name: 'Noir', extra: 'grayscale(0.8) contrast(1.35)', duoBoost: 0.15 },
  { name: 'Warm Push', extra: 'sepia(0.3) saturate(1.3)', duoBoost: 0.05 },
  { name: 'Cool Push', extra: 'hue-rotate(-14deg) saturate(1.25)', duoBoost: 0.05 },
];

// ---- title looks ---------------------------------------------------------
export const LOOKS = [
  { name: 'Vice Sunset', top: '#fff7e0', mid: '#ffb347', bot: '#ff2e88', script: '#2ee6c8', edge: '#16041f' },
  { name: 'Neon Nights', top: '#eaffff', mid: '#2ee6c8', bot: '#ff2e88', script: '#ffe14d', edge: '#050914' },
  { name: 'Gold Standard', top: '#ffffff', mid: '#ffe14d', bot: '#ff7847', script: '#ffffff', edge: '#241103' },
  { name: 'Ultraviolet', top: '#f3eaff', mid: '#b18cff', bot: '#ff2e88', script: '#2ee6c8', edge: '#0d0221' },
  { name: 'Chrome Ice', top: '#ffffff', mid: '#cfe9ff', bot: '#7ac7ff', script: '#ff9de2', edge: '#06121f' },
];

export const DEFAULT_STATE = {
  layout: 0, grade: 0, look: 0,
  titleA: 'VICE', titleB: 'HEAT', script: 'Leonida Nights',
  sub: 'LEONIDA  •  ONE CITY  •  EVERY TEMPTATION',
  quote: '“A love letter to the city that never cools down.”',
  source: 'VICE HEAT WEEKLY',
  grain: 0.5, halation: 0.55, keyline: 10, seed: 9,
  offsets: {}, // "panelIndex" -> {x,y,zoom}
};

// ---- helpers -------------------------------------------------------------
function hexRGB(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function coverFit(img, x, y, w, h, zoom = 1, ox = 0, oy = 0) {
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * s, dh = img.height * s;
  return [x + (w - dw) / 2 + ox * w, y + (h - dh) / 2 + oy * h, dw, dh];
}

let grainTile = null;
function makeGrain(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const img = g.createImageData(256, 256);
  const rnd = mulberry(seed * 7919 + 13);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}

// Duotone remap of an offscreen canvas toward shadow/highlight colors.
function applyDuotone(off, duo, amt) {
  if (amt <= 0.01) return;
  const g = off.getContext('2d');
  const img = g.getImageData(0, 0, off.width, off.height);
  const [sr, sg, sb] = hexRGB(duo[0]), [hr, hg, hb] = hexRGB(duo[1]);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    // S-curve for poster punch
    const t = lum * lum * (3 - 2 * lum);
    d[i]     = d[i]     + (sr + (hr - sr) * t - d[i]) * amt;
    d[i + 1] = d[i + 1] + (sg + (hg - sg) * t - d[i + 1]) * amt;
    d[i + 2] = d[i + 2] + (sb + (hb - sb) * t - d[i + 2]) * amt;
  }
  g.putImageData(img, 0, 0);
}

// ---- main render -----------------------------------------------------------
export function drawCover(ctx, W, H, state, images) {
  const grade = GRADES[state.grade], look = LOOKS[state.look];
  const layout = LAYOUTS[state.layout];
  ctx.save();
  ctx.fillStyle = '#0b0214'; ctx.fillRect(0, 0, W, H);

  // Render each panel into an offscreen, grade it, then clip-draw with keyline.
  layout.panels.forEach((panel, i) => {
    const img = images[panel.slot % images.length];
    if (!img) return;
    const xs = panel.pts.map(p => p[0] * W), ys = panel.pts.map(p => p[1] * H);
    const bx = Math.min(...xs), by = Math.min(...ys);
    const bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
    const off = document.createElement('canvas');
    off.width = Math.max(2, Math.ceil(bw)); off.height = Math.max(2, Math.ceil(bh));
    const og = off.getContext('2d');
    const treat = TREATMENTS[panel.treat % TREATMENTS.length];
    og.filter = `${grade.filter} ${treat.extra}`.trim();
    const offKey = state.offsets[i] || { x: 0, y: 0, zoom: 1 };
    const [dx, dy, dw, dh] = coverFit(img, -bx * 0, 0, bw, bh, offKey.zoom, offKey.x, offKey.y);
    og.drawImage(img, dx, dy, dw, dh);
    og.filter = 'none';
    applyDuotone(off, grade.duo, Math.max(0, grade.duoAmt + treat.duoBoost));

    ctx.save();
    ctx.beginPath();
    panel.pts.forEach((p, j) => j ? ctx.lineTo(p[0] * W, p[1] * H) : ctx.moveTo(p[0] * W, p[1] * H));
    ctx.closePath(); ctx.clip();
    ctx.drawImage(off, bx, by);
    // Halation: soft screened glow from bright areas
    if (state.halation > 0.02) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = state.halation * 0.35;
      ctx.filter = `blur(${Math.round(W * 0.012)}px) brightness(1.25) saturate(1.4)`;
      ctx.drawImage(off, bx, by);
      ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // White keyline border — the signature cover geometry
    ctx.beginPath();
    panel.pts.forEach((p, j) => j ? ctx.lineTo(p[0] * W, p[1] * H) : ctx.moveTo(p[0] * W, p[1] * H));
    ctx.closePath();
    ctx.lineWidth = state.keyline; ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = W * 0.008;
    ctx.stroke(); ctx.shadowBlur = 0;
  });

  // Cinematic vignette + top/bottom cinema gradients
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(4,0,12,${grade.vig})`);
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  const tg = ctx.createLinearGradient(0, 0, 0, H * 0.3);
  tg.addColorStop(0, 'rgba(5,0,14,0.55)'); tg.addColorStop(1, 'rgba(5,0,14,0)');
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H * 0.3);
  const bg = ctx.createLinearGradient(0, H * 0.68, 0, H);
  bg.addColorStop(0, 'rgba(5,0,14,0)'); bg.addColorStop(1, 'rgba(5,0,14,0.62)');
  ctx.fillStyle = bg; ctx.fillRect(0, H * 0.68, W, H * 0.32);

  drawTitle(ctx, W, H, state, look);
  drawFurniture(ctx, W, H, state, look);

  // Film grain
  if (state.grain > 0.02) {
    if (!grainTile) grainTile = makeGrain(state.seed);
    ctx.save();
    ctx.globalAlpha = state.grain * 0.14;
    ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(grainTile, 'repeat');
    ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  ctx.restore();
}

function drawTitle(ctx, W, H, state, look) {
  const cx = W / 2;
  // Script accent above the masthead
  ctx.save();
  ctx.translate(cx, H * 0.085);
  ctx.rotate(-0.045);
  ctx.font = `${Math.round(H * 0.052)}px Pacifico, cursive`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = look.script; ctx.shadowBlur = W * 0.03;
  ctx.fillStyle = look.script;
  ctx.fillText(state.script, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.globalAlpha = 0.25; ctx.fillText(state.script, 0, -2); ctx.globalAlpha = 1;
  ctx.restore();

  // Masthead: two stacked Anton lines, gradient fill, heavy outline
  const lines = [state.titleA, state.titleB].filter(Boolean);
  const size = H * (lines.length > 1 ? 0.148 : 0.19);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    const y = H * 0.155 + i * size * 0.94 + size / 2;
    ctx.font = `${Math.round(size)}px Anton, sans-serif`;
    const grad = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    grad.addColorStop(0, look.top); grad.addColorStop(0.52, look.mid); grad.addColorStop(1, look.bot);
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = W * 0.012; ctx.shadowOffsetY = W * 0.006;
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = look.edge;
    ctx.strokeText(line, cx, y);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.lineWidth = size * 0.045; ctx.strokeStyle = '#ffffff';
    ctx.strokeText(line, cx, y);
    ctx.fillStyle = grad;
    ctx.fillText(line, cx, y);
  });

  // Sub strip
  ctx.font = `${Math.round(H * 0.021)}px Anton, sans-serif`;
  const subY = H * 0.155 + lines.length * size * 0.94 + H * 0.028;
  const tw = ctx.measureText(state.sub).width + W * 0.05;
  ctx.fillStyle = 'rgba(8,0,18,0.72)';
  ctx.fillRect(cx - tw / 2, subY - H * 0.02, tw, H * 0.04);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.sub, cx, subY);
}

function drawFurniture(ctx, W, H, state, look) {
  // Top-left presents strip
  ctx.save();
  ctx.font = `${Math.round(H * 0.017)}px Anton, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('VICE HEAT STUDIOS PRESENTS', W * 0.035, H * 0.03);
  ctx.textAlign = 'right';
  ctx.fillText('EST. LEONIDA ★ No. 09', W * 0.965, H * 0.03);
  ctx.restore();

  // Quote pill, upper right under masthead zone
  ctx.save();
  ctx.font = `italic ${Math.round(H * 0.019)}px Georgia, serif`;
  const qw = ctx.measureText(state.quote).width + W * 0.045;
  const qx = W - qw - W * 0.03, qy = H * 0.47;
  ctx.fillStyle = 'rgba(8,0,18,0.66)';
  ctx.beginPath(); ctx.roundRect(qx, qy, qw, H * 0.055, H * 0.012); ctx.fill();
  ctx.fillStyle = '#ffe9f6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(state.quote, qx + qw / 2, qy + H * 0.021);
  ctx.font = `${Math.round(H * 0.013)}px Anton, sans-serif`;
  ctx.fillStyle = look.script;
  ctx.fillText('— ' + state.source, qx + qw / 2, qy + H * 0.042);
  ctx.restore();

  // Price burst star
  ctx.save();
  ctx.translate(W * 0.885, H * 0.665); ctx.rotate(0.32);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? W * 0.052 : W * 0.068, a = (i / 16) * Math.PI * 2;
    i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffe14d'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#16041f'; ctx.stroke();
  ctx.fillStyle = '#16041f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(H * 0.02)}px Anton, sans-serif`;
  ctx.fillText("DIRECTOR'S", 0, -H * 0.016);
  ctx.fillText('CUT ★ 4K', 0, H * 0.006);
  ctx.font = `${Math.round(H * 0.014)}px Anton, sans-serif`;
  ctx.fillText('GOLDEN HOUR ED.', 0, H * 0.026);
  ctx.restore();

  // Rating box, bottom-left
  ctx.save();
  const rw = W * 0.105, rh = H * 0.105, rx = W * 0.032, ry = H - rh - H * 0.055;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(rx, ry, rw, rh);
  ctx.lineWidth = 4; ctx.strokeStyle = '#111'; ctx.strokeRect(rx, ry, rw, rh);
  ctx.fillStyle = '#111'; ctx.textAlign = 'center';
  ctx.font = `${Math.round(rh * 0.52)}px Anton, sans-serif`; ctx.textBaseline = 'middle';
  ctx.fillText('VH', rx + rw / 2, ry + rh * 0.34);
  ctx.font = `${Math.round(rh * 0.17)}px Anton, sans-serif`;
  ctx.fillText('AGES 18+', rx + rw / 2, ry + rh * 0.68);
  ctx.font = `${Math.round(rh * 0.115)}px Anton, sans-serif`;
  ctx.fillText('LEONIDA BOARD', rx + rw / 2, ry + rh * 0.87);
  ctx.restore();

  // Barcode, bottom-right
  ctx.save();
  const bw2 = W * 0.17, bh2 = H * 0.052, bx2 = W - bw2 - W * 0.032, by2 = H - bh2 - H * 0.055;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(bx2 - 6, by2 - 6, bw2 + 12, bh2 + H * 0.026);
  const rnd = mulberry(state.seed * 31 + 7);
  let x = bx2;
  ctx.fillStyle = '#111';
  while (x < bx2 + bw2 - 3) { const wdt = 1 + rnd() * 4; if (rnd() > 0.42) ctx.fillRect(x, by2, wdt, bh2); x += wdt + 1.5; }
  ctx.font = `${Math.round(H * 0.013)}px monospace`; ctx.textAlign = 'center';
  ctx.fillText('8 901609 202609', bx2 + bw2 / 2, by2 + bh2 + H * 0.014);
  ctx.restore();

  // Bottom platform band
  ctx.save();
  ctx.fillStyle = 'rgba(5,0,12,0.85)';
  ctx.fillRect(0, H - H * 0.038, W, H * 0.038);
  ctx.font = `${Math.round(H * 0.016)}px Anton, sans-serif`;
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★  LEONIDA GOLDEN-HOUR EDITION  ★  FULLY OFFLINE COVER STUDIO  ★  PRINT-READY PNG EXPORT  ★', W / 2, H - H * 0.019);
  ctx.restore();
}
