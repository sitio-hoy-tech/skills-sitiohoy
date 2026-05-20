# Intake Schema

La IA debe convertir respuestas del cliente a este JSON y guardarlo en
`.sitiohoy/intake.json`.

```json
{
  "clientStatus": "nuevo",
  "existingTenantId": null,
  "existingTenantLookup": null,
  "business": {
    "name": "Nombre del negocio",
    "slug": "nombre-del-negocio",
    "industry": "indumentaria",
    "tagline": "",
    "description": "",
    "differentiator": "",
    "primaryGoal": "vender-online",
    "visualReferences": [],
    "competitors": [],
    "location": {
      "city": "",
      "province": ""
    },
    "hours": ""
  },
  "plan": "esencial",
  "technical": {
    "mercadoPagoActive": false,
    "correoArgentinoRequested": false,
    "enviaRequested": false,
    "resendRequested": false,
    "domain": {
      "status": "owned",
      "value": "https://www.ejemplo.com"
    },
    "editor": "claude-code",
    "supabaseMcp": false,
    "aiDesignerMcp": false
  },
  "audience": {
    "profile": "",
    "problem": "",
    "desiredFeeling": "",
    "ageRange": { "from": null, "to": null },
    "personality": [],
    "tone": "",
    "primaryDevice": "mobile"
  },
  "visualIdentity": {
    "colors": {
      "defined": true,
      "primary": "",
      "secondary": "",
      "accent": "",
      "hints": "",
      "fromLogo": false
    },
    "desiredMood": "",
    "style": "",
    "typography": "",
    "navigation": "",
    "imageTreatment": "",
    "ctaText": "",
    "corners": "",
    "heroLayout": "",
    "density": "",
    "logo": {
      "available": false,
      "format": ""
    },
    "photoQuality": "professional"
  },
  "catalog": {
    "initialCount": 0,
    "categories": [],
    "hasVariants": false,
    "priceRange": "",
    "type": "physical",
    "defaultWeightGrams": 500,
    "weightEstimated": true,
    "defaultDimensionsCm": {
      "length": 20,
      "width": 15,
      "height": 8
    }
  },
  "pages": {
    "about": false,
    "faq": false,
    "contact": false,
    "legal": false,
    "blog": false,
    "homepageSections": []
  },
  "contact": {
    "whatsapp": "",
    "email": "",
    "socials": [],
    "primarySocial": ""
  },
  "assets": {
    "folderReady": false,
    "missing": [],
    "faviconAvailable": false
  },
  "animations": "subtle",
  "notes": []
}
```

## Valores permitidos

- `clientStatus`: `nuevo`, `existente`
- `existingTenantId`: UUID string o `null` cuando `clientStatus` es `nuevo`
- `existingTenantLookup`: resultado de consultar `public.tenants` cuando `clientStatus` es `existente`.
  - `status`: `found`, `not_found`, `skipped`, `error`
  - `tenant`: snapshot publico sin secretos (`plan`, `status`, `url`, `contactEmail`, integraciones configuradas como booleanos, origen de envios, suscripcion y conteos relacionados)
  - si `status` no es `found`, el proyecto queda con nota pendiente para revisar Supabase antes de definir plan e integraciones
- `plan`: `esencial`, `emprendimiento`, `empresa`
- `business.primaryGoal`: `vender-online`, `recibir-consultas`, `mostrar-catalogo`, `generar-confianza`, `captar-leads`
- `business.competitors`: array de strings (nombres o URLs de competidores directos)
- `business.location.province`: una de las 24 provincias argentinas o vacío
- `business.hours`: texto libre con horario de atención
- `domain.status`: `owned`, `pending_purchase`, `temporary`
- `editor`: `claude-code`, `cursor`, `windsurf`, `copilot`, `opencode`, `gemini`, `codex`, `other`
- `primaryDevice`: `mobile`, `desktop`, `mixed`
- `photoQuality`: `professional`, `phone`, `supplier`, `none`
- `catalog.type`: `physical`, `digital`, `service`, `mixed`
- `audience.personality`: array de `confiable`, `innovador`, `elegante`, `divertido`, `audaz`, `tradicional`, `sofisticado`, `accesible`, `exclusivo`, `sustentable`
- `audience.ageRange`: objeto `{ from, to }` con edades numéricas o `null`
- `visualIdentity.typography`: `serif`, `sans-serif`, `display`
- `visualIdentity.navigation`: `horizontal`, `hamburger`, `sidebar`
- `visualIdentity.imageTreatment`: `natural`, `overlay`, `duotone`
- `visualIdentity.ctaText`: texto libre del botón principal (ej: "Comprar ahora")
- `visualIdentity.corners`: `rounded`, `sharp`, `mixed`
- `visualIdentity.heroLayout`: `image-left`, `image-right`, `fullwidth`
- `visualIdentity.density`: `spacious`, `compact`
- `pages.homepageSections`: array de `hero`, `productos-destacados`, `categorias`, `testimonios`, `sobre-nosotros`, `newsletter`, `banners-promo`, `galeria`, `faq-inline`, `contacto-rapido`
- `animations`: `none`, `subtle`, `full`
- `correoArgentinoRequested` y `enviaRequested` son mutuamente exclusivos — no pueden ser ambos `true`

## Reglas de peso y dimensiones

- `catalog.defaultWeightGrams` es obligatorio para `physical` y `mixed`.
- Peso en gramos, mínimo `1`. Para Correo Argentino no superar `25000`.
- Si el cliente no informa peso, usar `500`, `weightEstimated = true` y registrar la estimación en `notes`.
- `defaultDimensionsCm` se usa para cotizaciones de envío cuando el producto no tiene dimensiones propias.

## Campos nuevos (v3)

- `business.competitors`: Competidores directos del negocio. Se usa para SEO (competitor analysis) y para diferenciación en copy.
- `business.location`: Ciudad y provincia. Se usa para SEO local, schema LocalBusiness, y zona de envío por defecto.
- `business.hours`: Horario de atención. Se usa en la página de contacto y schema LocalBusiness.
- `visualIdentity.corners`: Estilo de esquinas que define el border-radius general del diseño.
- `visualIdentity.heroLayout`: Layout preferido para la sección hero del home.
- `visualIdentity.density`: Densidad de contenido (mucho white space vs compacto).

## Campos nuevos (v4) — mejora de precisión para diseño IA

- `business.tagline`: Slogan o frase corta de marca. Se usa en hero, metadata y OG tags.
- `audience.ageRange`: Rango de edad del público objetivo. Guía decisiones de tipografía, tono visual y densidad.
- `audience.personality`: Traits de personalidad de marca (array). Guían tono de copy, paleta de colores y estilo visual.
- `visualIdentity.typography`: Preferencia tipográfica (serif, sans-serif, display). Define el carácter visual de headings y body.
- `visualIdentity.navigation`: Estilo de navegación (horizontal, hamburger, sidebar). Impacta la arquitectura del layout.
- `visualIdentity.imageTreatment`: Tratamiento de imágenes (natural, overlay, duotone). Afecta hero, banners y galería.
- `visualIdentity.ctaText`: Texto del botón principal. Define la acción primaria del sitio.
- `pages.homepageSections`: Secciones seleccionadas para el homepage. La IA las ordena según el objetivo del sitio.
- `assets.faviconAvailable`: Si el cliente tiene favicon listo.
