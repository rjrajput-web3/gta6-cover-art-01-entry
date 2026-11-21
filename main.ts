// VICE HEAT — hand-in program for the gta6-cover-art-01 competition.
// Node 22, standard library only. It gathers this repository's app/ folder
// and screenshots/ folder into the output directory and writes the
// dossier.json the make.fun judge reads, using the vendored library.
//
// Run it directly:
//
//   node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR replaces /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(source, target) {
  mkdirSync(target, { recursive: true });
  if (existsSync(source)) cpSync(source, target, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outDir, 'app'));
copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

// The scorer's caps for this competition: at most 4 screenshots, each under
// 256 KiB; the app tree under 993 files and 48 MiB in total, no path over
// 1000 bytes; the dossier text under 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier written to ${join(outDir, 'dossier.json')}`);
