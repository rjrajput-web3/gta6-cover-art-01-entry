// Neon Coast Cover Studio — poster renderer.
// Pure canvas painting: given loaded images and a plain state object it
// draws one complete GTA-style cover. Nothing here touches the DOM, the
// network, the clock or Math.random, so the same state always paints the
// same pixels (the export determinism check relies on that).

export const LAYOUTS = [
  { id: "classic", name: "Classic Panels" },
  { id: "slash", name: "Slanted" },
  { id: "strip", name: "Story Strip" },
  { id: "hero", name: "Full-Bleed Hero" },
  { id: "tilt", name: "Tilted Snapshot" },
  { id: "nine", name: "Nine-Panel Grid" },
  { id: "duo", name: "Split Duo" },
  { id: "coverline", name: "Coverline" },
];

// Each grade is a CSS-filter recipe for the photo itself plus a translucent
// colour wash laid over it, so one photo can carry six different moods.
export const GRADES = [
  { id: "sunset", name: "Vice Sunset", filter: "saturate(1.35) contrast(1.08) brightness(1.04) hue-rotate(-8deg)", wash: ["rgba(255,94,98,0.20)", "rgba(255,166,88,0.10)"] },
  { id: "neon", name: "Neon Nights", filter: "saturate(1.5) contrast(1.15) brightness(0.98) hue-rotate(12deg)", wash: ["rgba(64,224,255,0.14)", "rgba(255,64,196,0.16)"] },
  { id: "noir", name: "Palm Noir", filter: "saturate(0.55) contrast(1.25) brightness(0.92)", wash: ["rgba(10,14,28,0.28)", "rgba(40,60,90,0.12)"] },
  { id: "heatwave", name: "Heatwave", filter: "saturate(1.45) contrast(1.1) brightness(1.08) sepia(0.18)", wash: ["rgba(255,120,40,0.18)", "rgba(255,210,90,0.12)"] },
  { id: "palmwave", name: "Palmwave", filter: "saturate(1.3) contrast(1.06) brightness(1.05) hue-rotate(-18deg)", wash: ["rgba(64,255,190,0.13)", "rgba(120,90,255,0.13)"] },
  { id: "gold", name: "Gold Rush", filter: "saturate(1.25) contrast(1.12) brightness(1.06) sepia(0.32)", wash: ["rgba(255,190,60,0.20)", "rgba(140,80,10,0.10)"] },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// Deterministic PRNG (mulberry32) — the only randomness the painter uses,
// always seeded from the cover's own content so repaints are identical.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedFromText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Panel rectangles for a layout, as fractions of the canvas. Each panel
// also carries a slant (top-edge skew in fractions) and a tilt in radians.
export function panelsFor(layoutId, w, h) {
  const P = (x, y, pw, ph, slant = 0, tilt = 0) => ({ x: x * w, y: y * h, w: pw * w, h: ph * h, slant: slant * w, tilt });
  switch (layoutId) {
    case "slash":
      return [P(0, 0, 0.56, 0.62, 0.1), P(0.5, 0, 0.5, 0.62, 0.1), P(0, 0.58, 0.42, 0.42, -0.06), P(0.38, 0.58, 0.62, 0.42, -0.06)];
    case "strip":
      return [P(0, 0, 1, 0.4), P(0, 0.37, 0.5, 0.34), P(0.5, 0.37, 0.5, 0.34), P(0, 0.68, 0.62, 0.32), P(0.62, 0.68, 0.38, 0.32)];
    case "hero":
      return [P(0, 0, 1, 1)];
    case "tilt":
      return [P(0.03, 0.05, 0.6, 0.58, 0, -0.045), P(0.42, 0.3, 0.55, 0.55, 0, 0.05), P(0.05, 0.55, 0.5, 0.4, 0, 0.03)];
    case "nine": {
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(P(c / 3, r / 3, 1 / 3, 1 / 3));
      return out;
    }
    case "duo":
      return [P(0, 0, 0.52, 1, 0.05), P(0.48, 0, 0.52, 1, 0.05)];
    case "coverline":
      return [P(0, 0, 1, 0.66), P(0, 0.62, 0.34, 0.38), P(0.34, 0.62, 0.33, 0.38), P(0.67, 0.62, 0.33, 0.38)];
    default: // classic
      return [P(0, 0, 0.62, 0.55), P(0.62, 0, 0.38, 0.55), P(0, 0.55, 0.45, 0.45), P(0.45, 0.55, 0.55, 0.45)];
  }
}

function panelPath(ctx, p) {
  ctx.beginPath();
  ctx.moveTo(p.x + p.slant, p.y);
  ctx.lineTo(p.x + p.w, p.y);
  ctx.lineTo(p.x + p.w - p.slant, p.y + p.h);
  ctx.lineTo(p.x, p.y + p.h);
  ctx.closePath();
}

// Draw one photo into a panel: cover-fit, honouring zoom, pan offsets
// (fractions of the overflow) and a horizontal flip flag.
function drawPhoto(ctx, img, p, view, grade) {
  if (!img || !img.width) return;
  ctx.save();
  if (p.tilt) {
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.tilt);
    ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
  }
  panelPath(ctx, p);
  ctx.clip();
  const scale = Math.max(p.w / img.width, p.h / img.height) * (view.zoom || 1);
  const dw = img.width * scale, dh = img.height * scale;
  const ox = (view.ox || 0) * (dw - p.w), oy = (view.oy || 0) * (dh - p.h);
  const dx = p.x + (p.w - dw) / 2 - ox, dy = p.y + (p.h - dh) / 2 - oy;
  ctx.filter = grade.filter;
  if (view.flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.filter = "none";
  const wash = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(p.x - Math.abs(p.slant) - 4, p.y - 4, p.w + Math.abs(p.slant) * 2 + 8, p.h + 8);
  ctx.restore();
  ctx.save();
  if (p.tilt) {
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.tilt);
    ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
  }
  panelPath(ctx, p);
  ctx.lineWidth = Math.max(3, p.w * 0.008);
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.restore();
}

function drawGrain(ctx, w, h, seed) {
  const rnd = seededRandom(seed);
  const n = Math.floor((w * h) / 900);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const v = Math.floor(rnd() * 255);
    ctx.fillStyle = "rgba(" + v + "," + v + "," + v + "," + (0.05 + rnd() * 0.06) + ")";
    ctx.fillRect(rnd() * w, rnd() * h, 1.4, 1.4);
  }
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(5,0,18,0.42)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Halftone dot band behind the title: rows of shrinking pink dots.
function drawHalftoneBand(ctx, w, y, bandH, seed) {
  const rnd = seededRandom(seed ^ 0x9e3779b9);
  ctx.save();
  ctx.fillStyle = "#ff2e88";
  const step = Math.max(10, w * 0.016);
  for (let row = 0; row * step < bandH; row++) {
    for (let col = 0; col * step < w + step; col++) {
      const r = step * 0.32 * (1 - (row * step) / (bandH * 1.4)) + rnd() * 0.4;
      if (r <= 0.4) continue;
      ctx.beginPath();
      ctx.arc(col * step + (row % 2 ? step / 2 : 0), y + row * step, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitFont(ctx, text, family, weight, startPx, maxW) {
  let px = startPx;
  while (px > 12) {
    ctx.font = weight + " " + px + "px " + family;
    if (ctx.measureText(text).width <= maxW) break;
    px -= 4;
  }
  return px;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// The round Vice City seal: two rings, arced lettering and a palm star.
function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16,8,38,0.88)"; ctx.fill();
  ctx.lineWidth = r * 0.07; ctx.strokeStyle = "#ffd23f"; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.035; ctx.strokeStyle = "#ff5ea8"; ctx.stroke();
  const word = "VICE CITY • NEON COAST • ";
  ctx.fillStyle = "#ffe9a8";
  ctx.font = "700 " + Math.round(r * 0.19) + "px Anton, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let i = 0; i < word.length; i++) {
    const a = (i / word.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r * 0.66, cy + Math.sin(a) * r * 0.66);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(word[i], 0, 0);
    ctx.restore();
  }
  drawStar(ctx, cx, cy, r * 0.3, "#ffd23f");
  ctx.restore();
}

function drawHeatPill(ctx, x, y, scale) {
  const w = 168 * scale, h = 44 * scale, r = h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = "rgba(12,4,26,0.85)"; ctx.fill();
  ctx.lineWidth = 2 * scale; ctx.strokeStyle = "#ff2e88"; ctx.stroke();
  for (let i = 0; i < 5; i++) drawStar(ctx, x + (26 + i * 27) * scale, y + h / 2, 10 * scale, i < 5 ? "#ffd23f" : "#555");
  ctx.restore();
}

function drawChips(ctx, tags, w, y, scale) {
  ctx.save();
  ctx.font = "700 " + Math.round(21 * scale) + "px Anton, sans-serif";
  ctx.textBaseline = "middle";
  let x = w * 0.045;
  for (const tag of tags) {
    if (!tag) continue;
    const tw = ctx.measureText(tag.toUpperCase()).width + 30 * scale;
    if (x + tw > w * 0.96) break;
    ctx.beginPath();
    ctx.roundRect(x, y, tw, 38 * scale, 19 * scale);
    ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill();
    ctx.fillStyle = "#22103f";
    ctx.textAlign = "left";
    ctx.fillText(tag.toUpperCase(), x + 15 * scale, y + 20 * scale);
    x += tw + 12 * scale;
  }
  ctx.restore();
}

// Paint the whole cover. state: {layout, grade, photos:[indices into imgs],
// views:[{ox,oy,zoom,flip}], caption, subtitle, quote, tags:[..]}.
export function renderCover(ctx, w, h, imgs, state) {
  const grade = gradeById(state.grade);
  ctx.save();
  ctx.fillStyle = "#160a2e";
  ctx.fillRect(0, 0, w, h);
  const panels = panelsFor(state.layout, w, h);
  panels.forEach((p, i) => {
    const idx = state.photos[i % state.photos.length] || 0;
    const view = (state.views && state.views[i]) || {};
    drawPhoto(ctx, imgs[idx], p, view, grade);
  });
  const seed = seedFromText(state.caption + "|" + state.layout + "|" + state.grade);
  drawVignette(ctx, w, h);
  drawGrain(ctx, w, h, seed);

  const s = w / 1080; // furniture scale, designed at 1080 wide
  // Title block: halftone band, Anton caption, Pacifico subtitle.
  const bandY = h - 300 * s - (state.quote ? 44 * s : 0);
  drawHalftoneBand(ctx, w, bandY, 120 * s, seed);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const caption = (state.caption || "NEON COAST").toUpperCase();
  const px = fitFont(ctx, caption, "Anton, sans-serif", "400", 118 * s, w * 0.91);
  ctx.lineWidth = px * 0.14;
  ctx.strokeStyle = "#160a2e";
  ctx.strokeText(caption, w * 0.045, bandY + 108 * s);
  const grad = ctx.createLinearGradient(0, bandY, 0, bandY + 120 * s);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.55, "#ffd23f");
  grad.addColorStop(1, "#ff5ea8");
  ctx.fillStyle = grad;
  ctx.fillText(caption, w * 0.045, bandY + 108 * s);
  if (state.subtitle) {
    ctx.font = Math.round(52 * s) + "px Pacifico, cursive";
    ctx.fillStyle = "#7df9ff";
    ctx.shadowColor = "#ff2e88";
    ctx.shadowBlur = 16 * s;
    ctx.fillText(state.subtitle, w * 0.05, bandY + 168 * s);
    ctx.shadowBlur = 0;
  }
  if (state.quote) {
    ctx.font = "italic 600 " + Math.round(30 * s) + "px Georgia, serif";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText("“" + state.quote + "”", w * 0.05, bandY + 216 * s);
  }
  drawChips(ctx, state.tags || [], w, h - 62 * s, s);
  drawHeatPill(ctx, w * 0.045, 30 * s, s);
  drawSeal(ctx, w - 108 * s, 108 * s, 78 * s);
  ctx.restore();
}
