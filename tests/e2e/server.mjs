// Local test-only static server with two actual immutable Vite builds.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

let version = 'a';
const root = resolve('dist-e2e');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:4173');
    if (url.pathname.startsWith('/__test/version/')) {
      const next = url.pathname.split('/').at(-1);
      if (request.method !== 'POST' || !['a', 'b'].includes(next)) { response.writeHead(400).end(); return; }
      version = next; response.writeHead(204).end(); return;
    }
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    const directory = resolve(root, version);
    let file = resolve(directory, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(directory + sep) && file !== directory) { response.writeHead(403).end(); return; }
    if (url.pathname === '/') file = resolve(directory, 'index.html');
    try { if (!(await stat(file)).isFile()) throw new Error('not a file'); }
    catch { if (!extname(url.pathname)) file = resolve(directory, 'index.html'); else { response.writeHead(404).end(); return; } }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(content);
  } catch { response.writeHead(500).end(); }
});
server.listen(4173, '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.closeAllConnections();
  server.close();
});
