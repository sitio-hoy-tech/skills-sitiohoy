# Checklist de Monitoreo Post-Launch

## Primeras 24 horas

- [ ] Sitio responde correctamente (no 500/502/503)
- [ ] SSL/HTTPS funciona sin warnings
- [ ] Imágenes cargan correctamente (no 404)
- [ ] Formulario de contacto envía correctamente
- [ ] WhatsApp link funciona en mobile
- [ ] Google Search Console: submit sitemap
- [ ] Analytics: verificar que trackea visitas

## Primera semana

- [ ] Verificar Core Web Vitals en campo (CrUX)
- [ ] Revisar errores en Vercel logs
- [ ] Confirmar que ISR funciona (cambiar un producto, ver actualización)
- [ ] Verificar indexación en Google (site:dominio.com)
- [ ] Revisar velocidad en PageSpeed Insights
- [ ] Confirmar backup automático de Supabase

## Primer mes

- [ ] Revisar métricas de Umami (si activo):
  - Visitas/día promedio
  - Bounce rate
  - Páginas más visitadas
  - Eventos de conversión (add to cart, purchase)
- [ ] Verificar que no hay errores recurrentes en logs
- [ ] Confirmar que pagos se acreditan correctamente
- [ ] Revisar si hay productos sin stock
- [ ] Verificar que emails transaccionales llegan (no spam)

## Alertas configurables

### Vercel
- Deploy fallido → notificación por email
- Error rate > 1% → revisar logs

### Supabase
- Database approaching limits → upgrade plan
- RLS bypass attempts → revisar logs de auth

### MercadoPago (si activo)
- Webhook failures → revisar /api/webhooks/mercadopago
- Chargebacks → contactar al cliente inmediatamente

## Contactos de emergencia

| Servicio | Contacto | SLA |
|----------|----------|-----|
| Vercel | support@vercel.com | según plan |
| Supabase | support@supabase.com | según plan |
| MercadoPago | developers@mercadopago.com | — |
| Dominio | registrador del cliente | — |

## Métricas de éxito (30 días)

- **Uptime**: ≥99.9%
- **LCP p75**: ≤2.5s
- **Error rate**: <0.1%
- **Conversión** (si checkout): baseline establecido
