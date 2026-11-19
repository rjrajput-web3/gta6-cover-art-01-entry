// Vice Cover Studio — the program that hands this entry in.
//
// It runs on Node 22 with only the standard library. Its whole job is to
// gather the finished pieces and lay them out for the grader: copy the
// app/ folder (the static offline web app) and the screenshots/ folder
// (the four judge-facing images) from next to this file into the output
// directory, then write output/dossier.json through the vendored make.fun
// helper, which is the summary the judge reads.
//
// Serve the app while building with `node serve.ts`, then open
// http://localhost:8080. Outside the grader's container, set
// MAKEFUN_OUTPUT_DIR to a scratch folder instead of /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's own gate: no more than four screenshots and
// none over 256 KiB, app/ under 993 files and 48 MiB in total, no path under
// app/ over 1000 bytes. Only text_max_bytes changes the dossier's bytes;
// the rest refuse an entry the scorer would refuse anyway.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
