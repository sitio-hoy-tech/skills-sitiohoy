import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.cwd()
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(root, 'sitiohoy.config.json')
const briefPath = path.join(root, 'brief.md')

if (!existsSync(configPath) || !existsSync(briefPath)) {
  console.error('Faltan sitiohoy.config.json o brief.md')
  process.exit(1)
}

const config = JSON.parse(await readFile(configPath, 'utf8'))
const brief = await readFile(briefPath, 'utf8')
const intakePath = path.join(root, '.sitiohoy', 'intake.json')
const intake = existsSync(intakePath) ? JSON.parse(await readFile(intakePath, 'utf8')) : {}

const plan = config.plan ?? 'esencial'
const project = config.project ?? 'SitioHoy'
const integrations = config.integrations ?? {}
const hasCheckout = plan === 'emprendimiento' || plan === 'empresa'
const hasEnvios = integrations.envia || integrations.fixedShipping
const hasResend = Boolean(integrations.resend)
const hasUmami = Boolean(integrations.umami)

const outContext = path.join(root, '.sitiohoy', 'context')
const outDesign = path.join(root, '.sitiohoy', 'design')
await mkdir(outContext, { recursive: true })
await mkdir(outDesign, { recursive: true })

const getBriefValue = (label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = brief.match(new RegExp(`^- ${escaped}:\\s*(.*)$`, 'mi'))
  return match?.[1]?.trim() ?? ''
}

const industry = getBriefValue('Rubro')
const tone = getBriefValue('Tono')
const desiredFeeling = getBriefValue('Sensacion deseada')
const style = getBriefValue('Estilo')
const photoQuality = getBriefValue('Calidad de fotos')
const primaryDevice = getBriefValue('Dispositivo predominante')
const primaryColor = getBriefValue('Color principal')
const secondaryColor = getBriefValue('Color secundario')
const accentColor = getBriefValue('Color acento')
const categories = getBriefValue('Categorias')

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const readTemplates = async () => {
  const templatesPath = path.join(scriptDir, '..', 'data', 'templates', 'index.json')
  if (!existsSync(templatesPath)) return []
  const data = JSON.parse(await readFile(templatesPath, 'utf8'))
  return data.templates ?? []
}

const visualReferences = [
  getBriefValue('Referente visual'),
  getBriefValue('Referentes visuales'),
  getBriefValue('Competidores'),
  ...(Array.isArray(intake.visualReferences) ? intake.visualReferences : []),
].map((item) => String(item ?? '').trim()).filter(Boolean)

const templates = await readTemplates()
const industryText = normalize(`${industry} ${categories}`)
const selectedTemplates = templates
  .map((template) => {
    const planScore = template.plan_fit?.includes(plan) ? 3 : 0
    const industryScore = (template.industry ?? []).some((item) => industryText.includes(normalize(item))) ? 3 : 0
    const ecommerceScore = hasCheckout && (template.tags ?? []).includes('ecommerce') ? 2 : 0
    const serviceScore = !hasCheckout && (template.tags ?? []).some((tag) => ['landing', 'portfolio', 'blog'].includes(tag)) ? 1 : 0
    return { template, score: planScore + industryScore + ecommerceScore + serviceScore }
  })
  .sort((a, b) => b.score - a.score)
  .filter((item) => item.score > 0)
  .slice(0, 3)
  .map((item) => item.template)

const fallbackTemplates = selectedTemplates.length ? selectedTemplates : templates.slice(0, 3)
const inspirationBullets = fallbackTemplates.map((template) => (
  `- ${template.name}: ${template.demo_url ?? template.preview_url}. Tomar estructura, ritmo visual y tratamiento de componentes; no copiar marca, textos ni paleta. ${template.description}`
))

const chooseFonts = () => {
  const text = `${industry} ${style} ${desiredFeeling}`.toLowerCase()
  if (/lujo|premium|moda|sofistic/.test(text)) return ['DM Serif Display', 'DM Sans']
  if (/artesanal|organico|natural|calido/.test(text)) return ['Fraunces', 'Nunito']
  if (/tech|moderno|futur/.test(text)) return ['Syne', 'Inter']
  if (/juvenil|urbano|vibrante/.test(text)) return ['Bricolage Grotesque', 'DM Sans']
  if (/gastronom/.test(text)) return ['Fraunces', 'Nunito']
  return ['Fraunces', 'Inter']
}

const chooseHero = () => {
  const photos = photoQuality.toLowerCase()
  const text = `${industry} ${style} ${desiredFeeling}`.toLowerCase()
  if (/professional|profesional/.test(photos)) return 'Hero full-bleed con imagen real, texto overlay y CTA claro.'
  if (/none|sin fotos/.test(photos)) return 'Hero editorial tipografico con color solido y composicion fuerte, sin stock generico.'
  if (/lujo|premium/.test(text)) return 'Hero editorial con mucho espacio, tipografia display y producto/imagen protagonista.'
  if (/tech|servicio/.test(text)) return 'Hero bento sobrio con beneficio principal y pruebas de confianza.'
  return 'Hero visual con imagen propia, CTA primario y prueba de confianza visible.'
}

const chooseCatalog = () => {
  if (plan === 'empresa') return 'Grid escalable con filtros, productos relacionados y soporte para catalogos grandes.'
  if (plan === 'emprendimiento') return 'Grid 2 columnas mobile, 3/4 desktop, cards con precio, stock y agregar al carrito.'
  return 'Grid visual con CTA WhatsApp por producto y filtros simples por categoria.'
}

const [displayFont, bodyFont] = chooseFonts()
const heroRecipe = chooseHero()
const catalogRecipe = chooseCatalog()

const planModules = {
  esencial: [
    ['0', 'Scaffold, base tecnica e identidad visual'],
    ['1', 'Layout global'],
    ['2', 'Home'],
    ['3', 'Catalogo y detalle'],
    ['4', 'Paginas opcionales'],
    ['5', 'SEO, QA y deploy'],
  ],
  emprendimiento: [
    ['0', 'Scaffold, base tecnica e identidad visual'],
    ['1', 'Layout global con carrito'],
    ['2', 'Home orientada a compra'],
    ['3', 'Catalogo con carrito y variantes'],
    ['4', 'Carrito y checkout'],
    ['5', 'Paginas opcionales'],
    ['6', 'SEO, Umami y deploy'],
  ],
  empresa: [
    ['0', 'Scaffold, base tecnica e identidad visual'],
    ['1', 'Layout global con carrito'],
    ['2', 'Home con confianza y testimonios'],
    ['3', 'Catalogo avanzado'],
    ['4', 'Checkout con MercadoPago y envios'],
    ['5', 'Paginas opcionales y E-E-A-T'],
    ['6', 'SEO tecnico y performance'],
    ['7', 'Umami avanzado y deploy'],
  ],
}

const modules = planModules[plan] ?? planModules.esencial

const commonRules = [
  '- Usar Server Components por defecto.',
  "- Usar 'use client' solo para estado, efectos o eventos.",
  '- Usar next/image, nunca <img>.',
  '- Usar next/font, nunca links externos de fuentes.',
  '- Usar revalidateTag, nunca revalidatePath global.',
  '- Ejecutar npm run sitiohoy:validate antes de cerrar.',
  '- En modulos visuales, revisar screenshots 375/390/768/1280/1920 y ejecutar sitiohoy:visual-audit con SITE_URL.',
]

const write = async (file, content) => {
  await writeFile(file, `${content.trim()}\n`)
}

await write(path.join(outContext, 'project-context.md'), `
# Project Context - ${project}

- Plan: ${plan}
- Industria: ${industry || 'sin definir'}
- Dominio: ${config.siteUrl || config.domain?.status || 'pendiente'}
- Checkout: ${hasCheckout ? 'si' : 'no'}
- MercadoPago: ${integrations.mercadopago ? 'si' : 'no'}
- Envia.com: ${integrations.envia ? 'si' : 'no'}
- Envios fijos: ${integrations.fixedShipping ? 'si' : 'no'}
- Resend: ${hasResend ? 'si' : 'no'}
- Umami: ${hasUmami ? 'si' : 'no'}
- WhatsApp: ${integrations.whatsapp ? 'si' : 'no'}

## Cargar siempre

- \`sitiohoy.config.json\`
- \`brief.md\`
- pack del modulo actual en \`.sitiohoy/context/\`

## No cargar salvo duda concreta

- Archivos core completos
- Integraciones no activas
- Modulos de otros planes

## Reglas permanentes

${commonRules.join('\n')}
`)

const moduleDetails = {
  '0': {
    read: ['sitio-hoy-scaffold', 'sitio-hoy-database', 'core/04-design-system.md si falta criterio visual'],
    build: ['base Next/Supabase', 'sitiohoy.config.json validado', 'migracion inicial', 'tokens css', 'DESIGN.md'],
    gates: ['npm run build', 'npm run sitiohoy:validate'],
  },
  '1': {
    read: ['.sitiohoy/design/inspiration-board.md', '.sitiohoy/design/design-direction.md', 'core/17-manejo-errores.md si falta template'],
    build: ['layout', 'header', 'footer', 'navegacion responsive', hasCheckout ? 'carrito/drawer base' : 'CTA WhatsApp'],
    gates: ['npm run sitiohoy:validate', 'SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit'],
  },
  '2': {
    read: ['.sitiohoy/design/inspiration-board.md', '.sitiohoy/design/layout-recipe.md', 'core/08-seo.md si falta metadata'],
    build: ['home', 'hero', 'categorias', 'destacados', 'propuesta de valor', 'CTA final'],
    gates: ['npm run sitiohoy:validate', 'SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit'],
  },
  '3': {
    read: ['.sitiohoy/design/inspiration-board.md', 'core/07-isr-cache.md si faltan queries', 'core/08-seo.md si falta Schema.org'],
    build: [hasCheckout ? 'catalogo con agregar al carrito' : 'catalogo con WhatsApp', 'detalle producto', 'galeria', 'variantes', 'metadata'],
    gates: ['npm run build', 'npm run sitiohoy:validate', 'SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit'],
  },
  '4': {
    read: hasCheckout ? ['.sitiohoy/context/checkout-context.md'] : ['integraciones/formulario-contacto.md si hay pagina contacto'],
    build: hasCheckout ? ['cart store', 'checkout multi-step', 'pedido', 'MercadoPago', hasEnvios ? 'envios' : 'coordinar envio', 'seguimiento'] : ['paginas opcionales', 'formulario si aplica'],
    gates: ['npm run build', 'npm run sitiohoy:validate', hasCheckout ? 'pago de prueba documentado' : ''],
  },
  '5': {
    read: plan === 'esencial' ? ['.sitiohoy/context/deploy-context.md'] : ['core/08-seo.md', 'integraciones/formulario-contacto.md si aplica'],
    build: plan === 'esencial' ? ['sitemap', 'robots', 'QA report', 'deploy'] : ['paginas opcionales', 'legales', 'E-E-A-T si Empresa'],
    gates: plan === 'esencial' ? ['npm run sitiohoy:qa', 'npm run sitiohoy:qa-report'] : ['npm run sitiohoy:validate'],
  },
  '6': {
    read: plan === 'empresa' ? ['core/08-seo.md'] : ['.sitiohoy/context/deploy-context.md'],
    build: plan === 'empresa' ? ['SEO tecnico', 'Schema.org completo', 'Lighthouse'] : ['sitemap', 'robots', 'Umami', 'deploy'],
    gates: ['npm run sitiohoy:qa', 'npm run sitiohoy:qa-report'],
  },
  '7': {
    read: ['.sitiohoy/context/deploy-context.md', 'integraciones/umami-avanzado.md'],
    build: ['Umami avanzado', 'eventos ecommerce', 'deploy', 'webhooks', 'compra real'],
    gates: ['npm run sitiohoy:qa', 'npm run sitiohoy:qa-report'],
  },
}

for (const [number, name] of modules) {
  const detail = moduleDetails[number] ?? moduleDetails['0']
  await write(path.join(outContext, `module-${number}.md`), `
# Module ${number} - ${name}

## Objetivo

${name} para ${project}, plan ${plan}.

## Contexto minimo

- \`sitiohoy.config.json\`
- \`brief.md\`
- \`.sitiohoy/context/project-context.md\`
- \`.sitiohoy/context/module-${number}.md\`
${Number(number) >= 1 && Number(number) <= 3 ? '- `.sitiohoy/design/inspiration-board.md`\n- `.sitiohoy/design/design-direction.md`\n- `.sitiohoy/design/layout-recipe.md`\n- `.sitiohoy/design/anti-slop-checklist.md`' : ''}

## Leer solo si hace falta

${detail.read.filter(Boolean).map((item) => `- ${item}`).join('\n')}

## Construir

${detail.build.filter(Boolean).map((item) => `- ${item}`).join('\n')}

## Reglas

${commonRules.join('\n')}

## Gates

${detail.gates.filter(Boolean).map((item) => `- ${item}`).join('\n')}
`)
}

if (hasCheckout) {
  await write(path.join(outContext, 'checkout-context.md'), `
# Checkout Context - ${project}

## Integraciones

- MercadoPago: ${integrations.mercadopago ? 'activo' : 'inactivo'}
- Envia.com: ${integrations.envia ? 'activo' : 'inactivo'}
- Envios fijos: ${integrations.fixedShipping ? 'activo' : 'inactivo'}
- Resend: ${hasResend ? 'activo' : 'inactivo'}

## Reglas criticas

- Recalcular subtotal, envio, descuentos y total en server.
- No confiar en precios del carrito cliente.
- Crear pedidos con \`tenant_id\`.
- Webhook MercadoPago debe filtrar por \`id\` y \`tenant_id\`.
- Registrar payload en \`payment_events\`.
- Tracking de pedido por Server Action/RPC con \`tracking_token\`.
- Idempotency key estable por pedido/intento, nunca \`Date.now()\`.

## Leer solo si hace falta

- \`integraciones/mercadopago.md\`
- ${integrations.fixedShipping ? '`integraciones/envios-fijos.md`' : integrations.envia ? '`integraciones/envia.md`' : 'shipping fallback en plan'}
- ${hasResend ? '`integraciones/resend.md`' : 'Resend no activo'}
`)
}

await write(path.join(outContext, 'deploy-context.md'), `
# Deploy Context - ${project}

## Antes de deploy

- \`npm run build\`
- \`npm run sitiohoy:qa\`
- \`SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit\`
- \`npm run sitiohoy:qa-report\`
- Revisar variables en Vercel.
- Confirmar dominio y SSL.
${hasCheckout ? '- Probar MercadoPago en produccion y webhook final.' : '- Probar CTA WhatsApp y formulario si existe.'}
${integrations.envia ? '- Verificar Envia.com en ambiente correcto.' : ''}
${hasUmami ? '- Verificar Umami pageviews/eventos.' : ''}

## Leer si hace falta

- \`core/15-deploy-vercel.md\`
- \`core/11-qa-checklist.md\`
`)

await write(path.join(outContext, 'context-index.md'), `
# Context Index - ${project}

## Plan

${plan}

## Packs disponibles

- \`.sitiohoy/context/project-context.md\`
${modules.map(([number, name]) => `- \`.sitiohoy/context/module-${number}.md\` - ${name}`).join('\n')}
${hasCheckout ? '- `.sitiohoy/context/checkout-context.md`' : ''}
- \`.sitiohoy/context/deploy-context.md\`

## Diseño

- \`.sitiohoy/design/inspiration-board.md\`
- \`.sitiohoy/design/design-direction.md\`
- \`.sitiohoy/design/layout-recipe.md\`
- \`.sitiohoy/design/design-tokens.seed.json\`
- \`.sitiohoy/design/anti-slop-checklist.md\`
`)

await write(path.join(outDesign, 'inspiration-board.md'), `
# Inspiration Board - ${project}

## Referencias del cliente

${visualReferences.length ? visualReferences.map((item) => `- ${item}`).join('\n') : '- Sin referencias visuales explícitas en el brief.'}

## Referencias curadas para consultar

${inspirationBullets.length ? inspirationBullets.join('\n') : '- Sin referencias curadas disponibles.'}

## Como usarlas

- Mirar composición, densidad, jerarquía, ritmo de secciones, tratamiento de cards, navegación y estados.
- Si una referencia es URL, abrirla y revisar mobile/desktop antes de diseñar.
- No copiar textos, marca, paleta exacta ni estructura completa.
- Para productos sin fotos del cliente, usar Unsplash relacionado al rubro/producto y evitar imágenes genéricas o oscuras.

## Hipótesis visual inicial

- Personalidad: ${desiredFeeling || tone || style || 'definir desde brief'}.
- Hero: ${heroRecipe}
- Catálogo: ${catalogRecipe}
- Dispositivo prioritario: ${primaryDevice || 'mixed'}.
- Calidad de fotos: ${photoQuality || 'sin definir'}.
`)

await write(path.join(outDesign, 'design-direction.md'), `
# Design Direction - ${project}

## Personalidad

- Industria: ${industry || 'sin definir'}
- Tono: ${tone || 'sin definir'}
- Sensacion deseada: ${desiredFeeling || 'sin definir'}
- Estilo: ${style || 'sin definir'}
- Dispositivo principal: ${primaryDevice || 'mixed'}

## Tipografia

- Display: ${displayFont}
- Body: ${bodyFont}

## Color

- Primary: ${primaryColor || 'definir desde brief'}
- Secondary: ${secondaryColor || 'definir desde brief'}
- Accent: ${accentColor || 'definir desde brief'}

## Referencias de inspiración

- Archivo obligatorio: \`.sitiohoy/design/inspiration-board.md\`.
- Antes de crear componentes visuales, revisar referencias del cliente o las curadas.
- Convertir las referencias en decisiones propias: estructura, ritmo, jerarquía y calidad visual.
- Si no hay fotos del cliente, elegir imágenes de Unsplash específicas del rubro/producto.

## Hero

${heroRecipe}

## Catalogo

${catalogRecipe}

## No negociar

- Nada de hero generico centrado con gradiente violeta/azul.
- No usar stock photos genericas si el brief tiene imagenes propias.
- No usar cards con glassmorphism decorativo.
- No usar tipografia por defecto sin intencion.
- No meter texto visible explicando la UI.
- No cerrar un modulo visual sin screenshots revisados en 375, 390, 768, 1280 y 1920 px.
- La nota visual minima para entregar al cliente es 8/10; si alguna dimensión clave queda por debajo, iterar.
`)

await write(path.join(outDesign, 'layout-recipe.md'), `
# Layout Recipe - ${project}

## Mobile first

- Base 375px.
- Touch targets minimo 44px.
- Header compacto y CTA visible.
- Evitar overflow horizontal.
- Ningun texto debe cortarse, pisarse o salirse del contenedor.
- Las cards no deben cambiar de tamaño al hacer hover ni por labels largos.
- El primer viewport debe mostrar marca/producto/rubro y dejar insinuada la siguiente seccion.

## Viewports obligatorios

- 375x812: mobile chico real; prioridad máxima si el brief dice mobile.
- 390x844: iPhone común; revisar header, hero, cards y CTA.
- 768x1024: tablet; evitar layouts desktop apretados.
- 1280x900: desktop estándar; revisar densidad y composición.
- 1920x1080: wide; evitar contenido perdido en el centro o hero demasiado alto.

## Criterio de aceptación visual

- Ejecutar \`SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit\`.
- Revisar manualmente screenshots en \`.sitiohoy/qa/visual/\`.
- Arreglar errores antes de cerrar: overflow horizontal, imágenes rotas, tap targets chicos, textos cortados, console errors.
- Si el diseño se ve genérico, volver a \`.sitiohoy/design/inspiration-board.md\` y rehacer composición/tokens.

## Hero recomendado

${heroRecipe}

## Catalogo recomendado

${catalogRecipe}

## Categorias iniciales

${categories || 'Definir desde catalogo.'}

## Componentes esperados

- Header
- Footer
- CTA principal
- ProductCard
- Empty state
- Loading skeleton
- Error state
${hasCheckout ? '- Cart drawer\n- Checkout steps\n- Payment state' : '- WhatsApp CTA por producto'}
`)

const tokenSeed = {
  color: {
    primary: primaryColor || '',
    secondary: secondaryColor || '',
    accent: accentColor || '',
  },
  font: {
    display: displayFont,
    body: bodyFont,
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
  },
  layout: {
    primaryDevice: primaryDevice || 'mixed',
    hero: heroRecipe,
    catalog: catalogRecipe,
  },
}

await writeFile(path.join(outDesign, 'design-tokens.seed.json'), `${JSON.stringify(tokenSeed, null, 2)}\n`)

await write(path.join(outDesign, 'anti-slop-checklist.md'), `
# Anti Slop Checklist - ${project}

- [ ] Inspiration board revisado antes de diseñar.
- [ ] Hero específico del rubro y brief.
- [ ] Paleta sale del brief, no de defaults violetas/azules.
- [ ] Tipografias elegidas por personalidad.
- [ ] Imagenes propias priorizadas.
- [ ] Si faltan imagenes propias, Unsplash es especifico del producto/rubro y no stock generico.
- [ ] Cards con funcion real.
- [ ] Estados hover/focus/loading/empty/error.
- [ ] Mobile 375px sin overflow.
- [ ] Mobile 390px sin texto cortado ni CTAs apretados.
- [ ] Tablet 768px sin layout roto.
- [ ] Desktop 1280px y wide 1920px con composición cuidada.
- [ ] Tap targets principales minimo 44px.
- [ ] Contraste legible en hero, botones y cards.
- [ ] No hay cards dentro de cards ni secciones flotantes decorativas.
- [ ] No domina una sola familia de color sin contraste real.
- [ ] Screenshots de \`.sitiohoy/qa/visual/\` revisados.
- [ ] \`.sitiohoy/qa/visual-report.json\` queda OK.
- [ ] Nota visual interna minima 8/10.
- [ ] CTA principal coincide con plan: ${hasCheckout ? 'compra' : 'WhatsApp'}.
- [ ] Schema y metadata no usan copy generico.
`)

// Write design-implementation.md
const designImplementation = `# Instrucciones de Implementación de Diseño

## Flujo de trabajo
1. Leer \`.sitiohoy/design/DESIGN.md\` como dirección creativa
2. Generar design tokens en \`styles/tokens.css\`
3. Implementar componentes directamente en código (TSX + Tailwind + tokens CSS)
4. Libertad creativa total: diseños únicos, modernos y hermosos

## Mapeo DESIGN.md → Code
| Especificación DESIGN.md | CSS/Tailwind Equivalent |
|---|---|
| color primario | bg-[color] / background-color |
| color texto | text-[color] / color |
| tipografía | text-[size] / font-size |
| espaciado | p-[n] / padding |
| gap | gap-[n] / gap |
| radios | rounded-[n] / border-radius |
| opacidad | opacity-[n] / opacity |

## Reglas de Diseño
- Colores coherentes con la dirección creativa del DESIGN.md
- Tipografía: font-family, weight y size según la personalidad del negocio
- Espaciado: respetar el sistema de spacing definido
- Si el diseño usa 8px grid, implementar con múltiplos de 8
- Libertad creativa para mejorar o complementar lo especificado

## Verificación
Después de implementar cada página:
1. Comparar con la dirección creativa del DESIGN.md
2. Screenshot del sitio implementado en múltiples viewports
3. Ajustar hasta lograr coherencia visual

## Recuerda
- El DESIGN.md (\`.sitiohoy/design/DESIGN.md\`) contiene la dirección creativa
- El modelo AI genera diseños directamente en código
- Cada sitio debe tener personalidad única — no copiar templates genéricos
`
await writeFile(path.join(outDesign, 'design-implementation.md'), designImplementation)

// Write implementation-order.md
const implOrder = `# Orden de Implementación Optimizado

## Principio
Cada módulo se implementa en orden de dependencia. No saltar módulos.
DESIGN.md DEBE estar listo antes de Módulo 1.

## Secuencia

### Pre-implementación
1. ✅ Briefing completado (intake.json, config, brief.md, DESIGN.md)
2. ✅ Context packs generados (.sitiohoy/context/, .sitiohoy/design/)
3. ✅ DESIGN.md generado como dirección creativa
4. ✅ Design tokens generados por el modelo AI → tokens.css

### Módulo 0 — Scaffold & Database
- Next.js base + Supabase schema + QA scripts
- Gate: \`npm run build\` + \`npm run sitiohoy:validate\`

### Módulo 1 — Layout Base
- Header, Footer, Nav, Cart Sidebar, Error boundaries
- Dependencia: tokens.css, DESIGN.md dirección creativa
- Gate: validate + visual-audit

### Módulo 2 — Home
- Hero, Trust Signals, Featured Products, Testimonios
- Dependencia: Módulo 1 (layout), assets del cliente
- Gate: validate + visual-audit (5 viewports)

### Módulo 3 — Catálogo
- Grid, Filtros, Product Detail, Variantes, Related
- Dependencia: Módulo 1 + datos en Supabase
- Gate: validate + Lighthouse

### Módulo 4 — Checkout ${hasCheckout ? '(ACTIVO)' : '(NO APLICA - Plan Esencial)'}
- Cart, Multi-step, MercadoPago, Shipping, Tracking, Emails
- Dependencia: Módulo 3 + credenciales MP
- Gate: validate + e2e + test-mercadopago + pago de prueba

### Módulo 5 — Páginas Complementarias
- About, FAQ, Contact, Legal
- Dependencia: Módulo 1
- Gate: validate

### Módulo 6 — SEO & Performance
- Sitemap, robots.txt, Schema.org, meta tags, Lighthouse
- Dependencia: Todos los módulos anteriores
- Gate: validate + Lighthouse ≥90

### Módulo 7 — Analytics & Deploy ${hasCheckout ? '(ACTIVO)' : '(PARCIAL)'}
- Umami, Vercel deploy, domain, prod credentials, smoke tests
- Dependencia: QA aprobado
- Gate: qa-report + smoke tests + compra real (si checkout)

## Estimación de Complejidad por Plan
- **Esencial**: ~5 módulos, sin checkout ni analytics avanzado
- **Emprendimiento**: ~7 módulos, checkout + envíos fijos
- **Empresa**: ~8 módulos, checkout + envíos dinámicos + analytics
`
await writeFile(path.join(outContext, 'implementation-order.md'), implOrder)

console.log('.sitiohoy/context/project-context.md')
console.log('.sitiohoy/context/context-index.md')
console.log('.sitiohoy/design/design-direction.md')
