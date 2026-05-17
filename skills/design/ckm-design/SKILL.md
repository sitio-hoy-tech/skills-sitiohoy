---
name: ckm:design
description: "Comprehensive design skill: brand identity, design tokens, UI styling, logo design (55 styles, 30 palettes), corporate identity program (50 deliverables, CIP mockups), HTML presentations (Chart.js), banner design (22 styles, social/ads/web/print), icon design (15 styles, SVG), social photos (multi-platform), visual audit (10 dimensions), AI slop detection. The AI model generates all assets directly — no external tools required."
argument-hint: "[design-type] [context]"
license: MIT
metadata:
  author: sitiohoy
  version: "3.0.0"
---

# Design

Unified design skill: brand, tokens, UI, logo, CIP, slides, banners, social photos, icons, visual audit.

**Filosofía:** El modelo AI genera todos los assets directamente usando las referencias como base de conocimiento. No se requieren herramientas externas, APIs, ni scripts. El output es código listo para usar: SVG, CSS, HTML, TSX.

## When to Use

- Brand identity, voice, assets
- Design system tokens and CSS custom properties
- UI styling with shadcn/ui + Tailwind
- Logo design (SVG/CSS inline)
- Corporate identity program (CIP) deliverables
- Presentations and pitch decks (HTML + Chart.js)
- Banner design for social media, ads, web, print
- Social photos for Instagram, Facebook, LinkedIn, Twitter, Pinterest, TikTok
- Icon sets (SVG)
- Visual audit and AI slop detection

## Sub-skill Routing

| Task | Mode | Knowledge Base |
|------|------|----------------|
| Brand identity, voice, assets | Brand | Project briefing + intake.json |
| Tokens, specs, CSS custom properties | Design System | `references/design-routing.md` |
| Logo creation | Logo | `references/logo-design.md`, `references/logo-style-guide.md` |
| CIP mockups, deliverables | CIP | `references/cip-design.md`, `references/cip-style-guide.md` |
| Presentations, pitch decks | Slides | `references/slides-create.md` |
| Banners, covers, headers | Banner | `references/banner-sizes-and-styles.md` |
| Social media images | Social Photos | `references/social-photos-design.md` |
| SVG icons, icon sets | Icon | `references/icon-design.md` |
| Visual consistency check | Audit | See "Mode: Visual Audit" below |
| Generic AI pattern detection | Slop Check | See "Mode: AI Slop Detection" below |

---

## Logo Design

55+ styles, 30 color palettes, 25 industry guides.

### Workflow

1. Read `references/logo-design.md` and `references/logo-style-guide.md` for style options
2. Read `references/logo-color-psychology.md` for color decisions
3. Read `references/logo-prompt-engineering.md` for composition principles
4. Consultar data en `data/logo/styles.csv`, `data/logo/colors.csv`, `data/logo/industries.csv`
5. **Generar el logo directamente como SVG inline** o CSS art
6. Presentar variantes al usuario (mínimo 2-3 opciones)

### Output Format

- **SVG preferido** — código SVG limpio, optimizado, viewBox correcto
- **Variantes:** logo completo, isotipo, versión horizontal, versión vertical
- **Colores:** versión full color + monocromática + sobre fondo oscuro
- **SIEMPRE fondo blanco** en las versiones principales

### Top Styles (de 55+)

| Style | Best For |
|-------|----------|
| Minimalist | SaaS, tech startups |
| Vintage/Retro | Food, restaurants, craft |
| Geometric | Fintech, architecture |
| Handwritten | Personal brands, creative |
| Bold/Modern | E-commerce, fashion |
| Gradient | Apps, digital products |
| Negative Space | Clever branding, logos with hidden meanings |

---

## CIP Design (Corporate Identity Program)

50+ deliverables, 20 styles, 20 industries.

### Workflow

1. Read `references/cip-design.md` for the complete deliverable catalog
2. Read `references/cip-style-guide.md` for style options
3. Read `references/cip-deliverable-guide.md` for specs per item
4. Consultar `data/cip/deliverables.csv`, `data/cip/styles.csv`, `data/cip/industries.csv`
5. **Generar mockups como HTML autocontenido** (un archivo por deliverable)
6. Cada HTML incluye la imagen/diseño renderizado en el contexto correcto

### Key Deliverables

| Category | Items |
|----------|-------|
| Print | Business card, letterhead, envelope, invoice, folder |
| Digital | Email signature, social covers, favicon, app icon |
| Marketing | Brochure, flyer, poster, presentation template |
| Signage | Storefront, roll-up banner, vehicle wrap |
| Merchandise | T-shirt, mug, notebook, tote bag |

### Output

- HTML files auto-contenidos (sin dependencias externas)
- Cada mockup muestra el logo/brand en contexto realista
- Incluir CSS que respete los design tokens del proyecto

---

## Slides (HTML Presentations)

Strategic presentations with Chart.js, design tokens, copywriting formulas.

### Workflow

1. Load `references/slides-create.md` for the creation workflow
2. Use `references/slides-layout-patterns.md` for slide structure
3. Use `references/slides-html-template.md` as HTML base
4. Apply `references/slides-copywriting-formulas.md` for persuasive copy
5. Reference `references/slides-strategies.md` for narrative arc

### Output

- Single HTML file, self-contained (CSS + JS inline)
- Chart.js for data visualization
- Keyboard navigation (← → arrows)
- Print-friendly with `@media print`
- Responsive for projection and screen

---

## Banner Design

22 art direction styles across social, ads, web, print.

### Workflow

1. Load `references/banner-sizes-and-styles.md` for complete sizes and styles
2. Gather requirements: purpose, platform, content, brand, style
3. Generate as HTML/CSS at exact pixel dimensions
4. Export-ready (screenshot at final size)

### Quick Size Reference

| Platform | Type | Size (px) |
|----------|------|-----------|
| Facebook | Cover | 820 × 312 |
| Twitter/X | Header | 1500 × 500 |
| LinkedIn | Personal | 1584 × 396 |
| YouTube | Channel art | 2560 × 1440 |
| Instagram | Story | 1080 × 1920 |
| Instagram | Post | 1080 × 1080 |
| Google Ads | Med Rectangle | 300 × 250 |
| Website | Hero | 1920 × 600-1080 |

### Design Rules

- Safe zones: critical content in central 70-80%
- One CTA per banner, bottom-right, min 44px height
- Max 2 fonts, min 16px body, ≥32px headline
- Text under 20% for Meta ads (penalization rule)
- Print: 300 DPI, CMYK, 3-5mm bleed

### Top Art Styles (de 22)

| Style | Best For |
|-------|----------|
| Minimalist | SaaS, tech |
| Bold Typography | Announcements |
| Gradient | Modern brands |
| Photo-Based | Lifestyle, e-commerce |
| Geometric | Tech, fintech |
| Neon/Cyberpunk | Gaming, events |
| Retro/Vintage | Food, craft brands |

---

## Icon Design

15 styles, 12 categories. Output: SVG optimizado.

### Workflow

1. Read `references/icon-design.md` for style definitions and best practices
2. Consultar `data/icon/styles.csv` for available styles
3. **Generar SVG directamente** — viewBox="0 0 24 24", stroke o fill según style
4. Mantener consistencia en stroke-width, radios, y proporciones

### Output Format

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- paths here -->
</svg>
```

### Top Styles

| Style | Best For |
|-------|----------|
| Outlined | UI interfaces, web apps |
| Filled | Mobile apps, nav bars |
| Duotone | Marketing, landing pages |
| Rounded | Friendly apps, health |
| Sharp | Tech, fintech, enterprise |
| Flat | Material design |
| Gradient | Modern SaaS brands |

### Rules

- Grid: 24×24px base, 2px stroke default
- Optical balance: adjust weight visually, not mathematically
- Consistency: same stroke-width across the set
- Simplicity: max 3-4 paths per icon, recognizable at 16px

---

## Social Photos

Multi-platform social image design. Output: HTML/CSS at exact platform dimensions.

### Workflow

1. Load `references/social-photos-design.md` for sizes, templates, best practices
2. Analyze requirements: subject, platforms, style, brand context
3. Ideate 3-5 concepts
4. Generate as HTML at exact pixel dimensions per platform
5. Each HTML is self-contained, screenshot-ready

### Key Sizes

| Platform | Size (px) | Platform | Size (px) |
|----------|-----------|----------|-----------|
| IG Post | 1080×1080 | FB Post | 1200×630 |
| IG Story | 1080×1920 | X Post | 1200×675 |
| IG Carousel | 1080×1350 | LinkedIn | 1200×627 |
| YT Thumb | 1280×720 | Pinterest | 1000×1500 |

---

## Mode: Visual Audit

Scores UI across 10 dimensions (0-10 each):

| # | Dimension | What to Check |
|---|-----------|---------------|
| 1 | Color consistency | Using palette or random hex values? |
| 2 | Typography hierarchy | Clear h1 > h2 > h3 > body > caption? |
| 3 | Spacing rhythm | Consistent scale (4/8/16px) or arbitrary? |
| 4 | Component consistency | Similar elements look similar? |
| 5 | Responsive behavior | Fluid or broken at breakpoints? |
| 6 | Dark mode | Complete or half-done? |
| 7 | Animation | Purposeful or gratuitous? |
| 8 | Accessibility | Contrast ratios, focus states, touch targets? |
| 9 | Information density | Cluttered or clean? |
| 10 | Polish | Hover states, transitions, loading/empty states? |

Each dimension gets: score, specific examples, fix with exact file:line.

### Usage

```
/ckm:design audit --url http://localhost:3000 --pages / /pricing /docs
```

---

## Mode: AI Slop Detection

Identifies generic AI-generated design patterns that make sites look templated:

**Red flags:**
- Gratuitous gradients on everything
- Purple-to-blue defaults (the "AI purple")
- Glassmorphism cards with no purpose
- Rounded corners on things that shouldn't be rounded
- Excessive scroll animations
- Generic hero with centered text over stock gradient
- Sans-serif font stack with no personality (Inter/Roboto/Lato default)
- Decorative floating orbs/blobs
- Unmotivated dark mode
- Stock illustration characters (undraw-style)

**Usage:**
```
/ckm:design slop-check
```

---

## Design Tokens Generation

Cuando se usa dentro del flujo SitioHoy, genera `styles/tokens.css`:

```css
:root {
  /* Colors */
  --color-primary: #FFAB39;
  --color-secondary: #C92331;
  --color-background: #FFFFFF;
  --color-surface: #F8F9FA;
  --color-text: #1A1A1A;
  --color-text-muted: #6B7280;

  /* Typography */
  --font-heading: 'Font Name', sans-serif;
  --font-body: 'Font Name', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

Los valores se derivan del briefing del proyecto (colores, mood, estilo).

---

## Complete Workflows

### Brand Package (Logo + CIP + Slides)

1. **Logo** → Generar variantes SVG usando style guides
2. **CIP** → Crear mockups HTML con el logo aplicado
3. **Slides** → Presentación HTML del brand package completo

### New Design System (for SitioHoy projects)

1. **Briefing** → Leer `intake.json` y `DESIGN.md`
2. **Tokens** → Generar `styles/tokens.css` basado en la identidad visual
3. **Components** → TSX + Tailwind usando tokens como CSS vars
4. **Audit** → Verificar consistencia con Visual Audit mode

---

## References

| Topic | File |
|-------|------|
| Design Routing | `references/design-routing.md` |
| Logo Design Guide | `references/logo-design.md` |
| Logo Styles | `references/logo-style-guide.md` |
| Logo Colors | `references/logo-color-psychology.md` |
| Logo Prompts | `references/logo-prompt-engineering.md` |
| CIP Design Guide | `references/cip-design.md` |
| CIP Deliverables | `references/cip-deliverable-guide.md` |
| CIP Styles | `references/cip-style-guide.md` |
| CIP Prompts | `references/cip-prompt-engineering.md` |
| Slides Create | `references/slides-create.md` |
| Slides Layouts | `references/slides-layout-patterns.md` |
| Slides Template | `references/slides-html-template.md` |
| Slides Copy | `references/slides-copywriting-formulas.md` |
| Slides Strategy | `references/slides-strategies.md` |
| Banner Sizes & Styles | `references/banner-sizes-and-styles.md` |
| Social Photos Guide | `references/social-photos-design.md` |
| Icon Design Guide | `references/icon-design.md` |
