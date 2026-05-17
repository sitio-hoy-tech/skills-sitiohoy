---
skill: deploy-vercel
descripcion: Deploy completo en Vercel — configuración, env vars, dominio, región SAO1 y go-live checklist
tipo: core — ejecutar en el último módulo de cada plan antes de entregar al cliente
---

# Deploy en Vercel

---

## Paso 0 — Automatización de launch

Antes de crear el proyecto en Vercel, usar `sitio-hoy-launch-automation` para generar:

- `.sitiohoy/launch/launch-plan.md`
- `.sitiohoy/launch/commands.sh`
- `.sitiohoy/launch/vercel-env.example`
- `.sitiohoy/launch/provision-supabase.mjs`
- `.sitiohoy/launch/seed-demo-data.sql`

Este paso prepara GitHub, Supabase, tenant/admin, productos demo y variables de Vercel.
No reemplaza la revisión final; ordena la ejecución y evita olvidos.
Todo lo que se suba a Supabase debe aplicarse con Supabase CLI (`supabase link`,
`supabase db push`, `supabase gen types`, `supabase storage` si corresponde).

---

## Paso 1 — Crear proyecto en Vercel

```bash
# Opción A: desde CLI (recomendado)
npx vercel

# Opción B: desde vercel.com → "Add New Project" → importar desde GitHub/GitLab
```

Al conectar el repositorio, Vercel detecta Next.js automáticamente.

**Configuración del proyecto:**
- Framework Preset: `Next.js` (auto-detectado)
- Root Directory: `/` (salvo monorepo)
- Build Command: `next build` (default)
- Output Directory: `.next` (default)
- Node.js Version: `20.x` ← seleccionar explícitamente
- Importar desde el repo GitHub creado por `sitio-hoy-launch-automation`

---

## Paso 2 — Región de deploy

> Seleccionar región **SAO1 (São Paulo)** para mínima latencia en Argentina.

Desde el dashboard del proyecto → Settings → Functions → Function Region → `sao1`

Si no aparece SAO1 en el plan free, elegir `iad1` (Virginia) como fallback — la diferencia
es ~80ms vs ~200ms desde Buenos Aires.

---

## Paso 3 — Variables de entorno en Vercel

Settings → Environment Variables → agregar todas las variables de `core/12-env-vars.md`.

**Reglas críticas:**
- Todas las variables sin `NEXT_PUBLIC_` son **secretas** — Vercel las protege automáticamente
- `NEXT_PUBLIC_*` son visibles en el browser — nunca poner tokens privados con ese prefijo
- Configurar para los 3 entornos: **Production**, **Preview**, **Development**

Variables mínimas a cargar (según plan):

```
NEXT_PUBLIC_SUPABASE_URL          → Production + Preview + Development
NEXT_PUBLIC_SUPABASE_ANON_KEY     → Production + Preview + Development
SUPABASE_SERVICE_ROLE_KEY         → Production + Preview + Development
NEXT_PUBLIC_TENANT_ID             → Production + Preview + Development
NEXT_PUBLIC_SITE_NAME             → Production
NEXT_PUBLIC_URL                   → Production (URL del dominio final)
MP_WEBHOOK_SECRET                 → Production (Emprendimiento y Empresa)
NEXT_PUBLIC_UMAMI_WEBSITE_ID      → Production
ENVIA_API_URL                     → Production = https://api.envia.com
                                    Preview/Dev = https://api-test.envia.com
```

---

## Paso 4 — Dominio custom

Settings → Domains → Add → ingresar `www.dominio.com.ar`

Vercel genera los registros DNS. Configurar en el panel del registrador:

```
Tipo    Nombre    Valor
─────────────────────────────────────────
CNAME   www       cname.vercel-dns.com
A       @         76.76.21.21
```

> El dominio `.com.ar` puede tardar hasta 48hs en propagar. El SSL se activa automáticamente.

**Redirect automático:**
Agregar también el dominio sin `www` (`dominio.com.ar`) y configurarlo como redirect a `www`.

---

## Paso 5 — Cambiar MercadoPago a producción

⚠️ Este paso es el más crítico. Hacerlo ANTES de la compra de prueba final.

1. En el dashboard de MercadoPago del cliente:
   - Activar cuenta para producción (requiere validación de identidad si no está hecha)
   - Obtener **Access Token de producción** (distinto al de prueba)
   - Obtener **Public Key de producción**

2. Actualizar en tabla `tenants` (no en .env):
   ```sql
   UPDATE tenants
   SET
     mp_access_token = 'APP_USR-...',   -- token de producción
     mp_public_key = 'APP_USR-...'      -- public key de producción
   WHERE id = 'UUID_DEL_TENANT';
   ```

3. Configurar webhook en MercadoPago → Tus integraciones → Webhooks:
   - URL: `https://www.dominio.com.ar/api/webhooks/mercadopago`
   - Eventos: `payment`
   - Copiar el `secret` y actualizar `MP_WEBHOOK_SECRET` en Vercel

4. Cambiar `ENVIA_API_URL` en Vercel a `https://api.envia.com` (sin `-test`) si aplica.

---

## Paso 6 — Compra de prueba real

Hacer una compra real con tarjeta de débito o crédito (monto mínimo):
- [ ] PaymentBrick renderiza en producción
- [ ] El pago se aprueba en MP
- [ ] El webhook llega y actualiza el estado del pedido en Supabase
- [ ] El email de confirmación llega (si Resend activado)
- [ ] El pedido aparece en la tabla `orders` con `payment_status = 'approved'`
- [ ] Reembolsar el pago desde el dashboard de MercadoPago

---

## Paso 7 — `next.config.ts` para producción

Verificar que esté configurado antes del deploy:

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',   // imágenes de Supabase Storage
      },
    ],
  },
  // Seguridad: headers HTTP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

## Paso 8 — Verificar build sin errores

```bash
npm run build
npm run sitiohoy:secret-scan
npm run sitiohoy:test-supabase
npm run sitiohoy:test-mercadopago
npm run sitiohoy:test-envia
npm run sitiohoy:test-correo-argentino
npm run sitiohoy:test-resend
SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit
SITE_URL=http://localhost:3000 npm run sitiohoy:e2e
npm run sitiohoy:audit
```

Para la auditoría visual, levantar el servidor local o production build, correr el comando y apagar el servidor al terminar.
El build, secret scan, smoke tests activos, auditoría visual, E2E y auditoría final deben completarse sin errores críticos.
Si hay errores de tipos → corregir antes de deployar.

Antes de deployar, limpiar el proyecto sin romper comportamiento:

- eliminar `console.log`/debug temporales y dejar solo `console.error` útil para errores operativos;
- correr `npm run sitiohoy:secret-scan`;
- verificar que ninguna credencial esté en archivos commiteables, screenshots, README o tracking;
- revisar Client Components para no exponer service role, tokens privados ni payloads sensibles;
- confirmar que logs de webhooks no impriman datos de tarjeta, access tokens ni secrets.

---

## Checklist de go-live ✅

**Infraestructura**
- [ ] `.sitiohoy/launch/launch-plan.md` generado y revisado
- [ ] Repo GitHub creado en la organización correcta
- [ ] Migraciones Supabase aplicadas con Supabase CLI
- [ ] Fila `tenants` creada/actualizada
- [ ] Usuario admin `admin{slug-del-negocio}@sitiohoy.com.ar` creado con contraseña segura y asociado en `user_tenants`
- [ ] Productos demo o reales cargados para validar diseño, con peso/dimensiones si hay envíos
- [ ] Si faltaron fotos del cliente, productos cargados con imágenes Unsplash relacionadas y registrado en tracking
- [ ] Proyecto creado en Vercel con región SAO1
- [ ] Todas las env vars cargadas en Vercel (Production)
- [ ] `NEXT_PUBLIC_URL` apunta al dominio final con `https://`
- [ ] Dominio configurado con SSL activo (candado verde en browser)
- [ ] Redirect `dominio.com.ar` → `www.dominio.com.ar` funcionando

**MercadoPago**
- [ ] Tokens de producción actualizados en tabla `tenants`
- [ ] Webhook configurado en MP con la URL de producción
- [ ] `MP_WEBHOOK_SECRET` actualizado en Vercel
- [ ] `ENVIA_API_URL` sin `-test` (solo Plan Empresa)
- [ ] Smoke test MercadoPago ejecutado si está activo
- [ ] Smoke test Envia/Correo Argentino ejecutado según proveedor activo
- [ ] Smoke test Resend ejecutado si está activo

**Funcionalidad**
- [ ] Home carga en < 3s en mobile (red 4G)
- [ ] Catálogo muestra productos reales del cliente
- [ ] Compra de prueba real completada y reembolsada
- [ ] Email de confirmación recibido (si Resend)
- [ ] Página de seguimiento funciona con el `tracking_token` del pedido de prueba

**SEO**
- [ ] `/sitemap.xml` accesible y sin errores
- [ ] `/robots.txt` sin errores
- [ ] Google Search Console: sitio verificado y sitemap enviado
- [ ] OG image visible al compartir en WhatsApp/redes

**Entrega al cliente**
- [ ] Credenciales de Supabase entregadas de forma segura
- [ ] Acceso al dashboard de Vercel transferido al cliente (o documentado)
- [ ] Instrucciones de uso del panel admin enviadas
- [ ] Reporte QA generado (`QA-[negocio]-[fecha].md`)
- [ ] Auditoría visual responsive OK con screenshots 375/390/768/1280/1920 revisados
- [ ] E2E usuario real OK con screenshots 375/768/1280/1920 revisados
- [ ] Archivo/checklist de pendientes PROD y pruebas manuales completado
- [ ] Auditoría generada (`AUDIT-SitioHoy-[negocio]-[fecha].md`)
