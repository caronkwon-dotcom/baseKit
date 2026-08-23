import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backendDir = path.join(workspaceDir, 'backend')
const wrapperName = process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw'
const wrapperPath = path.join(backendDir, wrapperName)

const result = spawnSync(wrapperPath, process.argv.slice(2), {
  cwd: backendDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error(`Backend Maven Wrapper 실행 실패: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
