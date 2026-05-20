---
skill: tracking-proyecto
descripcion: Registro interno de tokens, tiempo y costo por módulo — para análisis de producción de SitioHoy
tipo: core — actualizar al finalizar CADA módulo, sin excepción
---

# Tracking de Proyecto

> Registro interno de SitioHoy. No es parte del entregable al cliente.
> El archivo `proyecto-tracking.json` va en la raíz del proyecto y **SE COMMITEA al repositorio** (NO en `.gitignore`). Es fundamental para la trazabilidad del proyecto.
> Todas las fechas deben guardarse como ISO 8601 con offset Argentina `-03:00`
> (`America/Argentina/Buenos_Aires`), nunca como `Z` UTC.
> Los datos deben ser lo más reales posibles — tokens estimados, duración real, costo calculado.
> Si se pierde el tracking, se pierde toda la trazabilidad del proyecto.

---

## Crear al inicio del proyecto (Módulo 0)

Crear `proyecto-tracking.json` con esta estructura base:

```json
{
  "proyecto": "[Nombre del negocio]",
  "plan": "[esencial | emprendimiento | empresa]",
  "modelo": "[claude-sonnet-4-6 | gpt-4o | gemini-2-pro | ...]",
  "precios_usd_por_1k_tokens": {
    "input": 0.003,
    "output": 0.015
  },
  "timezone": "America/Argentina/Buenos_Aires",
  "inicio_proyecto": "[ISO 8601]",
  "fin_proyecto": null,
  "duracion_total_minutos": null,
  "tokens_input_total": 0,
  "tokens_output_total": 0,
  "costo_total_usd": 0,
  "modulos": []
}
```

### Precios de referencia por modelo (actualizar si cambian)

| Modelo | Input /1K tokens | Output /1K tokens |
|---|---|---|
| claude-sonnet-4-6 | $0.003 | $0.015 |
| claude-opus-4-6 | $0.015 | $0.075 |
| gpt-4o | $0.005 | $0.015 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gemini-2.0-pro | $0.00125 | $0.005 |

---

## Actualizar al finalizar cada módulo

Al completar el checklist ✅ de cada módulo, agregar un objeto al array `modulos`:

```json
{
  "modulo": 0,
  "nombre": "Setup e Identidad Visual",
  "inicio": "[ISO 8601]",
  "fin": "[ISO 8601]",
  "duracion_minutos": 0,
  "tokens_input_estimados": 0,
  "tokens_output_estimados": 0,
  "costo_estimado_usd": 0,
  "archivos_creados": [],
  "archivos_modificados": [],
  "comandos_ejecutados": [],
  "checks_completados": [],
  "decisiones": [],
  "datos_estimados": [],
  "integraciones_verificadas": [],
  "qa_resultado": "",
  "bloqueos": [],
  "notas": ""
}
```

### Cómo registrar tokens y archivos — automatizado

Al finalizar cada módulo, ejecutar:

```bash
node scripts/update-tracking.mjs --modulo N --nombre "Nombre del Módulo"
```

El script:
1. Lee `proyecto-tracking.json` existente
2. Detecta archivos creados/modificados con `git diff --name-only HEAD~1` o `git status --short`
3. Registra timestamps `-03:00` y calcula duración automáticamente
4. Deja `tokens_*` en 0 para completar manualmente o con `/cost` en Claude Code CLI

Para auditoría eficiente, completar los campos operativos cuando aplique:

```bash
node scripts/update-tracking.mjs \
  --modulo N \
  --nombre "Nombre del Módulo" \
  --comandos "npm run build|npm run sitiohoy:validate|supabase db push" \
  --checks "config_valid,brief_exists,supabase_schema_ready,validate_ok" \
  --integraciones "mercadopago,correo-argentino,resend" \
  --qa "build ok; validate ok" \
  --datos-estimados "peso productos: 500g por defecto|imagenes Unsplash: keyword ferreteria herramientas" \
  --decisiones "envios: Correo Argentino por cuenta del cliente" \
  --bloqueos "faltan tokens MercadoPago produccion" \
  --notas "Detalle breve verificable"
```

**Si usás Claude Code CLI:**
Ejecutar `/cost` al finalizar el módulo — muestra tokens reales de la sesión.
Anotar la diferencia entre el `/cost` del módulo anterior y el actual, y actualizarlos en el JSON.

**Si usás otro entorno (Cursor, Windsurf, OpenCode, GPT, Gemini):**
Estimar según cantidad de archivos generados:
- Archivo pequeño (< 50 líneas): ~2.000 tokens output
- Archivo mediano (50-150 líneas): ~5.000 tokens output
- Archivo grande (> 150 líneas): ~10.000 tokens output
- Input: aproximadamente 2x el output (contexto + instrucciones)

### Cálculo de costo

```
costo = (tokens_input / 1000 × precio_input) + (tokens_output / 1000 × precio_output)
```

---

## Cerrar al finalizar el proyecto (último módulo)

Completar los campos raíz:

```json
{
  "fin_proyecto": "[ISO 8601]",
  "duracion_total_minutos": "[suma de duracion_minutos de todos los módulos]",
  "tokens_input_total": "[suma de tokens_input_estimados]",
  "tokens_output_total": "[suma de tokens_output_estimados]",
  "costo_total_usd": "[suma de costo_estimado_usd]"
}
```

---

## Ejemplo real completo

```json
{
  "proyecto": "Ferretería Don Carlos",
  "plan": "emprendimiento",
  "modelo": "claude-sonnet-4-6",
  "precios_usd_por_1k_tokens": {
    "input": 0.003,
    "output": 0.015
  },
  "inicio_proyecto": "2026-05-03T10:00:00-03:00",
  "fin_proyecto": "2026-05-04T16:30:00-03:00",
  "duracion_total_minutos": 390,
  "tokens_input_total": 210000,
  "tokens_output_total": 95000,
  "costo_total_usd": 2.055,
  "modulos": [
    {
      "modulo": 0,
      "nombre": "Setup e Identidad Visual",
      "inicio": "2026-05-03T10:00:00-03:00",
      "fin": "2026-05-03T11:25:00-03:00",
      "duracion_minutos": 85,
      "tokens_input_estimados": 38000,
      "tokens_output_estimados": 18000,
      "costo_estimado_usd": 0.384,
      "archivos_creados": [
        "styles/tokens.css",
        "types/database.ts",
        ".env.local",
        "lib/supabase/server.ts",
        "lib/supabase/tenant.ts",
        "lib/cache-tags.ts"
      ],
      "archivos_modificados": [
        "package.json",
        "next.config.ts",
        "tsconfig.json"
      ],
      "comandos_ejecutados": ["npm run build", "npm run sitiohoy:validate"],
      "checks_completados": ["config_valid", "brief_exists", "tokens_css_exists", "supabase_schema_ready", "tracking_updated", "validate_ok"],
      "decisiones": ["Paleta basada en rubro ferretería y logo del cliente"],
      "datos_estimados": [],
      "integraciones_verificadas": ["supabase"],
      "qa_resultado": "build ok; validate ok",
      "bloqueos": [],
      "notas": "Design system: verde oscuro #1B4332 + arena #F5F0E8. Fuente: Playfair Display + Inter."
    },
    {
      "modulo": 1,
      "nombre": "Layout Global",
      "inicio": "2026-05-03T11:25:00-03:00",
      "fin": "2026-05-03T12:40:00-03:00",
      "duracion_minutos": 75,
      "tokens_input_estimados": 42000,
      "tokens_output_estimados": 19000,
      "costo_estimado_usd": 0.411,
      "archivos_creados": [
        "app/layout.tsx",
        "components/layout/Header.tsx",
        "components/layout/Footer.tsx",
        "components/ui/WhatsAppButton.tsx",
        "styles/components/header.css",
        "styles/components/footer.css"
      ],
      "archivos_modificados": [
        "styles/tokens.css"
      ],
      "comandos_ejecutados": ["npm run sitiohoy:validate"],
      "checks_completados": ["header_ready", "footer_ready", "whatsapp_ready", "responsive_checked", "validate_ok"],
      "decisiones": [],
      "datos_estimados": [],
      "integraciones_verificadas": ["whatsapp"],
      "qa_resultado": "validate ok",
      "bloqueos": [],
      "notas": "Header sticky con logo SVG. Menú hamburguesa en mobile. Botón WhatsApp flotante."
    }
  ]
}
```

---

## Agregar a `.gitignore`

```
# Tracking interno SitioHoy
proyecto-tracking.json
```

---

## Checklist de tracking ✅

- [ ] `proyecto-tracking.json` creado en Módulo 0 con datos base
- [ ] Cada módulo actualizado al finalizar su checklist
- [ ] Fechas en ISO 8601 con offset `-03:00`
- [ ] Comandos, decisiones, QA, integraciones y bloqueos registrados cuando existan
- [ ] `checks_completados` registrado según `.sitiohoy/checklists/module-checks.json`
- [ ] Datos estimados marcados explícitamente (peso, dimensiones, imágenes Unsplash, precios demo)
- [ ] `proyecto-tracking.json` en `.gitignore`
- [ ] Totales completados al cerrar el proyecto
