/**
 * test-webhooks-local.mjs
 * Simula webhooks de MercadoPago en localhost para testing sin compras reales.
 *
 * Usage:
 *   node scripts/test-webhooks-local.mjs --event payment.approved
 *   node scripts/test-webhooks-local.mjs --event payment.rejected
 *   node scripts/test-webhooks-local.mjs --event payment.pending
 *   node scripts/test-webhooks-local.mjs --all
 */

import { randomUUID } from 'node:crypto'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
const WEBHOOK_PATH = '/api/webhooks/mercadopago'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const idx = args.indexOf(name)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
}
const runAll = args.includes('--all')
const event = getArg('--event', 'payment.approved')

const PAYMENT_EVENTS = {
  'payment.approved': {
    action: 'payment.updated',
    type: 'payment',
    data: { id: '123456789' },
    status: 'approved',
    status_detail: 'accredited',
  },
  'payment.rejected': {
    action: 'payment.updated',
    type: 'payment',
    data: { id: '123456790' },
    status: 'rejected',
    status_detail: 'cc_rejected_other_reason',
  },
  'payment.pending': {
    action: 'payment.updated',
    type: 'payment',
    data: { id: '123456791' },
    status: 'pending',
    status_detail: 'pending_waiting_payment',
  },
  'payment.refunded': {
    action: 'payment.updated',
    type: 'payment',
    data: { id: '123456792' },
    status: 'refunded',
    status_detail: 'refunded',
  },
}

async function sendWebhook(eventType) {
  const payload = PAYMENT_EVENTS[eventType]
  if (!payload) {
    console.error(`  ❌ Evento desconocido: ${eventType}`)
    console.log(`  Eventos disponibles: ${Object.keys(PAYMENT_EVENTS).join(', ')}`)
    return false
  }

  const body = {
    id: randomUUID(),
    live_mode: false,
    type: payload.type,
    date_created: new Date().toISOString(),
    action: payload.action,
    data: payload.data,
    // Simulated payment details for the webhook handler
    _test: true,
    _simulated_status: payload.status,
    _simulated_status_detail: payload.status_detail,
  }

  const url = `${SITE_URL}${WEBHOOK_PATH}`
  console.log(`\n  → Enviando ${eventType} a ${url}`)
  console.log(`    Payload: ${JSON.stringify(body, null, 2).split('\n').join('\n    ')}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Test-Webhook': 'true' },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    let result
    try { result = JSON.parse(text) } catch { result = text }

    if (response.ok) {
      console.log(`  ✅ ${eventType}: ${response.status} ${response.statusText}`)
      if (result && typeof result === 'object') {
        console.log(`    Response: ${JSON.stringify(result)}`)
      }
      return true
    } else {
      console.log(`  ❌ ${eventType}: ${response.status} ${response.statusText}`)
      console.log(`    Response: ${typeof result === 'string' ? result : JSON.stringify(result)}`)
      return false
    }
  } catch (err) {
    console.log(`  ❌ ${eventType}: Error de conexión — ${err.message}`)
    console.log(`    ¿Está corriendo el servidor en ${SITE_URL}?`)
    return false
  }
}

async function main() {
  console.log('\n  🪝 SitioHoy Webhook Tester (Local)\n')
  console.log(`  Target: ${SITE_URL}${WEBHOOK_PATH}`)

  const events = runAll ? Object.keys(PAYMENT_EVENTS) : [event]
  const results = []

  for (const evt of events) {
    const ok = await sendWebhook(evt)
    results.push({ event: evt, ok })
  }

  console.log('\n  ─────────────────────────────────')
  console.log('  Resultados:')
  for (const r of results) {
    console.log(`    ${r.ok ? '✅' : '❌'} ${r.event}`)
  }

  const allOk = results.every(r => r.ok)
  console.log(`\n  ${allOk ? '✅ Todos los webhooks respondieron correctamente' : '⚠️  Algunos webhooks fallaron'}\n`)
  process.exit(allOk ? 0 : 1)
}

main()
