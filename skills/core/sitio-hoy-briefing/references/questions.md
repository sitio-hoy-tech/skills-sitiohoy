# Cuestionario SitioHoy

Usar el formulario web de 7 pasos. No hacer preguntas por consola salvo que falte
un dato bloqueante para decidir plan, checkout, envíos o dominio.

## 1. Plan y alcance

- Estado del cliente: nuevo o existente.
- Si es existente: tenant ID. Al enviar, consultar `public.tenants` para recuperar
  plan, nombre, slug, URL, email de contacto e integraciones configuradas, porque
  esos datos cargados en el tenant tienen prioridad sobre defaults del formulario.
- Plan: Esencial, Emprendimiento o Empresa.
- Para Empresa: proveedor de envíos.
  - Correo Argentino directo: MiCorreo propio del cliente.
  - Envia.com: cuenta propia y token API.
  - Precios fijos por zona: sin integración externa.
  - Sin envíos: retiro, coordinación manual o digital.
- MercadoPago activo.
- Emails automáticos con Resend.
- Dominio: existente o pendiente de compra.
- IA/editor y MCPs disponibles: Supabase y AIDesigner.

## 2. Negocio y cliente

- Nombre del negocio.
- Rubro.
- Objetivo principal del sitio: vender online, recibir consultas, mostrar catálogo,
  generar confianza o captar leads/reservas.
- Qué vende, para quién y por qué lo eligen.
- Diferencial competitivo.
- Cliente ideal.
- Necesidad o problema que resuelve.
- Sensación deseada al entrar al sitio.
- Tono de comunicación.
- Dispositivo principal.
- Referentes visuales o competidores.

## 3. Catálogo

- Cantidad inicial de productos, servicios o ítems.
- Tipo: físico, digital, servicio o mixto.
- Categorías principales.
- Variantes: talle, color, medida, sabor u otra.
- Rango de precios.
- Para físicos o mixtos: peso promedio y medidas promedio.
- Si no se sabe el peso, usar 500 g como estimación y marcarlo en notas.

## 4. Diseño

- Colores de marca definidos o tonos deseados.
- Mood visual.
- Estilo: minimalista, colorido, corporativo, artesanal, tech o premium.
- Logo disponible y formato.
- Calidad de fotos: profesionales, celular, proveedor o sin fotos.

## 5. Contenido y contacto

- Páginas necesarias: sobre nosotros, FAQ, contacto, legales, blog.
- WhatsApp.
- Email público.
- Redes sociales.
- Red principal.
- Nivel de animación: sin animaciones, sutiles o expresivas.

## 6. Assets

Estructura esperada:

```txt
_assets-cliente/
  logo/
  hero/
  productos/
  marca/
  galeria/
```

Reglas:

- nombres en minúsculas con guiones;
- JPG/WebP para fotos;
- PNG/SVG para logo;
- hero mínimo 1200 px;
- productos mínimo 800 px;
- si no hay fotos de productos, usar imágenes Unsplash relacionadas al
  rubro/categoría/producto hasta recibir fotos reales.

## 7. Revisión

Antes de enviar, confirmar:

- plan e integraciones;
- objetivo principal;
- negocio, cliente y tono;
- catálogo, categorías, peso y dimensiones;
- páginas, contacto y redes;
- assets disponibles y faltantes.
