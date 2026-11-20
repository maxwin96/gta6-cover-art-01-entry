// A minimal static file server for app/ (Node 22, standard library only).
// It exists so the entry can be tried locally with no build step:
//
//   node serve.ts            # serves app/ on http://localhost:8080
//   node serve.ts --port 8091
//
// Development convenience only — this file is not part of the handed-in app.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const cliArgs = process.argv.slice(2);
const portFlag = cliArgs.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(cliArgs[portFlag + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function replyError(response, code, message) {
  response.writeHead(code).end(message);
}

function resolveRequestedPath(rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(rawUrl ?? '/', 'http://localhost').pathname);
  } catch {
    return { error: 400 };
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(appRoot, normalize(pathname)));
  if (file !== appRoot && !file.startsWith(appRoot + sep)) return { error: 403 };
  return { file };
}

const server = createServer((request, response) => {
  const resolved = resolveRequestedPath(request.url);
  if (resolved.error) {
    replyError(response, resolved.error, resolved.error === 400 ? 'bad request' : 'forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(resolved.file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    replyError(response, 404, 'not found');
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(resolved.file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(resolved.file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`app/ is on http://localhost:${port}`);
});
