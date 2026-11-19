// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the exported cover alone, drawn by the app
// itself at the requested export size. `layout`, `grade`, `size`, `photo` and
// `caption` come from the query. window.__shotReady is set once painted.
import { drawCover } from './cover.js';

function applyScene(state, query) {
  state.layout = query.get('layout') || state.layout;
  state.grade = query.get('grade') || state.grade;
  state.title = query.get('caption') || state.title;
  state.subtitle = query.get('subtitle') || state.subtitle;
  state.captionPos = query.get('captionPos') || state.captionPos;
  state.intensity = query.get('intensity') ? Number(query.get('intensity')) : state.intensity;
  const photo = query.get('photo') || 'pier';
  state.panels.forEach((p, i) => {
    p.img = null;
    // Hero (panel 0) is a wide strip, so shift the photo down to keep faces
    // in frame; lower panels get a small shift too. drawPanel clamps the
    // offset so the photo always covers its panel.
    p.zoom = [1, 1, 1, 1][i] || 1;
    p.flip = i === 3;
    p.ox = 0;
    p.oy = [0.75, 0.3, 0, 0.3][i] || 0;
  });
  return photo;
}

export async function runShot(shot, query, state, canvas, samples, loadImage, redraw) {
  const photo = applyScene(state, query);
  // Wait for the Anton poster font so the caption renders in the shot.
  try { await document.fonts.load('80px Anton'); } catch { /* fall back to sans */ }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = (query.get('size') || '1920x1080').split('x').map(Number);
    canvas.width = size[0];
    canvas.height = size[1];
    // Alternate the hero photo between the two samples so each cover shot
    // shows a different picture in its top panel.
    const hero = photo === 'boulevard' ? samples[1] : samples[0];
    const other = photo === 'boulevard' ? samples[0] : samples[1];
    const ordered = [hero, other, hero, other];
    drawCover(canvas, state, ordered);
  } else {
    // Editor scene: pier in the hero, boulevard in the lower panels.
    const ordered = [samples[0], samples[1], samples[0], samples[1]];
    drawCover(canvas, state, ordered);
    const title = document.getElementById('title');
    if (title) title.value = state.title;
    const subtitle = document.getElementById('subtitle');
    if (subtitle) subtitle.value = state.subtitle;
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
