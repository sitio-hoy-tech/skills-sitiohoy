/**
 * preflight.mjs
 * Valida que un proyecto SitioHoy esté listo para iniciar módulos.
 *
 * Uso:
 *   node scripts/preflight.mjs
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const reportDir = path.join(root, '.sitiohoy', 'qa')
const errors = []
const warnings = []
const info = []

const addError = (message, detail = '') => errors.push({ message, detail })
const addWarning = (message, detail = '') => warnings.push({ message, detail })
const addInfo = (message, detail = '') => info.push({ message, detail })

const readJson = async (file, label) => {
  if (!existsSync(file)) {
    addError(`${label} no encontrado.`, path.relative(root, file))
    return null
  }

  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    addError(`${label} tiene JSON inválido.`, error.message)
    return null
  }
}

const commandExists = (command) => {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const config = await readJson(path.join(root, 'sitiohoy.config.json'), 'sitiohoy.config.json')
const intakePath = path.join(root, '.sitiohoy', 'intake.json')
const intake = existsSync(intakePath) ? await readJson(intakePath, '.sitiohoy/intake.json') : null

if (!intake) addWarning('.sitiohoy/intake.json no encontrado.', 'Si el sitio empezó con el formulario, debería existir para auditoría.')

if (!existsSync(path.join(root, 'brief.md'))) {
  addError('brief.md no encontrado.', 'Generar el brief desde .sitiohoy/intake.json antes del scaffold/módulos.')
}

if (config) {
  const allowedPlans = ['esencial', 'emprendimiento', 'empresa']
  const plan = config.plan
  const integrations = config.integrations ?? {}
  const catalog = config.catalog ?? intake?.catalog ?? {}
  const assets = config.assets ?? intake?.assets ?? {}

  if (!allowedPlans.includes(plan)) addError('Plan inválido.', `Recibido: ${plan || '(vacío)'}`)
  else addInfo('Plan detectado.', plan)

  if (!config.project && !config.business?.name) addError('Falta nombre del negocio.', 'Completar project o business.name.')
  if (!config.business?.industry && !intake?.business?.industry) addWarning('Falta rubro del negocio.', 'Afecta copy, SEO, diseño e imágenes Unsplash.')

  if (plan === 'esencial') {
    if (integrations.mercadopago) addWarning('MercadoPago activo en Plan Esencial.', 'Revisar si corresponde upgrade a Emprendimiento.')
    if (integrations.envia || integrations.correoArgentino || integrations.fixedShipping) {
      addWarning('Envíos activos en Plan Esencial.', 'Plan Esencial debería usar contacto/WhatsApp.')
    }
  }

  if (plan === 'emprendimiento') {
    if (!integrations.mercadopago) addError('Plan Emprendimiento requiere MercadoPago.', 'Activar integrations.mercadopago.')
    if (!integrations.fixedShipping) addWarning('Plan Emprendimiento normalmente usa envíos fijos.', 'Activar fixedShipping o documentar solo retiro.')
    if (integrations.envia || integrations.correoArgentino) addError('Envia/Correo Argentino son solo Plan Empresa.', 'Usar fixedShipping en Emprendimiento.')
  }

  if (plan === 'empresa') {
    if (!integrations.mercadopago) addError('Plan Empresa requiere MercadoPago.', 'Activar integrations.mercadopago.')
    const shippingProviders = [integrations.envia, integrations.correoArgentino, integrations.fixedShipping].filter(Boolean).length
    if (shippingProviders === 0) addWarning('Plan Empresa sin proveedor de envíos.', 'Elegir Correo Argentino, Envia.com, precios fijos o documentar solo retiro.')
    if (shippingProviders > 1) addError('Hay más de un proveedor de envíos activo.', 'correoArgentino, envia y fixedShipping son excluyentes como proveedor primario.')
  }

  const catalogType = catalog.type ?? intake?.catalog?.type
  const requiresShippingData = catalogType === 'physical' || catalogType === 'mixed' || integrations.envia || integrations.correoArgentino
  if (requiresShippingData) {
    if (!catalog.defaultWeightGrams || Number(catalog.defaultWeightGrams) <= 0) {
      addError('Falta catalog.defaultWeightGrams para productos físicos.', 'Definir peso default en gramos.')
    } else if (catalog.weightEstimated) {
      addWarning('Peso de productos estimado.', `${catalog.defaultWeightGrams}g. Registrar en tracking y revisar con el cliente.`)
    }

    const dimensions = catalog.defaultDimensionsCm ?? {}
    for (const key of ['length', 'width', 'height']) {
      if (!dimensions[key] || Number(dimensions[key]) <= 0) {
        addError(`Falta catalog.defaultDimensionsCm.${key}.`, 'Definir dimensiones default en centímetros.')
      }
    }
  }

  const missingAssets = assets.missing ?? []
  if (missingAssets.includes('productos') || assets.productos === false) {
    addWarning('Faltan imágenes de productos del cliente.', 'Usar Unsplash relacionado al rubro/categoría/producto y registrarlo en tracking.')
  }

  if (integrations.correoArgentino) {
    addWarning('Correo Argentino requiere platform_config y origen del tenant.', 'Cargar user/password en platform_config; cargar correo_argentino_customer_id y origin_* en tenants.')
  }

  if (integrations.envia) {
    addWarning('Envia.com requiere token y origen por tenant.', 'Cargar envia_access_token y origin_* en tenants.')
  }
}

if (!commandExists('supabase')) {
  addError('Supabase CLI no disponible.', 'Instalar/configurar supabase CLI antes de aplicar migraciones, seeds o storage.')
} else {
  addInfo('Supabase CLI disponible.')
}

if (!existsSync(path.join(root, 'proyecto-tracking.json'))) {
  addWarning('proyecto-tracking.json no existe todavía.', 'Ejecutar npm run sitiohoy:tracking al iniciar/cerrar el Módulo 0.')
}

const status = errors.length > 0 ? 'BLOQUEADO' : warnings.length > 0 ? 'APTO_CON_PENDIENTES_DOCUMENTADOS' : 'APTO'
const report = {
  generatedAt: new Date().toISOString(),
  status,
  counts: { errors: errors.length, warnings: warnings.length, info: info.length },
  errors,
  warnings,
  info,
}

await mkdir(reportDir, { recursive: true })
await writeFile(path.join(reportDir, 'preflight-report.json'), `${JSON.stringify(report, null, 2)}\n`)

console.log('\nSitioHoy Preflight')
console.log('──────────────────')
for (const item of info) console.log(`OK   ${item.message}${item.detail ? ` ${item.detail}` : ''}`)
for (const item of warnings) console.log(`WARN ${item.message}${item.detail ? ` ${item.detail}` : ''}`)
for (const item of errors) console.log(`ERR  ${item.message}${item.detail ? ` ${item.detail}` : ''}`)
console.log(`\nEstado: ${status}`)
console.log('Reporte: .sitiohoy/qa/preflight-report.json\n')

if (errors.length > 0) process.exit(1)
