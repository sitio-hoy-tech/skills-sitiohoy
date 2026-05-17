---
skill: briefing
descripcion: Cuestionario de diseño y negocio — ejecutar DESPUÉS del onboarding técnico
tipo: core — ejecutar en Paso 2, adaptado según el plan detectado
---

# Briefing del Cliente

> Ejecutar DESPUÉS de `01-onboarding-tecnico.md`. El plan ya fue determinado.
> Presentar todo de una sola vez. No hacer preguntas por separado. Esperar respuesta completa.

## Mensaje a enviar al cliente

```
Ahora necesito conocer tu negocio y tu estética para que el sitio sea tuyo, no genérico.
Respondé lo que tengas — con eso arrancamos.

──────────────────────────────────────
🏢 TU NEGOCIO
──────────────────────────────────────
1. Nombre del negocio
2. ¿A qué rubro pertenece? (indumentaria, gastronomía, servicios, tecnología, etc.)
3. Describilo en 1-2 oraciones como se lo explicarías a un cliente nuevo
4. ¿Cuál es tu diferencial frente a la competencia?
5. ¿Hay algún competidor o referente en Argentina que admires visualmente?

──────────────────────────────────────
👥 TU CLIENTE IDEAL
──────────────────────────────────────
6. ¿A quién le vendés? (edad, género, intereses, nivel socioeconómico)
7. ¿Qué problema le resolvés?
8. ¿Cómo querés que se sienta al entrar al sitio?
   (confianza, exclusividad, cercanía, urgencia, aspiración, diversión)
9. ¿Qué tono de comunicación usás?
   (formal / informal / técnico / cercano / premium / juvenil)

──────────────────────────────────────
🎨 IDENTIDAD VISUAL — MUY IMPORTANTE
──────────────────────────────────────
10. ¿Tenés colores de marca? (hex, RGB o describí el color)
    - Principal:
    - Secundario (opcional):
    - Acento (opcional):

11. Si no tenés colores, ¿qué sensación querés transmitir?
    [ ] Sofisticado / oscuro / premium
    [ ] Fresco / natural / orgánico
    [ ] Enérgico / vibrante / juvenil
    [ ] Minimalista / blanco / limpio
    [ ] Cálido / artesanal / cercano
    [ ] Tech / moderno / futurista

12. ¿Qué estilo visual te representa?
    [ ] Minimalista   [ ] Colorido   [ ] Corporativo
    [ ] Vintage       [ ] Artesanal  [ ] Tech / Moderno
    [ ] Lujo / Premium

13. ¿Tenés logo? ¿En qué formato? (PNG con fondo transparente o SVG = ideal)

14. ¿Las fotos de productos/servicios son:
    [ ] Fotos profesionales propias
    [ ] Fotos propias (celular)
    [ ] Imágenes de proveedor/stock
    [ ] Aún no tengo fotos

15. ¿Qué porcentaje de tus clientes creés que usan celular para comprar/consultar?
    [ ] Mayoría (>70%)   [ ] Mitad y mitad   [ ] Mayoría desktop

──────────────────────────────────────
🛍️ PRODUCTOS / SERVICIOS
──────────────────────────────────────
16. ¿Cuántos productos/servicios tenés para cargar al inicio?
17. ¿Tienen categorías? ¿Cuáles?
18. ¿Tienen variantes? (talles, colores, sabores, materiales, etc.)
19. Rango de precios (mínimo - máximo en ARS)

[SOLO PARA EMPRENDIMIENTO Y EMPRESA]
20. ¿Vendés productos físicos con envío o servicios/digitales?

──────────────────────────────────────
📄 PÁGINAS ADICIONALES
──────────────────────────────────────
21. ¿Necesitás alguna de estas páginas?
    [ ] Sobre nosotros / Historia
    [ ] Preguntas frecuentes (FAQ)
    [ ] Página de contacto con formulario
    [ ] Términos y condiciones / Política de devoluciones
    [ ] Blog / Novedades

──────────────────────────────────────
📞 DATOS DE CONTACTO Y REDES
──────────────────────────────────────
22. WhatsApp de atención al cliente
23. Email de contacto público
24. Redes sociales (Instagram, Facebook, TikTok, etc.)
25. ¿Cuál es tu red principal donde más actividad tenés?

──────────────────────────────────────
🖼️ IMÁGENES — IMPORTANTE
──────────────────────────────────────
Crear esta estructura en la raíz del proyecto antes de arrancar:

  _assets-cliente/
  ├── logo/          → PNG transparente + SVG
  ├── hero/          → imagen(es) principal del banner
  ├── productos/     → fotos de productos (subcarpeta por categoría)
  ├── marca/         → texturas, patrones, elementos de marca
  └── galeria/       → fotos del local, equipo, proceso

Reglas para los archivos:
  ✅ Nombres en minúsculas con guiones: remera-azul-frente.jpg
  ✅ JPG/WebP para fotos · PNG/SVG para logos y transparencias
  ✅ Mínimo 1200px de ancho para hero, 800px para productos
  ❌ Sin espacios en nombres de archivo
  ❌ Sin nombres genéricos (IMG_001.jpg)

Avisame cuando hayas subido las imágenes.
```

---

## Procesamiento interno — Brief del proyecto

Una vez recibidas las respuestas, construir este brief antes de ejecutar módulos:

```
BRIEF — [Nombre del negocio]
==============================
NEGOCIO
  Nombre: ___
  Rubro: ___
  Descripción: ___
  Diferencial: ___
  Referente visual: ___

AUDIENCIA
  Perfil: ___
  Problema que resuelve: ___
  Sensación deseada: ___
  Tono: ___
  Dispositivo predominante: [mobile | desktop | mixto]

IDENTIDAD VISUAL ← clave para el design system
  Colores: primario=#___ secundario=#___ acento=#___
  Estilo: ___
  Sensación si no hay colores: ___
  Tiene logo: sí/no | formato: ___
  Calidad de fotos: [profesional | casero | proveedor | sin fotos]

CATÁLOGO
  Cantidad aprox: ___
  Categorías: [lista]
  Variantes: sí/no
  Precios: $___–$___
  Tipo: físico | digital | servicio

PÁGINAS ADICIONALES: [lista]

CONTACTO
  WhatsApp: ___
  Email: ___
  RRSS: [lista con red principal destacada]

IMÁGENES
  _assets-cliente/ lista: sí/no
```

Este brief alimenta:
- **Design system**: colores, tipografía, estilo → `04-design-system.md`
- **Home**: textos de hero, propuesta de valor, CTAs
- **SEO**: metadata, Schema.org Organization, descripciones
- **Footer/Header**: datos de contacto, redes sociales

---

## Reglas de diseño derivadas del brief

Inferir automáticamente del brief:

| Señal del brief | Decisión de diseño |
|---|---|
| Dispositivo predominante = mobile | Layout mobile-first extremo, hero vertical, botones grandes |
| Estilo = lujo/premium | Tipografía serif display, paleta oscura/neutra, espaciado amplio |
| Estilo = juvenil/vibrante | Tipografía grotesque bold, colores saturados, animaciones activas |
| Fotos = sin fotos | Hero con tipografía XL + color sólido, no imágenes de stock genéricas |
| Fotos = profesionales | Hero full-bleed con imagen, texto overlay |
| Tono = formal | Menos animaciones, más estructura, tipografía elegante |
| Tono = cercano/informal | Más color, más movimiento, tipografía humanista |

---

## Verificación ✅ antes de Módulo 0

- [ ] Brief completo construido internamente
- [ ] Design system inferido del brief (colores, tipografía, estilo)
- [ ] `_assets-cliente/` creada con imágenes del cliente
- [ ] Logo disponible (PNG/SVG) o instrucción de generarlo
- [ ] Al menos 1 imagen para el hero
