/**
 * secret-scan.mjs
 * Escanea archivos commiteables en busca de secretos reales.
 */

import { existsSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const findings = []
const skipDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '_assets-cliente'])
const skipFiles = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', '.env.local', 'credentials.local.json', 'admin-credentials.local.json'])

const patterns = [
  { name: 'Supabase service role JWT', regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { name: 'MercadoPago token', regex: /\b(?:APP_USR|TEST)-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Resend API key', regex: /\bre_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Generic bearer token', regex: /\bBearer\s+[A-Za-z0-9._-]{30,}\b/g },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Password assignment', regex: /\b(?:password|passwd|correo_argentino_password)\s*[:=]\s*['"][^'"]{8,}['"]/gi },
]

const isPlaceholder = (value) => {
  const lower = value.toLowerCase()
  return ['placeholder', 'example', 'tu_', 'xxx', 'cambiar', 'secret', 'token_de', 'supabase_service_role_key'].some(marker => lower.includes(marker))
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.') && !['.env.example', '.sitiohoy'].includes(entry.name)) {
      if (entry.name !== '.env') continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) files.push(...await walk(full))
    } else if (!skipFiles.has(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function gitFiles() {
  try {
    const out = execSync('git ls-files --cached --others --exclude-standard', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return out.split('\n').filter(Boolean).map(file => path.join(root, file))
  } catch {
    return null
  }
}

const files = gitFiles() ?? await walk(root)
for (const file of files) {
  if (!existsSync(file)) continue
  const rel = path.relative(root, file)
  const fileStat = await stat(file)
  if (fileStat.size > 1024 * 1024) continue

  const text = await readFile(file, 'utf8').catch(() => '')
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.regex)) {
      const value = match[0]
      if (isPlaceholder(value)) continue
      const line = text.slice(0, match.index).split('\n').length
      findings.push({ file: rel, line, type: pattern.name })
    }
  }
}

if (findings.length) {
  console.log('\nSecret scan encontró posibles secretos:')
  for (const finding of findings) {
    console.log(`- ${finding.file}:${finding.line} ${finding.type}`)
  }
  console.log('\nMover secretos a .env.local, Vercel env vars o tabla tenants según corresponda.\n')
  process.exit(1)
}

console.log('Secret scan OK')
