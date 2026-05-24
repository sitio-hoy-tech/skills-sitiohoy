---
skill: modulos-emprendimiento
descripcion: Módulos 0-6 del Plan Emprendimiento — tienda con MercadoPago y envíos fijos
tipo: plan-emprendimiento
---

# Módulos — Plan Emprendimiento

**Base compartida:** leer `plans/modulos-shared.md` para pasos y verificaciones comunes a todos los planes. Este archivo solo documenta diferencias del Plan Emprendimiento.

Ejecutar secuencialmente. No avanzar al siguiente módulo sin cumplir el **gate universal de cierre** (ver `modulos-shared.md`). Para módulos de pagos/envíos, agregar QA manual documentado.

---

## Módulo 0 — Scaffold, Base Técnica e Identidad Visual

**Objetivo**: proyecto inicializado con checkout habilitado, schema completo y design system único.

Pasos:
1. Usar `sitio-hoy-scaffold`.
2. Crear `sitiohoy.config.json` con:
   - `plan: "emprendimiento"`
   - `integrations.mercadopago: true`
   - `integrations.fixedShipping: true`
   - `integrations.whatsapp: true`
   - `integrations.resend` según onboarding
   - `integrations.umami: true`
3. Instalar dependencias:
   ```bash
   npm install @supabase/ssr @supabase/supabase-js lucide-react zod
   npm install mercadopago @mercadopago/sdk-react react-hook-form @hookform/resolvers zustand
   ```
4. Si Resend está activado:
   ```bash
   npm install resend
   ```
5. Usar `sitio-hoy-database` para generar y aplicar schema completo.
6. Crear zonas iniciales en `shipping_zones`: CABA, GBA, Interior.
7. Leer `.sitiohoy/design/DESIGN.md` como dirección creativa.
8. El modelo AI genera design tokens y componentes directamente en código.
9. Crear/ajustar `styles/tokens.css` con tokens generados por el modelo AI.
10. Configurar `.env.local` desde `.env.example`.

Verificación ✅:
- [ ] `sitiohoy.config.json` creado con integraciones correctas
- [ ] `.sitiohoy/design/DESIGN.md` generado como dirección creativa
- [ ] Design tokens generados por el modelo AI
- [ ] Dependencias de checkout instaladas
- [ ] Schema completo aplicado, incluyendo `orders`, `order_items`, `coupons`, `shipping_zones`, `payment_events`
- [ ] RLS completo
- [ ] Zonas iniciales creadas o seed SQL preparado
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 1 — Layout Global

Igual que Plan Esencial Módulo 1, más:
- badge de carrito en el header;
- sidebar/drawer del carrito accesible desde header;
- estado vacío del carrito;
- soporte WhatsApp secundario visible.

Verificación ✅:
- [ ] Header con badge de carrito
- [ ] Drawer accesible con teclado
- [ ] Estado vacío claro
- [ ] Footer completo con crédito "Desarrollado por SitioHoy" (logo + link a sitiohoy.com.ar) en la barra inferior
- [ ] Responsive 375/768/1280 sin problemas
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 2 — Home

Igual que Plan Esencial Módulo 2, pero:
- CTA principal: "Comprar" o "Ver catálogo";
- WhatsApp queda como canal de soporte;
- destacar confianza de pago y envío.

Verificación ✅:
- [ ] CTA principal orientado a compra
- [ ] Productos destacados linkean a detalle o carrito
- [ ] Metadata y Schema.org completos
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 3 — Catálogo y Detalle de Producto

Igual que Plan Esencial Módulo 3, más:
- botón "Agregar al carrito" (solo si el producto NO tiene variantes);
- productos CON variantes: mostrar "Ver opciones" (Link al detalle) en vez de `AddToCartButton`;
- selector de variantes en el detalle que actualiza precio/stock;
- selector de cantidad que descuenta lo que ya está en el carrito (`maxAddable = stock - cartQuantity`);
- `compare_at_price` se evalúa siempre, incluso con variante seleccionada;
- indicador "Últimas X unidades" si stock < 5;
- validación de stock server-side antes de checkout.

Verificación ✅:
- [ ] Filtros por categoría visibles y funcionales
- [ ] Paginación server-side implementada
- [ ] Submenú de categorías en header
- [ ] Productos con variantes muestran "Ver opciones" en el grid
- [ ] Agregar, editar cantidad y eliminar funciona
- [ ] Cantidad máxima descuenta unidades ya en el carrito
- [ ] Variantes actualizan precio/stock sin recarga
- [ ] Descuento se muestra correctamente incluso con variante seleccionada
- [ ] Stock crítico visible
- [ ] Schema.org producto válido
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 4 — Carrito y Checkout

**Objetivo**: flujo de compra completo con MercadoPago y envíos por zona fija.

Leer: `integraciones/mercadopago.md`, `integraciones/envios-fijos.md`, `integraciones/resend.md` si aplica.

Pasos:
1. Store de carrito con Zustand + persistencia en `localStorage`.
2. `<CartSidebar>` con resumen, cantidades editables y cupón.
3. Checkout multi-step:
   - datos del comprador con `react-hook-form` + `zod`;
   - zona de envío desde `shipping_zones`;
   - pago con MercadoPago Bricks;
   - confirmación.
4. Recalcular subtotal, envío, descuentos y total en server.
5. Llamar `refreshCartPrices` en `useEffect` al montar `CheckoutForm` para verificar precios vigentes contra la BD antes de que el usuario pueda pagar.
6. Crear pedido e items con `tenant_id`.
7. Crear preferencia MercadoPago con idempotency key estable por pedido/intento.
   - En localhost: omitir `back_urls`, `auto_return` y `notification_url` (MP los rechaza).
8. Usar **Payment Brick** (formulario embebido), NO Wallet Brick (redirect externo).
9. Webhook `/api/webhooks/mercadopago`:
   - **verificar firma OBLIGATORIO** — `MP_WEBHOOK_SECRET` debe existir. Sin él, el webhook rechaza todos los requests;
   - usar `getTenantConfigFresh()` (sin cache) — nunca `getTenantConfig()`;
   - soportar formato legacy (`type: 'payment'`) y v2 (`action: 'payment.created'`);
   - guardar payload en `payment_events`;
   - actualizar `orders` filtrando por `id` y `tenant_id`.
10. Página `/seguimiento` con Server Action/RPC por `tracking_token`, no RLS anon basada en JWT.
11. Si Resend está activo: email de confirmación con template HTML inline de `lib/email/templates.ts`.

Verificación ✅:
- [ ] Carrito persiste al recargar
- [ ] Precios del carrito se refrescan al abrir el drawer y al montar el checkout
- [ ] Zonas de envío muestran precios correctos
- [ ] Totales se recalculan server-side
- [ ] Payment Brick (NO Wallet Brick) renderiza
- [ ] En localhost: preferencia se crea sin error (back_urls omitidos)
- [ ] Pago con tarjeta de prueba documentado
- [ ] Webhook usa `getTenantConfigFresh()` y soporta formato dual (legacy + v2)
- [ ] Webhook actualiza estado y registra `payment_events`
- [ ] Email llega si Resend está activo (con template HTML inline)
- [ ] Cupón aplica con reglas server-side
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 5 — Páginas Opcionales

Igual que Plan Esencial Módulo 4. Solo las páginas pedidas en el brief.

Verificación ✅:
- [ ] Páginas pedidas implementadas
- [ ] Formulario no pierde mensajes si no hay Resend
- [ ] Páginas incluidas en sitemap
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 6 — SEO Técnico, Umami y Deploy

Pasos:
1. `app/sitemap.ts` dinámico.
2. `app/robots.ts`.
3. Instalar Umami básico usando:
   - `tenants.umami_url` para script;
   - `tenants.umami_website_id` o `NEXT_PUBLIC_UMAMI_WEBSITE_ID` para website id.
4. Ejecutar `sitio-hoy-qa`.
5. Deploy en Vercel.
6. Configurar dominio con SSL.
7. Cambiar MercadoPago de TEST a PRODUCCIÓN.
8. Verificar webhook MP en producción.
9. Compra de prueba real.
10. Generar reporte QA.

Verificación ✅:
- [ ] `/sitemap.xml` sin errores
- [ ] `/robots.txt` correcto
- [ ] Umami registra visitas
- [ ] LCP < 2.5s y CLS < 0.1
- [ ] `npm run sitiohoy:qa` ejecutado o justificado
- [ ] `npm run sitiohoy:qa-report` generó reporte
- [ ] Deploy exitoso
- [ ] Compra real aprobada con MP producción

Gate final:
```bash
npm run sitiohoy:qa
npm run sitiohoy:qa-report
```
