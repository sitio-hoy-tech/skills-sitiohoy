# sitiohoy-skills

Installer de contexto y skills de SitioHoy para cualquier AI CLI.
Compatible con: Claude Code, Gemini CLI, OpenAI Codex, DeepSeek, Cursor, Windsurf.

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
curl -fsSL https://raw.githubusercontent.com/Sitio-Hoy-Tech/sitiohoy-skills/main/bootstrap.sh -o /tmp/sitiohoy.sh && bash /tmp/sitiohoy.sh
```

Descarga todo, mostrá el menú interactivo, instalá y no deja el repo en tu computadora.

## Actualizar skills

Cuando modifiques las skills localmente, sincronizá al repo:

```bash
cd ~/Desktop/sitiohoy-skills
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
sitiohoy-skills/
├── bootstrap.sh                ← punto de entrada (curl)
├── install.sh                  ← installer con menú interactivo
├── update.sh                   ← sincronizar skills locales → repo
├── credentials.env.example     ← template de credenciales
├── assets/
│   └── logo-sitiohoy.png
├── docs/
│   └── sitiohoy-skills.html    ← guía navegable del flujo completo
└── skills/
    ├── sitio-hoy/
    ├── sitio-hoy-briefing/
    ├── sitio-hoy-database/
    ├── sitio-hoy-launch-automation/
    ├── sitio-hoy-project-director/
    ├── sitio-hoy-qa/
    ├── sitio-hoy-scaffold/
    ├── seo/
    └── ...
```
