/**
 * brief-from-intake.mjs
 * Genera brief.md determinístico desde .sitiohoy/intake.json.
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const intakePath = path.join(root, '.sitiohoy', 'intake.json')
const briefPath = path.join(root, 'brief.md')

if (!existsSync(intakePath)) {
  console.error('Falta .sitiohoy/intake.json. Ejecutar el briefing primero.')
  process.exit(1)
}

const intake = JSON.parse(await readFile(intakePath, 'utf8'))
const business = intake.business ?? {}
const tech = intake.technical ?? {}
const audience = intake.audience ?? {}
const visual = intake.visualIdentity ?? {}
const catalog = intake.catalog ?? {}
const pages = intake.pages ?? {}
const contact = intake.contact ?? {}
const assets = intake.assets ?? {}

const yesNo = (value) => value ? 'sí' : 'no'
const list = (items) => Array.isArray(items) && items.length ? items.join(', ') : 'sin datos'
const pageList = Object.entries(pages).filter(([, enabled]) => enabled).map(([name]) => name)
const shipping = tech.correoArgentinoRequested
  ? 'Correo Argentino directo'
  : tech.enviaRequested
    ? 'Envia.com'
    : intake.shipping === 'fixed'
      ? 'precios fijos'
      : 'sin envíos automatizados'

const lines = [
  `# Brief SitioHoy - ${business.name ?? 'Proyecto'}`,
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
  `- Plan: ${intake.plan ?? 'sin datos'}`,
  `- MercadoPago: ${yesNo(tech.mercadoPagoActive)}`,
  `- Envíos: ${shipping}`,
  `- Resend: ${yesNo(tech.resendRequested)}`,
  `- Dominio: ${tech.domain?.value || tech.domain?.status || 'sin datos'}`,
  `- Editor/IA: ${tech.editor ?? 'sin datos'}`,
  `- Supabase MCP: ${yesNo(tech.supabaseMcp)}`,
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
  `- Redes: ${list((contact.socials ?? []).map(s => typeof s === 'string' ? s : `${s.network}: ${s.url}`))}`,
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

await writeFile(briefPath, `${lines.join('\n')}\n`)
console.log('brief.md generado desde .sitiohoy/intake.json')
