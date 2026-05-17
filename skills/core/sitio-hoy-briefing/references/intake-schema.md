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
    "description": "",
    "differentiator": "",
    "primaryGoal": "vender-online",
    "visualReferences": []
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
    "blog": false
  },
  "contact": {
    "whatsapp": "",
    "email": "",
    "socials": [],
    "primarySocial": ""
  },
  "assets": {
    "folderReady": false,
    "missing": []
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
- `domain.status`: `owned`, `pending_purchase`, `temporary`
- `editor`: `claude-code`, `cursor`, `windsurf`, `copilot`, `opencode`, `gemini`, `codex`, `other`
- `primaryDevice`: `mobile`, `desktop`, `mixed`
- `photoQuality`: `professional`, `phone`, `supplier`, `none`
- `catalog.type`: `physical`, `digital`, `service`, `mixed`
- `animations`: `none`, `subtle`, `full`
- `correoArgentinoRequested` y `enviaRequested` son mutuamente exclusivos — no pueden ser ambos `true`

## Reglas de peso y dimensiones

- `catalog.defaultWeightGrams` es obligatorio para `physical` y `mixed`.
- Peso en gramos, mínimo `1`. Para Correo Argentino no superar `25000`.
- Si el cliente no informa peso, usar `500`, `weightEstimated = true` y registrar la estimación en `notes`.
- `defaultDimensionsCm` se usa para cotizaciones de envío cuando el producto no tiene dimensiones propias.
