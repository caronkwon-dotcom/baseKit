import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ViteDevServer } from 'vite'

const CURATION_FILE = path.resolve('meta/term-curation.json')
const EDITABLE_METADATA_FILES = new Map([
  ['words', path.resolve('meta/words.json')],
  ['domains', path.resolve('meta/domains.json')],
])

async function writeJsonAtomically(filePath: string, value: unknown) {
  const temporaryFile = `${filePath}.tmp`
  const backupFile = `${filePath}.bak`
  await fs.writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  JSON.parse(await fs.readFile(temporaryFile, 'utf8'))
  await fs.copyFile(filePath, backupFile)
  try {
    await fs.copyFile(temporaryFile, filePath)
    JSON.parse(await fs.readFile(filePath, 'utf8'))
    await fs.rm(temporaryFile, { force: true })
    await fs.rm(backupFile, { force: true })
  } catch (error) {
    await fs.copyFile(backupFile, filePath)
    throw error
  }
}

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
            await writeJsonAtomically(CURATION_FILE, next)
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

function editableMetadataLocalApi() {
  return {
    name: 'basekit-editable-metadata-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/metadata/', async (request: IncomingMessage, response: ServerResponse) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        const fileName = request.url?.split('?')[0].replace(/^\//, '') ?? ''
        const filePath = EDITABLE_METADATA_FILES.get(fileName)
        if (!filePath) { response.statusCode = 404; response.end(JSON.stringify({ message: '지원하지 않는 메타데이터입니다.' })); return }
        if (request.method === 'GET') { response.end(await fs.readFile(filePath, 'utf8')); return }
        if (request.method !== 'PUT') { response.statusCode = 405; response.end(JSON.stringify({ message: 'Method Not Allowed' })); return }

        const chunks: Buffer[] = []
        request.on('data', (chunk?: Buffer) => chunk && chunks.push(chunk))
        request.on('end', async () => {
          try {
            const next = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (!Array.isArray(next)) throw new Error('메타데이터는 배열이어야 합니다.')
            await writeJsonAtomically(filePath, next)
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
  plugins: [react(), termCurationLocalApi(), editableMetadataLocalApi()],
})
