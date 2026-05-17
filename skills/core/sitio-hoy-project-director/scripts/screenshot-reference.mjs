#!/usr/bin/env node
/**
 * SitioHoy — Screenshot Reference
 *
 * Captura screenshots de sitios de referencia y los guarda en
 * .sitiohoy/design/references/ para que la skill los use como
 * contexto visual al generar layouts.
 *
 * Uso:
 *   node screenshot-reference.mjs https://sitio.com
 *   node screenshot-reference.mjs https://sitio.com --label "tienda-ropa"
 *   node screenshot-reference.mjs https://sitio.com --full-page
 *   node screenshot-reference.mjs https://sitio.com --mobile
 *   node screenshot-reference.mjs --batch urls.txt   # un URL por línea
 *
 * Requiere:
 *   npm install playwright
 *   npx playwright install chromium
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

// ── Args ──────────────────────────────────────────────────────────────────────
const args = new Map()
const positional = []
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg.startsWith('--')) {
    const next = process.argv[i + 1]
    args.set(arg.slice(2), next && !next.startsWith('--') ? process.argv[++i] : true)
  } else {
    positional.push(arg)
  }
}

const fullPage  = args.get('full-page') === true
const mobile    = args.get('mobile') === true
const label     = args.get('label')
const batchFile = args.get('batch')
const outDir    = path.resolve(args.get('output') ?? '.sitiohoy/design/references')
const indexFile = path.join(outDir, 'index.json')

// ── Helpers ───────────────────────────────────────────────────────────────────
const slugify = (str) =>
  str.replace(/^https?:\/\//, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

const log  = (...m) => console.log(' ', ...m)
const warn = (...m) => console.warn('  ⚠', ...m)
const ok   = (...m) => console.log('  ✓', ...m)
const err  = (...m) => console.error('  ✗', ...m)

// ── Playwright check ──────────────────────────────────────────────────────────
let playwright
try {
  playwright = await import('playwright')
} catch {
  err('Playwright no está instalado.')
  console.log('\n  Instalarlo con:')
  console.log('    npm install playwright')
  console.log('    npx playwright install chromium\n')
  process.exit(1)
}

// ── Index (registro de screenshots) ──────────────────────────────────────────
async function loadIndex() {
  if (!existsSync(indexFile)) return { screenshots: [] }
  return JSON.parse(await readFile(indexFile, 'utf8'))
}

async function saveIndex(idx) {
  await writeFile(indexFile, JSON.stringify(idx, null, 2))
}

// ── Screenshot ────────────────────────────────────────────────────────────────
async function screenshot(url, browser, idx) {
  const slug   = label ?? slugify(url)
  const ts     = new Date().toISOString().slice(0, 10)
  const suffix = mobile ? '-mobile' : fullPage ? '-full' : ''
  const file   = `${slug}${suffix}-${ts}.png`
  const dest   = path.join(outDir, file)

  log(`Capturando${mobile ? ' (mobile)' : ''}${fullPage ? ' (full-page)' : ''}: ${url}`)

  const viewport = mobile
    ? { width: 390, height: 844 }   // iPhone 14
    : { width: 1440, height: 900 }  // desktop estándar

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,           // 2x para mayor nitidez
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  })

  const page = await context.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
    // Esperar un poco para lazy-loaded images
    await page.waitForTimeout(1500)
    await page.screenshot({ path: dest, fullPage, type: 'png' })
  } catch (e) {
    // Reintentar con load si networkidle falla (sitios con websockets)
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20_000 })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: dest, fullPage, type: 'png' })
    } catch (e2) {
      await context.close()
      throw new Error(`No se pudo cargar ${url}: ${e2.message}`)
    }
  }

  await context.close()

  // Registrar en index
  const entry = { url, file, label: slug, mobile, full_page: fullPage, captured_at: ts }
  idx.screenshots = idx.screenshots.filter((s) => s.file !== file) // dedup
  idx.screenshots.unshift(entry)

  ok(`${file}`)
  return entry
}

// ── Main ──────────────────────────────────────────────────────────────────────
await mkdir(outDir, { recursive: true })
const idx = await loadIndex()

// Obtener lista de URLs
let urls = [...positional]
if (batchFile) {
  if (!existsSync(batchFile)) { err(`Archivo no encontrado: ${batchFile}`); process.exit(1) }
  const lines = (await readFile(batchFile, 'utf8')).split('\n').map((l) => l.trim()).filter(Boolean)
  urls = [...urls, ...lines]
}

if (urls.length === 0) {
  console.log('\n  Uso: node screenshot-reference.mjs <url> [opciones]')
  console.log('  Ejemplo: node screenshot-reference.mjs https://demo.vercel.store --label tienda\n')
  process.exit(0)
}

log('')
log('SitioHoy — Screenshot Reference')
log(`Destino: ${outDir}`)
log('')

const browser = await playwright.chromium.launch()

let failed = 0
for (const url of urls) {
  try {
    await screenshot(url, browser, idx)
  } catch (e) {
    err(`${url}: ${e.message}`)
    failed++
  }
}

await browser.close()
await saveIndex(idx)

log('')
log(`${urls.length - failed} screenshot(s) guardados`)
log(`Index: ${indexFile}`)
log('')

// Mostrar cómo usarlo en la skill
if (idx.screenshots.length > 0) {
  log('Para usar en diseño, indicarle a la skill:')
  log('  "Tengo referencias en .sitiohoy/design/references/"')
  log('  La skill las leerá como imágenes para guiar el layout.')
  log('')
}

if (failed > 0) process.exit(1)
