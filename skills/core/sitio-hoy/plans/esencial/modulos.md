---
skill: modulos-esencial
descripcion: Módulos 0-5 del Plan Esencial — catálogo con WhatsApp, sin checkout ni pagos
tipo: plan-esencial
---

# Módulos — Plan Esencial

**Base compartida:** leer `plans/modulos-shared.md` para pasos y verificaciones comunes a todos los planes. Este archivo solo documenta diferencias del Plan Esencial.

Ejecutar secuencialmente. No avanzar al siguiente módulo sin cumplir el **gate universal de cierre** (ver `modulos-shared.md`).

Si el proyecto no tiene scripts SitioHoy, cargar `sitio-hoy-scaffold` o `sitio-hoy-qa` antes de cerrar el módulo.

---

## Módulo 0 — Scaffold, Base Técnica e Identidad Visual

**Objetivo**: proyecto inicializado con base repetible, schema completo y design system único antes de escribir UI final.

Pasos:
1. Usar `sitio-hoy-scaffold` si el proyecto arranca desde cero.
2. Crear `sitiohoy.config.json` con:
   - `plan: "esencial"`
   - `integrations.whatsapp: true`
   - pagos, envíos, Resend y Umami en `false`
3. Instalar dependencias base:
   ```bash
   npm install @supabase/ssr @supabase/supabase-js lucide-react zod
   ```
4. Usar `sitio-hoy-database` para generar `supabase/migrations/001_initial_schema.sql`.
5. Aplicar schema completo + RLS + bucket `public_assets`.
   - El schema completo se crea aunque Esencial no use checkout.
   - Las features se apagan por configuración, no borrando tablas.
6. Leer `.sitiohoy/design/DESIGN.md` como dirección creativa.
7. El modelo AI genera design tokens y componentes directamente en código.
8. Crear/ajustar `styles/tokens.css` con tokens generados por el modelo AI.
9. Crear `.env.local` desde `.env.example`.
10. Crear `proyecto-tracking.json` en la raíz del proyecto (se commitea al repo, NO en `.gitignore`).

Verificación ✅:
- [ ] `sitiohoy.config.json` creado con plan Esencial
- [ ] `.sitiohoy/design/DESIGN.md` generado como dirección creativa
- [ ] `styles/tokens.css` existe con tokens generados por el modelo AI
- [ ] `supabase/migrations/001_initial_schema.sql` generado
- [ ] Schema completo aplicado o listo para ejecutar manualmente
- [ ] `.env.example` existe y `.env.local` no se commitea
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores
- [ ] `_assets-cliente/` creada con imágenes del cliente

Gate de cierre:
```bash
npm run build
npm run sitiohoy:validate
```

---

## Módulo 1 — Layout Global

**Objetivo**: shell del sitio con header, footer, navegación responsive y estados base.

Pasos:
1. `app/layout.tsx` con `next/font`, metadata global y tokens cargados.
2. `<Header>`: logo, nav principal y botón "WhatsApp" con ícono destacado.
3. `<Footer>`: WhatsApp, email, redes sociales, links legales, Schema.org `Organization`.
   - En la barra inferior del footer incluir siempre `<AgencyCredit />` (componente reutilizable en `components/ui/agency-credit.tsx`).
   - El componente muestra "Desarrollado por" + logo SitioHoy con link a `sitiohoy.com.ar`.
   - Copiar `public/logo-sitiohoy.png` desde los assets del onboarding.
   - Si el logo no fue entregado, pedirlo antes de construir el footer.
   - La barra inferior debe ser `flex justify-between` para que copyright quede a la izquierda y el crédito a la derecha.
4. `app/not-found.tsx` y `app/error.tsx` globales.
5. `loading.tsx` con skeleton en rutas que cargan datos.
6. Botón WhatsApp flotante o en header como elemento de conversión principal.

Verificación ✅:
- [ ] Header responsive con menú mobile funcional
- [ ] Botón WhatsApp abre `wa.me` con mensaje predefinido
- [ ] Footer con datos completos del brief
- [ ] Crédito "Desarrollado por SitioHoy" visible en la barra inferior del footer con link a sitiohoy.com.ar
- [ ] 375px / 768px / 1280px sin overflow
- [ ] Auditoría diseño ≥ 8/10 en las 10 dimensiones
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 2 — Home

**Objetivo**: página principal optimizada para conversión y SEO con CTA hacia WhatsApp.

Secciones:
1. Hero según brief y `core/04-design-system.md`.
2. Categorías con links al catálogo filtrado.
3. Productos destacados (`featured = true`, máximo 8 productos — hardcodeado con `LIMIT 8` en la query).
4. Propuesta de valor con 3-4 beneficios.
5. CTA final con WhatsApp grande y copy del negocio.

Implementar:
- `generateMetadata()` con OG tags completos.
- Schema.org `Organization`, `WebSite`, `SearchAction`.
- `unstable_cache` con tag `TAGS.HOMEPAGE`.
- `next/image` en todas las imágenes.
- Motion con `prefers-reduced-motion`.

Verificación ✅:
- [ ] Todas las secciones implementadas
- [ ] Hero único, no plantilla genérica
- [ ] WhatsApp funciona con mensaje correcto
- [ ] Schema.org válido
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 3 — Catálogo y Detalle de Producto

**Objetivo**: catálogo completo con detalle de producto y CTA WhatsApp por producto.

Pasos:
1. `/catalogo` con grid, filtros por categoría, ordenamiento y **paginación server-side** (LIMIT/OFFSET, nunca cargar todos los productos de golpe).
2. `/catalogo/[slug]` con galería, variantes y botón "Consultar por WhatsApp".
3. `generateStaticParams()` solo si ≤50 productos. Para catálogos más grandes, las páginas se generan on-first-visit via ISR on-demand.
4. `generateMetadata()` por producto.
5. Schema.org `Product`, `Offer` y `BreadcrumbList`.
6. Queries cacheadas con `unstable_cache` — ISR on-demand solamente, nunca `revalidate = N`.
7. `loading.tsx`, `error.tsx` y `not-found.tsx` en segmentos de catálogo.
8. **Submenús en header**: si hay categorías, agregar dropdown de categorías bajo "Productos" en la navegación principal.

Verificación ✅:
- [ ] Filtros por categoría visibles y funcionales
- [ ] Paginación implementada (no se cargan todos los productos de golpe)
- [ ] Galería navegable
- [ ] Variantes visibles con precio correcto
- [ ] WhatsApp incluye nombre del producto
- [ ] URLs canónicas correctas
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 4 — Páginas Opcionales y CMS

**Objetivo**: implementar solo las páginas solicitadas en el brief.

Páginas comunes:
- `/sobre-nosotros`
- `/faq` con Schema.org `FAQPage`
- `/contacto` con `integraciones/formulario-contacto.md`
- `/terminos` y `/privacidad`

Reglas:
- Crear solo lo pedido.
- Si hay formulario, guardar lead en `contact_messages` cuando Resend no esté configurado.
- Páginas estáticas puras NO usan `revalidate = N` — se invalidan via ISR on-demand como el resto del sitio.

Verificación ✅:
- [ ] Solo páginas pedidas implementadas
- [ ] FAQ con Schema.org si existe
- [ ] Formulario valida y no pierde mensajes
- [ ] Páginas incluidas en sitemap
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 5 — SEO Técnico, Performance y Deploy

**Objetivo**: sitio listo para indexación, QA final y deploy en Vercel.

Pasos:
1. `app/sitemap.ts` dinámico con productos y páginas.
2. `app/robots.ts` con permisos para buscadores y bots de IA permitidos.
3. Auditar `generateMetadata()` en todas las rutas.
4. Validar Schema.org.
5. Ejecutar `sitio-hoy-qa`.
6. Generar reporte QA.
7. Leer `core/15-deploy-vercel.md`.
8. Deploy en Vercel, dominio y SSL.

Verificación ✅:
- [ ] `/sitemap.xml` sin errores
- [ ] `/robots.txt` correcto
- [ ] LCP < 2.5s y CLS < 0.1
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:qa` ejecutado o justificado
- [ ] `npm run sitiohoy:qa-report` generó reporte
- [ ] Deploy en Vercel exitoso
- [ ] Cliente con acceso a Vercel Dashboard

Gate final:
```bash
npm run sitiohoy:qa
npm run sitiohoy:qa-report
```
