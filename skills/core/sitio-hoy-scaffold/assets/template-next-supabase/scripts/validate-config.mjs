/**
 * validate-config.mjs
 * Valida sitiohoy.config.json antes de iniciar el scaffold o los módulos.
 * Funciona en cualquier entorno (Claude, Cursor, Windsurf, OpenCode, GPT, Gemini).
 *
 * Uso: node scripts/validate-config.mjs
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const configPath = path.join(root, 'sitiohoy.config.json')

const errors = []
const warnings = []

const err = (msg) => errors.push(`❌ ${msg}`)
const warn = (msg) => warnings.push(`⚠️  ${msg}`)

if (!existsSync(configPath)) {
  err('sitiohoy.config.json no encontrado. Ejecutar sitio-hoy-briefing primero.')
  printAndExit()
}

let config
try {
  config = JSON.parse(await readFile(configPath, 'utf8'))
} catch {
  err('sitiohoy.config.json tiene JSON inválido.')
  printAndExit()
}

// ── Plan ──────────────────────────────────────────────────────────────────────
const PLANES = ['esencial', 'emprendimiento', 'empresa']
if (!config.plan) err('Campo "plan" requerido.')
else if (!PLANES.includes(config.plan)) err(`"plan" debe ser uno de: ${PLANES.join(', ')}. Recibido: "${config.plan}"`)

// ── Business ─────────────────────────────────────────────────────────────────
if (!config.business?.name) err('"business.name" requerido.')
if (!config.business?.slug) warn('"business.slug" no definido — se generará desde el nombre.')
if (!config.business?.industry) warn('"business.industry" no definido — afecta copy y design system.')

// ── Tenant ID ─────────────────────────────────────────────────────────────────
if (!config.tenantId) warn('"tenantId" no definido — se necesita antes del scaffold.')
else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.tenantId)) {
  err('"tenantId" debe ser un UUID válido.')
}

// ── Integraciones por plan ────────────────────────────────────────────────────
const integ = config.integrations ?? {}

if (config.plan === 'esencial') {
  if (integ.mercadopago) warn('Plan Esencial no incluye MercadoPago — considerar cambiar a Emprendimiento.')
  if (integ.envia) warn('Plan Esencial no incluye Envia.com.')
  if (integ.fixedShipping) warn('Plan Esencial no incluye zonas de envío — solo WhatsApp.')
}

if (config.plan === 'emprendimiento') {
  if (!integ.mercadopago) warn('Plan Emprendimiento requiere MercadoPago. Agregar "mercadopago": true.')
  if (integ.envia) warn('Envia.com es solo Plan Empresa. En Emprendimiento usar "fixedShipping": true.')
}

if (config.plan === 'empresa') {
  if (!integ.mercadopago) warn('Plan Empresa requiere MercadoPago.')
  if (integ.envia && integ.fixedShipping) warn('envia y fixedShipping activos al mismo tiempo — elegir uno como primario.')
  if (!integ.envia && !integ.fixedShipping) warn('Plan Empresa sin envíos configurados. Activar "envia" o "fixedShipping".')
}

if (integ.whatsapp === false) warn('"whatsapp" desactivado — el botón flotante no se generará.')

// ── Assets ────────────────────────────────────────────────────────────────────
if (config.assets?.missing?.length > 0) {
  warn(`Assets faltantes: ${config.assets.missing.join(', ')} — se usarán placeholders.`)
}

// ── Domain ────────────────────────────────────────────────────────────────────
if (!config.domain?.url && config.domain?.status !== 'pending_purchase') {
  warn('"domain.url" no definido — usar URL de Vercel como placeholder.')
}

// ── Output ────────────────────────────────────────────────────────────────────
function printAndExit() {
  if (errors.length) {
    console.log('\n── validate-config ──────────────────────')
    errors.forEach(e => console.log(e))
    warnings.forEach(w => console.log(w))
    console.log('─────────────────────────────────────────\n')
    process.exit(1)
  }
  process.exit(0)
}

console.log('\n── validate-config ──────────────────────')
if (errors.length === 0 && warnings.length === 0) {
  console.log(`✅ sitiohoy.config.json válido (plan: ${config.plan})`)
} else {
  errors.forEach(e => console.log(e))
  warnings.forEach(w => console.log(w))
}
console.log('─────────────────────────────────────────\n')

if (errors.length > 0) process.exit(1)
