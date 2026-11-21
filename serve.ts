// Vice Sunset Cover Maker — tiny offline static server (Node 22, stdlib only).
// Serves app/ as the web root, so http://localhost:8080/ loads app/index.html
// and relative paths (style.css, src/*.js, samples/*) resolve under app/.
// Anything not found under app/ falls back to the repo root (README, screenshots).
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const APP = join(ROOT, 'app');
const PORT = Number(process.env.PORT ?? 8080);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

function safeJoin(base: string, urlPath: string): string | null {
  const cleaned = normalize(urlPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const filePath = resolve(join(base, cleaned));
  return filePath.startsWith(base) ? filePath : null;
}

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (urlPath === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  let filePath: string | null = null;
  if (urlPath === '/' || urlPath === '') {
    filePath = join(APP, 'index.html');
  } else {
    const underApp = safeJoin(APP, urlPath);
    if (underApp && existsSync(underApp)) filePath = underApp;
    else {
      const underRoot = safeJoin(ROOT, urlPath);
      if (underRoot && existsSync(underRoot)) filePath = underRoot;
    }
  }
  if (filePath && existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Vice Sunset Cover Maker at http://localhost:${PORT}/`);
});
