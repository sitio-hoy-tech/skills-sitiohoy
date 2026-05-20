---
skill: design-system
descripcion: Sistema de diseño completo — generación, tokens, UX/UI, responsive, anti-slop, imágenes
tipo: core — cargar en Módulo 0 (generación) y Módulo 1 (implementación)
---

# Design System — Sistema Completo

> El diseño es la primera impresión del negocio. Cada sitio debe ser visualmente único.
> Ejecutar la generación del design system ANTES de escribir cualquier componente visual.

---

## 0. Protocolo de Calidad Visual

El diseño es un gate de entrega, no una mejora opcional. Antes de escribir componentes públicos:

1. Ejecutar `sitio-hoy-project-director` y leer `.sitiohoy/design/inspiration-board.md`.
2. Revisar referencias del cliente; si no hay, usar referencias curadas del board y sitios reales del rubro.
3. Definir tokens, tipografías, composición de hero, patrón de catálogo, animaciones y estados.
4. Implementar mobile-first desde 375px.
5. Correr `SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit`.
6. Revisar manualmente screenshots en `.sitiohoy/qa/visual/`.
7. No cerrar módulos visuales con overflow, texto cortado, imágenes rotas, hero genérico o nota visual menor a 8/10.

Si el cliente no envió imágenes, usar Unsplash relacionado al producto/rubro y documentar el criterio. No usar fotos genéricas oscuras, recortadas o de bancos de imagen sin relación clara con el emprendimiento.

Cada proyecto debe tener dirección visual propia: paleta, tipografías, composición, ritmo de imágenes y microinteracciones adaptadas al cliente. No repetir el mismo hero, las mismas fuentes ni la misma estructura de cards por comodidad. Si dos proyectos se parecen visualmente, volver a generar variante de diseño antes de implementar.

---

## 1. Generación del Design System

### Generación directa por el modelo AI

1. El briefing genera automáticamente `.sitiohoy/design/DESIGN.md` con todo el sistema de diseño
2. El modelo AI lee DESIGN.md como **dirección creativa** (no como spec rígida)
3. El modelo AI genera directamente design tokens y componentes en código
4. Volcar los tokens en `styles/tokens.css` (CSS custom properties)
5. El DESIGN.md ya contiene el rationale completo de cada decisión de diseño
6. Libertad creativa total: diseños únicos, modernos y hermosos
7. Las referencias de ckm-design sirven como guía complementaria

### Template de `styles/tokens.css`

```css
:root {
  /* Colores de marca */
  --color-primary: #____;
  --color-primary-hover: #____;
  --color-primary-hsl: ___ ___ ___;   /* Para usar con opacity: hsl(var(--color-primary-hsl) / 0.15) */
  --color-secondary: #____;
  --color-accent: #____;

  /* Neutros (9 pasos) */
  --neutral-50: #f9fafb;
  --neutral-100: #f3f4f6;
  --neutral-200: #e5e7eb;
  --neutral-300: #d1d5db;
  --neutral-400: #9ca3af;
  --neutral-500: #6b7280;
  --neutral-600: #4b5563;
  --neutral-700: #374151;
  --neutral-800: #1f2937;
  --neutral-900: #111827;

  /* Tipografía */
  --font-display: 'NombreFuente', sans-serif;
  --font-body: 'NombreFuente', sans-serif;

  /* Escala tipográfica */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */
  --text-6xl: 3.75rem;   /* 60px */

  /* Espaciado (escala 4px) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-24: 6rem;     /* 96px */

  /* Radios */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Transiciones */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: var(--neutral-900);
    --color-surface: var(--neutral-800);
    --color-text: var(--neutral-50);
    --color-text-muted: var(--neutral-400);
    --color-border: var(--neutral-700);
  }
}
```

---

## 2. Tipografías — Pares por Estilo de Negocio

Siempre usar `next/font/google`. Nunca `<link>` externo.
Elegir fuentes según rubro, personalidad, precio percibido y audiencia. No usar siempre la misma combinación.

| Estilo del negocio | Display | Body |
|---|---|---|
| Moda / Lujo | `DM Serif Display` | `DM Sans` |
| Artesanal / Orgánico | `Playfair Display` | `Lora` |
| Tech / Moderno | `Syne` | `Inter` |
| Juvenil / Urban | `Bricolage Grotesque` | `DM Sans` |
| Minimalista / Clean | `Cormorant Garamond` | `Geist` |
| Bold / Impactante | `Cabinet Grotesk` | `General Sans` |
| Gastronomía / Calidez | `Fraunces` | `Nunito` |
| Servicios / Corporativo | `Plus Jakarta Sans` | `Inter` |

Nunca usar `Roboto`, `Lato` o `Open Sans` por defecto — son señal de diseño genérico.

Si el brief pide una estética específica, sumar una segunda propuesta tipográfica moderna aunque no esté en la tabla. Documentar en `DESIGN.md` por qué esa fuente expresa mejor al cliente.

---

## 3. Estructuras de Hero (rotar por proyecto — nunca repetir)

| Opción | Descripción | Ideal para |
|---|---|---|
| A | Bento grid: imagen hero izquierda + grid de características derecha | Tech, servicios |
| B | Full-bleed imagen/video con texto overlay y CTA flotante | Moda, gastronomía |
| C | Hero editorial con imagen full-bleed, texto overlay y pista visible de la siguiente sección | Servicios, lujo |
| D | Tipografía XL en primer plano + imagen de fondo con blur/parallax | Cualquiera sin fotos |
| E | Carrusel de productos featured con animación de entrada | E-commerce masivo |
| F | Marquee horizontal de productos + texto central minimal + badge de confianza | Ropa, accesorios |
| G | Grid asimétrico de 6 imágenes (collage) + CTA lateral | Fotografía, gastronomía |
| H | Layout editorial — tipografía XL 2/3 pantalla + producto flotante derecha | Premium, diseño |

**Regla**: Elegir la opción según el brief. Si hay fotos profesionales → B, C, G. Si no hay fotos → D, H.

---

## 4. Layouts de Catálogo (rotar por proyecto)

- **Masonry grid** con alturas variables según imagen del producto
- **Grid asimétrico 3-col** con primer producto featured en tamaño doble
- **Lista horizontal** con imagen izquierda y detalles expandibles
- **Cards estilo revista** con tipografía grande y precio superpuesto en hover
- **Grid + filtros laterales**: sidebar fija (desktop) / drawer (mobile)
- **Infinite scroll con skeleton** sin paginación visible

---

## 5. Responsive — Breakpoints y Grids

```css
/* Mobile-first SIEMPRE */
/* Base: 375px — diseño base para celular */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */

/* Grid de catálogo */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);  /* mobile: 2 col */
  gap: var(--space-3);
}
@media (min-width: 768px) {
  .product-grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-5); }
}
@media (min-width: 1280px) {
  .product-grid { grid-template-columns: repeat(4, 1fr); gap: var(--space-6); }
}

/* Touch targets — mínimo 44px */
.btn, .nav-link, .product-card__action {
  min-height: 44px;
  min-width: 44px;
}
```

### Validación responsive obligatoria en cada módulo

Antes de marcar un módulo como ✅, verificar en estos viewports:
- **375px** (iPhone SE) — el más restrictivo
- **390px** (iPhone 14)
- **768px** (tablet)
- **1280px** (desktop)
- **1920px** (desktop grande)

Comando obligatorio con servidor local activo:

```bash
SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit
```

El reporte queda en `.sitiohoy/qa/visual-report.json` y los screenshots en `.sitiohoy/qa/visual/`. Si el script marca errores, el módulo no se cierra.

---

## 6. Navegación Responsive — Header, Menú Mobile y Categorías

### Menú mobile

En drawers fixed, usar `height: 100vh`; no `h-full`.
Para `CartDrawer` y drawers equivalentes, desmontar cuando están cerrados:
`if (!isOpen) return null`. No dejarlos ocultos con `translate-x-full`, porque
pueden interferir con foco, scroll y accesibilidad.

```tsx
<aside
  className="fixed inset-0 z-50"
  style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
>
  <header style={{ flexShrink: 0 }}>...</header>
  <nav style={{ flex: 1, overflowY: 'auto' }}>...</nav>
  <footer style={{ flexShrink: 0 }}>...</footer>
</aside>
```

El Header Server Component debe pasar `categories: CatalogCategory[]` al `MobileMenu`
Client Component. En mobile, las categorías siempre están visibles como submenu:

- primer ítem: `Ver todo el catálogo` → `/productos`
- categorías: `/productos?categoria=${cat.slug}`
- no usar acordeón para categorías principales del catálogo

### Desktop nav — dropdown con hover seguro

```tsx
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

function handleMouseEnter() {
  if (timeoutRef.current) clearTimeout(timeoutRef.current)
  setOpen(true)
}

function handleMouseLeave() {
  timeoutRef.current = setTimeout(() => setOpen(false), 120)
}
```

El dropdown debe cubrir el espacio entre trigger y panel para evitar cierres al mover el mouse.

---

## 7. Estados de Componentes (obligatorio en todos)

| Estado | Implementación |
|---|---|
| Default | — |
| Hover | `transition: var(--transition-fast)` mínimo |
| Active/Pressed | `transform: scale(0.98)` |
| Focus | `outline: 2px solid var(--color-primary); outline-offset: 2px` |
| Loading | Skeleton shimmer (ver abajo) |
| Empty | Mensaje + ícono SVG simple |
| Error | Mensaje descriptivo + botón retry |
| Disabled | `opacity: 0.5; cursor: not-allowed; pointer-events: none` |

### Skeleton loader

> CSS de shimmer definido en `core/17-manejo-errores.md` — sección `loading.tsx`. Copiar desde allí.

### Formularios y selects

Nunca usar `<select>` nativo en UI pública o admin. Usar dropdown custom accesible
integrado con `Controller` de `react-hook-form`, para mantener estilos, estados,
errores y comportamiento responsive consistentes.

### `prefers-reduced-motion` — obligatorio

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Animaciones y Microinteracciones

Usar animaciones con intención en todos los sitios públicos, respetando `prefers-reduced-motion`.
No dejar páginas estáticas si el rubro pide energía, artesanalidad, premium o dinamismo.

Mínimos por proyecto:

- Hero: entrada de texto + imagen o producto con delay suave.
- Header: transición de estado sticky/menu.
- Cards de producto: hover/focus con imagen, sombra o CTA sin mover layout.
- Carrito: feedback visual al agregar producto.
- Menú mobile: apertura/cierre con opacity + translate corto.
- Formularios: estado loading, éxito y error con transición accesible.

Duraciones recomendadas: `150ms` para controles, `250ms` para cards/menus, `400ms` para hero.
Nunca animar propiedades que rompen performance (`width`, `height`, `top`, `left`) si se puede usar `transform` u `opacity`.

---

## 9. Optimización de Imágenes

La compresión de imágenes se maneja en build-time con el script `sitiohoy:optimize-assets` (usa `sharp` como dev dependency). No se instala compresión client-side en el sitio público — eso corresponde al admin (repositorio separado).

### Validación de imágenes (solo referencia para admin)

```typescript
// Solo si se necesita validar uploads en el futuro (admin)
export function validateImage(file: File) {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  if (!ALLOWED.includes(file.type)) throw new Error('Formato no permitido. Usar JPG, PNG, WebP o AVIF.')
  if (file.size > 50 * 1024 * 1024) throw new Error('El archivo supera 50MB.')
}
```

### Uso de `next/image` — siempre

```tsx
// Producto — proporciones fijas
<Image
  src={product.imageUrl}
  alt={`${product.name} — ${siteName}`}   // Nunca vacío, nunca genérico
  width={800}
  height={800}
  className="object-cover"
  priority={isAboveFold}                   // true solo para LCP
  placeholder="blur"
  blurDataURL={product.blurHash ?? DEFAULT_BLUR}
/>

// Hero — full-bleed responsive
<Image
  src={heroImage}
  alt={heroAlt}
  fill
  className="object-cover"
  priority={true}
  sizes="100vw"
/>

// Producto en grid
<Image
  src={product.imageUrl}
  alt={`${product.name}`}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
/>
```

---

## 10. Detección de AI Slop — Patrones Prohibidos

Verificar que el sitio NO tenga ninguno de estos patrones antes de entregar:

- Gradiente violeta/azul genérico en el hero sin relación con la marca
- Cards con glassmorphism sin propósito funcional
- Bordes redondeados > 20px en contenedores grandes
- Animaciones de scroll-reveal en TODOS los elementos sin criterio
- Hero genérico: texto centrado + subtítulo + botón sobre stock photo de laptops/personas sonriendo
- Tipografía sin personalidad: Inter/Roboto/Lato por defecto sin justificación
- Gradiente diagonal `from-purple-500 to-pink-500` sin relación con la marca
- Íconos flotantes decorativos sin función
- Sección "Features" con 6 cards idénticas con íconos de Heroicons y texto placeholder
- Texto dentro de botones/cards que se corta o pisa otros elementos
- Cards dentro de cards o secciones enteras tratadas como cards decorativas
- UI dominada por un solo color sin contraste real
- Hero sin señal clara del producto, negocio o rubro en el primer viewport
- Misma combinación de fuentes, mismo hero o misma grilla usada en proyectos anteriores sin justificación del brief

---

## 11. Auditoría de Diseño — 10 Dimensiones

Antes de terminar Módulo 1 y Módulo 2, puntuar 0-10:

1. **Consistencia de color** — ¿Se usan los tokens o valores hex random?
2. **Jerarquía tipográfica** — ¿h1 > h2 > h3 > body claramente diferenciados?
3. **Ritmo de espaciado** — ¿Escala 4px/8px/16px/24px/32px/48px/64px?
4. **Consistencia de componentes** — ¿Elementos similares lucen similares?
5. **Responsive** — ¿Fluido en 375/768/1280/1920px?
6. **Dark mode** — ¿Completo o roto?
7. **Animaciones** — ¿Con propósito o decorativas?
8. **Accesibilidad** — Contraste ≥ 4.5:1, focus visible, touch targets ≥ 44px
9. **Densidad** — ¿Congestionado o respira bien?
10. **Polish** — ¿Hover, loaders, empty states, error states implementados?

**Score < 8 en cualquier dimensión = bloquear entrega del módulo.**

Además del puntaje:
- `visual-report.json` debe quedar OK.
- Screenshots 375/390/768/1280/1920 deben revisarse manualmente.
- La primera pantalla debe mostrar marca/producto/rubro y dejar insinuada la siguiente sección.
- El diseño debe verse específico del cliente, no como template genérico.

---

## 12. Logos — Si el cliente no tiene

Solicitar al cliente o generar con herramientas de diseño:

- Nombre del negocio + rubro + estilo buscado + paleta ya definida
- Siempre generar: variante horizontal + variante cuadrada (ícono)
- Formatos: PNG fondo transparente + SVG
- Verificar legibilidad en 32px (favicon) y 200px (header)
- Si el modelo AI generó un logo como parte del diseño, usarlo directamente
