# skills-sitiohoy

Installer de contexto y skills de SitioHoy para cualquier AI CLI.
Compatible con: Claude Code, OpenAI Codex, OpenCode.

## Documentación visual del flujo

Este repositorio incluye una guía HTML navegable para entender en profundidad cómo se
crea un sitio con las skills de SitioHoy:

- [docs/sitiohoy-skills.html](docs/sitiohoy-skills.html)

El documento explica:
- qué skills existen y para qué se usa cada una;
- cómo funciona el briefing de cliente en 7 pasos y qué archivos genera;
- cómo se componen internamente (`SKILL.md`, `references/`, `scripts/`, `assets/`, `data/`);
- cómo se cargan las skills según la IA instalada;
- qué skills intervienen en cada módulo y plan;
- qué tecnologías y librerías usa el stack;
- por qué se usa ISR on-demand con `unstable_cache` + `revalidateTag`;
- cómo funciona ISR on-demand multitenant con tags por tenant y triggers SQL `pg_net`;
- qué gates de QA, visual audit, tracking, Supabase CLI y launch bloquean la entrega;
- que `sitiohoy:e2e` con Playwright es gate obligatorio antes de deploy;
- como registrar errores reales corregidos en `.sitiohoy/errores-corregidos.md`;
- que cada sitio debe tener direccion visual propia, tipografias acordes al cliente y animaciones con proposito;
- que antes de deployar se limpian `console.log`, secretos y datos sensibles;
- que el reporte QA debe listar pendientes de produccion y pruebas manuales como compra, formulario, emails, envios y webhooks;
- que el email transaccional usa SMTP/nodemailer vía Hostinger (no Resend), con credenciales `smtp_user`/`smtp_pass` por tenant;
- que el schema incluye tablas extendidas: `product_attributes`, `product_attribute_values`, `crm_webhook_config`;
- que se incorporaron 20+ patterns del primer deploy real (withCache, getTenantConfigFresh, double-tag ISR, Payment Brick, etc.);
- qué mejoras futuras conviene evaluar para hacer el flujo más robusto.

Abrir localmente:

```bash
open docs/sitiohoy-skills.html
```

Si no estás en macOS, abrir el archivo desde el navegador o servirlo con cualquier
servidor estático.

**Regla de mantenimiento:** cada vez que cambie una skill, un módulo, una tecnología,
un script de QA/launch/tracking o el proceso de instalación, actualizar también
`docs/sitiohoy-skills.html` y esta sección del README si corresponde.

## Instalación

```bash
curl -fsSL https://raw.githubusercontent.com/Sitio-Hoy-Tech/skills-sitiohoy/main/bootstrap.sh -o /tmp/sitiohoy.sh && bash /tmp/sitiohoy.sh
```

El bootstrap muestra las versiones tagueadas disponibles en GitHub y permite elegir cuál instalar (o `main` para la última). Descarga, muestra el menú interactivo para elegir la IA destino, instala las skills y no deja el repo en tu computadora.

## Actualizar skills

Cuando modifiques las skills localmente, sincronizá al repo:

```bash
cd ~/Desktop/skills-sitiohoy
bash update.sh
git add skills/ && git commit -m "feat: actualizar skills" && git push
```

## Validación de skills

Después de modificar scripts, checklists o templates, correr:

```bash
node scripts/test-skills.mjs
git diff --check
```

El test valida sintaxis de scripts, JSON y ejecuta un smoke flow sobre `examples/dummy-empresa`.
`git diff --check` detecta espacios finales y problemas básicos de formato en el diff.

## Estructura

```
skills-sitiohoy/
├── bootstrap.sh                ← punto de entrada (curl), selector de versión
├── install.sh                  ← installer con menú interactivo (IA + credenciales)
├── update.sh                   ← sincronizar skills locales → repo
├── sitiohoy.config.json        ← config base del proyecto (plan, integraciones, gates)
├── credentials.env.example     ← template de credenciales
├── assets/
│   └── logo-sitiohoy.png
├── docs/
│   └── sitiohoy-skills.html    ← guía navegable del flujo completo
├── examples/
│   └── dummy-empresa/          ← fixture para smoke tests
├── scripts/
│   └── test-skills.mjs         ← validación de skills
└── skills/
    ├── core/                   ← skills principales del framework
    │   ├── sitio-hoy/                  — orquestador principal
    │   ├── sitio-hoy-briefing/         — onboarding + config
    │   ├── sitio-hoy-scaffold/         — base Next.js + Supabase
    │   ├── sitio-hoy-database/         — migraciones + RLS + seed admin
    │   ├── sitio-hoy-qa/               — validación automática
    │   ├── sitio-hoy-launch-automation/ — deploy GitHub + Vercel + Supabase
    │   └── sitio-hoy-project-director/ — context packs + dirección visual
    ├── design/                 ← skills de diseño
    │   └── ckm-design/                 — sistema de diseño knowledge-based
    └── seo/                    ← skills de SEO (19 sub-skills)
        ├── seo/                        — orquestador SEO principal
        ├── seo-audit/                  — auditoría completa del sitio
        ├── seo-backlinks/              — análisis de backlinks
        ├── seo-competitor-pages/       — páginas de comparación vs competencia
        ├── seo-content/                — calidad de contenido + E-E-A-T
        ├── seo-dataforseo/             — datos en vivo vía DataForSEO
        ├── seo-firecrawl/              — crawling vía Firecrawl
        ├── seo-geo/                    — SEO para AI Overviews + buscadores IA
        ├── seo-google/                 — Search Console + PageSpeed + CrUX
        ├── seo-hreflang/               — hreflang + SEO internacional
        ├── seo-image-gen/              — generación de imágenes para SEO
        ├── seo-images/                 — optimización de imágenes
        ├── seo-local/                  — SEO local + Google Business Profile
        ├── seo-maps/                   — geo-grid ranking + GBP
        ├── seo-page/                   — análisis deep de página individual
        ├── seo-plan/                   — planificación estratégica SEO
        ├── seo-programmatic/           — SEO programático a escala
        ├── seo-schema/                 — Schema.org / JSON-LD
        ├── seo-sitemap/                — análisis y generación de sitemaps
        └── seo-technical/              — auditoría técnica (9 categorías)
```
