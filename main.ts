// Neon Coast Cover Studio — make.fun hand-in.
//
// The scorer re-runs the vendored buildDossier on this entry and
// requires the dossier written here to match it byte for byte, so
// this file only chooses the entry directory, the output path and
// the gate's caps, then hands everything else to vendor/.

import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The runner stages the entry at /output; run from a plain checkout,
// this file's own folder is the entry (it holds app/ + screenshots/).
const here = dirname(fileURLToPath(import.meta.url));
const entryDir = existsSync(join('/output', 'app')) ? '/output' : here;

// The dossier itself must stay under the 1.5 MiB hand-in cap; the
// text cap below keeps the source text well inside it.
const dossier = buildDossier(entryDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

const outPath = join(entryDir, 'dossier.json');
writeFileSync(outPath, dossier);
console.log(`dossier.json written: ${dossier.length} bytes`);
