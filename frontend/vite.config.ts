import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ViteDevServer } from 'vite'

const CURATION_FILE = path.resolve('meta/term-curation.json')
const REPOSITORY_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DOCUMENT_VIRTUAL_ID = 'virtual:basekit-documents'
const RESOLVED_DOCUMENT_VIRTUAL_ID = `\0${DOCUMENT_VIRTUAL_ID}`
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

async function collectMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory() ? collectMarkdownFiles(entryPath) : [entryPath]
  }))
  return files.flat().filter((filePath) => filePath.endsWith('.md'))
}

function readHeading(content: string, fallback: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback
}

function readStatus(content: string) {
  return content.match(/^## Status\s+([A-Z0-9_-]+)/m)?.[1] ?? undefined
}

function classifyDocument(relativePath: string) {
  if (relativePath.startsWith('docs/releases/')) return { category: 'RELEASE', defaultStatus: 'DEV_PM' }
  if (relativePath.startsWith('docs/decisions/')) return { category: 'DECISION', defaultStatus: 'ACCEPTED' }
  if (relativePath.startsWith('docs/ideas/')) return { category: 'IDEA', defaultStatus: 'IDEA' }
  if (relativePath.includes('dev-guide')) return { category: 'SAMPLE', defaultStatus: 'REFERENCE' }
  if (relativePath === 'docs/basekit-current-status.md') return { category: 'STATUS', defaultStatus: 'CURRENT' }
  return { category: 'GUIDE', defaultStatus: 'REFERENCE' }
}

function basekitDocumentsPlugin() {
  return {
    name: 'basekit-documents',
    resolveId(id: string) {
      return id === DOCUMENT_VIRTUAL_ID ? RESOLVED_DOCUMENT_VIRTUAL_ID : undefined
    },
    async load(id: string) {
      if (id !== RESOLVED_DOCUMENT_VIRTUAL_ID) return undefined
      const documentPaths = [
        path.join(REPOSITORY_ROOT, 'README.md'),
        ...await collectMarkdownFiles(path.join(REPOSITORY_ROOT, 'docs')),
      ]
      const documents = await Promise.all(documentPaths.map(async (filePath) => {
        const content = await fs.readFile(filePath, 'utf8')
        const relativePath = path.relative(REPOSITORY_ROOT, filePath).replaceAll('\\', '/')
        const classification = classifyDocument(relativePath)
        return {
          key: relativePath,
          path: relativePath,
          title: readHeading(content, path.basename(filePath, '.md')),
          category: classification.category,
          status: readStatus(content) ?? classification.defaultStatus,
          content,
        }
      }))
      const categoryOrder = new Map(['RELEASE', 'STATUS', 'DECISION', 'GUIDE', 'SAMPLE', 'IDEA'].map((category, index) => [category, index]))
      documents.sort((left, right) => {
        const categoryDifference = (categoryOrder.get(left.category) ?? 99) - (categoryOrder.get(right.category) ?? 99)
        if (categoryDifference !== 0) return categoryDifference
        return left.category === 'RELEASE'
          ? right.path.localeCompare(left.path)
          : left.title.localeCompare(right.title, 'ko')
      })
      return `export default ${JSON.stringify(documents)}`
    },
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
  plugins: [react(), basekitDocumentsPlugin(), termCurationLocalApi(), editableMetadataLocalApi()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.app.github.dev'],
    proxy: {
      '/api/health': 'http://localhost:8080',
      '/api/standard-design': 'http://localhost:8080',
      '/actuator': 'http://localhost:8080',
      '/v3/api-docs': 'http://localhost:8080',
      '/swagger-ui': 'http://localhost:8080',
    },
  },
})
