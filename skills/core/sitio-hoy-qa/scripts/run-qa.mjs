import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const pkg = existsSync('package.json') ? JSON.parse(await readFile('package.json', 'utf8')) : { scripts: {} }
const scripts = pkg.scripts ?? {}

function run(name, command) {
  console.log(`\n== ${name} ==`)
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (existsSync('scripts/preflight.mjs')) run('sitiohoy preflight', ['node', 'scripts/preflight.mjs'])
if (scripts.lint) run('lint', ['npm', 'run', 'lint'])
if (scripts.build) run('build', ['npm', 'run', 'build'])
run('sitiohoy static validation', ['node', 'scripts/validate-sitiohoy.mjs'])
if (existsSync('scripts/secret-scan.mjs')) run('secret scan', ['node', 'scripts/secret-scan.mjs'])
if (existsSync('scripts/visual-audit.mjs')) run('visual audit', ['node', 'scripts/visual-audit.mjs'])
if (scripts['sitiohoy:e2e']) run('sitiohoy e2e', ['npm', 'run', 'sitiohoy:e2e'])
else if (scripts['test:e2e']) run('e2e', ['npm', 'run', 'test:e2e'])
if (scripts.lighthouse) run('lighthouse', ['npm', 'run', 'lighthouse'])
if (scripts['sitiohoy:qa-report']) run('qa report', ['npm', 'run', 'sitiohoy:qa-report'])
