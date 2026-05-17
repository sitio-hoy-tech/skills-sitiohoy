/**
 * run-qa.mjs
 * Ejecuta el pipeline de QA de SitioHoy en orden:
 *   preflight → lint → build → sitiohoy:validate → sitiohoy:e2e → lighthouse → qa-report
 *
 * Uso: node scripts/run-qa.mjs
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

// Leer scripts del package.json de forma segura
const pkgPath = 'package.json'
const scripts = existsSync(pkgPath)
  ? (JSON.parse(await readFile(pkgPath, 'utf8')).scripts ?? {})
  : {}

function run(label, command) {
  console.log(`\n── ${label} ${'─'.repeat(Math.max(0, 40 - label.length))}`)
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    console.error(`\n✗ "${label}" falló con código ${result.status ?? 1}`)
    process.exit(result.status ?? 1)
  }
  console.log(`✓ ${label}`)
}

// Orden de ejecución: bloquear temprano si falta contexto crítico.
if (existsSync('scripts/preflight.mjs')) run('sitiohoy:preflight', ['node', 'scripts/preflight.mjs'])
if (scripts.lint)       run('lint',                  ['npm', 'run', 'lint'])
if (scripts.build)      run('build',                 ['npm', 'run', 'build'])
                        run('sitiohoy:validate',     ['node', 'scripts/validate-sitiohoy.mjs'])
if (existsSync('scripts/secret-scan.mjs')) run('sitiohoy:secret-scan', ['node', 'scripts/secret-scan.mjs'])
if (existsSync('scripts/visual-audit.mjs')) run('sitiohoy:visual-audit', ['node', 'scripts/visual-audit.mjs'])
if (scripts['sitiohoy:e2e']) run('sitiohoy:e2e',      ['npm', 'run', 'sitiohoy:e2e'])
else if (scripts['test:e2e']) run('e2e',              ['npm', 'run', 'test:e2e'])
if (scripts.lighthouse)  run('lighthouse',            ['npm', 'run', 'lighthouse'])
if (scripts['sitiohoy:qa-report']) run('sitiohoy:qa-report', ['npm', 'run', 'sitiohoy:qa-report'])

console.log('\n✅ QA pipeline completo\n')
