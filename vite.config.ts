import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ViteDevServer } from 'vite'

const CURATION_FILE = path.resolve('meta/term-curation.json')

function termCurationLocalApi() {
  return {
    name: 'basekit-term-curation-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/term-curation', async (request: IncomingMessage, response: ServerResponse) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')

        if (request.method === 'GET') {
          response.end(await fs.readFile(CURATION_FILE, 'utf8'))
          return
        }

        if (request.method !== 'PUT') {
          response.statusCode = 405
          response.end(JSON.stringify({ message: 'Method Not Allowed' }))
          return
        }

        const chunks: Buffer[] = []
        request.on('data', (chunk?: Buffer) => chunk && chunks.push(chunk))
        request.on('end', async () => {
          try {
            const next = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (next.version !== 1 || typeof next.reviews !== 'object') {
              throw new Error('지원하지 않는 정제 데이터 형식입니다.')
            }
            const temporaryFile = `${CURATION_FILE}.tmp`
            await fs.writeFile(temporaryFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
            JSON.parse(await fs.readFile(temporaryFile, 'utf8'))
            await fs.rename(temporaryFile, CURATION_FILE)
            response.end(JSON.stringify({ saved: true }))
          } catch (error) {
            response.statusCode = 400
            response.end(JSON.stringify({ message: error instanceof Error ? error.message : '저장 실패' }))
          }
        })
      })
    },
  }
}

// GitHub Pages project site: https://caronkwon-dotcom.github.io/baseKit/
export default defineConfig({
  base: '/baseKit/',
  plugins: [react(), termCurationLocalApi()],
})
