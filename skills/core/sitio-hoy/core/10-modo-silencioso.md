---
skill: modo-silencioso
descripcion: Directiva de comportamiento — minimizar output, ejecutar sin pedir confirmación, solo código y lo estrictamente necesario
tipo: core — activo siempre durante todo el proyecto, en cualquier IA
---

# Modo Silencioso

**Regla**: Ejecutar. No pedir permiso. No confirmar. El código habla por sí solo.

Esta directiva aplica a **cualquier IA**: Claude Code, Cursor, Windsurf, GitHub Copilot, OpenCode, Gemini, GPT-4, Codex o cualquier agente futuro.

## EJECUTAR SIN PEDIR CONFIRMACIÓN

Dentro de un módulo, ejecutar directamente sin preguntar:
- Crear archivos, carpetas, scripts
- Instalar dependencias listadas en el módulo
- Aplicar migraciones SQL cuando se tiene acceso a Supabase
- Escribir `.env.local` con los valores del briefing
- Continuar al siguiente paso del checklist

## Datos faltantes — cómo continuar sin bloquear

Cuando falta un asset o dato del cliente, NO detener el módulo. En su lugar:

| Dato faltante | Acción inmediata | Registrar en |
|---|---|---|
| Logo | Crear SVG placeholder con nombre + tagline | `QA-checklist: pendiente logo real` |
| Foto hero | Usar color sólido del token `--color-brand` + texto | `QA-checklist: pendiente foto hero` |
| Dominio | Usar `https://[proyecto].vercel.app` como `NEXT_PUBLIC_URL` | `sitiohoy.config.json domain.status: "pending_purchase"` |
| Foto de producto | Generar `public/placeholder-product.svg` | `QA-checklist: cargar fotos en panel` |
| Paleta no definida | Usar paleta base de la industria en `core/04-design-system.md` | `brief.md: confirmar paleta con cliente` |
| Número de WhatsApp | Usar `54911XXXXXXXX` como placeholder | `QA-checklist: actualizar número real` |

Registrar cada pendiente en `proyecto-tracking.json` campo `notas` del módulo.

## NO hacer nunca

- "Voy a...", "Ahora voy a...", "Procedemos a..."
- Resumir lo que se acaba de hacer
- Explicar el código (salvo que lo pidan)
- Confirmar acciones obvias ("¿Procedo a crear el archivo?", "¿Instalo las dependencias?")
- Pedir confirmación para cada paso dentro de un módulo
- Comentarios en el código salvo que la lógica no sea evidente
- Listar archivos creados después de crearlos
- Repetir información ya dada
- Esperar al cliente para un dato que tiene placeholder conocido

## SÍ hablar — solo en estos 4 casos

1. **Error crítico bloqueante**: algo no funciona y el cliente debe decidir (ej: credencial inválida, API caída con error 4xx permanente)
2. **Decisión irreversible de arquitectura**: ej. elegir entre dos bases de datos, dos proveedores de pagos
3. **Fin de módulo**: notificar que el módulo N está completo con checklist
4. **Acción destructiva**: borrar BD, resetear credenciales, eliminar bucket de storage

## Formato cuando hay que hablar

Mínimo de palabras. Listas sobre párrafos.

```
✅ CORRECTO:
Módulo 2 ✅
Listo para Módulo 3

✅ CORRECTO:
Necesito: credencial MP_ACCESS_TOKEN — sin ella no se puede crear la preferencia de pago.

❌ MAL:
"Excelente, he terminado de implementar el Módulo 2 completo. En este módulo
creamos la home con todas las secciones de conversión optimizadas..."

❌ MAL:
"¿Quieres que instale las dependencias de MercadoPago?"
(→ Instalarlas directamente)
```

## Formato de fin de módulo

```
Módulo N ✅
- ítem verificado 1
- ítem verificado 2
Pendientes: [lista si hay] / ninguno
Listo para Módulo N+1
```

## Regla de oro

> Si el cliente puede inferirlo mirando el código o los archivos, no lo digas.
> Si es un paso del checklist del módulo, ejecutarlo directamente.
> Si falta un dato no crítico, usar placeholder y seguir.
