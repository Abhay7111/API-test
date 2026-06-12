/* eslint-disable no-undef */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 4001;

// ensure data file exists
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf8');

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function sendJSON(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(s);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      if (!data) return resolve(null);
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'POST' && url.pathname === '/share') {
    try {
      const body = await parseBody(req);
      if (!body || typeof body !== 'object') return sendJSON(res, 400, { error: 'Expected JSON object in request body' });
      const id = randomUUID();
      const store = readStore();
      store[id] = { data: body, createdAt: Date.now() };
      writeStore(store);
      const host = req.headers.host || `localhost:${PORT}`;
      const link = `http://${host}/data/${id}`;
      return sendJSON(res, 201, { id, url: link });
    } catch {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/data/')) {
    const id = url.pathname.split('/')[2];
    const store = readStore();
    if (!store[id]) return sendJSON(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(store[id].data));
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/data/')) {
    const id = url.pathname.split('/')[2];
    const store = readStore();
    if (!store[id]) return sendJSON(res, 404, { error: 'Not found' });
    delete store[id];
    writeStore(store);
    return sendJSON(res, 200, { ok: true });
  }

  // simple index/help
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('Data Share Service\nPOST /share {object} -> returns {id, url}\nGET /data/:id -> returns object');
  }

  sendJSON(res, 404, { error: 'Unknown endpoint' });
});

server.listen(PORT, () => console.log(`data-share server listening on http://localhost:${PORT}`));
