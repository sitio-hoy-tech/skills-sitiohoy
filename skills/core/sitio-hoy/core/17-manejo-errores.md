---
skill: manejo-errores
descripcion: Templates de error.tsx, not-found.tsx y loading.tsx — un juego por segmento de ruta importante
tipo: core — implementar en Módulo 1 (layout) y completar en cada módulo que agregue rutas
---

# Manejo de Errores y Estados de Carga

> Regla: cada segmento de ruta con datos tiene su propio `error.tsx`, `not-found.tsx` y `loading.tsx`.
> No usar un único archivo global — los errores deben ser contextuales.

---

## `error.tsx` — Error inesperado

```tsx
// app/(public)/error.tsx  (y repetir en cada segmento importante)
'use client'
import { useEffect } from 'react'
import Link from 'next/link'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    // En producción: enviar a servicio de monitoreo (Sentry, etc.)
    console.error(error)
  }, [error])

  return (
    <main className="error-page">
      <div className="error-content">
        <h1>Algo salió mal</h1>
        <p>Hubo un error inesperado. Podés intentar de nuevo o volver al inicio.</p>
        <div className="error-actions">
          <button onClick={reset} className="btn-primary">
            Intentar de nuevo
          </button>
          <Link href="/" className="btn-secondary">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
```

### Por segmento de catálogo

```tsx
// app/(public)/catalogo/error.tsx
'use client'
import Link from 'next/link'

export default function CatalogoError({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Error al cargar el catálogo</h1>
      <p>No pudimos cargar los productos. Intentá de nuevo.</p>
      <div className="error-actions">
        <button onClick={reset} className="btn-primary">Reintentar</button>
        <Link href="/" className="btn-secondary">Ir al inicio</Link>
      </div>
    </main>
  )
}
```

---

## `not-found.tsx` — Recurso no encontrado

```tsx
// app/not-found.tsx — global (404 de toda la app)
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Página no encontrada',
}

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="not-found-content">
        <span className="not-found-code" aria-hidden="true">404</span>
        <h1>Página no encontrada</h1>
        <p>El contenido que buscás no existe o fue movido.</p>
        <Link href="/" className="btn-primary">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
```

### Para producto inexistente

```tsx
// app/(public)/catalogo/[slug]/not-found.tsx
import Link from 'next/link'

export default function ProductoNotFound() {
  return (
    <main className="not-found-page">
      <h1>Producto no encontrado</h1>
      <p>Este producto no existe o ya no está disponible.</p>
      <Link href="/catalogo" className="btn-primary">
        Ver catálogo
      </Link>
    </main>
  )
}
```

> En `app/(public)/catalogo/[slug]/page.tsx` llamar `notFound()` si el producto no existe:
> ```typescript
> import { notFound } from 'next/navigation'
> const product = await getProductBySlug(slug)
> if (!product) notFound()
> ```

---

## `loading.tsx` — Skeleton de carga

Solo en rutas con datos pesados. Usar shimmer CSS del design system.

```tsx
// app/(public)/catalogo/loading.tsx
export default function CatalogoLoading() {
  return (
    <main className="catalog-page">
      <div className="catalog-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="product-card-skeleton">
            <div className="skeleton skeleton-image" />
            <div className="skeleton skeleton-text" style={{ width: '70%' }} />
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          </div>
        ))}
      </div>
    </main>
  )
}
```

```tsx
// app/(public)/catalogo/[slug]/loading.tsx
export default function ProductoLoading() {
  return (
    <main className="product-page">
      <div className="product-layout">
        <div className="skeleton skeleton-product-image" />
        <div className="product-info">
          <div className="skeleton skeleton-text" style={{ width: '80%', height: '2rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '30%', height: '1.5rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '100%', height: '4rem' }} />
          <div className="skeleton skeleton-button" />
        </div>
      </div>
    </main>
  )
}
```

### CSS de skeleton (va en `styles/tokens.css` o archivo propio)

```css
/* Shimmer animation */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-alt) 25%,
    var(--color-surface)     50%,
    var(--color-surface-alt) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

.skeleton-image        { aspect-ratio: 1; width: 100%; }
.skeleton-product-image { aspect-ratio: 4/3; width: 100%; }
.skeleton-text         { height: 1rem; margin-block: 0.5rem; }
.skeleton-button       { height: 3rem; width: 100%; margin-top: 1rem; }

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; opacity: 0.6; }
}
```

---

## Dónde crear cada archivo

| Archivo | Ruta | Cuándo |
|---|---|---|
| `error.tsx` | `app/(public)/` | Módulo 1 |
| `not-found.tsx` | `app/` | Módulo 1 |
| `loading.tsx` | `app/(public)/catalogo/` | Módulo 3 |
| `error.tsx` | `app/(public)/catalogo/` | Módulo 3 |
| `not-found.tsx` | `app/(public)/catalogo/[slug]/` | Módulo 3 |
| `loading.tsx` | `app/(public)/catalogo/[slug]/` | Módulo 3 |
| `error.tsx` | `app/(public)/checkout/` | Módulo 4 (Emprendimiento+Empresa) |
| `not-found.tsx` | `app/(public)/seguimiento/` | Módulo 4 (Emprendimiento+Empresa) |

---

## Checklist ✅

- [ ] `app/not-found.tsx` global creado en Módulo 1
- [ ] `app/(public)/error.tsx` creado en Módulo 1
- [ ] `loading.tsx` en catálogo y detalle de producto (Módulo 3)
- [ ] `notFound()` llamado en `[slug]/page.tsx` si el producto no existe
- [ ] Skeleton shimmer funciona (verificar visualmente con throttling de red en DevTools)
- [ ] `prefers-reduced-motion` desactiva la animación
