// Vice Sunset Cover Maker — entry builder.
// Copies app/ and screenshots/ into the output directory, then writes the
// make.fun dossier (makefun/dossier/v1) the scorer recomputes byte for byte.
//
// Usage:  MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? 'out');

// The bounty's gate caps (gate.json keys, passed whole to buildDossier).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function build(): void {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  for (const dir of ['app', 'screenshots']) {
    const src = join(ROOT, dir);
    if (!existsSync(src)) throw new Error(`missing ${dir}/ in ${ROOT}`);
    cpSync(src, join(OUT_DIR, dir), { recursive: true });
  }
  const dossier = buildDossier(OUT_DIR, CAPS);
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
  validateOutput(OUT_DIR, dossier);
  console.log(`wrote ${join(OUT_DIR, 'dossier.json')} (${dossier.length} bytes)`);
}

// Validates the built output before reporting success: the dossier must
// parse with the expected schema, the entry page must exist, there must be
// 3–4 screenshots, and a second buildDossier run must produce byte-identical
// bytes (determinism check — a non-deterministic dossier fails the scorer).
function validateOutput(outDir: string, dossier: Uint8Array): void {
  const parsed = JSON.parse(new TextDecoder().decode(dossier)) as { schema?: string };
  if (parsed.schema !== 'makefun/dossier/v1') {
    throw new Error(`dossier schema mismatch: ${String(parsed.schema)}`);
  }
  if (!existsSync(join(outDir, 'app', 'index.html'))) {
    throw new Error('output is missing app/index.html');
  }
  const shots = readdirSync(join(outDir, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`expected 3–4 screenshots, found ${shots.length}`);
  }
  const rebuilt = buildDossier(outDir, CAPS);
  if (!Buffer.from(rebuilt).equals(Buffer.from(dossier))) {
    throw new Error('dossier is not deterministic: second build differs');
  }
}

build();
