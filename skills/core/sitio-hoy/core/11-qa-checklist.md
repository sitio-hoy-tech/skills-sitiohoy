---
skill: qa-checklist
descripcion: Generador de reporte QA al finalizar el proyecto — checklist para validación manual antes del deploy
tipo: core — ejecutar al terminar el último módulo, ANTES del deploy
---

# QA Checklist — Generador de Reporte

Al terminar todos los módulos del plan, usar primero `sitio-hoy-qa`:

```bash
npm run sitiohoy:qa
SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit
SITE_URL=http://localhost:3000 npm run sitiohoy:e2e
npm run sitiohoy:qa-report
```

Eso genera un reporte base con hallazgos automáticos. Luego completar o ampliar el
archivo `QA-[nombre-negocio]-[fecha].md` con la matriz manual de este documento.

## Instrucción de generación

Crear o completar el archivo con esta estructura. Completar la columna "IA ✅" con:
- `✅` si `sitio-hoy-qa` o revisión estática lo verificó;
- `⚠️` si requiere credenciales, navegador real o tercero externo;
- vacío si es 100% manual.

La columna "Manual ✅" queda vacía para que el humano la complete.

## Template del archivo QA

```markdown
# QA — [Nombre del Negocio]
**Plan**: [Esencial | Emprendimiento | Empresa]
**Fecha de generación**: [YYYY-MM-DD]
**Generado por**: SitioHoy skill v2.0

> Marcar ✅ en la columna "Manual" después de verificar cada ítem en el navegador.
> No deployar hasta que todos los ítems críticos (🔴) estén ✅ en ambas columnas.

---

## 1. DISEÑO Y RESPONSIVE

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| El sitio se ve correctamente en 375px (iPhone SE) | [auto] | | 🔴 |
| El sitio se ve correctamente en 390px (iPhone 14) | [auto] | | 🔴 |
| El sitio se ve correctamente en 768px (tablet) | [auto] | | 🔴 |
| El sitio se ve correctamente en 1280px (desktop) | [auto] | | 🔴 |
| El sitio se ve correctamente en 1920px (desktop grande) | [auto] | | 🔴 |
| No hay overflow horizontal ni textos cortados | [auto] | | 🔴 |
| Screenshots en `.sitiohoy/qa/visual/` revisados | [auto] | | 🔴 |
| Imágenes de producto/hero no están rotas ni son genéricas | [auto] | | 🔴 |
| El hero es visualmente único y no genérico | [auto] | | 🔴 |
| El layout del catálogo está diferenciado | [auto] | | 🟡 |
| Dark mode funciona correctamente | [auto] | | 🟡 |
| No hay patrones de AI slop detectados | [auto] | | 🔴 |
| Todas las fuentes cargan con next/font | [auto] | | 🔴 |
| Touch targets ≥ 44px en mobile | [auto] | | 🔴 |
| Animaciones respetan prefers-reduced-motion | [auto] | | 🟡 |
| Score diseño ≥ 8/10 en las 10 dimensiones | [auto] | | 🔴 |

---

## 2. FUNCIONALIDAD — CATÁLOGO

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| Home carga correctamente | [auto] | | 🔴 |
| Catálogo muestra todos los productos activos | [auto] | | 🔴 |
| Filtros por categoría funcionan | [auto] | | 🔴 |
| Página de detalle de producto carga | [auto] | | 🔴 |
| Galería de imágenes funciona | [auto] | | 🔴 |
| Variantes de producto actualizan precio/stock | [auto] | | 🔴 |
| Productos físicos tienen peso/dimensiones o defaults estimados registrados | [manual] | revisar `products.weight_grams` y tracking | 🔴 |
| Botón "Consultar por WhatsApp" redirige correctamente | [auto] | | 🔴 |
| Breadcrumbs funcionan | [auto] | | 🟡 |
| Página 404 personalizada funciona | [auto] | | 🟡 |

---

## 3. FUNCIONALIDAD — BLOG (Solo si activado en brief)

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| Listado de blog carga con posts publicados | [auto] | | 🔴 |
| Filtro por categoría de blog funciona | [auto] | | 🔴 |
| Detalle de post carga correctamente | [auto] | | 🔴 |
| Schema.org Article presente en detalle de post | [auto] | | 🔴 |
| Posts con status `draft` NO aparecen en listado público | [auto] | | 🔴 |
| Blog posts aparecen en sitemap.xml | [auto] | | 🔴 |
| Metadata OG correcta en posts (título, descripción, imagen) | [auto] | | 🟡 |
| Breadcrumbs en blog funcionan | [auto] | | 🟡 |
| ISR on-demand invalida blog al publicar/editar post | | ← probar manualmente | 🔴 |
| RLS habilitado en blog_posts y blog_categories | [auto] | | 🔴 |

---

## 4. FUNCIONALIDAD — CHECKOUT (Solo Emprendimiento y Empresa)

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| Carrito persiste al recargar la página | [auto] | | 🔴 |
| Agregar producto al carrito funciona | [auto] | | 🔴 |
| Eliminar producto del carrito funciona | [auto] | | 🔴 |
| Paso 1 checkout — datos del comprador válida | [auto] | | 🔴 |
| Paso 2 checkout — selección de envío funciona | [auto] | | 🔴 |
| Tenant tiene `origin_postal_code` cargado para cotizar envío | [auto] | revisar Supabase | 🔴 |
| Paso 3 checkout — Payment Brick se renderiza | [auto] | | 🔴 |
| Pago con tarjeta de prueba es aprobado | | ← probar manualmente | 🔴 |
| Redirección a /checkout/success funciona | [auto] | | 🔴 |
| Redirección a /checkout/error funciona | [auto] | | 🔴 |
| Cupón de descuento se aplica correctamente | | ← probar manualmente | 🟡 |
| Página de seguimiento muestra el pedido | | ← probar manualmente | 🟡 |

---

## 5. EMAILS (Solo si Resend está activado)

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| Email de confirmación llega al comprador | [auto] | ← verificar inbox | 🔴 |
| Email NO cae en spam | | ← verificar inbox | 🔴 |
| El email tiene el nombre y número de pedido correcto | | ← verificar contenido | 🔴 |
| Link "seguir mi pedido" en el email funciona | | ← hacer click en el email | 🟡 |

---

## 6. SEO Y PERFORMANCE

> ⚠️ **Lighthouse siempre sobre build de producción.**
> `npm run build && npm start` — nunca sobre `npm run dev`.
> Dev mode sirve JS sin minificar con HMR activo: los números son falsos y generan trabajo innecesario.
> "Reduce unused JavaScript" de 200+ KiB en páginas con checkout es un falso positivo inevitable — ignorar.

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| Score Lighthouse ≥ 90 en Home | [auto] | ← correr sobre `npm start` | 🔴 |
| Score Lighthouse ≥ 90 en página de producto | [auto] | ← correr sobre `npm start` | 🔴 |
| LCP < 2.5s | [auto] | | 🔴 |
| CLS < 0.1 | [auto] | | 🔴 |
| /sitemap.xml accesible y sin errores | [auto] | ← abrir en browser | 🔴 |
| /robots.txt correcto | [auto] | ← abrir en browser | 🔴 |
| Schema.org sin errores (Google Rich Results) | [auto] | ← probar en rich-results.google.com | 🟡 |
| Todas las imágenes tienen alt descriptivo | [auto] | | 🔴 |
| URLs canónicas en todas las páginas | [auto] | | 🟡 |
| OG tags correctos (al compartir en redes) | [auto] | ← probar en opengraph.xyz | 🟡 |

---

## 7. SEGURIDAD Y TÉCNICO

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| TypeScript sin errores (`npm run build`) | [auto] | | 🔴 |
| RLS habilitado en todas las tablas de Supabase | [auto] | | 🔴 |
| SUPABASE_SERVICE_ROLE_KEY no está en NEXT_PUBLIC_ | [auto] | | 🔴 |
| Headers de seguridad configurados | [auto] | | 🟡 |
| `console.log`/debug innecesarios removidos antes de deploy | [auto] | | 🔴 |
| Secret scan sin credenciales en archivos commiteables | [auto] | | 🔴 |
| Variables de entorno completas en Vercel | | ← verificar en dashboard | 🔴 |

---

## 8. ACCESIBILIDAD (a11y)

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| Todas las imágenes tienen `alt` descriptivo (nunca vacío) | [auto] | | 🔴 |
| Contraste de texto cumple WCAG AA (ratio ≥ 4.5:1) | [auto] | | 🔴 |
| Navegación por teclado funciona (Tab, Enter, Escape) | | ← probar manualmente | 🔴 |
| Focus visible en todos los elementos interactivos | [auto] | | 🔴 |
| Formularios tienen `label` asociado a cada input | [auto] | | 🔴 |
| `aria-label` en botones de icono (hamburger, cerrar, carrito) | [auto] | | 🔴 |
| Skip-to-content link presente | [auto] | | 🟡 |
| `lang="es"` en `<html>` | [auto] | | 🔴 |
| Roles ARIA correctos en landmarks (header, main, nav, footer) | [auto] | | 🟡 |

---

## 9. DEPLOY FINAL

| Ítem | IA ✅ | Manual ✅ | Prioridad |
|---|---|---|---|
| `npm run build` sin errores | [auto] | | 🔴 |
| Deploy en Vercel exitoso | | ← verificar logs | 🔴 |
| Dominio con SSL configurado | | ← verificar candado en browser | 🔴 |
| Credenciales MP en PRODUCCIÓN (no TEST) | | ← verificar en MP dashboard | 🔴 |
| Webhook MP apuntando a URL de producción | | ← verificar en MP dashboard | 🔴 |
| Compra de prueba REAL aprobada | | ← hacer compra real | 🔴 |
| Cliente tiene acceso al Vercel Dashboard | | ← enviar invitación | 🔴 |

---

## E2E — Flujo de usuario real

- [ ] `npm run sitiohoy:e2e` corrió sin errores
- [ ] Screenshots en 375/768/1280/1920 revisados manualmente
- [ ] Menú mobile abre y muestra categorías
- [ ] Se puede agregar un producto al carrito
- [ ] Checkout carga sin errores JS en consola
- [ ] Formulario de contacto visible y enviable
- [ ] Ninguna ruta devuelve 404 o 500

---

## Pendientes para configurar en PRODUCCIÓN

> La IA completa esta sección al terminar, antes de deployar.

- [ ] Variables de Vercel Production cargadas y revisadas
- [ ] `NEXT_PUBLIC_URL` usa `https://` del dominio final
- [ ] MercadoPago usa credenciales de producción en `tenants`
- [ ] Webhook MercadoPago apunta a producción y tiene `MP_WEBHOOK_SECRET`
- [ ] Resend tiene SPF, DKIM y DMARC verificados para `sitiohoy.com.ar`
- [ ] Envia/Correo Argentino configurados en modo producción si aplica
- [ ] Dominio y SSL activos
- [ ] Compra real de prueba realizada y reembolsada
- [ ] Formulario de contacto enviado y recibido
- [ ] Emails transaccionales revisados en inbox y spam

---

## Pruebas manuales antes de desplegar

> La IA debe dejar un archivo/checklist con estas pruebas y marcar qué ya pudo verificar.

- [ ] Home, catálogo, detalle, carrito, checkout, contacto, seguimiento, legales y 404 cargan sin 404/500
- [ ] Navegación desktop y mobile completa
- [ ] Filtros/categorías de catálogo funcionan
- [ ] Variantes cambian precio/stock correctamente
- [ ] Agregar, modificar cantidad y eliminar del carrito funciona
- [ ] Checkout calcula subtotal, envío, descuento y total server-side
- [ ] Compra de prueba con MercadoPago aprobada
- [ ] Pedido queda en Supabase con estado correcto
- [ ] Webhook actualiza estado y registra `payment_events`
- [ ] Email de compra llega al comprador
- [ ] Formulario de contacto guarda lead y envía emails
- [ ] No hay errores JS en consola durante los flujos principales

---

## Issues detectados durante el desarrollo

> La IA completa esta sección con cualquier problema encontrado y su solución aplicada.

| # | Issue | Módulo | Solución aplicada |
|---|---|---|---|
| 1 | [descripción] | [módulo] | [solución] |

---

## Resumen

- 🔴 Críticos completados por IA: X / Y
- 🔴 Críticos pendientes de validación manual: Y
- 🟡 Opcionales completados: X / Y

**Estado**: Listo para validación manual → deploy
```

---

## Cómo completar la columna "IA ✅"

Al generar el reporte, la IA debe:

1. Leer `.sitiohoy/qa/static-report.json` si existe.
2. Revisar el código generado y marcar `✅` en los ítems que puede verificar estáticamente.
3. Marcar `⚠️` en ítems que no pudo verificar (credenciales de terceros, pruebas de pago, inbox, dashboards).
4. Dejar en blanco los ítems que requieren interacción manual del humano.
5. Completar la sección "Issues detectados" con problemas reales encontrados.
6. No marcar como `✅` pagos, webhooks, emails o dominio si no fueron probados realmente.

## Gates automáticos mínimos

| Gate | Comando | Bloquea entrega |
|---|---|---|
| Build TypeScript | `npm run build` | Sí |
| Reglas SitioHoy | `npm run sitiohoy:validate` | Sí |
| Auditoría visual | `SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit` | Sí en módulos visuales y antes de deploy |
| E2E usuario real | `SITE_URL=http://localhost:3000 npm run sitiohoy:e2e` | Sí antes de deploy |
| QA completo | `npm run sitiohoy:qa` | Sí antes de deploy |
| Reporte | `npm run sitiohoy:qa-report` | Sí antes de deploy |
| Lighthouse | `npm run lighthouse` si existe | Sí antes de deploy |

## Leyenda de prioridades

- 🔴 **Crítico** — No deployar sin este ítem resuelto
- 🟡 **Importante** — Resolver antes de mostrar al cliente, pero no bloquea el deploy
