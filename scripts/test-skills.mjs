/**
 * test-skills.mjs
 * Smoke tests for SitioHoy skills and bundled scripts.
 */

import { existsSync, mkdtempSync, cpSync, rmSync, chmodSync, writeFileSync, readFileSync } from 'node:fs'
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

// ── Categorized structure: skills/core/, skills/seo/, skills/design/ ──────────

const skillCategories = ['core', 'seo', 'design']
const skillsDirs = skillCategories.map(c => path.join(root, 'skills', c))

// ── 1. Validate category structure ───────────────────────────────────────────

console.log('\n── Category structure ──')
for (const cat of skillCategories) {
  const catDir = path.join(root, 'skills', cat)
  if (!existsSync(catDir)) {
    failures.push({ label: `category ${cat} exists`, status: 1, stdout: '', stderr: `Missing: ${catDir}` })
  } else {
    console.log(`OK category ${cat}/ exists`)
  }
}

// ── 2. Validate each skill has SKILL.md ──────────────────────────────────────

console.log('\n── SKILL.md validation ──')
for (const catDir of skillsDirs) {
  if (!existsSync(catDir)) continue
  const entries = await readdir(catDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillDir = path.join(catDir, entry.name)
    const skillMd = path.join(skillDir, 'SKILL.md')
    const designMd = path.join(skillDir, 'design.md')
    if (existsSync(skillMd)) {
      console.log(`OK ${entry.name}/SKILL.md exists`)
    } else if (existsSync(designMd)) {
      console.log(`OK ${entry.name}/design.md exists (legacy)`)
    } else {
      failures.push({ label: `${entry.name}/SKILL.md`, status: 1, stdout: '', stderr: `Missing SKILL.md in ${skillDir}` })
    }
  }
}

// ── 3. No Python files in the repo ───────────────────────────────────────────

console.log('\n── No Python files ──')
const pyFiles = await walk(path.join(root, 'skills'), file => file.endsWith('.py'))
if (pyFiles.length) {
  failures.push({
    label: 'no .py files in skills/',
    status: 1,
    stdout: '',
    stderr: `Found Python files:\n${pyFiles.map(f => `  ${path.relative(root, f)}`).join('\n')}`,
  })
} else {
  console.log('OK no .py files in skills/')
}

// ── 4. No Stitch references in executable files ──────────────────────────────

console.log('\n── No Stitch references ──')
const execFiles = await walk(path.join(root, 'skills'), file =>
  file.endsWith('.mjs') || file.endsWith('.ts') || file.endsWith('.tsx')
)
const stitchRefs = []
for (const file of execFiles) {
  const content = readFileSync(file, 'utf8')
  if (/stitch/i.test(content)) {
    stitchRefs.push(path.relative(root, file))
  }
}
if (stitchRefs.length) {
  failures.push({
    label: 'no Stitch refs in executable files',
    status: 1,
    stdout: '',
    stderr: `Found Stitch references:\n${stitchRefs.map(f => `  ${f}`).join('\n')}`,
  })
} else {
  console.log('OK no Stitch references in executable files')
}

// ── 5. No GEMINI_API_KEY in executable files ─────────────────────────────────

console.log('\n── No GEMINI_API_KEY ──')
const geminiRefs = []
for (const file of execFiles) {
  const content = readFileSync(file, 'utf8')
  if (/GEMINI_API_KEY/i.test(content)) {
    geminiRefs.push(path.relative(root, file))
  }
}
if (geminiRefs.length) {
  failures.push({
    label: 'no GEMINI_API_KEY in executable files',
    status: 1,
    stdout: '',
    stderr: `Found GEMINI_API_KEY:\n${geminiRefs.map(f => `  ${f}`).join('\n')}`,
  })
} else {
  console.log('OK no GEMINI_API_KEY in executable files')
}

// ── 6. Node syntax check for .mjs files ─────────────────────────────────────

console.log('\n── Node syntax check ──')
const scriptFiles = [
  ...await walk(path.join(root, 'skills'), file => file.endsWith('.mjs')),
  ...await walk(path.join(root, 'scripts'), file => file.endsWith('.mjs')),
]

for (const file of scriptFiles) {
  run(`node --check ${path.relative(root, file)}`, ['node', '--check', file], { capture: true })
}

// ── 7. JSON validation ──────────────────────────────────────────────────────

console.log('\n── JSON validation ──')
const jsonFiles = [
  ...await walk(path.join(root, 'skills'), file => file.endsWith('.json')),
  ...await walk(path.join(root, 'examples'), file => file.endsWith('.json')),
]

for (const file of jsonFiles) {
  run(`json ${path.relative(root, file)}`, ['node', '-e', `JSON.parse(require('fs').readFileSync(${JSON.stringify(file)}, 'utf8'))`], { capture: true })
}

// ── 8. Fixture tests ────────────────────────────────────────────────────────

console.log('\n── Fixture tests ──')
const tmp = mkdtempSync(path.join(os.tmpdir(), 'sitiohoy-skills-'))
try {
  const fixture = path.join(tmp, 'dummy-empresa')
  cpSync(path.join(root, 'examples', 'dummy-empresa'), fixture, { recursive: true })
  await mkdir(path.join(fixture, 'scripts'), { recursive: true })

  // Updated path for categorized structure
  const templateScripts = path.join(root, 'skills', 'core', 'sitio-hoy-scaffold', 'assets', 'template-next-supabase', 'scripts')
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

// ── Results ─────────────────────────────────────────────────────────────────

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
