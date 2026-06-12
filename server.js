/* eslint-disable no-undef */
import http from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';

const PORT = process.env.PORT || 4000;
const DB_FILE = join(process.cwd(), 'mock-db.json');
let mocks = {};

if (existsSync(DB_FILE)) {
  try {
    const file = readFileSync(DB_FILE, 'utf8');
    mocks = file ? JSON.parse(file) : {};
  } catch (err) {
    console.error('Failed to parse mock-db.json:', err.message);
    mocks = {};
  }
}

const saveDb = () => {
  writeFileSync(DB_FILE, JSON.stringify(mocks, null, 2), 'utf8');
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const normalizeSlug = (slug) =>
  slug
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (path === '/api/mocks' && req.method === 'GET') {
    const list = Object.keys(mocks).map((slug) => ({ slug }));
    sendJson(res, 200, list);
    return;
  }

  if (path === '/api/mocks' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body || '{}');
      const slug = normalizeSlug(String(payload.slug || ''));
      if (!slug) {
        sendJson(res, 400, { message: 'Slug is required and must contain letters, numbers, dashes or underscores.' });
        return;
      }
      if (!payload.body || typeof payload.body !== 'object') {
        sendJson(res, 400, { message: 'Body must be a JSON object.' });
        return;
      }

      mocks[slug] = payload.body;
      saveDb();

      sendJson(res, 201, {
        slug,
        endpoint: `http://localhost:${PORT}/mock-api/${slug}`,
      });
    } catch {
      sendJson(res, 400, { message: 'Invalid JSON payload' });
    }
    return;
  }

  if (path.startsWith('/api/mocks/') && req.method === 'DELETE') {
    const slug = normalizeSlug(path.slice('/api/mocks/'.length));
    if (!slug || !mocks[slug]) {
      sendJson(res, 404, { message: 'Mock not found' });
      return;
    }

    delete mocks[slug];
    saveDb();
    sendJson(res, 200, { message: 'Mock deleted' });
    return;
  }

  if (path.startsWith('/mock-api/')) {
    const slug = path.slice('/mock-api/'.length);
    if (!slug || !mocks[slug]) {
      sendJson(res, 404, { message: 'Mock endpoint not found' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(mocks[slug]));
    return;
  }

  sendJson(res, 404, { message: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`);
});
