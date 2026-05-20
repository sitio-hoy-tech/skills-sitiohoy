---
name: sitio-hoy-briefing
description: >
  Ejecutar onboarding tecnico y briefing de negocio/diseño para SitioHoy,
  detectar plan e integraciones, normalizar respuestas y generar automaticamente
  sitiohoy.config.json y brief.md antes del scaffold. Usar al iniciar un nuevo
  sitio o cuando haya que rehacer el alcance del proyecto.
---

# SitioHoy Briefing

Esta skill separa la etapa comercial/estrategica del desarrollo. Su objetivo es
convertir respuestas del cliente en artefactos concretos:

- `sitiohoy.config.json`
- `brief.md`
- opcional: `.sitiohoy/intake.json` como fuente normalizada

## Cuándo usar

Usar antes de `sitio-hoy-scaffold` cuando:
- el cliente pide crear un sitio nuevo;
- cambia el plan;
- cambia el alcance de pagos, envíos, emails, dominio o assets;
- hace falta regenerar el brief para diseño/SEO/copy.

## Workflow

### Formulario web (SIEMPRE usar esto — no hacer preguntas por consola)

El formulario está compactado en 7 pasos: plan, negocio/cliente, catálogo,
diseño, contenido/contacto, assets y revisión. Prioriza respuestas rápidas y
datos accionables para diseño, copy, SEO e integraciones.

El servidor no tiene dependencias npm. Correrlo con `node` directamente:

```bash
# Localizar el script (usar la ruta donde están instaladas las skills)
node ~/.claude/skills/sitio-hoy-briefing/scripts/briefing-server.mjs
# Si está en .claude/skills/:
node .claude/skills/sitio-hoy-briefing/scripts/briefing-server.mjs
# Si está en .agents/skills/:
node .agents/skills/sitio-hoy-briefing/scripts/briefing-server.mjs
# Si está en .opencode/skills/:
node .opencode/skills/sitio-hoy-briefing/scripts/briefing-server.mjs
```

**Pasos:**
1. Encontrar la ruta correcta del script buscando `briefing-server.mjs` en las carpetas de skills del proyecto.
2. Correr `node <ruta>/briefing-server.mjs` desde la raíz del proyecto.
3. Abrir `http://localhost:3456` en el navegador (el servidor lo hace automáticamente).
4. Esperar a que el cliente complete y envíe el formulario. El servidor se cierra automáticamente tras 30 minutos de inactividad.
5. El servidor genera automáticamente: `.sitiohoy/intake.json` + `sitiohoy.config.json` + `brief.md` + `.sitiohoy/design/DESIGN.md` + `.sitiohoy/copy-guide.md` + `_assets-cliente/`
   - El `DESIGN.md` es el documento de dirección creativa que el modelo AI usa para generar el diseño directamente en código.
   - Si el cliente ya tenía tenant ID, también genera `.sitiohoy/existing-tenant-check.json` con el snapshot público de `public.tenants`.
6. Pedir al cliente que confirme que completó y envió el formulario.
7. Después de esa confirmación, verificar que el proceso del servidor terminó. El script se apaga solo 2 segundos después del submit; si sigue corriendo, cortarlo antes de continuar.
8. Una vez generados los archivos y detenido el servidor, continuar con el workflow.

**No hacer preguntas por consola.** Si `node` no está disponible, informar al cliente y pedir que instale Node.js.

## Reglas de normalización

- **Cliente existente vs nuevo:** El formulario pregunta si el cliente ya tiene un tenant creado. Si tiene tenant ID:
  - `clientStatus` = `"existente"` y `existingTenantId` = UUID del tenant.
  - **No crear el cliente en Supabase** — usar el tenant existente.
  - Al enviar, el servidor consulta `public.tenants` usando `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de env local o `~/.sitiohoy/credentials.env`.
  - Si encuentra el tenant, usar esa fila como fuente de verdad para plan, nombre, slug, URL, email de contacto e integraciones ya cargadas. El formulario no debe inventar esos datos.
  - Guardar la consulta en `existingTenantLookup` y `.sitiohoy/existing-tenant-check.json`, sin persistir secretos: tokens y keys quedan como booleanos `*Configured`.
  - Si la consulta no se puede hacer o no encuentra la fila, dejar una nota pendiente y revisar Supabase antes de scaffold/deploy.
- Plan permitido: `esencial`, `emprendimiento`, `empresa`.
- `mercadopago` es `true` para Emprendimiento y Empresa.
- `fixedShipping` es `true` para Emprendimiento, y también para Empresa si eligió "precios fijos por zona".
- `correoArgentino` es `true` solo para Empresa si eligió "Correo Argentino directo" — requiere usuario MiCorreo propio del cliente.
- `envia` es `true` solo para Empresa si eligió "Envia.com" — requiere cuenta propia del cliente + token API.
- `correoArgentino` y `envia` son mutuamente exclusivos — nunca ambos `true`.
- Si eligió "precios fijos por zona", `fixedShipping = true` y ambos quedan en `false`.
- Si el cliente eligió "solo retiro" o "sin envíos", todos quedan en `false` y el checkout no muestra paso de envío.
- **Nunca asumir proveedor de envíos en Plan Empresa** — preguntar siempre.
- **Correcciones automáticas:** Si los datos del formulario no coinciden con los del tenant en Supabase (ej: plan diferente, nombre diferente), el servidor corrige automáticamente usando el tenant como fuente de verdad. Las correcciones se registran en `intake.corrections[]` con campo, valor anterior, valor nuevo y razón.
- `resend` depende de onboarding.
- `umami` es `true` para Emprendimiento y Empresa.
- `whatsapp` siempre es `true`.
- Si falta dominio, usar `domain.status = "pending_purchase"`.
- `business.primaryGoal` debe resumir la conversión principal: vender online,
  recibir consultas, mostrar catálogo, generar confianza o captar leads.
- Si falta logo o hero, marcarlo en `assets.missing`.
- Si faltan fotos de productos, marcar `productos` en `assets.missing` y agregar una nota: usar imágenes Unsplash relacionadas al rubro/categoría/producto hasta que el cliente envíe fotos reales.
- Si el catálogo tiene productos físicos o mixtos, `catalog.defaultWeightGrams` debe existir. Si el cliente no lo informó, usar `500` como estimación inicial, marcar `catalog.weightEstimated = true` y registrar el motivo en `notes`.
- Para MercadoPago, Correo Argentino, Envia.com y Resend, no inventar credenciales. Marcar el proveedor como activo solo si corresponde por plan/elección, pero dejar las credenciales como pendientes hasta que se carguen en Supabase.

## Criterio de salida

No pasar a scaffold hasta tener:
- [ ] `sitiohoy.config.json`
- [ ] `brief.md`
- [ ] `.sitiohoy/design/DESIGN.md` (documento de dirección creativa para el modelo AI)
- [ ] estado del cliente detectado (`nuevo` o `existente`)
- [ ] si es existente: `existingTenantId` validado
- [ ] si es existente: `.sitiohoy/existing-tenant-check.json` generado y revisado
- [ ] plan detectado
- [ ] integraciones calculadas
- [ ] assets faltantes listados
- [ ] peso default definido para productos físicos/mixtos
- [ ] si faltan imágenes de productos: regla Unsplash anotada
- [ ] páginas opcionales listadas
- [ ] tono y dirección visual resumidos
- [ ] **DESIGN.md generado y listo para que el modelo AI lo use como dirección creativa**

## Handoff

Después de esta skill:
1. `sitio-hoy-project-director` genera context packs y dirección visual;
2. `sitio-hoy` importa el INDEX del plan detectado;
3. `sitio-hoy-scaffold` crea la base;
4. `sitio-hoy-database` genera schema/RLS;
5. los módulos usan `brief.md`, `DESIGN.md` y `.sitiohoy/context/module-N.md` como fuente mínima.
6. El modelo AI lee DESIGN.md como dirección creativa y genera diseños directamente en código.
