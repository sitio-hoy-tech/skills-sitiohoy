---
skill: arquitectura-base
descripcion: Estructura de carpetas del proyecto — sin rutas admin (admin es repo separado)
tipo: core — referencia para ubicar y crear archivos
---

# Arquitectura del Proyecto

```
/
├── app/
│   ├── (public)/                    # Rutas públicas del sitio
│   │   ├── page.tsx                 # Home — Hero + secciones de conversión
│   │   ├── catalogo/
│   │   │   ├── page.tsx             # Listado con filtros y búsqueda
│   │   │   └── [slug]/
│   │   │       └── page.tsx         # Detalle de producto (SEO individual)
│   │   ├── checkout/                # Solo en Emprendimiento y Empresa
│   │   │   ├── page.tsx             # Checkout multi-step
│   │   │   ├── success/page.tsx     # Confirmación de compra
│   │   │   └── error/page.tsx       # Error en el pago
│   │   ├── seguimiento/             # Solo en Emprendimiento y Empresa
│   │   │   └── page.tsx             # Tracking de pedido por tracking_token
│   │   └── [...cms]/                # Páginas opcionales (Sobre nosotros, FAQ, etc.)
│   │       └── page.tsx
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── mercadopago/route.ts  # Solo Emprendimiento y Empresa
│   │   │   └── envia/route.ts        # Solo Empresa
│   │   └── revalidate/route.ts       # Revalidación ISR externa
│   ├── layout.tsx                    # Root layout con metadata global y fonts
│   ├── sitemap.ts                    # Sitemap dinámico
│   ├── robots.ts                     # Robots.txt con permisos IA
│   ├── not-found.tsx                 # 404 global
│   └── error.tsx                     # Error boundary global
│
├── components/
│   ├── ui/                           # Primitivos: Button, Input, Badge, Modal, etc.
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   ├── catalog/
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductFilters.tsx
│   │   ├── ProductGallery.tsx
│   │   └── AddToCartButton.tsx       # Solo Emprendimiento y Empresa
│   ├── checkout/                     # Solo Emprendimiento y Empresa
│   │   ├── CartSidebar.tsx
│   │   ├── CheckoutSteps.tsx
│   │   └── PaymentBrick.tsx
│   └── seo/
│       ├── SchemaOrg.tsx
│       └── SchemaProduct.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # createBrowserClient
│   │   ├── server.ts                 # createServerClient + createServiceClient
│   │   ├── tenant.ts                 # getTenantConfig()
│   │   └── provision.ts              # provisionTenant() — ejecutar 1 vez
│   ├── data/
│   │   ├── products.ts               # getAllProducts, getProductBySlug, etc.
│   │   ├── categories.ts
│   │   └── site-config.ts
│   ├── mercadopago/                  # Solo Emprendimiento y Empresa
│   │   └── client.ts
│   ├── envia/                        # Solo Empresa
│   │   ├── client.ts
│   │   └── provinces.ts
│   ├── resend/                       # Solo si se activó en onboarding
│   │   ├── client.ts
│   │   └── emails/
│   │       ├── order-confirmation.tsx
│   │       └── order-status.tsx
│   ├── analytics/
│   │   └── umami.ts                  # Solo Emprendimiento y Empresa
│   ├── cache-tags.ts
│   └── utils.ts                      # slugify, formatPrice, etc.
│
├── styles/
│   ├── tokens.css                    # Design tokens — generados en Módulo 0
│   ├── globals.css
│   └── animations.css
│
├── types/
│   ├── database.ts                   # Tipos de Supabase
│   └── umami.d.ts
│
├── public/
│   └── [assets estáticos]
│
├── _assets-cliente/                  # Imágenes del cliente (no se versiona)
│   ├── logo/
│   ├── hero/
│   ├── productos/
│   └── marca/
│
├── supabase/
│   └── migrations/                   # SQL si no hay MCP de Supabase
│       └── 001_initial_schema.sql
│
├── middleware.ts                     # Protección de rutas (si aplica)
├── next.config.ts
├── tsconfig.json
├── .env.local
└── DESIGN.md                         # Rationale del design system
```

## Notas de arquitectura

- Las rutas de checkout y seguimiento **solo existen** en Emprendimiento y Empresa
- No existe carpeta `(admin)` — el admin es un repositorio separado
- `_assets-cliente/` se agrega a `.gitignore` (imágenes del cliente no van al repo)
- `supabase/migrations/` solo si el MCP de Supabase no está disponible
- `DESIGN.md` documenta las decisiones de diseño para el cliente y futuros cambios
