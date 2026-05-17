# Workflow de Diseño con Stitch — Flujo Manual

## Qué es Stitch

Stitch es la herramienta de diseño visual que genera todos los mockups y pantallas del sitio web. Es el **único** paso de diseño en el flujo SitioHoy — no hay alternativa manual ni fallback.

## Flujo Completo (Manual)

### 1. Preparación (Automático)

El briefing server genera automáticamente `.sitiohoy/design/DESIGN.md` con toda la información que Stitch necesita:

- Identidad de marca completa
- Paleta de colores exacta con hex
- Sistema tipográfico completo
- Especificaciones de layout y grid
- Lista de todas las páginas según el plan
- Estructura detallada de cada página
- Componentes clave con especificaciones
- Animaciones y microinteracciones
- Assets disponibles
- Guía de copy y lenguaje
- Requisitos de accesibilidad
- Integraciones visuales
- Notas especiales para evitar errores

### 2. Enviar a Stitch (Manual)

```
1. Abrir Stitch en el navegador (stitch.withgoogle.com o app correspondiente)
2. Crear un nuevo proyecto
3. Copiar TODO el contenido de .sitiohoy/design/DESIGN.md
4. Pegar en el prompt de Stitch
5. Solicitar: "Generá el diseño completo de este sitio web siguiendo cada especificación"
```

**Importante:**
- Enviar el DESIGN.md **completo**, no resumido
- Stitch necesita TODOS los datos para generar sin errores
- Si el documento es muy largo, enviarlo por secciones: primero el sistema de diseño, luego las páginas

### 3. Generación del Diseño

Esperar a que Stitch procese y genere:

- Sistema de diseño base (colores, tipografía, componentes)
- Header y Footer
- Home completa
- Catálogo
- Página de Producto
- Carrito (si aplica)
- Checkout multi-step (si aplica)
- Seguimiento de pedido (si aplica)
- Páginas opcionales (Sobre Nosotros, FAQ, Contacto)
- Estados de error (404, Error)

### 4. Revisión

Revisar cada pantalla en Stitch:

```
- [ ] Colores coinciden con el DESIGN.md
- [ ] Tipografía es correcta (familias, tamaños, pesos)
- [ ] Layout es mobile-first (375px)
- [ ] Todos los componentes del DESIGN.md están presentes
- [ ] Estados hover y active visibles
- [ ] Badges y etiquetas correctos
- [ ] CTAs son claros y visibles
- [ ] Footer incluye crédito "Desarrollado por SitioHoy"
- [ ] Responsive se ve bien en 375px, 768px, 1280px
```

### 5. Guardar ID del Proyecto

```
1. En Stitch, copiar el ID del proyecto
2. Guardar en .sitiohoy/design/stitch-project-id.txt
3. Informar el ID a la IA para referencia durante implementación
```

### 6. Exportar Assets

```
1. En Stitch, exportar imágenes, iconos y otros assets
2. Guardar en _assets-cliente/stitch/
3. Documentar qué assets se exportaron en proyecto-tracking.json
```

### 7. Extracción para Código

```
1. Extraer design tokens (colores, tipografía, espaciado)
2. Volcar en styles/tokens.css
3. Usar el diseño de Stitch como referencia pixel-perfect
4. Implementar exactamente lo que Stitch generó
```

## Reglas

1. **Nunca implementar UI sin diseño previo en Stitch** (excepto Módulo 0)
2. **Si Stitch no generó un diseño, PARAR** — no diseñar manualmente
3. **Siempre mobile-first** — diseñar mobile antes que desktop
4. **Tokens over hardcoding** — usar variables, no valores directos
5. **Fidelidad** — implementar exactamente lo que Stitch generó
6. **Iteración** — si se necesita un cambio, actualizar Stitch primero y regenerar

## Si Stitch genera un diseño incorrecto

1. Revisar si el DESIGN.md tenía la información correcta
2. Corregir el DESIGN.md si es necesario
3. Reenviar a Stitch con las correcciones
4. No intentar "arreglar" en código lo que Stitch hizo mal — corregir en Stitch

## Integración con el flujo SitioHoy

```
Briefing (automático)
  → DESIGN.md generado (automático)
    → Enviar a Stitch (manual)
      → Stitch genera diseño (automático/Stitch)
        → Revisar y aprobar (manual)
          → Guardar ID (manual)
            → Exportar assets (manual)
              → Implementar en código (IA)
                → QA visual contra Stitch
```

## Verificación periódica

Antes de cada módulo visual, confirmar:
- ¿El diseño de Stitch está disponible?
- ¿Tengo el ID del proyecto?
- ¿Los assets están exportados?

Si falta algo, resolver antes de escribir código.
