/**
 * module-close.mjs
 * Cierra un módulo SitioHoy con validación, checks y tracking.
 *
 * Uso:
 *   node scripts/module-close.mjs --modulo 4 --nombre "Checkout" --checks "cart_persists,validate_ok"
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const args = new Map()
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i]
  if (arg.startsWith('--')) {
    const next = process.argv[i + 1]
    args.set(arg.slice(2), next && !next.startsWith('--') ? (i += 1, next) : true)
  }
}

const modulo = Number(args.get('modulo'))
const nombre = args.get('nombre') || `Módulo ${modulo}`
const checks = String(args.get('checks') || '').split(',').map(s => s.trim()).filter(Boolean)
const skipBuild = Boolean(args.get('skip-build'))
const skipPreflight = Boolean(args.get('skip-preflight'))
const runAudit = Boolean(args.get('audit'))

if (!Number.isInteger(modulo) || modulo < 0) {
  console.error('Uso: node scripts/module-close.mjs --modulo N --nombre "Nombre" --checks "check_a,check_b"')
  process.exit(1)
}

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'))
const config = existsSync(path.join(root, 'sitiohoy.config.json'))
  ? await readJson(path.join(root, 'sitiohoy.config.json'))
  : { plan: 'esencial' }
const checklistPath = path.join(root, '.sitiohoy', 'checklists', 'module-checks.json')
const checklist = existsSync(checklistPath) ? await readJson(checklistPath) : null
const moduleSpec = checklist?.plans?.[config.plan]?.modules?.find(item => Number(item.id) === modulo)
const requiredChecks = moduleSpec?.requiredChecks ?? []
const missingChecks = requiredChecks.filter(check => !checks.includes(check))

if (missingChecks.length) {
  console.error(`No se puede cerrar Módulo ${modulo}. Faltan checks:`)
  for (const check of missingChecks) console.error(`- ${check}`)
  console.error('\nAgregar los checks cumplidos con --checks o completar el trabajo pendiente.')
  process.exit(1)
}

function run(label, command) {
  console.log(`\n== ${label} ==`)
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit', shell: false })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function runDeployE2EGate() {
  const isDeployModule = /deploy/i.test(`${moduleSpec?.name ?? ''} ${nombre}`)
  if (!isDeployModule || !pkg.scripts?.['sitiohoy:e2e']) return

  console.log('\n== sitiohoy:e2e ==')
  const result = spawnSync('npm', ['run', 'sitiohoy:e2e'], {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, SITE_URL: process.env.SITE_URL ?? 'http://localhost:3000' },
  })

  if (result.status !== 0) {
    spawnSync('node', [
      'scripts/update-tracking.mjs',
      '--modulo', String(modulo),
      '--nombre', String(nombre),
      '--checks', checks.join(','),
      '--comandos', 'SITE_URL=http://localhost:3000 npm run sitiohoy:e2e',
      '--qa', 'sitiohoy:e2e falló',
      '--bloqueos', 'E2E de usuario real falló antes de deploy',
    ], { stdio: 'inherit', shell: false })
    process.exit(result.status ?? 1)
  }
}

if (!skipPreflight && existsSync(path.join(root, 'scripts', 'preflight.mjs'))) {
  run('sitiohoy:preflight', ['node', 'scripts/preflight.mjs'])
}

const pkg = existsSync(path.join(root, 'package.json'))
  ? await readJson(path.join(root, 'package.json'))
  : { scripts: {} }
if (!skipBuild && pkg.scripts?.build) run('build', ['npm', 'run', 'build'])
if (existsSync(path.join(root, 'scripts', 'validate-sitiohoy.mjs'))) {
  run('sitiohoy:validate', ['node', 'scripts/validate-sitiohoy.mjs'])
}
if (existsSync(path.join(root, 'scripts', 'secret-scan.mjs'))) {
  run('sitiohoy:secret-scan', ['node', 'scripts/secret-scan.mjs'])
}
runDeployE2EGate()

const trackingArgs = [
  'scripts/update-tracking.mjs',
  '--modulo', String(modulo),
  '--nombre', String(nombre),
  '--checks', checks.join(','),
  '--comandos', [
    !skipPreflight ? 'npm run sitiohoy:preflight' : '',
    !skipBuild && pkg.scripts?.build ? 'npm run build' : '',
    'npm run sitiohoy:validate',
    'npm run sitiohoy:secret-scan',
    /deploy/i.test(`${moduleSpec?.name ?? ''} ${nombre}`) && pkg.scripts?.['sitiohoy:e2e'] ? 'SITE_URL=http://localhost:3000 npm run sitiohoy:e2e' : '',
  ].filter(Boolean).join('|'),
  '--qa', 'module-close ok',
]
run('sitiohoy:tracking', ['node', ...trackingArgs])

if (runAudit && existsSync(path.join(root, 'scripts', 'audit.mjs'))) {
  run('sitiohoy:audit', ['node', 'scripts/audit.mjs'])
}

console.log(`\nMódulo ${modulo} cerrado correctamente: ${nombre}\n`)
