import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const reportPath = path.join(root, '.sitiohoy', 'qa', 'static-report.json')
const staticReport = existsSync(reportPath)
  ? JSON.parse(await readFile(reportPath, 'utf8'))
  : { ok: false, counts: { errors: 0, warnings: 1 }, findings: [{ severity: 'warning', message: 'No se encontro static-report.json' }] }

const visualReportPath = path.join(root, '.sitiohoy', 'qa', 'visual-report.json')
const visualReport = existsSync(visualReportPath)
  ? JSON.parse(await readFile(visualReportPath, 'utf8'))
  : { ok: false, skipped: true, reason: 'No se encontro visual-report.json', counts: { errors: 0, warnings: 1 }, findings: [] }

const configPath = path.join(root, 'sitiohoy.config.json')
const config = existsSync(configPath)
  ? JSON.parse(await readFile(configPath, 'utf8'))
  : { project: process.env.NEXT_PUBLIC_SITE_NAME ?? 'SitioHoy', plan: 'sin-definir' }

const date = new Date().toISOString().slice(0, 10)
const safeProject = String(config.project ?? 'sitiohoy').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const fileName = `QA-${safeProject || 'sitiohoy'}-${date}.md`

const allFindings = [
  ...(staticReport.findings ?? []).map((finding) => ({ ...finding, source: 'static' })),
  ...(visualReport.findings ?? []).map((finding) => ({
    ...finding,
    source: `visual ${finding.page ?? ''} ${finding.viewport ?? ''}`.trim(),
  })),
]

const findingRows = allFindings.length
  ? allFindings.map(f => `| ${f.severity} | ${f.file ?? f.source ?? ''} | ${f.message} |`)
  : ['| ok | | Sin hallazgos automaticos |']

const lines = [
  `# QA - ${config.project ?? 'SitioHoy'}`,
  '',
  `Plan: ${config.plan ?? 'sin-definir'}`,
  `Fecha: ${date}`,
  `Estado automatico: ${staticReport.ok ? 'OK' : 'REVISAR'}`,
  `Estado visual: ${visualReport.skipped ? 'OMITIDO' : visualReport.ok ? 'OK' : 'REVISAR'}`,
  '',
  '## Resumen automatico',
  '',
  `- Errores: ${staticReport.counts?.errors ?? 0}`,
  `- Warnings: ${staticReport.counts?.warnings ?? 0}`,
  `- Errores visuales: ${visualReport.counts?.errors ?? 0}`,
  `- Warnings visuales: ${visualReport.counts?.warnings ?? 0}`,
  `- Screenshots responsive: ${visualReport.screenshots?.length ?? 0}`,
  '',
  '## Auditoria visual',
  '',
  visualReport.skipped
    ? `- Omitida: ${visualReport.reason ?? 'sin motivo registrado'}`
    : `- Base URL: ${visualReport.baseUrl ?? 'sin URL'}`,
  ...(visualReport.screenshots?.length
    ? visualReport.screenshots.map((screenshot) => `- ${screenshot}`)
    : ['- Sin screenshots guardados.']),
  '',
  '## E2E - Flujo de usuario real',
  '',
  '- [ ] `SITE_URL=http://localhost:3000 npm run sitiohoy:e2e` corrio sin errores.',
  '- [ ] Screenshots `.sitiohoy/qa/e2e/375`, `768`, `1280` y `1920` revisados.',
  '- [ ] Menu mobile abre y muestra categorias.',
  '- [ ] Producto agregado al carrito.',
  '- [ ] Checkout carga sin errores JS.',
  '- [ ] Contacto visible y enviable.',
  '- [ ] Ninguna ruta devuelve 404 o 500.',
  '',
  '## Hallazgos',
  '',
  '| Severidad | Archivo | Hallazgo |',
  '|---|---|---|',
  ...findingRows,
  '',
  '## Pendientes manuales criticos',
  '',
  '- [ ] Responsive verificado en 375, 390, 768, 1280 y 1920 px.',
  '- [ ] Formulario o WhatsApp probado manualmente.',
  '- [ ] Sitemap y robots abiertos en navegador.',
  '- [ ] Compra de prueba realizada si aplica MercadoPago.',
  '- [ ] Webhook de MercadoPago validado en produccion si aplica.',
  '- [ ] Email transaccional recibido si aplica Resend.',
  '- [ ] Dominio, SSL y variables Vercel revisados antes del deploy final.',
  '',
  '## Pendientes para PRODUCCION',
  '',
  '- [ ] Variables Vercel Production completas.',
  '- [ ] `NEXT_PUBLIC_URL` con HTTPS final.',
  '- [ ] MercadoPago en credenciales de produccion y webhook activo.',
  '- [ ] Resend con SPF/DKIM/DMARC verificados para sitiohoy.com.ar.',
  '- [ ] Envia/Correo Argentino en modo produccion si aplica.',
  '- [ ] Compra real de prueba completada y reembolsada.',
  '- [ ] Formulario de contacto probado y email recibido.',
  '- [ ] `console.log`/debug temporales removidos y secret scan OK.',
]

await mkdir(root, { recursive: true })
await writeFile(path.join(root, fileName), `${lines.join('\n')}\n`)
console.log(fileName)
