// Shot presets for Neon Coast Cover Studio.
//
// A screenshot run opens the studio with a query string instead of a
// person at the controls. Two modes are recognised:
//
//   ?shot=cover   one finished cover fills the window at &size=WxH
//   ?shot=editor  the normal editor, with the preset already applied
//
// Everything else (layout, grade, photos, ox, oy, zoom, flip, caption,
// subtitle, quote, tags) is optional and overrides the matching piece
// of the studio state, so a shot is fully described by its URL and two
// runs of the same URL paint the identical cover. With no shot
// parameter this module returns null and changes nothing.

function parseInts(raw) {
  if (!raw) return [];
  return raw.split(",").map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

function parseFloats(raw) {
  if (!raw) return [];
  return raw.split(",").map((part) => {
    const n = Number(part);
    return Number.isFinite(n) ? n : 0;
  });
}

function parseTags(raw) {
  if (!raw) return [];
  return raw.split("|").map((t) => t.trim()).filter((t) => t.length > 0);
}

// Read the current query string. Returns null for a normal visit, or
// { mode, size, state } where state is a partial renderCover state:
// text fields plus a photos array and a parallel views array.
export function readShotRequest() {
  const q = new URLSearchParams(window.location.search);
  const mode = q.get("shot");
  if (mode !== "cover" && mode !== "editor") return null;

  const state = {};
  if (q.get("layout")) state.layout = q.get("layout");
  if (q.get("grade")) state.grade = q.get("grade");
  for (const key of ["caption", "subtitle", "quote"]) {
    if (q.has(key)) state[key] = q.get(key);
  }
  const tags = parseTags(q.get("tags"));
  if (tags.length) state.tags = tags;

  const photos = parseInts(q.get("photos"));
  if (photos.length) {
    const oxs = parseFloats(q.get("ox"));
    const oys = parseFloats(q.get("oy"));
    const zooms = parseFloats(q.get("zoom"));
    const flips = q.get("flip") ? q.get("flip").split(",") : [];
    state.photos = photos;
    state.views = photos.map((_, i) => ({
      ox: oxs[i] || 0,
      oy: oys[i] || 0,
      zoom: zooms[i] > 0 ? zooms[i] : 1,
      flip: flips[i] === "1" || flips[i] === "true",
    }));
  }

  let size = null;
  const rawSize = q.get("size");
  if (rawSize) {
    const parts = rawSize.split("x");
    const w = Number(parts[0]);
    const h = Number(parts[1]);
    if (w > 0 && h > 0) size = { w, h };
  }
  return { mode, size, state };
}

// Publish a finished cover shot for the headless capture step: the PNG
// data URL goes on the window, into a hidden element, and a ready flag
// lands on <body> so the capturer knows the paint has settled.
export function publishShotPng(canvas) {
  const url = canvas.toDataURL("image/png");
  window.__SHOT_PNG__ = url;
  const holder = document.createElement("pre");
  holder.id = "shot-data";
  holder.hidden = true;
  holder.textContent = url;
  document.body.appendChild(holder);
  document.body.dataset.shotReady = "1";
}
