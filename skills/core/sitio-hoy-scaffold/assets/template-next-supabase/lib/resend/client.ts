import { Resend } from 'resend'
import { getTenantConfig } from '@/lib/config/tenant'

/**
 * Devuelve un cliente Resend autenticado con la API key del tenant.
 * Lanzar desde Server Actions o Route Handlers — nunca desde Client Components.
 */
export async function getResendClient(): Promise<Resend> {
  const config = await getTenantConfig()
  const apiKey = config.resend_api_key

  if (!apiKey) {
    throw new Error(
      'Resend no está configurado para este tenant. Agregar resend_api_key en la tabla tenants.',
    )
  }

  return new Resend(apiKey)
}
