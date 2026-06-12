/* eslint-disable no-undef */
import { defineConfig } from 'vite' 
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { promises as fs, existsSync } from 'node:fs'
import { join } from 'node:path'

const DB_FILE = join(process.cwd(), 'mock-db.json')

const normalizeSlug = (value) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase()

const loadMocks = async () => {
  if (!existsSync(DB_FILE)) {
    await fs.writeFile(DB_FILE, JSON.stringify({}, null, 2), 'utf8')
    return {}
  }
  try {
    const data = await fs.readFile(DB_FILE, 'utf8')
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

const saveMocks = async (mocks) => {
  await fs.writeFile(DB_FILE, JSON.stringify(mocks, null, 2), 'utf8')
}

const mockApiPlugin = {
  name: 'vite:mock-api',
  configureServer(server) {
    let mocks = {}
    let loaded = false

    const loadIfNeeded = async () => {
      if (!loaded) {
        mocks = await loadMocks()
        loaded = true
      }
    }

    server.middlewares.use(async (req, res, next) => {
      await loadIfNeeded()
      const url = new URL(req.url, `http://${req.headers.host}`)
      const path = url.pathname

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        })
        res.end()
        return
      }

      if (path.startsWith('/api/mocks/')) {
        if (req.method === 'DELETE') {
          const slug = normalizeSlug(path.slice('/api/mocks/'.length))
          if (!slug || !mocks[slug]) {
            res.writeHead(404, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            })
            res.end(JSON.stringify({ message: 'Mock not found' }))
            return
          }

          delete mocks[slug]
          await saveMocks(mocks)
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ message: 'Mock deleted' }))
          return
        }
      }

      if (path === '/api/mocks') {
        if (req.method === 'GET') {
          const list = Object.keys(mocks).map((slug) => ({ slug }))
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify(list))
          return
        }

        if (req.method === 'POST') {
          let body = ''
          for await (const chunk of req) {
            body += chunk
          }
          try {
            const payload = JSON.parse(body || '{}')
            const slug = normalizeSlug(String(payload.slug || ''))
            if (!slug) {
              res.writeHead(400, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              })
              res.end(JSON.stringify({ message: 'Slug is required and must contain letters, numbers, dashes or underscores.' }))
              return
            }
            if (!payload.body || typeof payload.body !== 'object' || Array.isArray(payload.body)) {
              res.writeHead(400, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              })
              res.end(JSON.stringify({ message: 'Body must be a JSON object.' }))
              return
            }

            mocks[slug] = payload.body
            await saveMocks(mocks)

            res.writeHead(201, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            })
            res.end(JSON.stringify({ slug, endpoint: `${req.headers.origin || `http://${req.headers.host}`}/mock-api/${slug}` }))
          } catch {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            })
            res.end(JSON.stringify({ message: 'Invalid JSON payload' }))
          }
          return
        }
      }

      if (path.startsWith('/mock-api/')) {
        const slug = path.slice('/mock-api/'.length)
        if (!slug || !mocks[slug]) {
          res.writeHead(404, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ message: 'Mock endpoint not found' }))
          return
        }

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify(mocks[slug]))
        return
      }

      next()
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), mockApiPlugin],
  server: {
    watch: {
      ignored: ['**/mock-db.json'],
    },
  },
})
