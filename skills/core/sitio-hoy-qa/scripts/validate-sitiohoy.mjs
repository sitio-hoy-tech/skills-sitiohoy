import { existsSync } from 'node:fs'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const findings = []

const add = (severity, message, file = '') => findings.push({ severity, message, file })

async function walk(dir) {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return full
  }))
  return nested.flat()
}

const sourceFiles = (await Promise.all(['app', 'components', 'lib', 'styles'].map(d => walk(path.join(root, d))))).flat()
const codeFiles = sourceFiles.filter(file => /\.(tsx|ts|jsx|js|css)$/.test(file))

for (const file of codeFiles) {
  const rel = path.relative(root, file)
  const text = await readFile(file, 'utf8')

  if (/<img[\s>]/.test(text)) {
    add('error', 'Usar next/image en lugar de <img>.', rel)
  }

  if (/<select[\s>]/.test(text)) {
    add('error', 'No usar <select> nativo. Usar dropdown custom con Controller de react-hook-form.', rel)
  }

  if (/revalidatePath\(\s*['"]\/['"]\s*\)/.test(text)) {
    add('error', 'No usar revalidatePath global. Usar revalidateTag.', rel)
  }

  if (/revalidateTag\s*\(\s*[^,\n)]+\s*\)/.test(text)) {
    add('error', "Next.js 16 requiere revalidateTag(tag, 'default').", rel)
  }

  if (/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/.test(text)) {
    add('error', 'Service role key no puede tener prefijo NEXT_PUBLIC_.', rel)
  }

  if (/['"]use client['"]/.test(text) && /createServiceClient/.test(text)) {
    add('error', 'No usar createServiceClient en componentes client.', rel)
  }

  if (/dangerouslySetInnerHTML/.test(text) && !/JSON\.stringify/.test(text)) {
    add('warning', 'Revisar dangerouslySetInnerHTML. Solo deberia usarse para JSON-LD saneado.', rel)
  }

  if (/console\.log\s*\(/.test(text) && !rel.startsWith('scripts/')) {
    add('warning', 'Remover console.log/debug antes de deploy.', rel)
  }

  if (/app\/.*productos/.test(rel) && /dynamic\s*=\s*['"]force-dynamic['"]/.test(text)) {
    add('error', 'No usar dynamic = force-dynamic en catálogo. Usar ISR on-demand.', rel)
  }

  if (/app\/.*productos/.test(rel) && /revalidate\s*=\s*\d+/.test(text)) {
    add('error', 'No usar revalidate = N en catálogo editable. Usar ISR on-demand.', rel)
  }
}

const required = [
  ['styles/tokens.css', 'Falta styles/tokens.css.'],
  ['app/layout.tsx', 'Falta app/layout.tsx.'],
  ['app/not-found.tsx', 'Falta app/not-found.tsx global.'],
  ['app/error.tsx', 'Falta app/error.tsx global.'],
]

for (const [file, message] of required) {
  if (!existsSync(path.join(root, file))) add(file === 'app/error.tsx' ? 'warning' : 'error', message, file)
}

if (!existsSync(path.join(root, '.env.example'))) {
  add('warning', 'Falta .env.example.', '.env.example')
}

if (!existsSync(path.join(root, '.sitiohoy', 'design', 'DESIGN.md'))) {
  add('warning', 'Falta .sitiohoy/design/DESIGN.md. Los módulos visuales requieren el documento de dirección creativa.', '.sitiohoy/design/DESIGN.md')
}

if (!existsSync(path.join(root, '.sitiohoy', 'copy-guide.md'))) {
  add('warning', 'Falta .sitiohoy/copy-guide.md. Ejecutar briefing-server para generar la guía de copy.', '.sitiohoy/copy-guide.md')
}

const layoutPath = path.join(root, 'app', 'layout.tsx')
if (existsSync(layoutPath)) {
  const layout = await readFile(layoutPath, 'utf8')
  if (!/next\/font/.test(layout)) add('error', 'app/layout.tsx debe usar next/font.', 'app/layout.tsx')
}

const report = {
  generatedAt: new Date().toISOString(),
  ok: !findings.some(f => f.severity === 'error'),
  counts: {
    errors: findings.filter(f => f.severity === 'error').length,
    warnings: findings.filter(f => f.severity === 'warning').length,
  },
  findings,
}

await mkdir(path.join(root, '.sitiohoy', 'qa'), { recursive: true })
await writeFile(path.join(root, '.sitiohoy', 'qa', 'static-report.json'), `${JSON.stringify(report, null, 2)}\n`)

for (const finding of findings) {
  const label = finding.severity.toUpperCase()
  console.log(`${label}: ${finding.file ? `${finding.file}: ` : ''}${finding.message}`)
}

if (!report.ok) process.exit(1)
console.log('SitioHoy static validation OK')
