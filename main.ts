// Vice Sunset Cover Maker — build entrypoint.
// Copies app/ and screenshots/ into OUT_DIR and writes dossier.json there.
// NEVER deletes OUT_DIR itself: on the grading server OUT_DIR is a mount
// point, and removing it fails with EBUSY. Only mkdir + write/copy inside it.
import { mkdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || 'out';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function build() {
  // Create OUT_DIR (and its children) without ever removing OUT_DIR itself.
  mkdirSync(join(OUT_DIR, 'app'), { recursive: true });
  mkdirSync(join(OUT_DIR, 'screenshots'), { recursive: true });
  cpSync(join(ROOT, 'app'), join(OUT_DIR, 'app'), { recursive: true });
  cpSync(join(ROOT, 'screenshots'), join(OUT_DIR, 'screenshots'), { recursive: true });
  const dossier = buildDossier(OUT_DIR, CAPS);
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
  console.log(`built ${OUT_DIR} (dossier ${dossier.length} bytes)`);
}

function validateOutput() {
  const required = [
    join(OUT_DIR, 'app', 'index.html'),
    join(OUT_DIR, 'app', 'src', 'main.js'),
    join(OUT_DIR, 'app', 'src', 'cover.js'),
    join(OUT_DIR, 'app', 'style.css'),
    join(OUT_DIR, 'dossier.json'),
  ];
  for (const file of required) {
    if (!existsSync(file)) throw new Error(`missing output file: ${file}`);
  }
  const shots = ['01-cover.png', '02-editor.png', '03-cover-portrait.png', '04-cover-square.png'];
  for (const shot of shots) {
    if (!existsSync(join(OUT_DIR, 'screenshots', shot))) {
      throw new Error(`missing screenshot: ${shot}`);
    }
  }
  console.log('validateOutput: app + 4 screenshots + dossier.json present');
}

build();
validateOutput();
