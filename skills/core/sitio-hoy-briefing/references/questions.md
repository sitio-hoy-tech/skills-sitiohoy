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
- Tagline o slogan (frase corta que resume la marca).
- Objetivo principal del sitio: vender online, recibir consultas, mostrar catálogo,
  generar confianza o captar leads/reservas.
- Qué vende, para quién y por qué lo eligen.
- Diferencial competitivo.
- Cliente ideal.
- Rango de edad del público objetivo.
- Necesidad o problema que resuelve.
- Sensación deseada al entrar al sitio.
- Personalidad de marca (traits): confiable, innovador, elegante, divertido, audaz,
  tradicional, sofisticado, accesible, exclusivo, sustentable.
- Tono de comunicación.
- Dispositivo principal.
- Referentes visuales (marcas o sitios cuyo diseño les gusta como inspiración).
- Competidores directos (contra quién compite el negocio, para SEO y diferenciación).

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
- Estilo: minimalista, colorido, corporativo, artesanal, tech, premium, vintage.
- Tipografía: serif (elegante/clásica), sans-serif (moderna/limpia), display (creativa).
- Esquinas y formas: redondeadas (amigable), rectas (corporativo) o mixto.
- Navegación: horizontal (navbar clásica), hamburger (mobile-first), sidebar (panel lateral).
- Preferencia de layout del Hero: imagen izquierda, imagen derecha o full width.
- Tratamiento de imágenes: natural (sin filtros), overlay (gradiente), duotono (artístico).
- Densidad de contenido: espacioso o compacto.
- Texto del CTA principal (ej: "Comprar ahora", "Consultar", "Ver catálogo").
- Logo disponible y formato.
- Calidad de fotos: profesionales, celular, proveedor o sin fotos.

## 5. Contenido y contacto

- Páginas necesarias: sobre nosotros, FAQ, contacto, legales, blog.
- Secciones del homepage: hero, productos destacados, categorías, testimonios,
  sobre nosotros, newsletter, banners promocionales, galería, FAQ inline, contacto rápido.
- WhatsApp (formato +54..., se valida al enviar).
- Email público (se valida formato).
- Horario de atención (ej: Lun a Vie 9-18hs, Sáb 9-13hs).
- Ubicación: ciudad y provincia.
- Redes sociales (se valida que la URL empiece con http/https).
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
  favicon/
```

- Favicon disponible (icono para pestaña del navegador).

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
- objetivo principal y tagline;
- negocio, cliente, tono, personalidad y competidores;
- rango de edad del público;
- catálogo, categorías, peso y dimensiones;
- diseño: tipografía, navegación, esquinas, hero layout, densidad, tratamiento de imágenes;
- CTA principal;
- páginas, secciones del homepage, contacto, horario y ubicación;
- assets disponibles, faltantes y favicon.
