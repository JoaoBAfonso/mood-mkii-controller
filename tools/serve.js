import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replaceAll('/', sep)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
    const file = path === root ? resolve(root, 'index.html') : path;
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') res.writeHead(404).end('Not found');
    else { console.error(error); res.writeHead(500).end('Server error'); }
  }
});
server.listen(4173, '127.0.0.1', () => console.log('MOOD MIDI Studio: http://127.0.0.1:4173'));
