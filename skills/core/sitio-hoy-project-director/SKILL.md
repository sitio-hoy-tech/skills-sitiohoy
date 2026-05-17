---
name: sitio-hoy-project-director
description: >
  Generar context packs minimos y direccion visual para proyectos SitioHoy a
  partir de sitiohoy.config.json y brief.md. Usar despues de sitio-hoy-briefing
  y antes de scaffold/modulos para ahorrar tokens, mejorar consistencia de diseño
  y hacer el flujo portable a cualquier IA.
---

# SitioHoy Project Director

Esta skill reduce tokens y mejora diseño creando paquetes de contexto pequeños
por etapa. En vez de cargar todo `core/`, `plans/` e `integraciones/`, cada IA
carga solo el pack del módulo que está por ejecutar.

## Entradas

En la raíz del proyecto:
- `sitiohoy.config.json`
- `brief.md`

## Salidas

```txt
.sitiohoy/
  copy-guide.md              # generado por briefing
  context/
    project-context.md
    module-0.md
    module-1.md
    ...
    checkout-context.md        # si el plan tiene checkout
    deploy-context.md
    context-index.md
    implementation-order.md  # secuencia optimizada de módulos

  design/
    inspiration-board.md
    design-direction.md
    design-tokens.seed.json
    layout-recipe.md
    anti-slop-checklist.md
```

## Workflow

1. Confirmar que existen `sitiohoy.config.json` y `brief.md`.
2. Seleccionar templates de referencia y referencias del cliente (ver sección **Templates**).
3. Ejecutar:
   ```bash
   node scripts/generate-project-context.mjs
   ```
4. Para cada módulo, cargar solo:
   - `brief.md`
   - `sitiohoy.config.json`
   - `.sitiohoy/context/module-N.md`
   - `.sitiohoy/design/inspiration-board.md` si se escribe UI
   - `.sitiohoy/design/design-direction.md`
   - `.sitiohoy/design/layout-recipe.md` si se escribe UI
5. Si el módulo es checkout, cargar también `.sitiohoy/context/checkout-context.md`.
6. Si es deploy, cargar `.sitiohoy/context/deploy-context.md`.

## Templates de referencia

El archivo `data/templates/index.json` contiene una biblioteca curada de templates
open source relevantes para proyectos SitioHoy. El generador crea
`.sitiohoy/design/inspiration-board.md` con referencias del cliente y referencias curadas
según plan/rubro para anclar el diseño a ejemplos reales en vez de improvisar.

### Cómo seleccionar templates

Al iniciar un proyecto, leer `data/templates/index.json` y elegir 1–2 templates
que mejor correspondan al plan y rubro del cliente:

| Plan | Templates recomendados |
|---|---|
| Esencial | portfolio, landing page, servicios simples |
| Emprendimiento | e-commerce mediano, nextjs-commerce, medusa starter |
| Empresa | vercel-commerce, dub (multitenant), medusa completo |

Agregar o revisar en `inspiration-board.md` y `design-direction.md` una sección:

```md
## Referencias de layout

- **Template principal**: [nombre] — [repo] — [demo_url]
- **Patrón a tomar**: [qué componentes / estructura / UX se adopta]
- **Qué NO tomar**: [qué diferencia al sitio del template]
```

### Actualizar la biblioteca de templates

```bash
# Con GitHub API (necesita GITHUB_TOKEN para más rate limit)
GITHUB_TOKEN=ghp_xxx node scripts/fetch-templates.mjs

# Sin GitHub (solo lista curada)
node scripts/fetch-templates.mjs --no-github
```

El script preserva campos manuales (`industry`, `notes`) entre ejecuciones.
Para agregar un template nuevo, editarlo directamente en `data/templates/index.json`
con `"source": "curated"` y correr `--no-github`.

### Descargar componentes de código

Descarga los componentes clave (Hero, ProductCard, Navbar, Footer, Cart, Checkout)
de los templates como código real para usar de referencia:

```bash
# Todos los templates del index
GITHUB_TOKEN=ghp_xxx node scripts/fetch-components.mjs

# Un template específico
node scripts/fetch-components.mjs --id vercel-commerce

# Limitar archivos por template (default: 10)
node scripts/fetch-components.mjs --max-files 6
```

Los componentes quedan en `data/templates/components/{template-id}/`.
La skill los lee al generar `layout-recipe.md` y adapta las estructuras
al proyecto en lugar de inventarlas desde cero.

### Capturar screenshots de sitios de referencia

Cuando el cliente muestra un sitio que le gusta, capturarlo como imagen
para que la skill lo use como contexto visual:

```bash
# Instalar una sola vez:
npm install playwright && npx playwright install chromium

# Capturar un sitio de referencia
node scripts/screenshot-reference.mjs https://sitio.com --label "referencia-cliente"

# Mobile + full-page
node scripts/screenshot-reference.mjs https://sitio.com --mobile --full-page

# Batch desde archivo (un URL por línea)
node scripts/screenshot-reference.mjs --batch referencias.txt
```

Screenshots guardados en `.sitiohoy/design/references/` del proyecto del cliente.
Al iniciar el diseño, indicarle a la skill:
> "Tengo referencias en `.sitiohoy/design/references/` — usarlas para guiar el layout."

La skill lee las imágenes directamente y extrae paletas, tipografía,
jerarquía visual y patrones de layout.

## Component Seeds por Rubro

El archivo `references/component-seeds.md` contiene una biblioteca de componentes
recomendados según el rubro del negocio. Al generar el `DESIGN.md` y
los context packs, considerar estos seeds para:

1. Sugerir componentes específicos del rubro en el DESIGN.md
2. Dar al modelo AI estructuras base adecuadas al tipo de negocio
3. Evitar diseños genéricos — cada rubro tiene patrones de conversión distintos

## Paralelización

Estas tareas no dependen entre sí y pueden ejecutarse simultáneamente:

**Grupo A — generación de contexto** (todas independientes entre sí):
- `project-context.md`
- `module-0.md` … `module-N.md` (cada módulo es independiente)
- `checkout-context.md`
- `deploy-context.md`
- `context-index.md`

**Grupo B — dirección visual** (independiente del Grupo A):
- `inspiration-board.md`
- `design-direction.md`
- `design-tokens.seed.json`
- `layout-recipe.md`
- `anti-slop-checklist.md`

**Grupo C — referencias de diseño** (independiente de A y B):
- Captura de screenshots de referencia (`screenshot-reference.mjs`)
- Descarga de componentes de templates (`fetch-components.mjs`)

Orden recomendado: lanzar Grupo A y Grupo B en paralelo.
Lanzar Grupo C en paralelo con ambos si hay URLs de referencia disponibles.
Esperar a que los tres grupos terminen antes de pasar al scaffold.

## Diseño (generación directa por el modelo AI)

Después de generar los context packs, el modelo AI genera el diseño directamente en código:

1. Leer `.sitiohoy/design/DESIGN.md` (generado automáticamente por el briefing)
2. El modelo AI usa DESIGN.md como **dirección creativa**, no como spec rígida
3. Generar design tokens en `styles/tokens.css` (CSS custom properties)
4. Generar componentes UI directamente en código (TSX + Tailwind + tokens CSS)
5. Libertad creativa total: diseños únicos, modernos y hermosos

### Reglas de diseño
- SIEMPRE usar el DESIGN.md generado automáticamente — no crear briefs manuales
- Los design tokens se generan en `styles/tokens.css`
- Cada sitio debe tener personalidad única — no copiar templates genéricos
- Las referencias de ckm-design sirven como guía complementaria

## Reglas

- No duplicar documentación extensa de skills core.
- Los packs deben ser resúmenes operativos, no manuales largos.
- Cada pack debe decir qué archivos leer si hace falta más detalle.
- Cada pack debe incluir sus gates QA.
- La dirección visual es contrato de diseño: no improvisar UI fuera de ella sin actualizarla.

## Portabilidad

Funciona en cualquier IA porque usa Markdown, JSON y Node estándar sin dependencias.
Si una IA no soporta skills, se copia al contexto solo el pack correspondiente.
