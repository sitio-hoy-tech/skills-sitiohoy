/**
 * test-skills.mjs
 * Smoke tests for SitioHoy skills and bundled scripts.
 */

import { existsSync, mkdtempSync, cpSync, rmSync, chmodSync, writeFileSync } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
const failures = []

function run(label, command, options = {}) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  })

  const expectFailure = Boolean(options.expectFailure)
  const ok = expectFailure ? result.status !== 0 : result.status === 0
  if (!ok) {
    failures.push({
      label,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    })
  } else {
    console.log(`OK ${label}`)
  }
  return result
}

async function walk(dir, predicate) {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  const skippedDirs = new Set(['.git', '.venv', 'node_modules', '.next', 'dist', 'build'])
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) files.push(...await walk(full, predicate))
    }
    else if (!predicate || predicate(full)) files.push(full)
  }
  return files
}

const scriptFiles = [
  ...await walk(path.join(root, 'skills'), file => file.endsWith('.mjs')),
  ...await walk(path.join(root, 'scripts'), file => file.endsWith('.mjs')),
]

for (const file of scriptFiles) {
  run(`node --check ${path.relative(root, file)}`, ['node', '--check', file], { capture: true })
}

const jsonFiles = [
  ...await walk(path.join(root, 'skills'), file => file.endsWith('.json')),
  ...await walk(path.join(root, 'examples'), file => file.endsWith('.json')),
]

for (const file of jsonFiles) {
  run(`json ${path.relative(root, file)}`, ['node', '-e', `JSON.parse(require('fs').readFileSync(${JSON.stringify(file)}, 'utf8'))`], { capture: true })
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'sitiohoy-skills-'))
try {
  const fixture = path.join(tmp, 'dummy-empresa')
  cpSync(path.join(root, 'examples', 'dummy-empresa'), fixture, { recursive: true })
  await mkdir(path.join(fixture, 'scripts'), { recursive: true })

  const templateScripts = path.join(root, 'skills', 'sitio-hoy-scaffold', 'assets', 'template-next-supabase', 'scripts')
  for (const name of [
    'audit.mjs',
    'brief-from-intake.mjs',
    'module-close.mjs',
    'preflight.mjs',
    'secret-scan.mjs',
    'update-tracking.mjs',
    'validate-sitiohoy.mjs',
    'visual-audit.mjs',
  ]) {
    cpSync(path.join(templateScripts, name), path.join(fixture, 'scripts', name))
  }

  const binDir = path.join(fixture, 'bin')
  await mkdir(binDir, { recursive: true })
  const supabasePath = path.join(binDir, 'supabase')
  writeFileSync(supabasePath, '#!/usr/bin/env bash\necho supabase 2.0.0\n')
  chmodSync(supabasePath, 0o755)

  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` }
  run('fixture brief-from-intake', ['node', 'scripts/brief-from-intake.mjs'], { cwd: fixture, env })
  run('fixture preflight', ['node', 'scripts/preflight.mjs'], { cwd: fixture, env })
  run('fixture secret-scan', ['node', 'scripts/secret-scan.mjs'], { cwd: fixture, env })
  run('fixture visual-audit skipped', ['node', 'scripts/visual-audit.mjs'], { cwd: fixture, env })
  run('fixture module-close', [
    'node',
    'scripts/module-close.mjs',
    '--modulo',
    '0',
    '--nombre',
    'Scaffold',
    '--skip-preflight',
    '--skip-build',
    '--checks',
    'config_valid,brief_exists,shipping_provider_selected,supabase_cli_used,supabase_schema_ready,tracking_updated,validate_ok',
  ], { cwd: fixture, env })
  run('fixture audit', ['node', 'scripts/audit.mjs'], { cwd: fixture, env })
  run('fixture audit strict blocks warnings', ['node', 'scripts/audit.mjs', '--strict'], { cwd: fixture, env, expectFailure: true })
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

if (failures.length) {
  console.error('\nSkill tests failed:')
  for (const failure of failures) {
    console.error(`\n- ${failure.label} (status ${failure.status})`)
    if (failure.stdout) console.error(failure.stdout)
    if (failure.stderr) console.error(failure.stderr)
  }
  process.exit(1)
}

console.log('\nAll SitioHoy skill tests passed.\n')
