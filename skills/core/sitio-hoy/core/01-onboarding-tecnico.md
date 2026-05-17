---
skill: onboarding-tecnico
descripcion: Pre-calificación técnica — determina plan, stack e integraciones antes del briefing de diseño
tipo: core — ejecutar PRIMERO, antes de cualquier otra cosa
---

# Onboarding Técnico

> Ejecutar ANTES del briefing de diseño. Las respuestas determinan qué skills importar y qué módulos ejecutar.

## Mensaje a enviar al cliente

```
Antes de arrancar, necesito responder unas preguntas rápidas sobre el alcance del proyecto.

──────────────────────────────────────
⚙️ PLAN Y FUNCIONALIDADES
──────────────────────────────────────

1. ¿Qué plan vas a contratar?
   [ ] Esencial ($25.000/mes) — catálogo de productos/servicios + contacto por WhatsApp
   [ ] Emprendimiento ($37.000/mes) — tienda con MercadoPago + envíos con precios fijos
   [ ] Empresa ($65.000/mes) — tienda completa con envíos automatizados por Correo Argentino o Envia.com

2. ¿Tenés cuenta de MercadoPago activa para cobros?
   (requerido para Emprendimiento y Empresa)
   [ ] Sí  [ ] No, hay que crearla

3. (Solo Empresa) ¿Cómo querés gestionar envíos?
   [ ] Correo Argentino directo con usuario MiCorreo propio del cliente
   [ ] Envia.com con cuenta propia del cliente + token API
   [ ] Precios fijos por zona
   [ ] Solo retiro / sin envíos

4. ¿Necesitás emails automáticos al comprador? (confirmación de compra, cambio de estado)
   [ ] Sí (recomendado)  [ ] No por ahora

5. ¿Tenés dominio propio?
   [ ] Sí — ¿cuál es?
   [ ] No, hay que comprarlo

──────────────────────────────────────
🤖 ENTORNO DE DESARROLLO
──────────────────────────────────────

6. ¿Con qué IA/editor estás trabajando?
   [ ] Claude Code  [ ] Cursor  [ ] Windsurf  [ ] VS Code + Copilot  [ ] Otro: ___

7. ¿Tenés el MCP de Supabase configurado?
   (permite que la IA cree las tablas automáticamente)
   [ ] Sí  [ ] No

8. ¿Tenés AIDesigner MCP disponible?
   (genera el design system único del sitio)
   [ ] Sí  [ ] No — la IA generará el design system manualmente
```

---

## Procesamiento de respuestas

### Determinar plan activo

```
Si respuesta 1 = Esencial  → cargar plans/esencial/INDEX.md
Si respuesta 1 = Emprendimiento → cargar plans/emprendimiento/INDEX.md
Si respuesta 1 = Empresa → cargar plans/empresa/INDEX.md
```

### Construir config técnica interna

```
CONFIG TÉCNICA — [Nombre del negocio]
======================================
Plan: [esencial | emprendimiento | empresa]
MercadoPago: [sí/no]
Envia.com: [sí/no]
Correo Argentino: [sí/no]
Emails Resend: [sí/no]
Dominio: [url o "por comprar"]
Editor: [claude-code | cursor | otro]
MCP Supabase: [activo | inactivo → modo manual]
MCP AIDesigner: [activo | inactivo → modo manual]
```

### Reglas de importación de integraciones

| Integración | Esencial | Emprendimiento | Empresa |
|---|---|---|---|
| MercadoPago | ❌ | ✅ | ✅ |
| Envíos fijos por zona | ❌ | ✅ | ❌ |
| Correo Argentino | ❌ | ❌ | ✅ (si activó y tiene usuario MiCorreo propio) |
| Envia.com | ❌ | ❌ | ✅ (si activó) |
| Resend emails | ❌ | ✅ (si activó) | ✅ (si activó) |
| Umami Analytics | ❌ | ✅ básico | ✅ avanzado |
| Cupones de descuento | ❌ | ✅ | ✅ |

### Fallback si MCP Supabase no está activo

El modelo generará los scripts SQL en archivos `.sql` en la carpeta `supabase/migrations/` del proyecto.
Aplicar con Supabase CLI (`supabase link` + `supabase db push`). No usar SQL Editor salvo bloqueo documentado.

### Fallback si AIDesigner MCP no está activo

El modelo generará el design system manualmente basado en el brief del cliente:
1. Proponer 3 paletas de colores según el rubro y estilo
2. Cliente elige una
3. El modelo genera `styles/tokens.css` con esa paleta

---

## Verificación ✅ antes de continuar al briefing

- [ ] Plan determinado
- [ ] Config técnica construida internamente
- [ ] Archivos del plan correspondiente identificados para importar
- [ ] Modo MCP (activo/manual) establecido para Supabase y AIDesigner
