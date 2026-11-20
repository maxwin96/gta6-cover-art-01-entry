// Vice Sunset Cover Maker — submission packager (Node 22, stdlib only).
//
// Stages the entry for make.fun: it copies this repo's app/ and screenshots/
// into the output directory (defaults to /output, or $MAKEFUN_OUTPUT_DIR when
// set) and writes a dossier.json there using buildDossier from the vendored
// make.fun library. The output is deterministic — running it twice produces
// byte-identical files — so the dossier always matches what is staged.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function stageFolder(sourceName) {
  const source = join(repoRoot, sourceName);
  const target = join(outputDir, sourceName);
  mkdirSync(target, { recursive: true });
  if (existsSync(source)) cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
stageFolder('app');
stageFolder('screenshots');

// Guard rails matching the kit's reference/gate.json. Only text_max_bytes
// changes the dossier bytes; the remaining caps reject an entry the scorer
// itself would refuse: at most 4 screenshots, none over 256 KiB; at most
// 993 files inside app/ totalling 48 MiB; no app/ path longer than 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
