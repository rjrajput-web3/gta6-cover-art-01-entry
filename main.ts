// VICE HEAT - entrypoint (Node 22, standard library only).
// Hands the app in: copies app/ and screenshots/ into the output directory
// and writes /output/dossier.json with buildDossier from the kit's library.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
// The run is deterministic: the same repository writes the same bytes.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`VICE HEAT dossier written to ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
