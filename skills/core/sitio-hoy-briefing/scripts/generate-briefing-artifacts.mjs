import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const inputPath = process.argv[2] ?? '.sitiohoy/intake.json'
const root = process.cwd()
const fullInputPath = path.resolve(root, inputPath)

if (!existsSync(fullInputPath)) {
  console.error(`No existe el intake: ${inputPath}`)
  process.exit(1)
}

const intake = JSON.parse(await readFile(fullInputPath, 'utf8'))

const allowedPlans = new Set(['esencial', 'emprendimiento', 'empresa'])
const existingTenantPlan = String(intake.existingTenantLookup?.tenant?.plan ?? '').toLowerCase()
const plan = allowedPlans.has(existingTenantPlan)
  ? existingTenantPlan
  : String(intake.plan ?? '').toLowerCase()

if (!allowedPlans.has(plan)) {
  console.error('plan debe ser: esencial, emprendimiento o empresa')
  process.exit(1)
}

const slugify = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const business = intake.business ?? {}
const technical = intake.technical ?? {}
const domain = technical.domain ?? {}
const audience = intake.audience ?? {}
const visualIdentity = intake.visualIdentity ?? {}
const catalog = intake.catalog ?? {}
const pages = intake.pages ?? {}
const contact = intake.contact ?? {}
const assets = intake.assets ?? {}
const existingTenant = intake.existingTenantLookup?.tenant ?? null
const isExistingClient = intake.clientStatus === 'existente' && intake.existingTenantId

const projectName = existingTenant?.name || business.name || 'SitioHoy'
const projectSlug = existingTenant?.slug || business.slug || slugify(projectName)
const hasCheckout = plan === 'emprendimiento' || plan === 'empresa'
const correoArgentino = plan === 'empresa' && Boolean(technical.correoArgentinoRequested)
const envia = plan === 'empresa' && Boolean(technical.enviaRequested) && !correoArgentino

const integrations = {
  mercadopago: hasCheckout,
  correoArgentino,
  fixedShipping: plan === 'emprendimiento' || (plan === 'empresa' && !correoArgentino && !envia),
  envia,
  resend: hasCheckout && Boolean(technical.resendRequested),
  umami: hasCheckout,
  whatsapp: true,
}

const siteUrl = existingTenant?.url || (domain.status === 'owned' && domain.value ? String(domain.value).replace(/\/$/, '') : '')

const config = {
  project: projectName,
  slug: projectSlug,
  plan,
  clientStatus: intake.clientStatus ?? 'nuevo',
  tenantId: isExistingClient ? intake.existingTenantId : randomUUID(),  // generado automáticamente — se puede reemplazar por el ID real de Supabase
  siteUrl,
  domain,
  integrations,
  technical: {
    editor: technical.editor ?? 'other',
    supabaseMcp: Boolean(technical.supabaseMcp),
    aiDesignerMcp: Boolean(technical.aiDesignerMcp),
    mercadoPagoActive: Boolean(technical.mercadoPagoActive),
  },
  limits: {
    maxProducts: plan === 'esencial' ? 50 : plan === 'emprendimiento' ? 200 : null,
  },
  qualityGates: {
    build: true,
    staticValidation: true,
    qaReport: true,
    checkoutManualTest: hasCheckout,
    lighthouse: true,
  },
}

const missingAssets = Array.isArray(assets.missing) ? assets.missing : []
if (!assets.folderReady) missingAssets.push('_assets-cliente/')
if (!visualIdentity.logo?.available) missingAssets.push('logo')
if (visualIdentity.photoQuality === 'none') missingAssets.push('hero/productos')

const yesNo = (value) => (value ? 'sí' : 'no')
const list = (items) => (Array.isArray(items) && items.length
  ? items.map((item) => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') return [item.network, item.url].filter(Boolean).join(': ')
    return ''
  }).filter(Boolean).join(', ')
  : 'ninguno')

const tenantLookup = intake.existingTenantLookup
const tenantLookupBlock = isExistingClient ? `
## Tenant Existente

- Tenant ID: ${intake.existingTenantId}
- Consulta tenant: ${tenantLookup?.status ?? 'no realizada'}
- Nombre cargado: ${existingTenant?.name ?? 'sin datos'}
- Slug cargado: ${existingTenant?.slug ?? 'sin datos'}
- Plan cargado: ${existingTenant?.plan ?? 'sin datos'}
- Estado cargado: ${existingTenant?.status ?? 'sin datos'}
- URL cargada: ${existingTenant?.url ?? 'sin datos'}
- Contact email cargado: ${existingTenant?.contactEmail ?? 'sin datos'}
- MercadoPago configurado: ${yesNo(existingTenant?.mercadoPagoConfigured)}
- Resend configurado: ${yesNo(existingTenant?.resendConfigured)}
- Envia configurado: ${yesNo(existingTenant?.enviaConfigured)}
- Correo Argentino configurado: ${yesNo(existingTenant?.correoArgentinoConfigured)}
- Umami configurado: ${yesNo(existingTenant?.umamiConfigured)}
- Datos relacionados: productos ${existingTenant?.related?.products ?? 'n/d'}, categorias ${existingTenant?.related?.categories ?? 'n/d'}, zonas envio ${existingTenant?.related?.shipping_zones ?? 'n/d'}, pedidos ${existingTenant?.related?.orders ?? 'n/d'}
${tenantLookup?.warnings?.length ? tenantLookup.warnings.map((warning) => `- Advertencia tenant: ${warning}`).join('\n') : ''}
` : ''

const brief = `# Brief - ${projectName}

${tenantLookupBlock}
## Configuracion Tecnica

- Plan: ${plan}
- Dominio: ${siteUrl || domain.status || 'pendiente'}
- Editor/IA: ${technical.editor ?? 'other'}
- MCP Supabase: ${yesNo(technical.supabaseMcp)}
- MCP AIDesigner: ${yesNo(technical.aiDesignerMcp)}
- MercadoPago activo: ${yesNo(technical.mercadoPagoActive)}
- Envia.com: ${yesNo(integrations.envia)}
- Resend emails: ${yesNo(integrations.resend)}
- Umami: ${yesNo(integrations.umami)}
- WhatsApp: ${yesNo(integrations.whatsapp)}

## Negocio

- Nombre: ${projectName}
- Slug: ${projectSlug}
- Rubro: ${business.industry ?? ''}
- Objetivo principal: ${business.primaryGoal ?? ''}
- Descripcion: ${business.description ?? ''}
- Diferencial: ${business.differentiator ?? ''}
- Referentes visuales: ${list(business.visualReferences)}

## Audiencia

- Perfil: ${audience.profile ?? ''}
- Problema que resuelve: ${audience.problem ?? ''}
- Sensacion deseada: ${audience.desiredFeeling ?? ''}
- Tono: ${audience.tone ?? ''}
- Dispositivo predominante: ${audience.primaryDevice ?? 'mixed'}

## Identidad Visual

- Color principal: ${visualIdentity.colors?.primary ?? ''}
- Color secundario: ${visualIdentity.colors?.secondary ?? ''}
- Color acento: ${visualIdentity.colors?.accent ?? ''}
- Mood deseado: ${visualIdentity.desiredMood ?? ''}
- Estilo: ${visualIdentity.style ?? ''}
- Logo disponible: ${yesNo(visualIdentity.logo?.available)}
- Formato logo: ${visualIdentity.logo?.format ?? ''}
- Calidad de fotos: ${visualIdentity.photoQuality ?? ''}

## Catalogo

- Cantidad inicial: ${catalog.initialCount ?? 0}
- Categorias: ${list(catalog.categories)}
- Variantes: ${yesNo(catalog.hasVariants)}
- Rango de precios: ${catalog.priceRange ?? ''}
- Tipo: ${catalog.type ?? ''}

## Paginas

- Sobre nosotros: ${yesNo(pages.about)}
- FAQ: ${yesNo(pages.faq)}
- Contacto: ${yesNo(pages.contact)}
- Legales: ${yesNo(pages.legal)}
- Blog: ${yesNo(pages.blog)}

## Contacto

- WhatsApp: ${contact.whatsapp ?? ''}
- Email: ${contact.email ?? ''}
- Redes: ${list(contact.socials)}
- Red principal: ${contact.primarySocial ?? ''}

## Assets

- Carpeta lista: ${yesNo(assets.folderReady)}
- Faltantes: ${list([...new Set(missingAssets)])}

## Decisiones Derivadas

- CTA principal: ${hasCheckout ? 'comprar / ver catalogo' : 'WhatsApp / ver catalogo'}
- Envio: ${integrations.correoArgentino ? 'Correo Argentino directo' : integrations.envia ? 'Envia.com' : integrations.fixedShipping ? 'zonas fijas' : 'coordinar por WhatsApp'}
- Checkout: ${hasCheckout ? 'activo' : 'no incluido'}
- Schema base: completo en todos los planes
- QA obligatorio: build + sitiohoy:validate por modulo, sitiohoy:qa antes de deploy

## Notas

${Array.isArray(intake.notes) && intake.notes.length ? intake.notes.map((note) => `- ${note}`).join('\n') : '- Sin notas adicionales.'}
`

await mkdir(path.join(root, '.sitiohoy'), { recursive: true })
await writeFile(path.join(root, '.sitiohoy', 'intake.normalized.json'), `${JSON.stringify(intake, null, 2)}\n`)
await writeFile(path.join(root, 'sitiohoy.config.json'), `${JSON.stringify(config, null, 2)}\n`)
await writeFile(path.join(root, 'brief.md'), brief)

console.log('sitiohoy.config.json')
console.log('brief.md')
