import { existsSync } from 'node:fs'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const findings = []

const add = (severity, message, file = '') => findings.push({ severity, message, file })

async function walk(dir) {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return full
  }))
  return files.flat()
}

const sourceFiles = (await Promise.all(['app', 'components', 'lib', 'styles'].map(d => walk(path.join(root, d))))).flat()
const codeFiles = sourceFiles.filter(file => /\.(tsx|ts|jsx|js|css)$/.test(file))

for (const file of codeFiles) {
  const rel = path.relative(root, file)
  const text = await readFile(file, 'utf8')
  if (/<img[\s>]/.test(text)) add('error', 'Usar next/image en lugar de <img>.', rel)
  if (/<select[\s>]/.test(text)) add('error', 'No usar <select> nativo. Usar dropdown custom con Controller de react-hook-form.', rel)
  if (/revalidatePath\s*\(\s*['"]\//.test(text)) add('error', 'No usar revalidatePath global. Usar revalidateTag.', rel)
  if (/revalidateTag\s*\(\s*[^,\n)]+\s*\)/.test(text)) add('error', "Next.js 16 requiere revalidateTag(tag, 'default').", rel)
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(text) && /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/.test(text)) {
    add('error', 'Service role key no puede tener prefijo NEXT_PUBLIC_.', rel)
  }
  if (/['"]use client['"]/.test(text) && /createServiceClient/.test(text)) {
    add('error', 'No usar createServiceClient en componentes client.', rel)
  }
  // ISR: detectar revalidate numérico en unstable_cache (debe ser solo on-demand)
  if (/unstable_cache/.test(text) && /revalidate\s*:\s*\d+/.test(text)) {
    add('warning', 'unstable_cache con revalidate numérico — usar solo ISR on-demand (sin revalidate).', rel)
  }
  // Webhook MP sin verificación de firma
  if (/webhooks\/mercadopago/.test(rel) && !/MP_WEBHOOK_SECRET/.test(text)) {
    add('error', 'Webhook de MercadoPago sin verificación de firma (MP_WEBHOOK_SECRET). Ver integraciones/mercadopago.md.', rel)
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

// Validar sitiohoy.config.json
const configPath = path.join(root, 'sitiohoy.config.json')
if (existsSync(configPath)) {
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const integrations = config.integrations ?? {}
  if (integrations.correoArgentino && integrations.envia) {
    add('error', 'correoArgentino y envia no pueden estar ambos activos. Elegir uno como proveedor de envíos automatizados.', 'sitiohoy.config.json')
  }
  if ((integrations.correoArgentino || integrations.envia) && config.plan === 'esencial') {
    add('error', 'correoArgentino/envia solo disponibles en Plan Emprendimiento y Empresa.', 'sitiohoy.config.json')
  }
  if (!config.tenantId || config.tenantId === '') {
    add('error', 'tenantId vacío en sitiohoy.config.json. Ejecutar generate-briefing-artifacts.mjs.', 'sitiohoy.config.json')
  }
} else {
  add('warning', 'Falta sitiohoy.config.json.')
}

if (!existsSync(path.join(root, 'styles', 'tokens.css'))) add('error', 'Falta styles/tokens.css.')
if (!existsSync(path.join(root, '.env.example'))) add('warning', 'Falta .env.example.')
if (!existsSync(path.join(root, 'app', 'not-found.tsx'))) add('warning', 'Falta app/not-found.tsx global.')
if (!existsSync(path.join(root, 'app', 'error.tsx'))) add('warning', 'Falta app/error.tsx global.')

const layoutPath = path.join(root, 'app', 'layout.tsx')
if (existsSync(layoutPath)) {
  const layout = await readFile(layoutPath, 'utf8')
  if (!/next\/font/.test(layout)) add('error', 'app/layout.tsx debe usar next/font.', 'app/layout.tsx')
} else {
  add('error', 'Falta app/layout.tsx.')
}

const report = {
  generatedAt: new Date().toISOString(),
  ok: !findings.some(f => f.severity === 'error'),
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
