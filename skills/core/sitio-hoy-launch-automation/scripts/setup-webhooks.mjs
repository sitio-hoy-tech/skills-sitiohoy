#!/usr/bin/env node
/**
 * SitioHoy — Webhook Setup
 * Registra automáticamente los webhooks necesarios según el plan del proyecto.
 *
 * Uso:
 *   MP_ACCESS_TOKEN=... SITE_URL=https://tusitio.com node setup-webhooks.mjs
 *   node setup-webhooks.mjs --site-url https://tusitio.com --plan emprendimiento
 *
 * Env vars requeridas:
 *   MP_ACCESS_TOKEN       Token de acceso de MercadoPago (producción o test)
 *
 * Env vars opcionales:
 *   SITE_URL              URL del sitio (override de sitiohoy.config.json)
 *   RESEND_API_KEY        Para verificar que Resend está configurado (solo check)
 *   ENVIA_API_KEY         Para verificar que Envia está configurado (solo check, Plan Empresa)
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// ── Args ──────────────────────────────────────────────────────────────────────
const args = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg.startsWith('--')) {
    const next = process.argv[i + 1]
    args.set(arg.slice(2), next && !next.startsWith('--') ? process.argv[++i] : true)
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
const root = process.cwd()
const configPath = path.join(root, 'sitiohoy.config.json')

if (!existsSync(configPath)) {
  console.error('✗ Falta sitiohoy.config.json. Ejecutar sitio-hoy-briefing primero.')
  process.exit(1)
}

const config = JSON.parse(await readFile(configPath, 'utf8'))
const plan = (config.plan ?? 'esencial').toLowerCase()
const siteUrl = String(args.get('site-url') || process.env.SITE_URL || config.siteUrl || '').replace(/\/$/, '')

if (!siteUrl) {
  console.error('✗ Falta SITE_URL. Pasalo como --site-url https://tusitio.com o en sitiohoy.config.json.')
  process.exit(1)
}

const mpToken = process.env.MP_ACCESS_TOKEN
const outDir = path.join(root, '.sitiohoy', 'launch')
const resultsPath = path.join(outDir, 'webhook-results.json')

const results = { siteUrl, plan, webhooks: [] }
let hasErrors = false

// ── Helpers ───────────────────────────────────────────────────────────────────
const log = {
  info: (msg) => console.log(`  → ${msg}`),
  ok:   (msg) => console.log(`  ✓ ${msg}`),
  warn: (msg) => console.log(`  ⚠ ${msg}`),
  err:  (msg) => console.error(`  ✗ ${msg}`),
}

// ── MercadoPago Webhook ───────────────────────────────────────────────────────
async function setupMercadoPagoWebhook() {
  if (plan === 'esencial') {
    log.info('Plan Esencial no usa MercadoPago — omitiendo webhook MP.')
    return
  }

  if (!mpToken) {
    log.warn('MP_ACCESS_TOKEN no definido — no se puede registrar webhook de MercadoPago.')
    log.warn('Registralo manualmente en https://www.mercadopago.com.ar/developers/panel/notifications/ipn')
    results.webhooks.push({ service: 'mercadopago', status: 'skipped', reason: 'MP_ACCESS_TOKEN no definido' })
    return
  }

  const webhookUrl = `${siteUrl}/api/webhooks/mercadopago`
  log.info(`Registrando webhook MercadoPago → ${webhookUrl}`)

  // Primero listar webhooks existentes para evitar duplicados
  let existingId = null
  try {
    const listRes = await fetch('https://api.mercadopago.com/v1/notifications/webhooks', {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    if (listRes.ok) {
      const list = await listRes.json()
      const existing = (list.results ?? list ?? []).find((w) => w.url === webhookUrl)
      if (existing) {
        existingId = existing.id
        log.info(`Webhook ya existe (id: ${existingId}) — actualizando.`)
      }
    }
  } catch {
    // Si falla el listado, intentamos crear igual
  }

  const body = {
    url: webhookUrl,
    events: ['payment'],
  }

  const method = existingId ? 'PUT' : 'POST'
  const endpoint = existingId
    ? `https://api.mercadopago.com/v1/notifications/webhooks/${existingId}`
    : 'https://api.mercadopago.com/v1/notifications/webhooks'

  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${mpToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (res.ok) {
    log.ok(`Webhook MercadoPago ${existingId ? 'actualizado' : 'creado'} (id: ${data.id ?? existingId})`)
    results.webhooks.push({
      service: 'mercadopago',
      status: 'ok',
      id: data.id ?? existingId,
      url: webhookUrl,
      action: existingId ? 'updated' : 'created',
    })
  } else {
    log.err(`MercadoPago API error ${res.status}: ${JSON.stringify(data)}`)
    results.webhooks.push({ service: 'mercadopago', status: 'error', code: res.status, detail: data })
    hasErrors = true
  }
}

// ── Resend (verificación de configuración, no webhook real) ───────────────────
async function checkResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    log.warn('RESEND_API_KEY no definido — verificá que Resend esté configurado en Vercel.')
    results.webhooks.push({ service: 'resend', status: 'skipped', reason: 'RESEND_API_KEY no definido' })
    return
  }

  log.info('Verificando API key de Resend...')
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (res.ok) {
    const data = await res.json()
    const domains = data.data ?? []
    log.ok(`Resend OK — ${domains.length} dominio(s) configurado(s): ${domains.map((d) => d.name).join(', ') || 'ninguno aún'}`)
    results.webhooks.push({ service: 'resend', status: 'ok', domains: domains.map((d) => d.name) })
  } else {
    log.warn(`Resend respondió ${res.status} — verificá la API key.`)
    results.webhooks.push({ service: 'resend', status: 'warn', code: res.status })
  }
}

// ── Envia.com (solo Plan Empresa) ─────────────────────────────────────────────
async function checkEnvia() {
  if (plan !== 'empresa') {
    log.info(`Plan ${plan} no usa Envia.com — omitiendo.`)
    return
  }

  const apiKey = process.env.ENVIA_API_KEY
  if (!apiKey) {
    log.warn('ENVIA_API_KEY no definido — verificá que Envia esté configurado en Vercel.')
    results.webhooks.push({ service: 'envia', status: 'skipped', reason: 'ENVIA_API_KEY no definido' })
    return
  }

  log.info('Verificando conexión con Envia.com...')
  const baseUrl = process.env.ENVIA_API_URL || 'https://api-test.envia.com'
  const res = await fetch(`${baseUrl}/ship/rate/`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (res.ok || res.status === 400) {
    // 400 es esperado sin body — confirma que la key es válida
    log.ok(`Envia.com API key válida (${baseUrl})`)
    results.webhooks.push({ service: 'envia', status: 'ok', baseUrl })
  } else {
    log.warn(`Envia.com respondió ${res.status} — verificá la API key.`)
    results.webhooks.push({ service: 'envia', status: 'warn', code: res.status })
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n  SitioHoy — Webhook Setup`)
console.log(`  Sitio : ${siteUrl}`)
console.log(`  Plan  : ${plan}\n`)

await setupMercadoPagoWebhook()
await checkResend()
await checkEnvia()

// Guardar resultados
await mkdir(outDir, { recursive: true })
await writeFile(resultsPath, JSON.stringify(results, null, 2))

console.log(`\n  Resultados guardados en .sitiohoy/launch/webhook-results.json`)

if (hasErrors) {
  console.error('\n  ✗ Algunos webhooks fallaron. Revisá webhook-results.json.\n')
  process.exit(1)
} else {
  console.log('\n  ✓ Setup de webhooks completado.\n')
}
