/**
 * briefing-server.mjs
 * Pure Node.js — no npm dependencies.
 * Serves briefing-form.html and handles intake submission.
 */

import http from 'node:http'
import fs from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FORM_HTML = path.resolve(__dirname, '../assets/briefing-form.html')
const START_PORT = 3456
const CWD = process.cwd()
const TENANT_SELECT = [
  'id',
  'name',
  'slug',
  'plan',
  'status',
  'max_products',
  'url',
  'contact_email',
  'mp_access_token',
  'mp_public_key',
  'resend_api_key',
  'envia_access_token',
  'correo_argentino_customer_id',
  'umami_url',
  'umami_website_id',
  'origin_name',
  'origin_phone',
  'origin_address',
  'origin_city',
  'origin_state',
  'origin_postal_code',
  'subscription_status',
  'current_period_end',
  'created_at',
].join(',')
const ALLOWED_PLANS = new Set(['esencial', 'emprendimiento', 'empresa'])

// ── ANSI COLORS ─────────────────────────────────────────────────────────────
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  gray:    '\x1b[90m',
  white:   '\x1b[97m',
  bgGreen: '\x1b[42m',
}

const clr = (color, str) => `${color}${str}${c.reset}`
const log  = (...a) => console.log(...a)

// ── FIND FREE PORT ───────────────────────────────────────────────────────────
async function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > 65535) {
        reject(new Error(`No se encontró un puerto libre desde ${start} hasta 65535`))
        return
      }
      const server = http.createServer()
      server.once('error', () => tryPort(port + 1))
      server.once('listening', () => { server.close(() => resolve(port)) })
      server.listen(port, '127.0.0.1')
    }
    tryPort(start)
  })
}

// ── OPEN BROWSER ─────────────────────────────────────────────────────────────
function openBrowser(url) {
  try {
    const platform = process.platform
    if (platform === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' })
    else if (platform === 'win32') execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true })
    else execSync(`xdg-open "${url}"`, { stdio: 'ignore' })
  } catch {
    log(clr(c.yellow, `  → Abrí manualmente: ${url}`))
  }
}

// ── MULTIPART PARSER ─────────────────────────────────────────────────────────
/**
 * Minimal multipart/form-data parser — no dependencies.
 * Returns: { fields: { name: string }, files: [{ fieldname, filename, data: Buffer }] }
 */
function parseMultipart(body, boundary) {
  const fields = {}
  const files = []
  const boundaryBuf = Buffer.from('--' + boundary)
  const CRLF = Buffer.from('\r\n')
  const CRLFx2 = Buffer.from('\r\n\r\n')

  let pos = 0
  // Find first boundary
  while (pos < body.length) {
    const boundStart = indexOf(body, boundaryBuf, pos)
    if (boundStart === -1) break
    pos = boundStart + boundaryBuf.length

    // Check for terminal boundary (--boundary--)
    if (body[pos] === 0x2d && body[pos + 1] === 0x2d) break

    // Skip CRLF after boundary
    if (body[pos] === 0x0d && body[pos + 1] === 0x0a) pos += 2

    // Find header/body separator
    const headerEnd = indexOf(body, CRLFx2, pos)
    if (headerEnd === -1) break

    const headersBuf = body.slice(pos, headerEnd)
    const headers = headersBuf.toString('utf8')
    pos = headerEnd + 4 // skip \r\n\r\n

    // Find next boundary (marks end of this part's data)
    const nextBound = indexOf(body, Buffer.from('\r\n--' + boundary), pos)
    const dataEnd = nextBound === -1 ? body.length : nextBound
    const data = body.slice(pos, dataEnd)
    pos = dataEnd

    // Parse Content-Disposition
    const dispMatch = headers.match(/Content-Disposition:\s*form-data;(.+?)(?:\r\n|$)/i)
    if (!dispMatch) continue
    const disp = dispMatch[1]

    const nameMatch = disp.match(/name="([^"]*)"/)
    const filenameMatch = disp.match(/filename="([^"]*)"/)

    if (!nameMatch) continue
    const fieldname = nameMatch[1]

    if (filenameMatch) {
      const filename = filenameMatch[1]
      if (filename) {
        files.push({ fieldname, filename, data: Buffer.from(data) })
      }
    } else {
      fields[fieldname] = data.toString('utf8')
    }
  }

  return { fields, files }
}

function indexOf(buf, search, start = 0) {
  for (let i = start; i <= buf.length - search.length; i++) {
    let found = true
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break }
    }
    if (found) return i
  }
  return -1
}

// ── READ REQUEST BODY ────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// ── SLUGIFY ───────────────────────────────────────────────────────────────────
function slugify(str) {
  return String(str ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseEnvValue(value) {
  return String(value ?? '').trim().replace(/^['"]|['"]$/g, '')
}

function loadLocalCredentials() {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const candidates = [
    path.join(CWD, '.env.local'),
    path.join(CWD, '.env'),
    path.join(CWD, 'credentials.env'),
    home ? path.join(home, '.sitiohoy', 'credentials.env') : '',
  ].filter(Boolean)

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    const content = fs.readFileSync(file, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const clean = line.trim()
      if (!clean || clean.startsWith('#') || !clean.includes('=')) continue
      const [key, ...rest] = clean.split('=')
      const name = key.trim().replace(/^export\s+/, '')
      if (!name || process.env[name]) continue
      process.env[name] = parseEnvValue(rest.join('='))
    }
  }
}

function getSupabaseCredentials() {
  loadLocalCredentials()
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return { url: String(url).replace(/\/$/, ''), serviceRoleKey }
}

function supabaseHeaders(serviceRoleKey, extra = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extra,
  }
}

async function fetchTenantRow(credentials, tenantId) {
  const url = new URL(`${credentials.url}/rest/v1/tenants`)
  url.searchParams.set('id', `eq.${tenantId}`)
  url.searchParams.set('select', TENANT_SELECT)
  url.searchParams.set('limit', '1')

  const response = await fetch(url, { headers: supabaseHeaders(credentials.serviceRoleKey) })
  const text = await response.text()
  if (!response.ok) throw new Error(`Supabase tenants ${response.status}: ${text}`)
  const rows = text ? JSON.parse(text) : []
  return Array.isArray(rows) ? rows[0] : null
}

async function countTenantRows(credentials, table, tenantId) {
  const url = new URL(`${credentials.url}/rest/v1/${table}`)
  url.searchParams.set('tenant_id', `eq.${tenantId}`)
  url.searchParams.set('select', 'id')

  const response = await fetch(url, {
    headers: supabaseHeaders(credentials.serviceRoleKey, { Prefer: 'count=exact', Range: '0-0' }),
  })
  if (!response.ok) return { count: null, error: `${table}: ${response.status}` }
  const range = response.headers.get('content-range') || ''
  const count = Number(range.split('/').pop())
  return { count: Number.isFinite(count) ? count : null }
}

function publicTenantSnapshot(row, related = {}) {
  return {
    id: row.id,
    name: row.name ?? '',
    slug: row.slug ?? '',
    plan: row.plan ?? '',
    status: row.status ?? '',
    maxProducts: row.max_products ?? null,
    url: row.url ?? '',
    contactEmail: row.contact_email ?? '',
    mercadoPagoConfigured: Boolean(row.mp_access_token && row.mp_public_key),
    resendConfigured: Boolean(row.resend_api_key),
    enviaConfigured: Boolean(row.envia_access_token),
    correoArgentinoConfigured: Boolean(row.correo_argentino_customer_id),
    umamiConfigured: Boolean(row.umami_url || row.umami_website_id),
    origin: {
      name: row.origin_name ?? '',
      phone: row.origin_phone ?? '',
      address: row.origin_address ?? '',
      city: row.origin_city ?? '',
      state: row.origin_state ?? '',
      postalCode: row.origin_postal_code ?? '',
    },
    subscription: {
      status: row.subscription_status ?? '',
      currentPeriodEnd: row.current_period_end ?? '',
    },
    createdAt: row.created_at ?? '',
    related,
  }
}

function mergeTenantIntoIntake(intake, tenant) {
  const plan = ALLOWED_PLANS.has(String(tenant.plan ?? '').toLowerCase())
    ? String(tenant.plan).toLowerCase()
    : String(intake.plan ?? 'esencial').toLowerCase()
  const hasCheckout = plan === 'emprendimiento' || plan === 'empresa'

  intake.plan = plan
  intake.business = {
    ...(intake.business ?? {}),
    name: tenant.name || intake.business?.name || 'SitioHoy',
    slug: tenant.slug || intake.business?.slug || slugify(tenant.name || 'sitiohoy'),
  }

  intake.technical = {
    ...(intake.technical ?? {}),
    mercadoPagoActive: Boolean(tenant.mp_access_token && tenant.mp_public_key) || Boolean(intake.technical?.mercadoPagoActive),
    correoArgentinoRequested: plan === 'empresa' && Boolean(tenant.correo_argentino_customer_id),
    enviaRequested: plan === 'empresa' && Boolean(tenant.envia_access_token) && !tenant.correo_argentino_customer_id,
    resendRequested: hasCheckout && (Boolean(tenant.resend_api_key) || Boolean(intake.technical?.resendRequested)),
    domain: {
      ...(intake.technical?.domain ?? {}),
      status: tenant.url ? 'owned' : (intake.technical?.domain?.status ?? 'pending_purchase'),
      value: tenant.url || intake.technical?.domain?.value || '',
    },
  }

  intake.contact = {
    ...(intake.contact ?? {}),
    email: tenant.contact_email || intake.contact?.email || '',
  }

  // Track corrections
  const corrections = []
  if (intake._formPlan && intake._formPlan !== plan) {
    corrections.push({ field: 'plan', from: intake._formPlan, to: plan, reason: 'El tenant en Supabase tiene un plan diferente' })
  }
  if (intake._formBusinessName && tenant.name && intake._formBusinessName !== tenant.name) {
    corrections.push({ field: 'business.name', from: intake._formBusinessName, to: tenant.name, reason: 'Nombre del tenant en Supabase difiere' })
  }
  if (corrections.length) {
    intake.corrections = corrections
    corrections.forEach(c => log(clr(c.yellow, `  ⚠ Corrección: ${c.field} "${c.from}" → "${c.to}" (${c.reason})`)))
  }
}

async function lookupExistingTenant(intake) {
  const tenantId = intake.clientStatus === 'existente' ? String(intake.existingTenantId ?? '').trim() : ''
  if (!tenantId) return null

  const checkedAt = new Date().toISOString()
  if (typeof fetch !== 'function') {
    return {
      status: 'skipped',
      checkedAt,
      tenantId,
      warnings: ['Node no tiene fetch disponible. Revisar el tenant manualmente en Supabase.'],
    }
  }

  const credentials = getSupabaseCredentials()
  if (!credentials) {
    return {
      status: 'skipped',
      checkedAt,
      tenantId,
      warnings: ['Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. No se pudo consultar el tenant existente.'],
    }
  }

  try {
    const row = await fetchTenantRow(credentials, tenantId)
    if (!row) {
      return {
        status: 'not_found',
        checkedAt,
        tenantId,
        warnings: ['No existe una fila en public.tenants para ese tenant ID.'],
      }
    }

    const relatedTables = ['products', 'categories', 'shipping_zones', 'orders', 'user_tenants']
    const relatedEntries = await Promise.all(relatedTables.map(async table => [table, await countTenantRows(credentials, table, tenantId)]))
    const related = Object.fromEntries(relatedEntries.map(([table, result]) => [table, result.count]))
    const relatedWarnings = relatedEntries.filter(([, result]) => result.error).map(([, result]) => result.error)
    mergeTenantIntoIntake(intake, row)

    return {
      status: 'found',
      checkedAt,
      tenantId,
      source: 'supabase-rest',
      tenant: publicTenantSnapshot(row, related),
      warnings: relatedWarnings,
    }
  } catch (err) {
    return {
      status: 'error',
      checkedAt,
      tenantId,
      warnings: [`No se pudo consultar Supabase: ${err.message}`],
    }
  }
}

// ── HANDLE SUBMIT ────────────────────────────────────────────────────────────
async function handleSubmit(req, res) {
  const contentType = req.headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary=(.+)/)

  let intake = null
  const savedFiles = []

  if (boundaryMatch) {
    // Multipart form data
    const boundary = boundaryMatch[1].trim()
    const body = await readBody(req)
    const { fields, files } = parseMultipart(body, boundary)

    // Parse the JSON "data" field
    if (fields.data) {
      try { intake = JSON.parse(fields.data) } catch {
        sendJSON(res, 400, { ok: false, error: 'Invalid JSON in data field' })
        return
      }
    }

    // Save uploaded files
    for (const { fieldname, filename, data } of files) {
      const folder = sanitizeFolderName(fieldname)
      const destDir = path.join(CWD, '_assets-cliente', folder)
      await mkdir(destDir, { recursive: true })
      const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._\-]/g, '-')
      const destPath = path.join(destDir, safeName)
      await writeFile(destPath, data)
      savedFiles.push(`_assets-cliente/${folder}/${safeName}`)
      log(clr(c.cyan, `  ↑ archivo guardado: _assets-cliente/${folder}/${safeName}`))
    }
  } else if (contentType.includes('application/json')) {
    // Plain JSON body
    const body = await readBody(req)
    try { intake = JSON.parse(body.toString('utf8')) } catch {
      sendJSON(res, 400, { ok: false, error: 'Invalid JSON body' })
      return
    }
  } else {
    sendJSON(res, 400, { ok: false, error: 'Unsupported content type' })
    return
  }

  if (!intake) {
    sendJSON(res, 400, { ok: false, error: 'Missing intake data' })
    return
  }

  // Save original form values for correction tracking
  if (intake.clientStatus === 'existente') {
    intake._formPlan = intake.plan
    intake._formBusinessName = intake.business?.name
  }

  const existingTenantLookup = await lookupExistingTenant(intake)
  if (existingTenantLookup) {
    intake.existingTenantLookup = existingTenantLookup
    delete intake._formPlan
    delete intake._formBusinessName
    if (existingTenantLookup.status !== 'found') {
      intake.notes = [
        ...(Array.isArray(intake.notes) ? intake.notes : []),
        'Cliente existente: revisar la fila public.tenants antes de definir plan, integraciones y datos de empresa.',
      ]
    }
  }

  // Write .sitiohoy/intake.json
  const sitiohoyDir = path.join(CWD, '.sitiohoy')
  await mkdir(sitiohoyDir, { recursive: true })
  const intakePath = path.join(sitiohoyDir, 'intake.json')
  await writeFile(intakePath, JSON.stringify(intake, null, 2) + '\n')
  log(clr(c.green, `  ✓ .sitiohoy/intake.json escrito`))

  let tenantLookupPath = null
  if (existingTenantLookup) {
    tenantLookupPath = path.join(sitiohoyDir, 'existing-tenant-check.json')
    await writeFile(tenantLookupPath, JSON.stringify(existingTenantLookup, null, 2) + '\n')
    const statusColor = existingTenantLookup.status === 'found' ? c.green : c.yellow
    log(clr(statusColor, `  ✓ .sitiohoy/existing-tenant-check.json escrito (${existingTenantLookup.status})`))
  }

  // Write sitiohoy.config.json — update integrations if exists, create if not
  const configPath = path.join(CWD, 'sitiohoy.config.json')
  const plan = String(intake.plan ?? 'esencial').toLowerCase()
  const tech = intake.technical ?? {}
  const hasCheckout = plan === 'emprendimiento' || plan === 'empresa'

  const caRequested = plan === 'empresa' && Boolean(tech.correoArgentinoRequested)
  const enviaRequested = plan === 'empresa' && Boolean(tech.enviaRequested) && !caRequested
  const fixedShipping = plan === 'emprendimiento' || (plan === 'empresa' && !caRequested && !enviaRequested)

  const newIntegrations = {
    mercadopago: hasCheckout,
    correoArgentino: caRequested,
    fixedShipping,
    envia: enviaRequested,
    resend: hasCheckout && Boolean(tech.resendRequested),
    umami: hasCheckout,
    whatsapp: true,
  }

  let config = {}
  const generatedConfig = buildNewConfig(intake, newIntegrations)
  if (fs.existsSync(configPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      const isExistingClient = generatedConfig.clientStatus === 'existente' && generatedConfig.tenantId
      config = {
        ...existing,
        ...generatedConfig,
        tenantId: isExistingClient ? generatedConfig.tenantId : (existing.tenantId ?? generatedConfig.tenantId),
        integrations: newIntegrations
      }
    } catch {
      config = generatedConfig
    }
  } else {
    config = generatedConfig
  }

  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n')
  log(clr(c.green, `  ✓ sitiohoy.config.json escrito`))

  const briefPath = path.join(CWD, 'brief.md')
  await writeFile(briefPath, buildBrief(intake, newIntegrations))
  log(clr(c.green, `  ✓ brief.md escrito`))

  // Generate DESIGN.md (AI design direction document) using the standalone generator
  const designDir = path.join(CWD, '.sitiohoy', 'design')
  await mkdir(designDir, { recursive: true })

  // Execute generate-design-md.mjs to create DESIGN.md
  const designGeneratorPath = path.join(__dirname, 'generate-design-md.mjs')
  let designMdGenerated = false

  if (fs.existsSync(designGeneratorPath)) {
    try {
      const { execSync } = await import('node:child_process')
      execSync(`node "${designGeneratorPath}"`, { cwd: CWD, stdio: 'pipe' })
      designMdGenerated = true
      log(clr(c.green, `  ✓ .sitiohoy/design/DESIGN.md generado via generate-design-md.mjs`))
    } catch (err) {
      log(clr(c.yellow, `  ⚠ Error generando DESIGN.md via script: ${err.message}`))
      log(clr(c.yellow, `    Intentando generación inline...`))
    }
  }

  // Fallback: generate inline if script failed or doesn't exist
  if (!designMdGenerated) {
    const designMdPath = path.join(designDir, 'DESIGN.md')
    await writeFile(designMdPath, buildDesignMd(intake, newIntegrations))
    log(clr(c.green, `  ✓ .sitiohoy/design/DESIGN.md escrito (inline)`))
  }

  log(clr(c.cyan, `    → El modelo AI usará este archivo como dirección creativa`))

  // Write copy guide
  const copyGuidePath = path.join(sitiohoyDir, 'copy-guide.md')
  await writeFile(copyGuidePath, buildCopyGuide(intake, newIntegrations))
  log(clr(c.green, `  ✓ .sitiohoy/copy-guide.md escrito`))

  // Summary
  log('')
  log(clr(c.bold, clr(c.white, '  Archivos generados:')))
  log(clr(c.gray, '  .sitiohoy/intake.json'))
  if (tenantLookupPath) log(clr(c.gray, '  .sitiohoy/existing-tenant-check.json'))
  log(clr(c.gray, '  sitiohoy.config.json'))
  log(clr(c.gray, '  brief.md'))
  log(clr(c.gray, '  .sitiohoy/design/DESIGN.md'))
  log(clr(c.cyan, '    → El modelo AI usará DESIGN.md como dirección creativa para generar el diseño'))
  log(clr(c.gray, '  .sitiohoy/copy-guide.md'))
  savedFiles.forEach(f => log(clr(c.gray, `  ${f}`)))
  log('')

  sendJSON(res, 200, { ok: true, intake: intakePath, config: configPath, brief: briefPath, tenantLookup: tenantLookupPath, files: savedFiles })

  // Graceful shutdown after 2s
  setTimeout(() => {
    log(clr(c.yellow, '\n  Briefing recibido. Cerrando servidor...\n'))
    process.exit(0)
  }, 2000)
}

function buildNewConfig(intake, integrations) {
  const business = intake.business ?? {}
  const tech = intake.technical ?? {}
  const domain = tech.domain ?? {}
  const plan = String(intake.plan ?? 'esencial').toLowerCase()
  const siteUrl = domain.status === 'owned' && domain.value
    ? String(domain.value).replace(/\/$/, '')
    : ''
  const isExisting = intake.clientStatus === 'existente' && intake.existingTenantId

  return {
    project: business.name ?? 'SitioHoy',
    business: {
      name: business.name ?? 'SitioHoy',
      slug: business.slug || slugify(business.name ?? 'sitiohoy'),
      industry: business.industry ?? '',
      description: business.description ?? '',
    },
    slug: business.slug || slugify(business.name ?? 'sitiohoy'),
    plan,
    clientStatus: intake.clientStatus ?? 'nuevo',
    tenantId: isExisting ? intake.existingTenantId : randomUUID(),
    siteUrl,
    domain,
    integrations,
    technical: {
      editor: tech.editor ?? 'other',
      supabaseMcp: Boolean(tech.supabaseMcp),
      aiDesignerMcp: Boolean(tech.aiDesignerMcp),
      mercadoPagoActive: Boolean(tech.mercadoPagoActive),
    },
    catalog: intake.catalog ?? {},
    assets: intake.assets ?? {},
    limits: {
      maxProducts: plan === 'esencial' ? 50 : plan === 'emprendimiento' ? 200 : null,
    },
    qualityGates: {
      build: true,
      staticValidation: true,
      qaReport: true,
      checkoutManualTest: plan !== 'esencial',
      lighthouse: true,
    },
    performanceBudget: {
      lcp: plan === 'empresa' ? 1800 : 2500,       // ms
      fid: 100,                                     // ms
      cls: 0.1,
      ttfb: plan === 'empresa' ? 600 : 800,        // ms
      bundleSizeKb: plan === 'esencial' ? 200 : plan === 'emprendimiento' ? 350 : 500,
      lighthouseMobile: plan === 'empresa' ? 90 : 80,
      lighthouseDesktop: 90,
    },
  }
}

function buildBrief(intake, integrations) {
  const business = intake.business ?? {}
  const tech = intake.technical ?? {}
  const audience = intake.audience ?? {}
  const visual = intake.visualIdentity ?? {}
  const catalog = intake.catalog ?? {}
  const pages = intake.pages ?? {}
  const contact = intake.contact ?? {}
  const assets = intake.assets ?? {}
  const plan = String(intake.plan ?? 'esencial').toLowerCase()
  const pageList = Object.entries(pages).filter(([, enabled]) => enabled).map(([name]) => name)
  const shipping = integrations.correoArgentino
    ? 'Correo Argentino directo'
    : integrations.envia
      ? 'Envia.com'
      : integrations.fixedShipping
        ? 'precios fijos por zona'
        : 'sin envíos automatizados'

  const yesNo = (value) => value ? 'sí' : 'no'
  const list = (items) => Array.isArray(items) && items.length ? items.map(item => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') return [item.network, item.url].filter(Boolean).join(': ')
    return ''
  }).filter(Boolean).join(', ') : 'sin datos'

  const isExisting = intake.clientStatus === 'existente' && intake.existingTenantId
  const lookup = intake.existingTenantLookup
  const tenant = lookup?.tenant
  const tenantLookupLines = isExisting
    ? [
        `- Consulta tenant: ${lookup?.status ?? 'no realizada'}`,
        ...(lookup?.checkedAt ? [`- Consultado en: ${lookup.checkedAt}`] : []),
        ...(tenant ? [
          `- Tenant cargado: ${tenant.name || 'sin nombre'} (${tenant.slug || 'sin slug'})`,
          `- Estado tenant: ${tenant.status || 'sin datos'}`,
          `- Plan tenant: ${tenant.plan || 'sin datos'}`,
          `- URL tenant: ${tenant.url || 'sin datos'}`,
          `- Contact email tenant: ${tenant.contactEmail || 'sin datos'}`,
          `- MercadoPago configurado: ${yesNo(tenant.mercadoPagoConfigured)}`,
          `- Resend configurado: ${yesNo(tenant.resendConfigured)}`,
          `- Envia configurado: ${yesNo(tenant.enviaConfigured)}`,
          `- Correo Argentino configurado: ${yesNo(tenant.correoArgentinoConfigured)}`,
          `- Umami configurado: ${yesNo(tenant.umamiConfigured)}`,
          `- Origen envios: ${[tenant.origin?.address, tenant.origin?.city, tenant.origin?.state, tenant.origin?.postalCode].filter(Boolean).join(', ') || 'sin datos'}`,
          `- Datos relacionados: productos ${tenant.related?.products ?? 'n/d'}, categorias ${tenant.related?.categories ?? 'n/d'}, zonas envio ${tenant.related?.shipping_zones ?? 'n/d'}, pedidos ${tenant.related?.orders ?? 'n/d'}, usuarios ${tenant.related?.user_tenants ?? 'n/d'}`,
        ] : []),
        ...(lookup?.warnings?.length ? lookup.warnings.map(warning => `- Advertencia tenant: ${warning}`) : []),
        '',
      ]
    : []

  const lines = [
    `# Brief SitioHoy - ${business.name ?? 'Proyecto'}`,
    '',
    '## Estado del Cliente',
    '',
    `- Tipo: ${isExisting ? 'Cliente existente' : 'Cliente nuevo'}`,
    isExisting ? `- Tenant ID: ${intake.existingTenantId}` : '- Se debe crear tenant nuevo en Supabase',
    ...tenantLookupLines,
    '',
    '## Negocio',
    '',
    `- Nombre: ${business.name ?? 'sin datos'}`,
    `- Slug: ${business.slug ?? 'sin datos'}`,
    `- Rubro: ${business.industry ?? 'sin datos'}`,
    `- Objetivo principal: ${business.primaryGoal ?? 'sin datos'}`,
    `- Descripción: ${business.description ?? 'sin datos'}`,
    `- Diferencial: ${business.differentiator ?? 'sin datos'}`,
    `- Referentes visuales: ${list(business.visualReferences)}`,
    '',
    '## Alcance Técnico',
    '',
    `- Plan: ${plan}`,
    `- MercadoPago: ${yesNo(integrations.mercadopago)}`,
    `- MercadoPago activo del cliente: ${yesNo(tech.mercadoPagoActive)}`,
    `- Envíos: ${shipping}`,
    `- Resend: ${yesNo(integrations.resend)}`,
    `- Umami: ${yesNo(integrations.umami)}`,
    `- Dominio: ${tech.domain?.value || tech.domain?.status || 'sin datos'}`,
    `- Editor/IA: ${tech.editor ?? 'sin datos'}`,
    `- Supabase MCP: ${yesNo(tech.supabaseMcp)}`,
    `- AIDesigner MCP: ${yesNo(tech.aiDesignerMcp)}`,
    '',
    '## Audiencia y Tono',
    '',
    `- Perfil: ${audience.profile ?? 'sin datos'}`,
    `- Problema: ${audience.problem ?? 'sin datos'}`,
    `- Sensación deseada: ${audience.desiredFeeling ?? 'sin datos'}`,
    `- Tono: ${audience.tone ?? 'sin datos'}`,
    `- Dispositivo principal: ${audience.primaryDevice ?? 'sin datos'}`,
    '',
    '## Identidad Visual',
    '',
    `- Colores definidos: ${yesNo(visual.colors?.defined)}`,
    `- Primario: ${visual.colors?.primary || visual.colors?.hints || 'derivar del brief/logo'}`,
    `- Secundario: ${visual.colors?.secondary || 'derivar del brief/logo'}`,
    `- Acento: ${visual.colors?.accent || 'derivar del brief/logo'}`,
    `- Mood: ${visual.desiredMood ?? 'sin datos'}`,
    `- Estilo: ${visual.style ?? 'sin datos'}`,
    `- Logo disponible: ${yesNo(visual.logo?.available)} ${visual.logo?.format ? `(${visual.logo.format})` : ''}`.trim(),
    `- Calidad de fotos: ${visual.photoQuality ?? 'sin datos'}`,
    `- Animaciones: ${intake.animations ?? 'subtle'}`,
    '',
    '## Catálogo',
    '',
    `- Cantidad inicial: ${catalog.initialCount ?? 0}`,
    `- Categorías: ${list(catalog.categories)}`,
    `- Variantes: ${yesNo(catalog.hasVariants)}`,
    `- Rango de precios: ${catalog.priceRange || 'sin datos'}`,
    `- Tipo: ${catalog.type ?? 'sin datos'}`,
    `- Peso default: ${catalog.defaultWeightGrams ?? 'no aplica'} g`,
    `- Peso estimado: ${yesNo(catalog.weightEstimated)}`,
    `- Dimensiones default: ${catalog.defaultDimensionsCm ? `${catalog.defaultDimensionsCm.length} x ${catalog.defaultDimensionsCm.width} x ${catalog.defaultDimensionsCm.height} cm` : 'sin datos'}`,
    '',
    '## Páginas',
    '',
    `- Páginas solicitadas: ${list(pageList)}`,
    '',
    '## Contacto',
    '',
    `- WhatsApp: ${contact.whatsapp || 'sin datos'}`,
    `- Email: ${contact.email || 'sin datos'}`,
    `- Redes: ${list(contact.socials)}`,
    `- Red principal: ${contact.primarySocial || 'sin datos'}`,
    '',
    '## Assets',
    '',
    `- Carpeta lista: ${yesNo(assets.folderReady)}`,
    `- Faltantes: ${list(assets.missing)}`,
    assets.missing?.includes('productos')
      ? '- Regla: usar imágenes Unsplash relacionadas al rubro/categoría/producto hasta recibir fotos reales.'
      : '- Regla: usar imágenes provistas por el cliente.',
    '',
    '## Riesgos y Pendientes',
    '',
    ...(intake.notes?.length ? intake.notes.map(note => `- ${note}`) : ['- Sin notas adicionales.']),
    '',
  ]

  return `${lines.join('\n')}\n`
}

// Fallback inline generator if generate-design-md.mjs fails
// NOTE: Use generate-design-md.mjs as the primary generator.
// This function is a minimal fallback.
function buildDesignMd(intake, integrations) {
  const business = intake.business ?? {}
  return `# DESIGN.md — ${business.name || 'Proyecto'}\n\n> ERROR: El generador principal (generate-design-md.mjs) falló.\n> Por favor ejecutá: node scripts/generate-design-md.mjs\n`
}

  const toneDesc = toneDescriptions[tone] || toneDescriptions.profesional

  const styleHints = {
    moderno: 'Moderno y limpio. Sin exceso de decoración.',
    vintage: 'Vintage o retro. Puede incluir texturas, tipografía clásica, colores nostálgicos.',
    minimalista: 'Minimalista. Mucho espacio en blanco, pocos elementos, tipografía cuidada.',
    elegante: 'Elegante y sofisticado. Detalles refinados, paleta cromática sobria.',
    jugueton: 'Juguetón y colorido. Formas orgánicas, colores vivos, energía positiva.',
    industrial: 'Industrial o urbano. Texturas de concreto/metal, tipografía bold, alto contraste.',
    organico: 'Orgánico y natural. Colores tierra, formas suaves, tipografía artesanal.',
    tecnologico: 'Tecnológico. Líneas limpias, acentos neón, tipografía monoespaciada o geométrica.',
    oscuro: 'Dark mode como estilo principal. Alto contraste, acentos brillantes.',
  }

  const styleHint = styleHints[style] || styleHints.moderno

  const primaryDevice = audience.primaryDevice ?? 'mobile'
  const devicePriority = primaryDevice === 'mobile'
    ? 'Mobile-first. Diseñá primero para celular y luego escalá a desktop.'
    : primaryDevice === 'desktop'
      ? 'Desktop-priority. El público principal usa computadora, pero el sitio debe verse bien en mobile igual.'
      : 'Diseño equilibrado mobile/desktop. Ambos son importantes.'

  const list = (items) => Array.isArray(items) && items.length
    ? items.map(i => typeof i === 'string' ? i : i?.url ? `${i.network}: ${i.url}` : JSON.stringify(i)).join(', ')
    : 'ninguno'

  // Pages by plan
  function getPagesForPlan() {
    const base = ['Home']
    if (plan === 'esencial') {
      base.push('Catálogo', 'Detalle de Producto')
      if (pages.about) base.push('Sobre Nosotros')
      if (pages.faq) base.push('FAQ / Preguntas Frecuentes')
      if (pages.contact) base.push('Contacto')
      if (pages.legal) base.push('Términos y Privacidad')
      base.push('404 / Error')
    } else if (plan === 'emprendimiento') {
      base.push('Catálogo', 'Detalle de Producto', 'Carrito', 'Checkout multi-step', 'Seguimiento de Pedido')
      if (pages.about) base.push('Sobre Nosotros')
      if (pages.faq) base.push('FAQ / Preguntas Frecuentes')
      if (pages.contact) base.push('Contacto')
      if (pages.legal) base.push('Términos y Privacidad')
      base.push('404 / Error')
    } else {
      base.push('Catálogo', 'Detalle de Producto', 'Carrito', 'Checkout multi-step', 'Seguimiento de Pedido')
      if (pages.about) base.push('Sobre Nosotros')
      if (pages.faq) base.push('FAQ / Preguntas Frecuentes')
      if (pages.contact) base.push('Contacto')
      if (pages.legal) base.push('Términos y Privacidad')
      if (pages.blog) base.push('Blog')
      base.push('404 / Error')
    }
    return base
  }

  const pagesList = getPagesForPlan()
  const primaryCTA = !hasCheckout ? 'Consultar por WhatsApp / Ver catálogo' : 'Comprar ahora / Ver catálogo'

  let shippingDesc = 'Sin envíos automatizados. El cliente coordina por WhatsApp.'
  if (plan === 'emprendimiento') shippingDesc = 'Envíos por zonas fijas (CABA, GBA, Interior). El precio se calcula según la zona.'
  if (plan === 'empresa' && technical.correoArgentinoRequested) shippingDesc = 'Envíos con Correo Argentino (MiCorreo). Cotización en tiempo real.'
  if (plan === 'empresa' && technical.enviaRequested) shippingDesc = 'Envíos con Envia.com (multicarrier). Etiquetas PDF, múltiples carriers.'

  const lines = []

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`# DESIGN.md — Dirección Creativa para el Modelo AI`)
  lines.push(``)
  lines.push(`> **Proyecto:** ${business.name || 'Sin definir'}`)
  lines.push(`> **Plan:** ${plan === 'esencial' ? 'Esencial' : plan === 'emprendimiento' ? 'Emprendimiento' : 'Empresa'}`)
  lines.push(`> **Rubro:** ${business.industry || 'Sin definir'}`)
  lines.push(`> **Fecha:** ${new Date().toISOString().split('T')[0]}`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. EL NEGOCIO
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 1. Sobre el Negocio`)
  lines.push(``)
  lines.push(`**Nombre:** ${business.name || 'Sin definir'}`)
  lines.push(``)
  lines.push(`**Descripción:**`)
  lines.push(`${business.description || 'Sin definir'}`)
  lines.push(``)
  lines.push(`**Diferenciador / Por qué elegirlos:**`)
  lines.push(`${business.differentiator || 'Sin definir'}`)
  lines.push(``)
  lines.push(`**Objetivo del sitio web:**`)
  lines.push(`${business.primaryGoal || 'Mostrar productos y generar contactos/ventas'}`)
  lines.push(``)
  lines.push(`**Plan contratado:** ${plan === 'esencial' ? 'Esencial — Catálogo sin checkout. CTA principal: WhatsApp.' : plan === 'emprendimiento' ? 'Emprendimiento — Tienda con checkout, MercadoPago, envíos por zona fija.' : 'Empresa — Tienda completa con checkout, MercadoPago, envíos avanzados, analítica avanzada.'}`)
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. PÚBLICO OBJETIVO
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 2. Público Objetivo`)
  lines.push(``)
  lines.push(`**Perfil:**`)
  lines.push(`${audience.profile || 'Sin definir'}`)
  lines.push(``)
  lines.push(`**Problema que resuelve el negocio:**`)
  lines.push(`${audience.problem || 'Sin definir'}`)
  lines.push(``)
  lines.push(`**Sensación que debe transmitir el sitio:**`)
  lines.push(`${audience.desiredFeeling || 'Sin definir'}`)
  lines.push(``)
  lines.push(`**Dispositivo principal:**`)
  lines.push(`${devicePriority}`)
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. IDENTIDAD VISUAL
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 3. Identidad Visual`)
  lines.push(``)

  if (visual.colors?.primary) {
    lines.push(`**Color principal:** ${visual.colors.primary}`)
    lines.push(`- Este es el color de marca. Usalo como guía para la paleta general. Proponé una paleta completa que funcione.`)
  } else {
    lines.push(`**Color principal:** No definido — proponé una paleta que vaya con el rubro y el estilo.`)
  }

  if (visual.colors?.secondary) {
    lines.push(``)
    lines.push(`**Color secundario:** ${visual.colors.secondary}`)
  }

  if (visual.colors?.accent) {
    lines.push(``)
    lines.push(`**Color de acento:** ${visual.colors.accent}`)
  }

  lines.push(``)
  lines.push(`**Estilo visual deseado:** ${style}`)
  lines.push(`${styleHint}`)

  if (visual.desiredMood) {
    lines.push(``)
    lines.push(`**Mood / Sensación visual:** ${visual.desiredMood}`)
  }

  if (Array.isArray(business.visualReferences) && business.visualReferences.length) {
    lines.push(``)
    lines.push(`**Referencias visuales del cliente:**`)
    business.visualReferences.forEach(ref => {
      lines.push(`- ${ref}`)
    })
    lines.push(`- Tomá estas referencias como inspiración, no como algo a copiar exactamente.`)
  }

  lines.push(``)
  lines.push(`**Nivel de animaciones:** ${intake.animations || 'sutiles'}`)
  lines.push(`- sutiles = hover suaves, fade-ins básicos`)
  lines.push(`- completas = parallax, microinteracciones, entradas escalonadas`)
  lines.push(`- ninguna = solo transiciones CSS mínimas`)
  lines.push(``)

  if (visual.logo?.available) {
    lines.push(`**Logo:** Sí, el cliente tiene logo (${visual.logo.format || 'formato no especificado'}).`)
    lines.push(`- Respetalo como elemento principal de marca. Adaptá el diseño a su estilo.`)
  } else {
    lines.push(`**Logo:** No — el cliente no tiene logo todavía.`)
    lines.push(`- El sitio debe funcionar sin logo o con un wordmark tipográfico.`)
  }

  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. COMUNICACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 4. Comunicación — Tono y Lenguaje`)
  lines.push(``)
  lines.push(`**Tono general:** ${toneDesc}`)
  lines.push(``)
  lines.push(`**Reglas de comunicación:**`)
  lines.push(`- Español argentino.`)
  lines.push(`- Sin anglicismos innecesarios.`)
  lines.push(`- CTAs claros y accionables.`)
  lines.push(`- Las descripciones de producto deben comunicar el beneficio primero, la característica después.`)
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PÁGINAS A DISEÑAR
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 5. Páginas a Diseñar`)
  lines.push(``)
  lines.push(`**Plan:** ${plan === 'esencial' ? 'Esencial' : plan === 'emprendimiento' ? 'Emprendimiento' : 'Empresa'}`)
  lines.push(`**Total de páginas:** ${pagesList.length}`)
  lines.push(``)
  lines.push(`**Lista de páginas:**`)
  pagesList.forEach((page, idx) => {
    lines.push(`${idx + 1}. ${page}`)
  })
  lines.push(``)

  if (hasCheckout) {
    lines.push(`**Checkout multi-step (4 pasos):**`)
    lines.push(`1. Datos del comprador`)
    lines.push(`2. Envío y cotización`)
    lines.push(`3. Pago (MercadoPago)`)
    lines.push(`4. Confirmación de compra`)
    lines.push(``)
  }

  lines.push(`**Dispositivos a diseñar:**`)
  lines.push(`- Mobile: 375px (iPhone SE) — ${primaryDevice === 'mobile' ? '**PRIORIDAD**' : 'Importante'}`)
  lines.push(`- Tablet: 768px (iPad)`)
  lines.push(`- Desktop: 1280px (laptop) — ${primaryDevice === 'desktop' ? '**PRIORIDAD**' : 'Importante'}`)
  lines.push(`- Wide: 1440px+ (desktop grande)`)
  lines.push(``)
  lines.push(`**Nota:** Mobile-first. Empezá por mobile y escalá hacia arriba.`)
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CATÁLOGO
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 6. Catálogo de Productos`)
  lines.push(``)
  lines.push(`**Cantidad inicial:** ${catalog.initialCount || 'Sin definir'} productos`)
  lines.push(`**Categorías:** ${list(catalog.categories)}`)
  lines.push(`**Tiene variantes:** ${catalog.hasVariants ? 'Sí (color, tamaño, sabor, etc.)' : 'No'}`)
  lines.push(`**Rango de precios:** ${catalog.priceRange || 'Sin definir'}`)
  lines.push(`**Tipo:** ${catalog.type || 'Sin definir'}`)
  lines.push(``)
  if (!hasCheckout) {
    lines.push(`**Importante:** Este plan NO tiene checkout. El botón principal de cada producto debe ser "Consultar por WhatsApp", no "Comprar".`)
    lines.push(``)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. INTEGRACIONES VISUALES
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 7. Integraciones Visuales`)
  lines.push(``)
  lines.push(`**Qué integraciones activas debe reflejar el diseño:**`)
  if (hasCheckout) {
    lines.push(`- ✅ MercadoPago — badge de "Pagá con MercadoPago" en footer, checkout, producto`)
  } else {
    lines.push(`- ❌ MercadoPago — no aplica este plan`)
  }
  if (plan === 'emprendimiento') {
    lines.push(`- ✅ Envíos — badge "Envíos a todo el país" en producto, checkout, footer`)
  } else if (plan === 'empresa' && technical.correoArgentinoRequested) {
    lines.push(`- ✅ Correo Argentino — badge de envío en producto, checkout, footer`)
  } else if (plan === 'empresa' && technical.enviaRequested) {
    lines.push(`- ✅ Envia.com — badge de envío multicarrier en producto, checkout, footer`)
  } else if (plan === 'empresa') {
    lines.push(`- ✅ Envíos — según el método elegido`)
  } else {
    lines.push(`- ❌ Envíos automatizados — no aplica este plan`)
  }
  lines.push(`- ✅ WhatsApp — botón flotante verde en esquina inferior derecha, siempre visible`)
  if (hasCheckout && technical.resendRequested) {
    lines.push(`- ✅ Email — icono de email en footer y contacto`)
  }
  if (Array.isArray(contact.socials) && contact.socials.length) {
    lines.push(`- ✅ Redes sociales: ${list(contact.socials)}`)
  }
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. CONTACTO
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 8. Información de Contacto`)
  lines.push(``)
  if (contact.whatsapp) lines.push(`**WhatsApp:** ${contact.whatsapp}`)
  if (contact.email) lines.push(`**Email:** ${contact.email}`)
  if (Array.isArray(contact.socials) && contact.socials.length) {
    lines.push(`**Redes sociales:**`)
    contact.socials.forEach(s => {
      if (typeof s === 'object' && s.network && s.url) {
        lines.push(`- ${s.network}: ${s.url}`)
      }
    })
  }
  if (contact.primarySocial) lines.push(`**Red principal:** ${contact.primarySocial}`)
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. ASSETS
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 9. Assets del Cliente`)
  lines.push(``)
  if (visual.logo?.available) {
    lines.push(`✅ **Logo disponible** (${visual.logo.format || 'formato no especificado'})`)
  } else {
    lines.push(`❌ **Logo no disponible** — El sitio debe funcionar con un wordmark tipográfico.`)
  }
  if (assets.folderReady) {
    lines.push(`✅ **Carpeta de assets lista**`)
  } else {
    lines.push(`❌ **Carpeta de assets no lista** — El sitio debe funcionar con imágenes de reemplazo hasta que el cliente envíe las suyas.`)
  }
  if (Array.isArray(assets.missing) && assets.missing.length) {
    lines.push(`**Faltan:** ${assets.missing.join(', ')}`)
  }
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. DIRECTRICES CREATIVAS
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 10. Directrices Creativas`)
  lines.push(``)
  lines.push(`**Esto es lo que hay que tener en cuenta al diseñar:**`)
  lines.push(``)
  lines.push(`### Prioridades generales`)
  lines.push(`1. **Mobile-first** — El diseño debe funcionar perfecto en celular.`)
  lines.push(`2. **Conversión** — Cada página debe tener un objetivo claro y un CTA visible.`)
  lines.push(`3. **Confianza** — Señales de confianza: pagos seguros, envíos, garantía, testimonios.`)
  lines.push(`4. **Identidad única** — El diseño debe sentirse propio de ${business.name || 'este negocio'}, no genérico.`)
  lines.push(`5. **Velocidad** — Diseño ligero, sin elementos que ralenticen la carga.`)
  lines.push(``)

  lines.push(`### Qué debe tener cada página`)
  lines.push(`- **Header:** Logo, navegación, ${hasCheckout ? 'carrito con badge, ' : ''}CTA principal. Mobile: menú hamburguesa.`)
  lines.push(`- **Footer:** Contacto, links de navegación, legales, redes, crédito "Desarrollado por SitioHoy" con link a sitiohoy.com.ar.`)
  lines.push(`- **Home:** Hero que transmita la esencia del negocio. ${!hasCheckout ? 'CTA a WhatsApp.' : 'CTA a comprar o ver catálogo.'} Productos o categorías destacadas. Señales de confianza.`)
  lines.push(`- **Catálogo:** Grid de productos. Filtros por categoría. Fotos claras. Precios visibles.`)
  lines.push(`- **Producto:** Galería de imágenes. Nombre, descripción, precio. ${catalog.hasVariants ? 'Variantes. ' : ''}Botón: "${!hasCheckout ? 'Consultar por WhatsApp' : 'Agregar al carrito'}".`)
  if (hasCheckout) {
    lines.push(`- **Carrito:** Lista de productos. Control de cantidades. Resumen de totales. Botón al checkout.`)
    lines.push(`- **Checkout:** 4 pasos (datos, envío, pago, confirmación). Barra de progreso. Resumen del pedido.`)
    lines.push(`- **Seguimiento:** Timeline del estado del pedido. Detalles.`)
  }
  lines.push(`- **Sobre Nosotros:** Historia del negocio. Valores o equipo. CTA a contacto.`)
  lines.push(`- **Contacto:** Información de contacto. ${pages.contact ? 'Formulario.' : ''} Redes sociales.`)
  lines.push(`- **FAQ:** Preguntas y respuestas. CTA a contacto si no encuentra respuesta.`)
  lines.push(`- **404 / Error:** Mensaje amigable. Links útiles.`)
  lines.push(``)

  lines.push(`### Qué evitar`)
  lines.push(`- ❌ Gradientes violeta/azul/rosa genéricos sin relación con la marca`)
  lines.push(`- ❌ Glassmorphism sin propósito funcional`)
  lines.push(`- ❌ Bordes redondeados excesivos (> 20px) en contenedores grandes`)
  lines.push(`- ❌ Animaciones de scroll-reveal en TODOS los elementos sin criterio`)
  lines.push(`- ❌ Hero genérico: gente sonriendo + subtítulo + botón sobre stock photo`)
  lines.push(`- ❌ Inter / Roboto / Lato por defecto sin justificación`)
  lines.push(`- ❌ Íconos flotantes decorativos sin función`)
  lines.push(`- ❌ Cards con sombras excesivas o bordes múltiples`)
  lines.push(`- ❌ Texto que se corta o pisa otros elementos`)
  lines.push(`- ❌ UI dominada por un solo color sin contraste real`)
  lines.push(`- ❌ Mismo diseño genérico que cualquier otra tienda`)
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ACCESIBILIDAD
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 11. Requisitos de Accesibilidad`)
  lines.push(``)
  lines.push(`- Contraste mínimo 4.5:1 para texto body`)
  lines.push(`- Touch targets mínimo 44x44px`)
  lines.push(`- Focus states visibles en todos los elementos interactivos`)
  lines.push(`- Alt text en todas las imágenes`)
  lines.push(`- Labels asociados a todos los inputs de formularios`)
  lines.push(`- Respetar prefers-reduced-motion — sin animaciones para quienes las desactiven`)
  lines.push(``)

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. INSTRUCCIONES FINALES
  // ═══════════════════════════════════════════════════════════════════════════
  lines.push(`## 12. Instrucciones Finales`)
  lines.push(``)
  lines.push(`**Este es tu brief de dirección creativa. Ahora generá el diseño:**`)
  lines.push(``)
  lines.push(`1. Diseñá un sitio web único y memorable para **${business.name || 'este negocio'}**.`)
  lines.push(`2. Usá los colores de marca como guía, pero proponé una paleta completa que funcione.`)
  lines.push(`3. Elegí tipografías que reflejen el tono **${tone}** y el estilo **${style}**.`)
  lines.push(`4. Diseñá mobile-first: empezá por 375px y escalá a desktop.`)
  lines.push(`5. Cada página debe tener un propósito claro y un CTA visible.`)
  lines.push(`6. El sitio debe transmitir **${audience.desiredFeeling || 'confianza y profesionalismo'}**.`)
  lines.push(`7. No copies templates genéricos — hacé algo que sea propio de este negocio.`)
  lines.push(`8. Recordá: el público es **${audience.profile || 'variado'}**, así que pensá en ellos al diseñar.`)
  lines.push(``)
  lines.push(`**Cuando termines, avisame para que revise el diseño y después implemente el código.**`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`**Documento generado por SitioHoy**`)
  lines.push(`**Documento generado por SitioHoy**`)
  lines.push(``)

  return lines.join('\n')
}

function buildCopyGuide(intake, integrations) {
  const business = intake.business ?? {}
  const audience = intake.audience ?? {}
  const tone = audience.tone ?? 'profesional'
  const plan = String(intake.plan ?? 'esencial').toLowerCase()
  const catalog = intake.catalog ?? {}
  const pages = intake.pages ?? {}
  const contact = intake.contact ?? {}

  const toneGuides = {
    cercano: 'Usar tuteo, frases cortas, empático. Ej: "Te ayudamos a encontrar lo que buscás"',
    profesional: 'Ustedeo o neutro, directo, claro. Ej: "Soluciones diseñadas para su negocio"',
    juvenil: 'Informal, dinámico, emojis con moderación. Ej: "Descubrí lo nuevo que te va a encantar"',
    exclusivo: 'Elegante, sobrio, sin exceso. Ej: "Una experiencia diseñada para quienes valoran la diferencia"',
  }

  const lines = [
    `# Guía de Copy — ${business.name ?? 'Proyecto'}`,
    '',
    '## Tono y Voz',
    '',
    `- Tono definido: **${tone}**`,
    `- Guía: ${toneGuides[tone] || toneGuides.profesional}`,
    `- Audiencia: ${audience.profile ?? 'sin definir'}`,
    `- Problema que resuelven: ${audience.problem ?? 'sin definir'}`,
    `- Sensación deseada: ${audience.desiredFeeling ?? 'sin definir'}`,
    '',
    '## Textos Obligatorios por Sección',
    '',
    '### Header',
    `- Nombre: ${business.name ?? 'definir'}`,
    '- Navegación: Inicio, Catálogo/Productos, ' + (pages.about ? 'Nosotros, ' : '') + (pages.contact ? 'Contacto, ' : '') + (pages.faq ? 'FAQ, ' : '') + (plan !== 'esencial' ? 'Carrito' : ''),
    '',
    '### Hero',
    `- Headline: debe comunicar "${business.primaryGoal ?? 'valor principal'}" en ≤8 palabras`,
    `- Subheadline: expandir con diferencial "${business.differentiator ?? ''}"`,
    `- CTA principal: ${plan !== 'esencial' ? '"Comprar ahora" o "Ver catálogo"' : '"Consultar por WhatsApp" o "Ver productos"'}`,
    '',
    '### Catálogo',
    `- Categorías: ${(catalog.categories ?? []).join(', ') || 'por definir'}`,
    `- Cantidad de productos: ${catalog.initialCount ?? 'por definir'}`,
    '- Cada producto: nombre, descripción corta (≤120 chars), precio, CTA',
    '',
    '### Footer',
    `- WhatsApp: ${contact.whatsapp ?? 'por definir'}`,
    `- Email: ${contact.email ?? 'por definir'}`,
    '- Links legales: Términos y Condiciones, Política de Privacidad',
    integrations.mercadopago ? '- Badge: "Pagá con MercadoPago"' : '',
    '',
    '## Reglas de Copy',
    '',
    '- Español argentino (vos/tuteo si tono cercano o juvenil)',
    '- Sin anglicismos innecesarios',
    '- CTAs claros y accionables',
    '- Descripciones de producto: beneficio primero, feature después',
    '- SEO: incluir keywords del rubro en H1, meta title, meta description',
    `- Keywords sugeridas: ${business.industry ?? ''}, ${(catalog.categories ?? []).slice(0, 3).join(', ')}`,
    '',
    '## Meta Tags (SEO)',
    '',
    `- Title: "${business.name} — ${business.description?.slice(0, 50) ?? business.industry ?? ''}"`,
    `- Description: ≤155 chars, incluir CTA y diferencial`,
    `- OG Image: hero del sitio o logo sobre fondo de marca`,
    '',
  ].filter(line => line !== undefined)

  return lines.join('\n') + '\n'
}

function sanitizeFolderName(name) {
  const allowed = ['logo', 'hero', 'productos', 'marca', 'galeria']
  const clean = name.toLowerCase().replace(/[^a-z]/g, '')
  return allowed.includes(clean) ? clean : 'galeria'
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

// ── REQUEST HANDLER ──────────────────────────────────────────────────────────
async function handleRequest(req, res) {
  const url = req.url?.split('?')[0] ?? '/'

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' })
    res.end()
    return
  }

  if (req.method === 'GET' && url === '/') {
    try {
      const html = await readFile(FORM_HTML, 'utf8')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html) })
      res.end(html)
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(`No se pudo leer el formulario: ${err.message}\nRuta esperada: ${FORM_HTML}`)
    }
    return
  }

  if (req.method === 'POST' && url === '/submit') {
    try {
      await handleSubmit(req, res)
    } catch (err) {
      log(clr(c.red, `  ERROR en /submit: ${err.message}`))
      log(err.stack)
      sendJSON(res, 500, { ok: false, error: err.message })
    }
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
}

// ── STARTUP ──────────────────────────────────────────────────────────────────
const port = await findFreePort(START_PORT)
const server = http.createServer(handleRequest)

server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`

  console.clear()
  log('')
  log(clr(c.bold, clr(c.green, '  ●  SitioHoy Briefing')))
  log(clr(c.gray, '  ─────────────────────────────────────'))
  log(`  ${clr(c.bold, 'URL:')}    ${clr(c.cyan, url)}`)
  log(`  ${clr(c.bold, 'CWD:')}    ${clr(c.gray, CWD)}`)
  log(`  ${clr(c.bold, 'Form:')}   ${clr(c.gray, FORM_HTML)}`)
  log(clr(c.gray, '  ─────────────────────────────────────'))
  log(`  ${clr(c.yellow, 'Ctrl+C')} para cancelar`)
  log('')

  // Verify form exists
  if (!fs.existsSync(FORM_HTML)) {
    log(clr(c.red, `  ADVERTENCIA: No se encontró el formulario en:`))
    log(clr(c.red, `  ${FORM_HTML}`))
    log('')
  }

  // Open browser unless disabled for CI/sandbox checks.
  if (process.env.SITIOHOY_NO_OPEN !== '1') {
    setTimeout(() => openBrowser(url), 300)
  }
})

server.on('error', (err) => {
  log(clr(c.red, `\n  Error del servidor: ${err.message}\n`))
  process.exit(1)
})

// ── GRACEFUL SHUTDOWN ─────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  log(clr(c.yellow, '\n  Cerrando servidor...\n'))
  server.close(() => process.exit(0))
})
process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})
