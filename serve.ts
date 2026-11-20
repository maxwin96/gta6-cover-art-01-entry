// Vice Sunset Cover Maker — static file server.
//
// Serves app/ on http://localhost:8080. Node 22+, standard library only.
// Usage: node serve.ts   then open http://localhost:8080 in a browser.

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = 8080;
const APP_DIR = resolve(import.meta.dirname ?? '.', 'app');

/** MIME types for the extensions the app serves. */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

/** Resolve a request path inside app/, or null when it escapes the tree. */
function resolveInside(requestPath: string): string | null {
  const cleaned = normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, '');
  const full = resolve(APP_DIR, `.${cleaned}`);
  return full === APP_DIR || full.startsWith(`${APP_DIR}/`) ? full : null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let target = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = resolveInside(target);
  if (file === null) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden\n');
    return;
  }
  let stat;
  try {
    stat = statSync(file);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found\n');
    return;
  }
  if (!stat.isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found\n');
    return;
  }
  const mime = MIME_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': mime, 'content-length': stat.size });
  res.end(readFileSync(file));
});

server.listen(PORT, () => {
  console.log(`Vice Sunset Cover Maker serving app/ at http://localhost:${PORT}/`);
});
