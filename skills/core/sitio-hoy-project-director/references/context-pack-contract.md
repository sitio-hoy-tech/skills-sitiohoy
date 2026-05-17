# Context Pack Contract

Cada pack debe responder:

1. Qué construir.
2. Qué leer si falta detalle.
3. Qué no hacer.
4. Qué archivos tocar normalmente.
5. Qué comandos/gates ejecutar.

## Carga minima por etapa

| Etapa | Archivos |
|---|---|
| Scaffold | `sitiohoy.config.json`, `brief.md`, `.sitiohoy/context/module-0.md` |
| Layout/Home/Catalogo | anterior + `.sitiohoy/design/design-direction.md` |
| Checkout | anterior + `.sitiohoy/context/checkout-context.md` |
| Deploy | `sitiohoy.config.json`, `.sitiohoy/context/deploy-context.md`, QA report |

## Anti-token rule

No cargar `core/05-base-datos.md`, `core/04-design-system.md` o integraciones completas
si el pack ya tiene suficiente contexto. Cargar el archivo largo solo ante duda concreta.
