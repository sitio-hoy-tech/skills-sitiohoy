# Component Seeds por Rubro

Referencia de componentes base que el modelo AI debe usar como punto de partida según el rubro del negocio.

## Rubros y sus componentes clave

### Indumentaria / Moda
- Hero: modelo con producto, split layout
- Product Card: imagen dominante, hover con segunda foto
- Filtros: por talle, color, categoría, precio
- Quick View: modal con galería y selector de talle
- Size Guide: tabla de talles con medidas

### Alimentos / Gastronomía
- Hero: producto en contexto (mesa, cocina), warm tones
- Product Card: foto cenital, badge "nuevo" o "popular"
- Categorías: iconos ilustrados o fotos recortadas
- Info nutricional: tabla colapsable en producto
- Delivery info: prominente en header/hero

### Tecnología / Electrónica
- Hero: producto sobre fondo limpio, specs destacadas
- Product Card: badge de specs (RAM, storage), rating
- Comparador: tabla de specs lado a lado
- Filtros: por specs técnicas, marca, precio
- Stock indicator: urgencia ("quedan 3")

### Belleza / Cosmética
- Hero: lifestyle aspiracional, paleta suave
- Product Card: textura/swatch de color, hover zoom
- Rutina builder: selector de paso 1-2-3
- Ingredientes: lista expandible con íconos
- Reviews: con fotos de clientes

### Hogar / Decoración
- Hero: ambiente completo, room setting
- Product Card: dimensiones visibles, color variants
- Room planner: galería de ambientes
- Materiales: badges (madera, metal, tela)
- Delivery info: "envío especial" para items grandes

### Servicios / Profesional
- Hero: equipo o resultado del servicio, CTA consulta
- Service cards: ícono + título + descripción + precio
- Testimonios: foto + nombre + empresa
- FAQ: acordeón expandible
- Contact: form prominente, mapa, horarios

### Deportes / Fitness
- Hero: acción, dinamismo, contraste alto
- Product Card: badge "bestseller", múltiples ángulos
- Filtros: por deporte, género, actividad
- Size guide: medidas con ilustración
- Reviews: con contexto de uso ("lo uso para correr 10K")

## Componentes universales (todos los rubros)

### Header
- Logo (izquierda)
- Nav principal (centro o derecha)
- Search (si >50 productos)
- Cart icon con counter
- Mobile: hamburger menu

### Footer
- Logo + descripción corta
- Links: navegación, legal, soporte
- Redes sociales: íconos
- Newsletter (si plan tiene)
- Medios de pago aceptados (badges)
- Info de envío resumida

### Trust Signals
- Envío gratis (si aplica) o costo transparente
- Medios de pago (MP badge)
- Garantía / devoluciones
- Seguridad (candado + "sitio seguro")
- Atención al cliente (WhatsApp)

### Empty States
- Carrito vacío: ilustración + CTA "ver productos"
- Sin resultados: sugerencias alternativas
- Error: mensaje amigable + CTA retry

### Loading States
- Skeleton screens (no spinners)
- Progressive loading para imágenes
- Optimistic updates para carrito
