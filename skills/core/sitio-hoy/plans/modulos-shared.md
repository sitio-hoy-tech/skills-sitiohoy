---
skill: modulos-shared
descripcion: Definiciones compartidas de módulos entre los 3 planes — evitar duplicación
tipo: referencia — los módulos de cada plan heredan de acá
---

# Módulos Compartidos

Este archivo define los pasos y verificaciones comunes a los 3 planes.
Los módulos de cada plan (`esencial/modulos.md`, `emprendimiento/modulos.md`, `empresa/modulos.md`)
heredan de acá y solo documentan sus diferencias.

---

## Gate universal de cierre de módulo

No avanzar al siguiente módulo sin:
1. Checklist funcional completo del módulo
2. `npm run build` sin errores (cuando aplique)
3. `npm run sitiohoy:validate` sin errores
4. `proyecto-tracking.json` actualizado
5. Pruebas manuales listadas y confirmadas por el usuario
6. Configuraciones necesarias para el próximo módulo comunicadas

---

## Módulo 0 — Scaffold, Base Técnica e Identidad Visual (COMPARTIDO)

**Objetivo**: proyecto inicializado con base repetible, schema completo y design system único antes de escribir UI final.

**Pasos comunes a todos los planes:**
1. Usar `sitio-hoy-scaffold` si el proyecto arranca desde cero.
2. Crear `sitiohoy.config.json` con plan e integraciones correspondientes.
3. Instalar dependencias base:
   ```bash
   npm install @supabase/ssr @supabase/supabase-js lucide-react zod
   ```
4. Usar `sitio-hoy-database` para generar schema completo + RLS + bucket `public_assets`.
   - El schema completo se crea siempre — las features se apagan por configuración, no borrando tablas.
5. Leer `.sitiohoy/design/DESIGN.md` como dirección creativa.
6. El modelo AI genera design tokens y componentes directamente en código.
7. Crear/ajustar `styles/tokens.css` con tokens generados por el modelo AI.
8. Crear `.env.local` desde `.env.example`.
9. Agregar `proyecto-tracking.json` al repo (NO en `.gitignore`).

**Verificación compartida ✅:**
- [ ] `sitiohoy.config.json` creado con plan correcto
- [ ] `.sitiohoy/design/DESIGN.md` generado como dirección creativa
- [ ] `styles/tokens.css` existe con tokens generados por el modelo AI
- [ ] `supabase/migrations/001_initial_schema.sql` generado
- [ ] Schema completo aplicado o listo para ejecutar
- [ ] `.env.example` existe y `.env.local` no se commitea
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores
- [ ] `_assets-cliente/` creada con imágenes del cliente

**Pruebas manuales:** "Verificá que `npm run dev` arranca sin errores y que `localhost:3000` muestra la página default de Next.js."

**Para el próximo módulo (Layout):** No se necesitan configuraciones adicionales.

---

## Módulo 1 — Layout Global (COMPARTIDO)

**Objetivo**: shell del sitio con header, footer, navegación responsive y estados base.

**Pasos comunes a todos los planes:**
1. `app/layout.tsx` con `next/font`, metadata global y tokens cargados.
2. `<Header>`: logo, nav principal con submenús de categorías si las hay.
3. `<Footer>`: WhatsApp, email, redes sociales, links legales, Schema.org `Organization`, `<AgencyCredit />`.
4. `app/not-found.tsx` y `app/error.tsx` globales.
5. `loading.tsx` con skeleton en rutas que cargan datos.
6. La barra inferior del footer: `flex justify-between` con copyright a la izquierda y crédito SitioHoy a la derecha.

**Verificación compartida ✅:**
- [ ] Header responsive con menú mobile funcional
- [ ] Submenú de categorías en header (si hay categorías)
- [ ] Footer con datos completos del brief
- [ ] Crédito `<AgencyCredit />` visible en la barra inferior del footer
- [ ] 375px / 768px / 1280px sin overflow
- [ ] Auditoría diseño ≥ 8/10 en las 10 dimensiones
- [ ] `npm run sitiohoy:validate` sin errores

**Pruebas manuales:** "Revisá el header y footer en mobile (375px) y desktop (1280px). Probá el menú hamburguesa. Verificá que el logo y los links funcionen."

---

## Módulo Home (COMPARTIDO)

**Secciones comunes:**
1. Hero según brief y `core/04-design-system.md`.
2. Categorías con links al catálogo filtrado.
3. Productos destacados (`featured = true`, máximo 8 productos — `LIMIT 8` hardcodeado).
4. Propuesta de valor con 3-4 beneficios.
5. CTA final.

**Implementar siempre:**
- `generateMetadata()` con OG tags completos.
- Schema.org `Organization`, `WebSite`, `SearchAction`.
- `unstable_cache` con tag `TAGS.HOMEPAGE` — ISR on-demand, nunca `revalidate = N`.
- `next/image` en todas las imágenes.
- Motion con `prefers-reduced-motion`.

**Verificación compartida ✅:**
- [ ] Todas las secciones implementadas
- [ ] Hero único, no plantilla genérica
- [ ] Schema.org válido
- [ ] `npm run sitiohoy:validate` sin errores

**Pruebas manuales:** "Mirá el home en localhost:3000. Aprobá el diseño — si querés cambios, decime antes de avanzar."

---

## Módulo Catálogo (COMPARTIDO)

**Pasos comunes:**
1. `/catalogo` con grid, filtros por categoría, ordenamiento y **paginación server-side** (LIMIT/OFFSET).
2. `/catalogo/[slug]` con galería y variantes.
3. `generateStaticParams()` solo si ≤50 productos. Para más, ISR on-demand (on-first-visit).
4. `generateMetadata()` por producto.
5. Schema.org `Product`, `Offer` y `BreadcrumbList`.
6. Queries cacheadas con `unstable_cache` — ISR on-demand, nunca `revalidate = N`.
7. `loading.tsx`, `error.tsx` y `not-found.tsx` en segmentos de catálogo.
8. Submenús de categorías en header si hay categorías.

**Verificación compartida ✅:**
- [ ] Filtros por categoría visibles y funcionales
- [ ] Paginación implementada
- [ ] Submenú de categorías en header
- [ ] Galería navegable
- [ ] Variantes visibles con precio correcto
- [ ] URLs canónicas correctas
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores

**Pruebas manuales:** "Probá los filtros de categoría, la paginación, y abrí un producto. Verificá la galería y las variantes."

---

## Módulo Páginas Opcionales (COMPARTIDO)

**Implementar solo las páginas solicitadas en el brief.**

Páginas comunes:
- `/sobre-nosotros`
- `/faq` con Schema.org `FAQPage`
- `/contacto` con `integraciones/formulario-contacto.md`
- `/terminos` y `/privacidad`

Reglas:
- Crear solo lo pedido.
- Si hay formulario, guardar lead en `contact_messages` siempre. Si Resend está configurado, enviar email branded.
- Páginas estáticas puras pueden usar ISR on-demand (sin `revalidate = N`).

**Verificación compartida ✅:**
- [ ] Solo páginas pedidas implementadas
- [ ] FAQ con Schema.org si existe
- [ ] Formulario valida, no pierde mensajes y envía email si Resend activo
- [ ] Páginas incluidas en sitemap
- [ ] `npm run sitiohoy:validate` sin errores

**Pruebas manuales:** "Revisá las páginas opcionales. Si hay formulario de contacto, probá enviarlo y verificá que llegue a la tabla `contact_messages`."

---

## Módulo SEO y Deploy (COMPARTIDO)

**Pasos comunes:**
1. `app/sitemap.ts` dinámico con productos y páginas.
2. `app/robots.ts` con permisos para buscadores y bots de IA.
3. Auditar `generateMetadata()` en todas las rutas.
4. Validar Schema.org.
5. Ejecutar `sitio-hoy-qa`.
6. Generar reporte QA.
7. Deploy en Vercel, dominio y SSL.

**Verificación compartida ✅:**
- [ ] `/sitemap.xml` sin errores
- [ ] `/robots.txt` correcto
- [ ] LCP < 2.5s y CLS < 0.1
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:qa` ejecutado o justificado
- [ ] `npm run sitiohoy:qa-report` generó reporte
- [ ] Deploy en Vercel exitoso

**Pruebas manuales:** "Verificá el sitio en producción. Revisá Lighthouse, que el sitemap esté accesible, y que Schema.org sea válido."
