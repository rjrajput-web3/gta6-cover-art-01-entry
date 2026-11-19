// Neon Coast Cover Studio - poster renderer.
//
// Everything that ends up on a finished cover is painted here, in one pure
// pass: panels, colour grade, grain, vignette and the poster furniture.
// The function takes a plain state object plus the loaded photographs, so
// the editor preview and the PNG export share the exact same drawing code
// and a given state always produces the same pixels.

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

// ---------------------------------------------------------------- grades

// A grade is a photo filter plus a coloured wash laid over the whole
// poster, a grain strength and a vignette strength.
export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', filter: 'saturate(1.35) contrast(1.08) brightness(1.03) hue-rotate(-8deg)', wash: ['rgba(255,94,58,0.20)', 'rgba(64,0,96,0.28)'], grain: 0.16, vignette: 0.42 },
  { id: 'neon', name: 'Neon Nights', filter: 'saturate(1.55) contrast(1.16) brightness(0.98) hue-rotate(12deg)', wash: ['rgba(0,229,255,0.14)', 'rgba(120,0,180,0.30)'], grain: 0.13, vignette: 0.5 },
  { id: 'noir', name: 'Palm Noir', filter: 'saturate(0.55) contrast(1.28) brightness(0.92)', wash: ['rgba(10,10,24,0.22)', 'rgba(0,0,0,0.38)'], grain: 0.22, vignette: 0.62 },
  { id: 'heatwave', name: 'Heatwave', filter: 'saturate(1.45) contrast(1.05) brightness(1.1) sepia(0.28)', wash: ['rgba(255,166,0,0.20)', 'rgba(190,30,45,0.22)'], grain: 0.15, vignette: 0.4 },
  { id: 'palmwave', name: 'Palmwave', filter: 'saturate(1.25) contrast(1.02) brightness(1.06) hue-rotate(-18deg)', wash: ['rgba(0,255,190,0.13)', 'rgba(0,70,140,0.26)'], grain: 0.12, vignette: 0.44 },
  { id: 'gold', name: 'Gold Rush', filter: 'saturate(1.3) contrast(1.12) brightness(1.05) sepia(0.42)', wash: ['rgba(255,196,0,0.18)', 'rgba(70,32,0,0.30)'], grain: 0.18, vignette: 0.48 },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// --------------------------------------------------------------- layouts

// A panel is a rectangle in unit space (0..1 across the poster) with an
// optional lean (the top edge shifted sideways, for slanted cuts) and an
// optional tilt (degrees of rotation, for the snapshot look).
function panel(x, y, w, h, extra) {
  return Object.assign({ x, y, w, h, lean: 0, tilt: 0 }, extra || {});
}

export const LAYOUTS = [
  {
    id: 'classic', name: 'Classic Collage',
    panels: () => [
      panel(0, 0, 0.58, 1),
      panel(0.58, 0, 0.42, 0.52),
      panel(0.58, 0.52, 0.42, 0.48),
    ],
  },
  {
    id: 'slash', name: 'Slanted',
    panels: () => [
      panel(-0.06, 0, 0.44, 1, { lean: 0.13 }),
      panel(0.36, 0, 0.4, 1, { lean: 0.13 }),
      panel(0.74, 0, 0.34, 1, { lean: 0.13 }),
    ],
  },
  {
    id: 'strip', name: 'Story Strip',
    panels: () => [0, 1, 2, 3, 4].map((i) => panel(i * 0.2, 0, 0.2, 1)),
  },
  {
    id: 'hero', name: 'Full Bleed Hero',
    panels: () => [panel(0, 0, 1, 1)],
  },
  {
    id: 'tilt', name: 'Tilted Snapshot',
    panels: () => [
      panel(0.03, 0.05, 0.55, 0.62, { tilt: -4 }),
      panel(0.47, 0.3, 0.5, 0.6, { tilt: 3 }),
      panel(0.06, 0.6, 0.42, 0.36, { tilt: 2 }),
    ],
  },
  {
    id: 'nine', name: 'Nine Panel Grid',
    panels: () => {
      const cells = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) cells.push(panel(c / 3, r / 3, 1 / 3, 1 / 3));
      }
      return cells;
    },
  },
  {
    id: 'duo', name: 'Split Duo',
    panels: () => [panel(0, 0, 0.5, 1), panel(0.5, 0, 0.5, 1)],
  },
  {
    id: 'coverline', name: 'Coverline',
    panels: () => [
      panel(0, 0, 1, 0.56),
      panel(0, 0.56, 0.34, 0.44),
      panel(0.34, 0.56, 0.33, 0.44),
      panel(0.67, 0.56, 0.33, 0.44),
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// ------------------------------------------------------------ randomness

// Small seeded generator: the grain must be identical on every render of
// the same poster, so nothing in the paint path may use Math.random.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------ photo fit

// Draw one photograph into a panel: cover-fit, then let the placement
// (ox, oy in -1..1, zoom >= 1, flip) move it inside the frame.
function paintPhoto(ctx, img, w, h, place) {
  const zoom = Math.max(1, place.zoom || 1);
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const roomX = Math.max(0, dw - w);
  const roomY = Math.max(0, dh - h);
  const dx = -roomX / 2 + (place.ox || 0) * roomX * 0.5;
  const dy = -roomY / 2 + (place.oy || 0) * roomY * 0.5;
  ctx.save();
  if (place.flip) {
    // Mirror the frame, then draw at the same offsets: the photograph
    // lands flipped in place, like turning a print over.
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Clip to a panel shape (leaning parallelogram), paint the photo with the
// grade filter, and frame it with a bright edge.
function paintPanel(ctx, W, H, shape, img, place, grade) {
  const px = shape.x * W;
  const py = shape.y * H;
  const pw = shape.w * W;
  const ph = shape.h * H;
  const leanPx = shape.lean * W;

  ctx.save();
  if (shape.tilt) {
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate((shape.tilt * Math.PI) / 180);
    ctx.translate(-pw / 2, -ph / 2);
  } else {
    ctx.translate(px, py);
  }
  ctx.beginPath();
  ctx.moveTo(leanPx, 0);
  ctx.lineTo(pw, 0);
  ctx.lineTo(pw - leanPx, ph);
  ctx.lineTo(0, ph);
  ctx.closePath();
  ctx.clip();

  if (img) {
    // Paint through a scratch canvas so the grade filter applies to the
    // photograph alone, never to the furniture drawn later.
    const scratch = paintPanel.scratch || (paintPanel.scratch = document.createElement('canvas'));
    scratch.width = Math.max(2, Math.round(pw));
    scratch.height = Math.max(2, Math.round(ph));
    const sctx = scratch.getContext('2d');
    sctx.save();
    sctx.filter = grade.filter;
    paintPhoto(sctx, img, scratch.width, scratch.height, place);
    sctx.restore();
    ctx.drawImage(scratch, 0, 0, pw, ph);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, ph);
    g.addColorStop(0, '#2a1052');
    g.addColorStop(1, '#0b1030');
    ctx.fillStyle = g;
    ctx.fillRect(-Math.abs(leanPx), 0, pw + Math.abs(leanPx) * 2, ph);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.beginPath();
  ctx.moveTo(leanPx, 0);
  ctx.lineTo(pw, 0);
  ctx.lineTo(pw - leanPx, ph);
  ctx.lineTo(0, ph);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// -------------------------------------------------------------- overlays

function paintWash(ctx, W, H, grade) {
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, grade.wash[0]);
  g.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function paintGrain(ctx, W, H, grade) {
  if (grade.grain <= 0) return;
  const gw = 220;
  const gh = Math.max(2, Math.round((gw * H) / W));
  const noise = paintGrain.noise || (paintGrain.noise = document.createElement('canvas'));
  noise.width = gw;
  noise.height = gh;
  const nctx = noise.getContext('2d');
  const data = nctx.createImageData(gw, gh);
  const rand = mulberry32(0x9e3779b9);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  ctx.save();
  ctx.globalAlpha = grade.grain;
  ctx.globalCompositeOperation = 'overlay';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(noise, 0, 0, W, H);
  ctx.restore();
}

function paintVignette(ctx, W, H, grade) {
  const r = Math.hypot(W, H) * 0.62;
  const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(4,0,16,${grade.vignette})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------- furniture

function fitFont(ctx, text, family, weight, startPx, maxWidth) {
  let px = startPx;
  while (px > 10) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 2;
  }
  return px;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Halftone dots filling the band behind the title: tight dots at the top
// of the band fading to nothing, the classic poster-print texture.
function paintHalftoneBand(ctx, W, bandTop, bandH) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, bandTop, W, bandH);
  ctx.clip();
  const shade = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandH);
  shade.addColorStop(0, 'rgba(8,2,24,0)');
  shade.addColorStop(0.35, 'rgba(8,2,24,0.55)');
  shade.addColorStop(1, 'rgba(8,2,24,0.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandTop, W, bandH);
  const step = Math.max(9, W * 0.011);
  ctx.fillStyle = 'rgba(255,120,200,0.5)';
  for (let row = 0, y = bandTop + step * 0.4; y < bandTop + bandH; row += 1, y += step) {
    const fade = 1 - (y - bandTop) / bandH;
    for (let x = (row % 2) * step * 0.5 + step * 0.4; x < W; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, step * 0.16 * fade + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function paintTitle(ctx, W, H, state) {
  const bandH = H * 0.3;
  const bandTop = H - bandH;
  paintHalftoneBand(ctx, W, bandTop, bandH);

  const caption = (state.caption || '').trim() || 'NEON COAST';
  const subtitle = (state.subtitle || '').trim();
  const quote = (state.quote || '').trim();
  const tags = (state.tags || []).filter((t) => String(t).trim());

  // Neon script subtitle, glowing above the title.
  let cursor = bandTop + bandH * 0.2;
  if (subtitle) {
    const px = fitFont(ctx, subtitle, 'Pacifico', '400', H * 0.052, W * 0.8);
    ctx.font = `400 ${px}px Pacifico`;
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = '#ff4fd8';
    ctx.shadowBlur = H * 0.02;
    ctx.fillStyle = '#ffd7f4';
    ctx.fillText(subtitle, W / 2, cursor);
    ctx.restore();
    cursor += H * 0.015;
  }

  // The big poster title in Anton, letterspaced and shadowed.
  const title = caption.toUpperCase();
  const px = fitFont(ctx, title, 'Anton', '400', H * 0.115, W * 0.92);
  ctx.font = `400 ${px}px Anton`;
  ctx.textAlign = 'center';
  ctx.save();
  try { ctx.letterSpacing = `${Math.round(px * 0.04)}px`; } catch (e) { /* older canvas */ }
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = H * 0.012;
  ctx.shadowOffsetY = H * 0.006;
  const grad = ctx.createLinearGradient(0, cursor, 0, cursor + px);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#ffe9f8');
  grad.addColorStop(1, '#ffb3e2');
  ctx.fillStyle = grad;
  ctx.fillText(title, W / 2, cursor + px * 0.92);
  ctx.restore();
  cursor += px * 0.98;

  // Quote line under the title, in the script face at reading size.
  if (quote) {
    const qpx = fitFont(ctx, quote, 'Pacifico', '400', H * 0.03, W * 0.7);
    ctx.font = `400 ${qpx}px Pacifico`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(quote, W / 2, cursor + qpx);
    cursor += qpx * 1.3;
  }

  // Tag chips in a centred row.
  if (tags.length) {
    const chipPx = H * 0.021;
    ctx.font = `400 ${chipPx}px Anton`;
    const gap = W * 0.012;
    const widths = tags.map((t) => ctx.measureText(String(t).toUpperCase()).width + chipPx * 1.5);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (tags.length - 1);
    let x = (W - total) / 2;
    const chipH = chipPx * 1.9;
    tags.forEach((t, i) => {
      ctx.save();
      ctx.fillStyle = 'rgba(10,4,28,0.72)';
      roundRect(ctx, x, cursor, widths[i], chipH, chipH / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,140,220,0.85)';
      ctx.lineWidth = Math.max(1, H * 0.0016);
      ctx.stroke();
      ctx.fillStyle = '#ffe3f6';
      ctx.textAlign = 'center';
      ctx.fillText(String(t).toUpperCase(), x + widths[i] / 2, cursor + chipH * 0.66);
      ctx.restore();
      x += widths[i] + gap;
    });
  }
}

// Five-star "heat" pill in the top right corner.
function paintHeatPill(ctx, W, H) {
  const label = '★★★★★';
  const px = H * 0.026;
  ctx.font = `400 ${px}px Anton`;
  const tw = ctx.measureText(label).width;
  const padX = px * 0.9;
  const w = tw + padX * 2;
  const h = px * 2;
  const x = W - w - W * 0.03;
  const y = H * 0.028;
  ctx.save();
  ctx.shadowColor = 'rgba(255,60,120,0.8)';
  ctx.shadowBlur = H * 0.012;
  ctx.fillStyle = '#e8114f';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h * 0.68);
  ctx.restore();
}

// Round Vice City seal: ring, arced lettering and a palm-star centre.
// Letters are placed one by one around the circle so the text follows it.
function paintSeal(ctx, W, H) {
  const cx = W * 0.075;
  const cy = H * 0.075;
  const r = Math.min(W, H) * 0.052;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12,4,30,0.78)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.strokeStyle = '#ffd94d';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.strokeStyle = 'rgba(255,217,77,0.8)';
  ctx.stroke();

  ctx.fillStyle = '#ffd94d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const word = 'VICE CITY';
  const lp = r * 0.34;
  ctx.font = `400 ${lp}px Anton`;
  const arcR = r * 0.58;
  const span = Math.PI * 0.92;
  for (let i = 0; i < word.length; i += 1) {
    const a = -Math.PI / 2 - span / 2 + (span * i) / (word.length - 1);
    ctx.save();
    ctx.translate(cx + Math.cos(a) * arcR, cy + Math.sin(a) * arcR);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(word[i], 0, 0);
    ctx.restore();
  }
  ctx.font = `400 ${r * 0.52}px Anton`;
  ctx.fillText('★', cx, cy + r * 0.3);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

// ------------------------------------------------------------ the render

// Paint a whole cover. `photos` is the library of loaded images; each
// panel placement names its photo by library index.
export function drawCover(ctx, W, H, state, photos) {
  const grade = gradeById(state.grade);
  const layout = layoutById(state.layout);
  const shapes = layout.panels();

  ctx.save();
  ctx.fillStyle = '#0a0618';
  ctx.fillRect(0, 0, W, H);
  shapes.forEach((shape, i) => {
    const place = (state.panels && state.panels[i]) || { photo: i };
    const img = photos[place.photo] || null;
    paintPanel(ctx, W, H, shape, img, place, grade);
  });
  paintWash(ctx, W, H, grade);
  paintTitle(ctx, W, H, state);
  paintHeatPill(ctx, W, H);
  paintSeal(ctx, W, H);
  paintGrain(ctx, W, H, grade);
  paintVignette(ctx, W, H, grade);
  ctx.restore();
}

// Panel rectangles in unit space, for editor hit-testing.
export function panelShapes(layoutId) {
  return layoutById(layoutId).panels();
}
