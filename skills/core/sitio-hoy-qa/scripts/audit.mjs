/**
 * audit.mjs
 * Genera una auditoría final del proyecto SitioHoy.
 *
 * Uso:
 *   node scripts/audit.mjs
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const auditDir = path.join(root, '.sitiohoy', 'audit')
const strict = process.argv.includes('--strict')

const readJsonIfExists = async (file) => {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

const argentinaDate = (date = new Date()) => {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

const listFiles = async (dir) => {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(full)
    return [full]
  }))
  return nested.flat()
}

const config = await readJsonIfExists(path.join(root, 'sitiohoy.config.json'))
const tracking = await readJsonIfExists(path.join(root, 'proyecto-tracking.json'))
const preflight = await readJsonIfExists(path.join(root, '.sitiohoy', 'qa', 'preflight-report.json'))
const staticReport = await readJsonIfExists(path.join(root, '.sitiohoy', 'qa', 'static-report.json'))
const visualReport = await readJsonIfExists(path.join(root, '.sitiohoy', 'qa', 'visual-report.json'))
const demoProducts = await readJsonIfExists(path.join(root, '.sitiohoy', 'launch', 'demo-products.json'))
const checklist = await readJsonIfExists(path.join(root, '.sitiohoy', 'checklists', 'module-checks.json'))

const findings = []
const add = (severity, message, detail = '') => findings.push({ severity, message, detail })

if (!config) add('error', 'No se pudo leer sitiohoy.config.json.')
if (!tracking) add('error', 'No se pudo leer proyecto-tracking.json.')

const plan = config?.plan ?? 'desconocido'
const slug = config?.slug ?? config?.business?.slug ?? 'sitiohoy'
const expectedModules = { esencial: 6, emprendimiento: 7, empresa: 8 }[plan] ?? 0

if (tracking) {
  const modules = tracking.modulos ?? []
  if (expectedModules && modules.length < expectedModules) {
    add('warning', 'Módulos registrados incompletos.', `${modules.length}/${expectedModules}`)
  }

  const invalidDates = []
  for (const field of ['inicio_proyecto', 'fin_proyecto']) {
    if (tracking[field] && !String(tracking[field]).endsWith('-03:00')) invalidDates.push(field)
  }
  modules.forEach((module) => {
    if (module.inicio && !String(module.inicio).endsWith('-03:00')) invalidDates.push(`modulo ${module.modulo} inicio`)
    if (module.fin && !String(module.fin).endsWith('-03:00')) invalidDates.push(`modulo ${module.modulo} fin`)
  })
  if (invalidDates.length) add('error', 'Fechas sin offset Argentina -03:00.', invalidDates.join(', '))

  const modulesWithoutCommands = modules.filter((module) => !(module.comandos_ejecutados ?? []).length)
  if (modulesWithoutCommands.length) {
    add('warning', 'Hay módulos sin comandos documentados.', modulesWithoutCommands.map(m => `M${m.modulo}`).join(', '))
  }

  const modulesWithoutQa = modules.filter((module) => !module.qa_resultado)
  if (modulesWithoutQa.length) {
    add('warning', 'Hay módulos sin resultado QA documentado.', modulesWithoutQa.map(m => `M${m.modulo}`).join(', '))
  }
}

if (preflight?.status === 'BLOQUEADO') add('error', 'Preflight bloqueado.', 'Resolver .sitiohoy/qa/preflight-report.json.')
if (staticReport && !staticReport.ok) add('error', 'Validación estática con errores.', '.sitiohoy/qa/static-report.json')
if (!visualReport) {
  add('warning', 'No existe auditoría visual responsive.', 'Ejecutar SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit antes de entregar.')
} else if (visualReport.skipped) {
  add('warning', 'Auditoría visual omitida.', visualReport.reason ?? 'Ejecutar con SITE_URL y servidor local activo.')
} else if (!visualReport.ok) {
  add('error', 'Auditoría visual responsive con errores.', '.sitiohoy/qa/visual-report.json')
}

const integrations = config?.integrations ?? {}
if (integrations.mercadopago && !process.env.MP_WEBHOOK_SECRET) {
  add('warning', 'MercadoPago activo pero MP_WEBHOOK_SECRET no está en el entorno actual.', 'Verificar Vercel/Supabase antes de go-live.')
}
if (integrations.envia && !process.env.ENVIA_API_URL) {
  add('warning', 'Envia activo pero ENVIA_API_URL no está en el entorno actual.', 'Verificar Vercel env vars.')
}
if (integrations.correoArgentino && !process.env.CA_API_URL) {
  add('warning', 'Correo Argentino activo pero CA_API_URL no está en el entorno actual.', 'Verificar Vercel env vars.')
}

if (demoProducts) {
  const withoutImage = demoProducts.filter((product) => !product.image_url)
  const withoutWeight = demoProducts.filter((product) => product.shipping_required !== false && !product.weight_grams)
  if (withoutImage.length) add('error', 'Productos demo sin imagen.', `${withoutImage.length}/${demoProducts.length}`)
  if (withoutWeight.length) add('error', 'Productos demo sin peso.', `${withoutWeight.length}/${demoProducts.length}`)
}

const migrationFiles = (await listFiles(path.join(root, 'supabase', 'migrations')))
  .map((file) => path.relative(root, file))
  .filter((file) => file.endsWith('.sql'))
if (!migrationFiles.length) add('warning', 'No hay migraciones Supabase en el repo.', 'Verificar que el schema se aplica por CLI.')

if (!existsSync(path.join(root, '.sitiohoy', 'launch', 'launch-plan.md'))) {
  add('warning', 'No existe launch-plan.md.', 'Ejecutar sitio-hoy-launch-automation antes del deploy.')
}

const checklistPlan = checklist?.plans?.[plan]
if (checklistPlan) {
  const moduleCount = checklistPlan.modules?.length ?? 0
  if (expectedModules && moduleCount !== expectedModules) {
    add('warning', 'Checklist JSON no coincide con módulos esperados.', `${moduleCount}/${expectedModules}`)
  }

  const trackedModules = new Map((tracking?.modulos ?? []).map((module) => [Number(module.modulo), module]))
  for (const moduleCheck of checklistPlan.modules ?? []) {
    const tracked = trackedModules.get(Number(moduleCheck.id))
    if (!tracked) continue
    const done = new Set(tracked.checks_completados ?? [])
    const missing = (moduleCheck.requiredChecks ?? []).filter((check) => !done.has(check))
    if (missing.length) {
      add('warning', `Módulo ${moduleCheck.id} tiene checks pendientes.`, missing.join(', '))
    }
  }
}

const errorCount = findings.filter(f => f.severity === 'error').length
const warningCount = findings.filter(f => f.severity === 'warning').length
const strictBlocked = strict && warningCount > 0
const status = errorCount > 0 || strictBlocked ? 'BLOQUEADO' : warningCount > 0 ? 'APROBADO_CON_PENDIENTES' : 'APROBADO'
const date = argentinaDate()
const reportName = `AUDIT-SitioHoy-${slug}-${date}.md`

const lines = [
  `# Auditoría SitioHoy - ${config?.project ?? config?.business?.name ?? slug}`,
  '',
  `- Estado: ${status}`,
  `- Modo strict: ${strict ? 'sí' : 'no'}`,
  `- Fecha: ${date} -03:00`,
  `- Plan: ${plan}`,
  `- Tenant ID: ${config?.tenantId ?? 'pendiente'}`,
  '',
  '## Hallazgos',
  '',
  findings.length
    ? findings.map(f => `- ${f.severity.toUpperCase()}: ${f.message}${f.detail ? ` ${f.detail}` : ''}`).join('\n')
    : '- Sin hallazgos.',
  '',
  '## Tracking',
  '',
  `- Módulos registrados: ${tracking?.modulos?.length ?? 0}/${expectedModules || '?'}`,
  `- Fechas UTC-3: ${findings.some(f => f.message.includes('Fechas sin offset')) ? 'no' : 'sí'}`,
  `- Costo estimado USD: ${tracking?.costo_total_usd ?? 0}`,
  '',
  '## Supabase',
  '',
  `- Migraciones encontradas: ${migrationFiles.length}`,
  `- Aplicación esperada: Supabase CLI`,
  '',
  '## Productos',
  '',
  `- Productos demo: ${demoProducts?.length ?? 0}`,
  `- Imágenes: ${demoProducts ? `${demoProducts.filter(p => p.image_url).length}/${demoProducts.length}` : 'sin demo-products.json'}`,
  `- Peso/dimensiones: ${demoProducts ? `${demoProducts.filter(p => p.shipping_required === false || p.weight_grams).length}/${demoProducts.length}` : 'sin demo-products.json'}`,
  '',
  '## Diseño Responsive',
  '',
  `- Visual audit: ${visualReport ? (visualReport.skipped ? 'omitido' : visualReport.ok ? 'OK' : 'REVISAR') : 'faltante'}`,
  `- Screenshots: ${visualReport?.screenshots?.length ?? 0}`,
  `- Hallazgos visuales: ${visualReport?.findings?.length ?? 0}`,
  '',
  '## Integraciones',
  '',
  `- MercadoPago: ${integrations.mercadopago ? 'activo' : 'no activo'}`,
  `- Correo Argentino: ${integrations.correoArgentino ? 'activo' : 'no activo'}`,
  `- Envia.com: ${integrations.envia ? 'activo' : 'no activo'}`,
  `- Resend: ${integrations.resend ? 'activo' : 'no activo'}`,
  `- Umami: ${integrations.umami ? 'activo' : 'no activo'}`,
  '',
]

const jsonReport = {
  generatedAt: new Date().toISOString(),
  status,
  strict,
  counts: { errors: errorCount, warnings: warningCount },
  findings,
  migrationFiles,
  visualReport: visualReport
    ? {
        ok: visualReport.ok,
        skipped: visualReport.skipped,
        screenshots: visualReport.screenshots?.length ?? 0,
        findings: visualReport.findings?.length ?? 0,
      }
    : null,
}

await mkdir(auditDir, { recursive: true })
await writeFile(path.join(auditDir, 'audit-report.json'), `${JSON.stringify(jsonReport, null, 2)}\n`)
await writeFile(path.join(root, reportName), `${lines.join('\n')}\n`)

console.log('\nSitioHoy Audit')
console.log('──────────────')
console.log(`Estado: ${status}`)
console.log(`Strict: ${strict ? 'sí' : 'no'}`)
console.log(`Errores: ${errorCount} | Warnings: ${warningCount}`)
console.log(`Reporte: ${reportName}`)
console.log('JSON: .sitiohoy/audit/audit-report.json\n')

if (errorCount > 0 || strictBlocked) process.exit(1)
