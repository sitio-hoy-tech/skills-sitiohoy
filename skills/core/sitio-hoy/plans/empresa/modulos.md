---
skill: modulos-empresa
descripcion: Módulos 0-7 del Plan Empresa — tienda completa con Envia.com y analítica avanzada
tipo: plan-empresa
---

# Módulos — Plan Empresa

**Base compartida:** leer `plans/modulos-shared.md` para pasos y verificaciones comunes a todos los planes. Este archivo solo documenta diferencias del Plan Empresa.

Ejecutar secuencialmente. No avanzar al siguiente módulo sin cumplir el **gate universal de cierre** (ver `modulos-shared.md`). Para módulos de pagos/envíos/eventos, agregar QA manual documentado.

---

## Módulo 0 — Scaffold, Base Técnica e Identidad Visual

**Objetivo**: proyecto inicializado para tienda completa con schema completo, Envia.com opcional y analítica avanzada.

Pasos:
1. Usar `sitio-hoy-scaffold`.
2. Crear `sitiohoy.config.json` con:
   - `plan: "empresa"`
   - `integrations.mercadopago: true`
   - `integrations.envia` según onboarding
   - `integrations.resend` según onboarding
   - `integrations.umami: true`
   - `integrations.whatsapp: true`
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
6. Confirmar columnas `origin_*`, `envia_access_token`, `umami_url` y `umami_website_id` en `tenants`.
7. Leer `.sitiohoy/design/DESIGN.md` como dirección creativa.
8. El modelo AI genera design tokens y componentes directamente en código.
9. Crear/ajustar `styles/tokens.css` con tokens generados por el modelo AI.
10. Configurar `.env.local` desde `.env.example`.

Verificación ✅:
- [ ] `sitiohoy.config.json` creado con plan Empresa
- [ ] `.sitiohoy/design/DESIGN.md` generado como dirección creativa
- [ ] Design tokens generados por el modelo AI
- [ ] Schema completo aplicado, incluyendo eventos, mensajes y shipping fallback
- [ ] RLS completo
- [ ] Datos de origen para Envia.com definidos o marcados como pendientes
- [ ] Umami script URL y website id definidos o marcados como pendientes
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 1 — Layout Global

Igual que Plan Emprendimiento Módulo 1, cuidando:
- navegación escalable;
- carrito accesible;
- señales de confianza;
- soporte WhatsApp secundario.

Verificación ✅:
- [ ] Header, carrito y footer completos con crédito "Desarrollado por SitioHoy" (logo + link a sitiohoy.com.ar) en la barra inferior
- [ ] Navegación accesible
- [ ] Responsive 375/768/1280/1920 sin problemas
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 2 — Home

Igual que Plan Emprendimiento Módulo 2, más:
- testimonios con Schema.org `Review` si el cliente tiene reviews;
- señales E-E-A-T: historia, equipo, certificaciones o experiencia;
- bloques de confianza para compra/envío.

Verificación ✅:
- [ ] Testimonios reales o no se muestra la sección
- [ ] CTA orientado a compra
- [ ] Schema.org válido
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 3 — Catálogo y Detalle de Producto

Igual que Plan Emprendimiento Módulo 3, más:
- Schema.org `Review` si hay reviews;
- FAQ de producto con Schema.org `FAQPage`;
- productos relacionados por categoría;
- soporte para catálogos grandes.

Verificación ✅:
- [ ] Filtros por categoría visibles y funcionales
- [ ] Paginación server-side implementada (crítico para catálogos grandes)
- [ ] Submenú de categorías en header
- [ ] NO usa `generateStaticParams()` (catálogo ilimitado → ISR on-demand)
- [ ] Catálogo performante con muchos productos
- [ ] Variantes, stock y carrito funcionan
- [ ] Productos relacionados no incluyen el actual
- [ ] FAQ y Review solo aparecen con datos reales
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 4 — Carrito y Checkout

**Objetivo**: flujo completo con MercadoPago + Envia.com + emails transaccionales.

Leer: `integraciones/mercadopago.md`, `integraciones/envia.md` si aplica, `integraciones/resend.md` si aplica.

Pasos:
1. Store de carrito con Zustand + persistencia en `localStorage`.
2. `<CartSidebar>` con resumen, cantidades editables y cupón.
3. Checkout multi-step:
   - datos del comprador con `react-hook-form` + `zod`;
   - campos de dirección obligatorios cuando `deliveryType === 'delivery'` (usar `superRefine`);
   - guardar `FormData` del paso 1 en estado para usarlo en el paso 2 al confirmar la orden;
   - el botón "Ir al pago" del paso de envío debe llamar a `confirmOrder(savedFormData)`, NO solo `setStep('pago')`;
   - cotización Envia.com en tiempo real;
   - fallback "Coordinar envío" si Envia.com no está configurado;
   - pago MercadoPago — el componente `PaymentBrick` debe llamar `initMercadoPago` en `useEffect` y renderizar `<Payment>` directamente sin guard de estado `ready`; agregar el guard causa que el brick quede en skeleton infinito;
   - confirmación.
4. Recalcular subtotal, envío, descuentos y total en server.
5. Crear pedido e items con `tenant_id`.
6. Crear preferencia MP con idempotency key estable.
7. Webhook MP:
   - **verificar firma OBLIGATORIO** — `MP_WEBHOOK_SECRET` debe existir. Sin él, el webhook rechaza todos los requests;
   - registrar `payment_events`;
   - actualizar `orders` filtrando por `id` y `tenant_id`.
8. Webhook Envia.com si aplica:
   - registrar evento;
   - actualizar tracking sin exponer credenciales.
9. Página `/seguimiento` con Server Action/RPC por `tracking_token`.
10. Emails Resend al aprobar pago y al cambiar estado.

Verificación ✅:
- [ ] Carrito persiste al recargar
- [ ] Campos de dirección obligatorios cuando deliveryType === 'delivery'
- [ ] FormData del paso 1 guardada en estado y pasada a confirmOrder en paso 2
- [ ] Envia.com cotiza o fallback funciona
- [ ] Envío se suma correctamente al total
- [ ] Totales se recalculan server-side
- [ ] Payment Brick acepta tarjeta de prueba
- [ ] Webhook registra `payment_events`
- [ ] Email de confirmación llega si aplica
- [ ] Cupón aplica correctamente
- [ ] `npm run build` sin errores
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 5 — Páginas Opcionales

Igual que Plan Esencial Módulo 4, más:
- Schema.org `FAQPage` en FAQ;
- sección "Sobre nosotros" con E-E-A-T;
- textos legales acordes a e-commerce con pagos y envíos.

Verificación ✅:
- [ ] Páginas pedidas implementadas
- [ ] Datos de empresa y políticas claros
- [ ] Formulario no pierde mensajes
- [ ] `npm run sitiohoy:validate` sin errores

---

## Módulo 6 — SEO Técnico y Performance

Pasos:
1. `app/sitemap.ts` con productos y páginas.
2. `app/robots.ts`.
3. Auditar `generateMetadata()`.
4. Schema.org completo: Product, Organization, WebSite, SearchAction, BreadcrumbList, FAQPage, Review si aplica.
5. Lighthouse en Home, catálogo y producto.
6. Ejecutar `sitio-hoy-qa`.

Verificación ✅:
- [ ] Metadata completa
- [ ] Schema.org sin errores críticos
- [ ] LCP < 2.5s y CLS < 0.1
- [ ] `npm run sitiohoy:qa` ejecutado o justificado

---

## Módulo 7 — Umami Avanzado y Deploy

Leer: `integraciones/umami-avanzado.md`.

Pasos:
1. Script Umami en `app/layout.tsx`.
2. Usar `tenants.umami_url` para script y `tenants.umami_website_id` o `NEXT_PUBLIC_UMAMI_WEBSITE_ID` para website id.
3. Eventos e-commerce:
   - `product_viewed`
   - `add_to_cart`
   - `checkout_started`
   - `coupon_applied`
   - `purchase`
4. Deploy en Vercel.
5. Configurar dominio con SSL.
6. Credenciales MP en PRODUCCIÓN.
7. Verificar webhooks MP y Envia.com.
8. Compra de prueba real.
9. Verificar evento `purchase` en Umami.
10. Generar reporte QA.

Verificación ✅:
- [ ] Umami registra pageviews
- [ ] Umami registra `purchase`
- [ ] Deploy exitoso
- [ ] Compra real aprobada
- [ ] `npm run sitiohoy:qa-report` generó reporte
- [ ] Cliente con acceso a Vercel y Umami Dashboard

Gate final:
```bash
npm run sitiohoy:qa
npm run sitiohoy:qa-report
```
