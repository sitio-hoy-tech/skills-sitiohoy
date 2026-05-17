/**
 * visual-audit.mjs
 * Revisa el sitio en viewports clave y guarda screenshots para auditoria.
 *
 * Uso:
 *   SITE_URL=http://localhost:3000 node scripts/visual-audit.mjs
 *   node scripts/visual-audit.mjs --url http://localhost:3000 --pages /,/catalogo,/checkout
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const qaDir = path.join(root, '.sitiohoy', 'qa')
const visualDir = path.join(qaDir, 'visual')

const args = new Map()
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i]
  if (!arg.startsWith('--')) continue
  const key = arg.slice(2)
  const next = process.argv[i + 1]
  if (next && !next.startsWith('--')) {
    args.set(key, next)
    i += 1
  } else {
    args.set(key, 'true')
  }
}

const baseUrl = args.get('url') || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
const pages = String(args.get('pages') || process.env.SITIOHOY_VISUAL_PAGES || '/')
  .split(',')
  .map((page) => page.trim())
  .filter(Boolean)

const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'wide-1920', width: 1920, height: 1080 },
]

const writeReport = async (report) => {
  await mkdir(qaDir, { recursive: true })
  await writeFile(path.join(qaDir, 'visual-report.json'), `${JSON.stringify(report, null, 2)}\n`)
}

if (!baseUrl) {
  const report = {
    ok: true,
    skipped: true,
    reason: 'SITE_URL no definido. Ejecutar con el servidor local activo para auditar diseño responsive.',
    generatedAt: new Date().toISOString(),
    findings: [],
    screenshots: [],
  }
  await writeReport(report)
  console.log('Visual audit omitido: definir SITE_URL=http://localhost:3000 para ejecutarlo.')
  process.exit(0)
}

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  await writeReport({
    ok: false,
    skipped: false,
    reason: 'Playwright no esta instalado. Instalarlo y agregar sitiohoy:e2e antes de cerrar diseño.',
    generatedAt: new Date().toISOString(),
    findings: [{ severity: 'error', page: '', viewport: '', message: 'Falta dependencia playwright.' }],
    screenshots: [],
  })
  console.error('Playwright no esta instalado. Agregarlo al proyecto para ejecutar sitiohoy:visual-audit.')
  process.exit(1)
}

const safeName = (pagePath, viewportName) => {
  const pageName = pagePath === '/' ? 'home' : pagePath.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${pageName || 'page'}-${viewportName}.png`
}

const normalizeUrl = (pagePath) => new URL(pagePath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()

const browser = await chromium.launch()
const findings = []
const screenshots = []

try {
  for (const pagePath of pages) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport })
      const consoleErrors = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      page.on('pageerror', (error) => {
        consoleErrors.push(error.message)
      })

      const targetUrl = normalizeUrl(pagePath)
      try {
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 })
      } catch (error) {
        findings.push({
          severity: 'error',
          page: pagePath,
          viewport: viewport.name,
          message: `No se pudo abrir ${targetUrl}: ${error.message}`,
        })
        await page.close()
        continue
      }

      const checks = await page.evaluate(() => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        }

        const selector = 'a,button,input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])'
        const tapTargets = Array.from(document.querySelectorAll(selector))
          .filter(visible)
          .map((element) => {
            const rect = element.getBoundingClientRect()
            const label = element.getAttribute('aria-label') || element.textContent?.trim() || element.getAttribute('href') || element.tagName
            return { label: String(label).replace(/\s+/g, ' ').slice(0, 80), width: Math.round(rect.width), height: Math.round(rect.height) }
          })
          .filter((item) => item.width < 44 || item.height < 44)
          .slice(0, 20)

        const overflowElements = Array.from(document.body.querySelectorAll('*'))
          .filter((element) => !['SCRIPT', 'STYLE', 'SVG', 'PATH'].includes(element.tagName))
          .filter(visible)
          .map((element) => {
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)
            const horizontalOverflow = element.scrollWidth > element.clientWidth + 1 && !['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)
            const outsideViewport = rect.left < -1 || rect.right > window.innerWidth + 1
            if (!horizontalOverflow && !outsideViewport) return null
            const label = element.getAttribute('aria-label') || element.textContent?.trim() || element.className || element.tagName
            return {
              tag: element.tagName.toLowerCase(),
              label: String(label).replace(/\s+/g, ' ').slice(0, 100),
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
            }
          })
          .filter(Boolean)
          .slice(0, 20)

        const brokenImages = Array.from(document.images)
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src || img.alt || 'imagen sin src')
          .slice(0, 20)

        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          tapTargets,
          overflowElements,
          brokenImages,
        }
      })

      await mkdir(visualDir, { recursive: true })
      const screenshotPath = path.join(visualDir, safeName(pagePath, viewport.name))
      await page.screenshot({ path: screenshotPath, fullPage: true })
      screenshots.push(path.relative(root, screenshotPath))

      if (checks.hasHorizontalOverflow) {
        findings.push({
          severity: 'error',
          page: pagePath,
          viewport: viewport.name,
          message: `Overflow horizontal: documento ${checks.documentWidth}px > viewport ${checks.viewportWidth}px.`,
        })
      }
      for (const item of checks.overflowElements) {
        findings.push({
          severity: 'error',
          page: pagePath,
          viewport: viewport.name,
          message: `Elemento desborda: ${item.tag} "${item.label}" (${item.left}-${item.right}px).`,
        })
      }
      for (const item of checks.brokenImages) {
        findings.push({
          severity: 'error',
          page: pagePath,
          viewport: viewport.name,
          message: `Imagen rota: ${item}`,
        })
      }
      for (const item of checks.tapTargets) {
        findings.push({
          severity: item.width < 36 || item.height < 36 ? 'error' : 'warning',
          page: pagePath,
          viewport: viewport.name,
          message: `Tap target chico: "${item.label}" ${item.width}x${item.height}px. Minimo recomendado 44x44.`,
        })
      }
      for (const error of consoleErrors.slice(0, 20)) {
        findings.push({
          severity: 'error',
          page: pagePath,
          viewport: viewport.name,
          message: `Console error: ${error}`,
        })
      }

      await page.close()
    }
  }
} finally {
  await browser.close()
}

const errors = findings.filter((finding) => finding.severity === 'error').length
const warnings = findings.filter((finding) => finding.severity === 'warning').length
const report = {
  ok: errors === 0,
  skipped: false,
  generatedAt: new Date().toISOString(),
  baseUrl,
  pages,
  viewports,
  counts: { errors, warnings },
  findings,
  screenshots,
}

await writeReport(report)

console.log('\nSitioHoy Visual Audit')
console.log('─────────────────────')
console.log(`URL: ${baseUrl}`)
console.log(`Paginas: ${pages.join(', ')}`)
console.log(`Screenshots: ${screenshots.length}`)
console.log(`Errores: ${errors} | Warnings: ${warnings}`)
console.log('Reporte: .sitiohoy/qa/visual-report.json\n')

if (errors > 0) process.exit(1)
