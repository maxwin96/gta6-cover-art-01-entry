// Vice Sunset Cover Maker — entrypoint.
//
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json from them with the make.fun kit library (vendor/makefun-app.ts).
// Node 22+, standard library only. Deterministic: two runs on the same
// source tree write byte-identical output.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

/** Where the entry goes: $MAKEFUN_OUTPUT_DIR, or /output when unset. */
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

/** The dossier caps this bounty gates on (see vendor/makefun-app.ts). */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
} as const;

/** Copy one tree into the output directory, refusing anything unexpected. */
function copyTree(repoRoot: string, name: 'app' | 'screenshots'): void {
  const src = join(repoRoot, name);
  const dst = join(OUTPUT_DIR, name);
  if (!existsSync(src) || !statSync(src).isDirectory()) {
    throw new Error(`${name}/: no such directory next to main.ts`);
  }
  cpSync(src, dst, { recursive: true });
}

/** Count the files under a directory, for the summary line. */
function countFiles(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}

/**
 * Refuse to write a dossier over an incomplete copy: index.html must be
 * present and screenshots/ must hold 3 or 4 images, matching the bounty.
 */
function validateOutput(): void {
  const index = join(OUTPUT_DIR, 'app', 'index.html');
  if (!existsSync(index) || !statSync(index).isFile()) {
    throw new Error('output/app/index.html is missing after the copy');
  }
  const shots = readdirSync(join(OUTPUT_DIR, 'screenshots')).filter((f) =>
    /\.(png|jpe?g)$/i.test(f),
  );
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`output/screenshots holds ${shots.length} images, expected 3 or 4`);
  }
}

function main(): void {
  const repoRoot = resolve(import.meta.dirname ?? '.');
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyTree(repoRoot, 'app');
  copyTree(repoRoot, 'screenshots');
  validateOutput();
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  const appFiles = countFiles(join(OUTPUT_DIR, 'app'));
  const shotFiles = countFiles(join(OUTPUT_DIR, 'screenshots'));
  console.log(
    `Vice Sunset Cover Maker -> ${OUTPUT_DIR} ` +
      `(${appFiles} app files, ${shotFiles} screenshots, dossier.json ${dossier.length} bytes)`,
  );
}

main();
