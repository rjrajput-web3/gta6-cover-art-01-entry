// Fixed scenes for screenshots: ?shot=cover renders one default composition
// full-bleed; ?shot=editor shows the full studio with a composed cover loaded.
// All parameters come from shots.json so the judged renders are reproducible.
import { SAMPLES, DEFAULT_STATE } from './cover.js';

export function stateFromQuery(query) {
  const s = { ...DEFAULT_STATE, offsets: {} };
  const num = (k) => { const v = query.get(k); return v === null ? null : Number(v); };
  if (num('layout') !== null) s.layout = num('layout');
  if (num('grade') !== null) s.grade = num('grade');
  if (num('look') !== null) s.look = num('look');
  if (num('seed') !== null) s.seed = num('seed');
  if (num('grain') !== null) s.grain = num('grain');
  if (num('halation') !== null) s.halation = num('halation');
  for (const k of ['titleA', 'titleB', 'script', 'sub', 'quote', 'source']) {
    const v = query.get(k); if (v !== null) s[k] = v;
  }
  // Panel photo order: ?photos=2,0,1 rotates which sample fills each slot.
  const order = (query.get('photos') || '').split(',').map(Number).filter(n => Number.isFinite(n));
  s.photoOrder = order.length ? order : SAMPLES.map((_, i) => i);
  return s;
}

export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  await apply(stateFromQuery(query));
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
