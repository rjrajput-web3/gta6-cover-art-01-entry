// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the
// query's layout and grade; ?shot=editor shows the editor with a sample
// photo loaded. The scene is fully set by the query, so two runs of the
// same URL render the same pixels. window.__shotReady is set once the
// fonts are in and the cover has been painted.
import { defaultState, applyPreset, LAYOUTS, GRADES } from './cover.js';

function sceneState(query) {
  const state = defaultState();
  const preset = query.get('preset');
  if (preset) {
    const next = applyPreset(state, preset);
    Object.assign(state, next);
  }
  const layout = query.get('layout');
  if (layout && LAYOUTS.some((l) => l.id === layout)) state.layout = layout;
  const grade = query.get('grade');
  if (grade && GRADES.some((g) => g.id === grade)) state.grade = grade;
  const subtitle = query.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
  const subtitleStyle = query.get('subtitleStyle');
  if (subtitleStyle) state.subtitleStyle = subtitleStyle;
  const titleSize = Number(query.get('titleSize'));
  if (Number.isFinite(titleSize) && titleSize > 0) state.titleSize = titleSize;
  const seed = Number(query.get('seed'));
  if (Number.isFinite(seed)) state.seed = seed;
  return state;
}

export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const state = sceneState(query);
  api.setState(state);
  const photo = query.get('photo') ?? 'rooftop';
  const caption = query.get('caption') ?? 'VICE HEAT';
  await api.load(photo, caption);
  // Wait for the two display fonts, then paint twice so the canvas holds
  // the final glyphs before the screenshot is taken.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('100px Pacifico'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch { /* fonts fall back to system faces; the shot still renders */ }
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  api.redraw();
  window.__shotReady = true;
}
