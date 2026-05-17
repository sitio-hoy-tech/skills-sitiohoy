/**
 * generate-handoff.mjs
 * Genera documento de entrega al cliente con toda la info necesaria.
 *
 * Usage: node scripts/generate-handoff.mjs
 *
 * Requires: sitiohoy.config.json, brief.md in CWD
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const configPath = path.join(root, 'sitiohoy.config.json')
const briefPath = path.join(root, 'brief.md')

if (!existsSync(configPath)) {
  console.error('  ❌ No existe sitiohoy.config.json')
  process.exit(1)
}

const config = JSON.parse(await readFile(configPath, 'utf8'))
const brief = existsSync(briefPath) ? await readFile(briefPath, 'utf8') : ''

const business = config.business ?? {}
const plan = config.plan ?? 'esencial'
const integrations = config.integrations ?? {}
const domain = config.domain ?? {}
const siteUrl = config.siteUrl || domain.value || '[URL pendiente]'

const planNames = { esencial: 'Esencial', emprendimiento: 'Emprendimiento', empresa: 'Empresa' }
const date = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })

const handoff = `# Entrega de Proyecto — ${business.name ?? 'SitioHoy'}

**Fecha de entrega:** ${date}
**Plan:** ${planNames[plan] ?? plan}
**URL del sitio:** ${siteUrl}

---

## Accesos

### Sitio Web (Vercel)
- **URL**: ${siteUrl}
- **Dashboard**: https://vercel.com (acceder con la cuenta vinculada)
- **Deploy automático**: cada push a \`main\` en GitHub genera un nuevo deploy

### Base de Datos (Supabase)
- **Dashboard**: https://supabase.com/dashboard
- **Proyecto**: vinculado al repositorio
- **Acceso**: read-only para consultar pedidos, productos y mensajes

### Repositorio (GitHub)
- **Repo**: [Se informará la URL del repositorio]
- **Rama principal**: \`main\`
- **Permisos**: acceso de lectura (o escritura si se acordó)

${integrations.mercadopago ? `### MercadoPago
- **Dashboard**: https://www.mercadopago.com.ar/developers
- **Credentials**: configuradas en producción
- **Webhook**: activo y verificado
- **Importante**: No modificar el Access Token sin coordinación técnica
` : ''}
${integrations.resend ? `### Email Transaccional (Resend)
- **Dashboard**: https://resend.com
- **Emails configurados**: confirmación de pedido, contacto
` : ''}
${integrations.umami ? `### Analytics (Umami)
- **Dashboard**: [URL del dashboard Umami]
- **Eventos trackeados**: page views, add to cart, purchase, contact form
` : ''}
---

## Qué incluye tu plan ${planNames[plan] ?? plan}

${plan === 'esencial' ? `- Catálogo de hasta 50 productos
- Consultas por WhatsApp
- Diseño responsive (mobile + desktop)
- SEO optimizado
- Formulario de contacto
` : plan === 'emprendimiento' ? `- Catálogo de hasta 200 productos
- Pagos online con MercadoPago
- Checkout completo
- Envíos con precios fijos por zona
- Emails transaccionales
- Analytics (Umami)
- SEO optimizado
- Formulario de contacto
` : `- Catálogo ilimitado
- Pagos online con MercadoPago
- Checkout completo multi-step
- Envíos dinámicos (${integrations.correoArgentino ? 'Correo Argentino' : integrations.envia ? 'Envia.com' : 'precios fijos por zona'})
- Emails transaccionales
- Analytics avanzado (Umami)
- SEO optimizado con Schema.org
- Formulario de contacto
- Seguimiento de pedidos
`}
---

## Cómo gestionar tu sitio

### Agregar/editar productos
- Acceder a Supabase Dashboard → Tabla \`products\`
- Campos obligatorios: name, price, tenant_id
- Las imágenes se suben a Storage → bucket \`product-images\`
- Después de cambios, el sitio se actualiza automáticamente (ISR)

### Ver pedidos
- Supabase Dashboard → Tabla \`orders\`
- Estados: pending → paid → processing → shipped → delivered
- Cada cambio de estado notifica al cliente (si email activo)

### Mensajes de contacto
- Supabase Dashboard → Tabla \`contact_messages\`
- También llegan por email si Resend está configurado

### Cambiar contenido (textos, imágenes)
- Requiere acceso al repositorio y un deploy
- Contactar al equipo técnico para cambios de contenido

---

## Soporte y Mantenimiento

- **Soporte técnico**: [definir canal — email/WhatsApp]
- **Tiempo de respuesta**: [definir SLA]
- **Incluye**: corrección de bugs, actualizaciones de seguridad
- **No incluye**: nuevas funcionalidades, rediseño, cambios de plan

---

## Información Técnica (para referencia)

- **Framework**: Next.js 15+ (App Router)
- **Base de datos**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **CDN**: Vercel Edge Network
- **SSL**: automático
${integrations.mercadopago ? '- **Pagos**: MercadoPago Checkout Bricks\n' : ''}${integrations.correoArgentino ? '- **Envíos**: Correo Argentino (MiCorreo API)\n' : ''}${integrations.envia ? '- **Envíos**: Envia.com API\n' : ''}${integrations.resend ? '- **Email**: Resend\n' : ''}${integrations.umami ? '- **Analytics**: Umami (self-hosted)\n' : ''}- **Validación**: QA automatizado + Lighthouse + E2E tests

---

## Checklist Post-Entrega

- [ ] Verificar que puedo acceder al sitio
- [ ] Verificar que puedo acceder a Supabase
- [ ] Verificar que los productos se ven correctamente
${integrations.mercadopago ? '- [ ] Verificar que puedo ver pedidos en MercadoPago\n' : ''}- [ ] Guardar esta documentación en lugar seguro
- [ ] Probar el formulario de contacto
${integrations.mercadopago ? '- [ ] Realizar una compra de prueba\n' : ''}- [ ] Confirmar canal de soporte técnico

---

*Generado automáticamente por SitioHoy el ${date}*
`

const outputDir = path.join(root, '.sitiohoy', 'launch')
await mkdir(outputDir, { recursive: true })
const outputPath = path.join(outputDir, 'entrega-cliente.md')
await writeFile(outputPath, handoff)

console.log(`\n  ✅ Documento de entrega generado: .sitiohoy/launch/entrega-cliente.md\n`)
