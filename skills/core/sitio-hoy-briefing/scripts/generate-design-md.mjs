/**
 * generate-design-md.mjs
 * Genera un DESIGN.md estructurado como documento de dirección creativa para el modelo AI.
 * Cada página tiene su propio mini-brief + checklist de verificación.
 * El formato es visual y escaneable para que el modelo AI no pierda detalles.
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const intakePath = path.join(root, '.sitiohoy', 'intake.json')
const configPath = path.join(root, 'sitiohoy.config.json')

if (!existsSync(intakePath)) {
  console.error(`No existe .sitiohoy/intake.json — correr briefing primero`)
  process.exit(1)
}

const intake = JSON.parse(await readFile(intakePath, 'utf8'))
const config = existsSync(configPath)
  ? JSON.parse(await readFile(configPath, 'utf8'))
  : {}

const plan = String(intake.plan ?? config.plan ?? 'esencial').toLowerCase()
const business = intake.business ?? {}
const audience = intake.audience ?? {}
const visual = intake.visualIdentity ?? {}
const catalog = intake.catalog ?? {}
const pages = intake.pages ?? {}
const contact = intake.contact ?? {}
const assets = intake.assets ?? {}
const technical = intake.technical ?? {}

const hasCheckout = plan === 'emprendimiento' || plan === 'empresa'
const hasCart = hasCheckout
const hasTracking = hasCheckout

const tone = String(audience.tone ?? 'profesional').toLowerCase()
const style = String(visual.style ?? 'moderno').toLowerCase()

const list = (items) => Array.isArray(items) && items.length
  ? items.map(i => typeof i === 'string' ? i : i?.url ? `${i.network}: ${i.url}` : JSON.stringify(i)).join(', ')
  : 'ninguno'

// ════════════════════════════════════════════════════════════════════════════
// PAGE DEFINITIONS — Each page has: name, required (boolean), screens, checklist
// ════════════════════════════════════════════════════════════════════════════
const allPages = [
  {
    name: 'Home',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Header/Nav con logo, menú, carrito, CTA principal',
      'Hero principal con imagen/video de fondo o ilustración',
      'Categorías destacadas (grid de 3-6 categorías)',
      'Productos destacados (grid de 4-8 productos)',
      'Señales de confianza (envíos, pagos, garantía)',
      'CTA final a WhatsApp o catálogo',
      'Footer con contacto, legales, redes, crédito SitioHoy'
    ],
    notes: 'Esta es la página más importante. El hero debe transmitir la esencia del negocio. NO usar stock photo genérico de gente sonriendo.',
  },
  {
    name: 'Catálogo',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Header de página con título y breadcrumb',
      'Filtros por categoría (sidebar desktop, drawer/bottom sheet mobile)',
      'Grid de productos (2 cols mobile, 3-4 cols desktop)',
      'Paginación o infinite scroll',
      'Footer'
    ],
    notes: 'El grid debe ser claro y fácil de scrollear en mobile.',
  },
  {
    name: 'Detalle de Producto',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Galería de imágenes (principal + thumbnails)',
      'Nombre, descripción, precio del producto',
      ...(catalog.hasVariants ? ['Selector de variantes (color, tamaño, sabor)'] : []),
      ...(hasCheckout ? ['Indicador de stock'] : []),
      `Botón CTA: "${!hasCheckout ? 'Consultar por WhatsApp' : 'Agregar al carrito'}"`,
      'Productos relacionados (4-6 items)',
      'Footer'
    ],
    notes: 'En mobile: galería swipeable arriba, info abajo, CTA sticky en bottom.',
  },
]

if (hasCart) {
  allPages.push({
    name: 'Carrito',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Lista de productos agregados (imagen, nombre, cantidad, precio, eliminar)',
      'Cupón de descuento (input + botón aplicar)',
      'Resumen: subtotal, envío, descuento, total',
      'Botón: "Proceder al pago"',
      'Link: "Seguir comprando"',
    ],
    notes: 'Mobile: puede ser full-screen o bottom sheet. Desktop: sidebar o página dedicada.',
  })
}

if (hasCheckout) {
  allPages.push({
    name: 'Checkout — Paso 1: Datos del Comprador',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Barra de progreso: Paso 1 de 4',
      'Formulario: Nombre, Email, Teléfono, Dirección (si envío)',
      'Resumen del pedido (sidebar desktop, bottom mobile)',
      'Botón: "Continuar al envío"',
    ],
    notes: 'Mobile: formulario apilado, inputs grandes para teclado.',
  })

  allPages.push({
    name: 'Checkout — Paso 2: Envío',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Barra de progreso: Paso 2 de 4',
      'Métodos de envío (delivery, retiro, Correo Argentino, etc.)',
      'Cotización del envío',
      'Resumen actualizado con envío',
      'Botón: "Continuar al pago"',
    ],
    notes: '',
  })

  allPages.push({
    name: 'Checkout — Paso 3: Pago',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Barra de progreso: Paso 3 de 4',
      'Área para el componente de pago de MercadoPago (NO diseñar el formulario de pago, solo el contenedor)',
      'Resumen final del pedido',
      'Badges de seguridad',
    ],
    notes: 'MercadoPago provee su propio componente de pago. Solo diseñar el contenedor y el layout alrededor.',
  })

  allPages.push({
    name: 'Checkout — Paso 4: Confirmación',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Mensaje de éxito: "¡Gracias por tu compra!"',
      'Número de pedido',
      'Resumen de la compra',
      'Próximos pasos (email de confirmación, seguimiento)',
      'CTA: "Seguir comprando" o "Ver seguimiento"',
    ],
    notes: 'Página de celebración. Puede ser colorida y animada.',
  })
}

if (hasTracking) {
  allPages.push({
    name: 'Seguimiento de Pedido',
    required: true,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Timeline visual de estados del pedido',
      'Detalles: productos, dirección, método de envío',
      'Número de tracking',
      'CTA: Contactar soporte',
    ],
    notes: 'Timeline: Confirmado → Preparando → Enviado → Entregado.',
  })
}

if (pages.about) {
  allPages.push({
    name: 'Sobre Nosotros',
    required: false,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Hero con imagen del local/equipo',
      'Historia del negocio',
      'Valores o equipo',
      'CTA a contacto o catálogo',
      'Footer',
    ],
    notes: '',
  })
}

if (pages.faq) {
  allPages.push({
    name: 'FAQ / Preguntas Frecuentes',
    required: false,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Título: Preguntas Frecuentes',
      'Lista de preguntas (accordion)',
      'CTA a contacto si no encuentra respuesta',
      'Footer',
    ],
    notes: '',
  })
}

if (pages.contact) {
  allPages.push({
    name: 'Contacto',
    required: false,
    screens: ['Mobile', 'Desktop'],
    sections: [
      'Información: dirección, teléfono, email, horarios',
      'Mapa (si hay dirección física)',
      'Formulario de contacto',
      'Redes sociales',
      'Footer',
    ],
    notes: '',
  })
}

if (pages.legal) {
  allPages.push({
    name: 'Términos y Privacidad',
    required: false,
    screens: ['Desktop'], // Usually same for mobile, no separate design needed
    sections: [
      'Título',
      'Texto legal en secciones',
      'Fecha de actualización',
      'Footer',
    ],
    notes: 'Diseño simple, centrado en legibilidad.',
  })
}

allPages.push({
  name: '404 — Página No Encontrada',
  required: true,
  screens: ['Mobile', 'Desktop'],
  sections: [
    'Ilustración o ícono grande',
    'Mensaje: "Página no encontrada"',
    'Links útiles: Inicio, Catálogo, Contacto',
  ],
  notes: 'Página divertida o amigable, a tono con la marca.',
})

allPages.push({
  name: 'Error General',
  required: true,
  screens: ['Mobile', 'Desktop'],
  sections: [
    'Mensaje de error',
    'Botón: "Reintentar"',
    'Link a Inicio',
  ],
  notes: '',
})

// ════════════════════════════════════════════════════════════════════════════
// BUILD DESIGN.md
// ════════════════════════════════════════════════════════════════════════════
function buildDesignMd() {
  const lines = []

  // HEADER
  lines.push(`# DESIGN.md — Dirección Creativa para el Modelo AI`)
  lines.push(``)
  lines.push(`> **Proyecto:** ${business.name || 'Sin definir'}`)
  lines.push(`> **Plan:** ${plan === 'esencial' ? 'Esencial' : plan === 'emprendimiento' ? 'Emprendimiento' : 'Empresa'}`)
  lines.push(`> **Rubro:** ${business.industry || 'Sin definir'}`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // ═════════════════════════════════════════════════════════════════════════
  // DIRECCIÓN CREATIVA — Ultra claro para el modelo AI
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(`## DIRECCIÓN CREATIVA — Leer primero`)
  lines.push(``)
  lines.push(`Modelo AI, necesito que diseñes un sitio web completo para **${business.name || 'este negocio'}**.`)
  lines.push(``)
  lines.push(`**Contexto rápido:**`)
  lines.push(`- Rubro: ${business.industry || 'Sin definir'}`)
  lines.push(`- Estilo: ${style} — ${visual.desiredMood || 'Sin definir'}`)
  lines.push(`- Tono: ${tone}`)
  lines.push(`- Dispositivo principal: ${audience.primaryDevice || 'mobile'}`)
  lines.push(`- Colores de marca: ${visual.colors?.primary || 'No definido'}${visual.colors?.secondary ? `, ${visual.colors.secondary}` : ''}`)
  lines.push(`- Animaciones: ${intake.animations || 'sutiles'}`)
  lines.push(`- Plan: ${plan === 'esencial' ? 'Catálogo sin checkout (CTA WhatsApp)' : plan === 'emprendimiento' ? 'Tienda con checkout y MercadoPago' : 'Tienda completa con envíos avanzados'}`)
  lines.push(``)
  lines.push(`**IMPORTANTE:**`)
  lines.push(`- Diseñá mobile-first: empezá por mobile (375px) y luego desktop (1280px).`)
  lines.push(`- Cada página debe tener versión mobile Y desktop.`)
  lines.push(`- El diseño debe ser único y propio de este negocio, NO genérico.`)
  lines.push(`- Seguí las secciones de cada página que están listadas abajo.`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // ═════════════════════════════════════════════════════════════════════════
  // PÁGINAS A DISEÑAR — Con prompts individuales
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(`## PÁGINAS A DISEÑAR`)
  lines.push(``)
  lines.push(`**Total: ${allPages.length} páginas | Mobile + Desktop cada una**`)
  lines.push(``)
  lines.push(`A continuación está el brief de CADA página. Diseñálas TODAS. No te saltees ninguna.`)
  lines.push(``)

  allPages.forEach((page, idx) => {
    lines.push(`---`)
    lines.push(``)
    lines.push(`### ${idx + 1}. ${page.name} ${page.required ? '(OBLIGATORIA)' : '(Opcional)'}`)
    lines.push(``)
    lines.push(`**Dispositivos:** ${page.screens.join(' + ')}`)
    lines.push(``)
    lines.push(`**Secciones que DEBE tener:**`)
    page.sections.forEach(section => {
      lines.push(`- [ ] ${section}`)
    })
    if (page.notes) {
      lines.push(``)
      lines.push(`**Notas:** ${page.notes}`)
    }
    lines.push(``)
  })

  lines.push(`---`)
  lines.push(``)

  // ═════════════════════════════════════════════════════════════════════════
  // CHECKLIST GLOBAL — Para verificar que no faltó nada
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(`## CHECKLIST GLOBAL — Verificar antes de entregar`)
  lines.push(``)
  lines.push(`Revisá esta lista y confirmá que está TODO:`)
  lines.push(``)
  lines.push(`### Páginas obligatorias:`)
  allPages.filter(p => p.required).forEach(p => {
    lines.push(`- [ ] ${p.name} — Mobile + Desktop`)
  })
  lines.push(``)
  lines.push(`### Páginas opcionales (si aplica):`)
  allPages.filter(p => !p.required).forEach(p => {
    lines.push(`- [ ] ${p.name} — Mobile + Desktop`)
  })
  lines.push(``)
  lines.push(`### Componentes que deben estar en TODAS las páginas:`)
  lines.push(`- [ ] Header con logo, navegación, ${hasCart ? 'carrito con badge, ' : ''}CTA principal`)
  lines.push(`- [ ] Footer con contacto, links, legales, redes, crédito "Desarrollado por SitioHoy"`)
  lines.push(`- [ ] Menú mobile (hamburguesa) con subcategorías`)
  lines.push(`- [ ] Botón flotante de WhatsApp (esquina inferior derecha)`)
  lines.push(`- [ ] Estados de hover y active en botones y links`)
  lines.push(`- [ ] Estados de loading (skeleton)`)
  lines.push(`- [ ] Estados empty (cuando no hay contenido)`)
  lines.push(``)

  // ═════════════════════════════════════════════════════════════════════════
  // IDENTIDAD VISUAL — Referencia rápida
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(`## REFERENCIA VISUAL`)
  lines.push(``)
  lines.push(`**Colores de marca (usar como guía):**`)
  lines.push(`- Primario: ${visual.colors?.primary || 'No definido — proponer'}`)
  lines.push(`- Secundario: ${visual.colors?.secondary || 'No definido — proponer'}`)
  lines.push(`- Acento: ${visual.colors?.accent || 'No definido — proponer'}`)
  lines.push(``)
  lines.push(`**Estilo:** ${style}`)
  lines.push(`**Mood:** ${visual.desiredMood || 'Sin definir'}`)
  lines.push(`**Tono:** ${tone}`)
  lines.push(``)

  if (Array.isArray(business.visualReferences) && business.visualReferences.length) {
    lines.push(`**Referencias del cliente (inspiración):**`)
    business.visualReferences.forEach(ref => lines.push(`- ${ref}`))
    lines.push(``)
  }

  lines.push(`**Animaciones:** ${intake.animations || 'sutiles'}`)
  lines.push(``)

  // ═════════════════════════════════════════════════════════════════════════
  // INTEGRACIONES VISUALES
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(`## INTEGRACIONES QUE DEBEN APARECER`)
  lines.push(``)
  if (hasCheckout) lines.push(`- ✅ MercadoPago badge (footer, checkout, producto)`)
  if (plan === 'empresa' && technical.correoArgentinoRequested) lines.push(`- ✅ Correo Argentino badge`)
  if (plan === 'empresa' && technical.enviaRequested) lines.push(`- ✅ Envia.com badge`)
  if (plan === 'emprendimiento') lines.push(`- ✅ Envíos badge`)
  lines.push(`- ✅ WhatsApp botón flotante verde`)
  if (hasCheckout && technical.resendRequested) lines.push(`- ✅ Email icono footer`)
  if (Array.isArray(contact.socials) && contact.socials.length) lines.push(`- ✅ Redes sociales: ${list(contact.socials)}`)
  lines.push(``)

  // ═════════════════════════════════════════════════════════════════════════
  // ANTI-PATTERNS
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(`## EVITAR — Anti-patterns`)
  lines.push(``)
  lines.push(`- ❌ Hero genérico con gente sonriendo sobre fondo blanco`)
  lines.push(`- ❌ Gradientes violeta/azul/rosa genéricos`)
  lines.push(`- ❌ Glassmorphism sin propósito`)
  lines.push(`- ❌ Inter / Roboto / Lato por defecto`)
  lines.push(`- ❌ Íconos flotantes decorativos sin función`)
  lines.push(`- ❌ Cards con sombras excesivas`)
  lines.push(`- ❌ UI dominada por un solo color`)
  lines.push(`- ❌ Mismo diseño genérico que cualquier otra tienda`)
  lines.push(`- ❌ Animaciones en TODOS los elementos sin criterio`)
  lines.push(``)

  // ═════════════════════════════════════════════════════════════════════════
  // INSTRUCCIONES FINALES
  // ═════════════════════════════════════════════════════════════════════════
  lines.push(`## INSTRUCCIONES FINALES`)
  lines.push(``)
  lines.push(`Este es el brief de dirección creativa. Diseñá el sitio completo:`)
  lines.push(``)
  lines.push(`1. Empezá con el sistema de diseño base (colores, tipografía, componentes).`)
  lines.push(`2. Luego diseñá página por página siguiendo la lista de arriba.`)
  lines.push(`3. Cada página debe tener versión MOBILE (375px) y DESKTOP (1280px).`)
  lines.push(`4. No te saltees ninguna página de la lista.`)
  lines.push(`5. Confirmá que completaste el CHECKLIST GLOBAL.`)
  lines.push(``)
  lines.push(`**Generar design tokens en styles/tokens.css y componentes directamente en código (TSX + Tailwind).**`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`**Documento generado por SitioHoy**`)
  lines.push(``)

  return lines.join('\n')
}

// ── Write file ──────────────────────────────────────────────────────────────
const designDir = path.join(root, '.sitiohoy', 'design')
await mkdir(designDir, { recursive: true })
const designPath = path.join(designDir, 'DESIGN.md')
await writeFile(designPath, buildDesignMd())

console.log(`✓ DESIGN.md generado: ${designPath}`)
console.log(`  Páginas: ${allPages.length}`)
console.log(`  Plan: ${plan}`)
console.log(`  Tono: ${tone}`)
console.log(`  Estilo: ${style}`)
