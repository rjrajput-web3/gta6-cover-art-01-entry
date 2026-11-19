// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the exported cover alone, drawn by the
// app itself at the requested export size. `layout`, `grade`, `size`,
// `caption`, `subtitle`, `quote`, `tags` and `photos` (comma list of sample
// indexes, one per panel) come from the query. window.__shotReady is set
// once painted. Every cover scene deals a different photo into each panel,
// so no screenshot repeats the same face twice in a row.
import { drawCover } from './cover.js';

function applyScene(state, query) {
  state.layout = query.get('layout') || state.layout;
  state.grade = query.get('grade') || state.grade;
  state.title = query.get('caption') || state.title;
  state.subtitle = query.get('subtitle') || state.subtitle;
  state.quote = query.get('quote') || state.quote;
  if (query.get('tags')) state.tags = query.get('tags').split('|').map((t) => t.trim()).filter(Boolean);
  state.captionPos = query.get('captionPos') || state.captionPos;
  state.intensity = query.get('intensity') ? Number(query.get('intensity')) : state.intensity;
  if (query.get('furniture')) {
    const on = query.get('furniture') === 'on';
    state.furniture = { band: on, stars: on, seal: on };
  }
  return query.get('photos') || '';
}

export async function runShot(shot, query, state, canvas, samples, loadImage, redraw) {
  const photos = applyScene(state, query);
  // Wait for both poster fonts so the lettering renders in the shot.
  try {
    await document.fonts.load('80px Anton');
    await document.fonts.load('40px Pacifico');
  } catch { /* fall back to sans */ }
  // Deal photos into the panels: the query names sample indexes in order,
  // otherwise the four samples are dealt round-robin.
  const deal = photos
    ? photos.split(',').map((n) => Number(n))
    : [0, 1, 2, 3, 0, 1, 2, 3, 0];
  const shifts = (query.get('ox') || '').split(',').map((n) => Number(n));
  state.panels.forEach((p, i) => {
    const idx = deal[i % deal.length];
    p.img = samples[idx] || null;
    p.zoom = 1;
    p.ox = Number.isFinite(shifts[i]) ? shifts[i] : 0;
    // Hero strips are wide, so shift tall portraits down to keep faces in
    // frame; drawPanel clamps the offset so the photo always covers.
    p.oy = i === 0 ? 0.55 : 0.25;
    p.flip = false;
    p.fit = 'cover';
  });
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = (query.get('size') || '1920x1080').split('x').map(Number);
    canvas.width = size[0];
    canvas.height = size[1];
    drawCover(canvas, state, samples);
  } else {
    // Editor scene: the strip layout with four different photos visible.
    drawCover(canvas, state, samples);
    const title = document.getElementById('title');
    if (title) title.value = state.title;
    const subtitle = document.getElementById('subtitle');
    if (subtitle) subtitle.value = state.subtitle;
    const quote = document.getElementById('quote');
    if (quote) quote.value = state.quote;
    const tags = document.getElementById('tags');
    if (tags) tags.value = state.tags.join(', ');
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
