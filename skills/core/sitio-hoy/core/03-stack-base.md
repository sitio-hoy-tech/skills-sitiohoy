---
skill: stack-base
descripcion: Stack tecnológico compartido por todos los planes — Next.js + Supabase + reglas base
tipo: core — cargar siempre
---

# Stack Base — Todos los Planes

## Stack fijo

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 15+ App Router | No usar Pages Router |
| Lenguaje | TypeScript strict | Sin `any`, sin `as unknown` |
| Estilos | CSS Modules + CSS custom properties | Design tokens en `styles/tokens.css` |
| Utilidades CSS | TailwindCSS | Solo utilitarios, nunca inline styles |
| Base de datos | Supabase (PostgreSQL) | Multitenant con RLS |
| Auth | Supabase Auth | Solo para el admin (futuro) |
| Despliegue | Vercel | Región SAO1 (São Paulo) — más cercana a AR |
| Imágenes | `next/image` + Supabase Storage | Nunca `<img>` nativo |

## Instalación base (todos los planes)

```bash
npx create-next-app@latest ./ --typescript --app --tailwind --src-dir=false --import-alias="@/*"

npm install @supabase/ssr @supabase/supabase-js lucide-react
```

## Variables de entorno base (`.env.local`)

```env
# Supabase — únicos valores en .env (resto viene de tabla tenants)
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # NUNCA con NEXT_PUBLIC_

# Sitio
NEXT_PUBLIC_URL=https://tusitio.com
NEXT_PUBLIC_SITE_NAME=Nombre del sitio
NEXT_PUBLIC_TENANT_ID=uuid-del-tenant

# Seguridad
REVALIDATION_SECRET=string-aleatorio-largo
```

> **Regla**: Las credenciales de integraciones (MercadoPago, Resend, Envia, Umami) se leen en runtime desde la tabla `tenants`, NO desde `.env`. Solo las variables de Supabase van en `.env`.

## Clientes Supabase

```typescript
// lib/supabase/server.ts
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server Components / Server Actions — pasa por RLS (JWT del usuario)
export const createServerClient = async () => {
  const cookieStore = await cookies()
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
}

// Operaciones privilegiadas (webhooks, queries públicas) — bypassa RLS
export const createServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```

> `getTenantConfig()` con `unstable_cache` y tags ISR: ver `core/12-env-vars.md`.

## `next.config.ts` base

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
}

export default nextConfig
```

## Dependencias adicionales por plan

```bash
# Emprendimiento y Empresa — pagos
npm install mercadopago @mercadopago/sdk-react react-hook-form zod @hookform/resolvers zustand

# Empresa — emails
npm install resend
```
