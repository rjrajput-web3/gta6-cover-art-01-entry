// Shot mode: the query string can preset the whole studio, which is how
// the screenshots in shots.json are taken. `?shot=cover` fills the window
// with one finished cover at the requested size; `?shot=editor` opens the
// editor with the preset already applied. With no `shot` parameter the
// studio starts normally and this module changes nothing.

function numberList(raw) {
  if (!raw) return [];
  return raw.split(',').map((part) => {
    const n = Number(part);
    return Number.isFinite(n) ? n : 0;
  });
}

function textList(raw) {
  if (!raw) return [];
  return raw.split('|').map((part) => part.trim()).filter(Boolean);
}

// Read the query string into a partial studio state. Returns null when
// the page was opened without a shot request.
export function readShotRequest() {
  const q = new URLSearchParams(window.location.search);
  const mode = q.get('shot');
  if (mode !== 'cover' && mode !== 'editor') return null;

  const shot = { mode, size: null, state: {} };
  const sizeRaw = q.get('size');
  if (sizeRaw) {
    const [w, h] = sizeRaw.split('x').map((n) => Number(n));
    if (w > 0 && h > 0) shot.size = { w, h };
  }
  if (q.get('layout')) shot.state.layout = q.get('layout');
  if (q.get('grade')) shot.state.grade = q.get('grade');
  if (q.get('caption') !== null) shot.state.caption = q.get('caption');
  if (q.get('subtitle') !== null) shot.state.subtitle = q.get('subtitle');
  if (q.get('quote') !== null) shot.state.quote = q.get('quote');
  const tags = textList(q.get('tags'));
  if (tags.length) shot.state.tags = tags;

  const photos = numberList(q.get('photos'));
  const oxs = numberList(q.get('ox'));
  const oys = numberList(q.get('oy'));
  if (photos.length) {
    shot.state.panels = photos.map((photo, i) => ({
      photo,
      ox: oxs[i] || 0,
      oy: oys[i] || 0,
      zoom: 1,
      flip: false,
    }));
  }
  return shot;
}

// In cover-shot mode the rendered PNG is published on the window and in a
// data element, so a headless browser can lift the exact bytes the app
// produced (and check that two runs agree byte for byte).
export function publishShotPng(canvas) {
  const url = canvas.toDataURL('image/png');
  window.__SHOT_PNG__ = url;
  const holder = document.createElement('pre');
  holder.id = 'shot-data';
  holder.hidden = true;
  holder.textContent = url;
  document.body.appendChild(holder);
  document.body.dataset.shotReady = '1';
}
