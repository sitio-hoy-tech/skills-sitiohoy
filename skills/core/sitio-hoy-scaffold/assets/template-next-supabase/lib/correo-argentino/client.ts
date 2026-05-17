/**
 * Cliente para la API MiCorreo de Correo Argentino.
 *
 * ⚠️ LIMITACIÓN: La API es de pre-carga. NO genera etiquetas PDF.
 * El comerciante imprime etiquetas desde el portal web de MiCorreo.
 *
 * Credenciales: user/password/token de plataforma en `platform_config` (no en .env).
 * El customer_id del negocio vive en `tenants.correo_argentino_customer_id`.
 * Solo accesible con service role de Supabase.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { env } from '@/lib/config/env'

const CA_API = process.env.CA_API_URL ?? 'https://api.correoargentino.com.ar/micorreo/v1'

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function getCorreoArgentinoConfig() {
  const supabase = createServiceClient()
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select(`
      id,
      correo_argentino_customer_id,
      origin_postal_code
    `)
    .eq('id', env.NEXT_PUBLIC_TENANT_ID)
    .single()

  if (tenantError || !tenant) throw new Error('Tenant no encontrado para Correo Argentino.')

  const { data: platform, error: platformError } = await supabase
    .from('platform_config')
    .select(`
      id,
      correo_argentino_user,
      correo_argentino_password,
      correo_argentino_customer_id,
      correo_argentino_token,
      correo_argentino_token_expires_at
    `)
    .limit(1)
    .single()

  if (platformError || !platform) {
    throw new Error('Credenciales de Correo Argentino no configuradas en platform_config.')
  }

  return { tenant, platform }
}

// ─── Token management ─────────────────────────────────────────────────────────

export async function getCAToken(): Promise<string> {
  const { platform } = await getCorreoArgentinoConfig()

  if (platform.correo_argentino_token && platform.correo_argentino_token_expires_at) {
    const expiresAt = new Date(platform.correo_argentino_token_expires_at)
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return platform.correo_argentino_token
    }
  }

  if (!platform.correo_argentino_user || !platform.correo_argentino_password) {
    throw new Error('Credenciales de Correo Argentino no configuradas en platform_config.')
  }

  const credentials = Buffer.from(
    `${platform.correo_argentino_user}:${platform.correo_argentino_password}`,
  ).toString('base64')

  const res = await fetch(`${CA_API}/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!res.ok) throw new Error(`Error obteniendo token CA: ${res.status}`)

  const { token, expires } = (await res.json()) as { token: string; expires: string }
  const expiresDate = new Date(expires)
  const expiresAt = Number.isNaN(expiresDate.getTime())
    ? new Date(Date.now() + 60 * 60 * 1000)
    : expiresDate

  const supabase = createServiceClient()
  await supabase
    .from('platform_config')
    .update({
      correo_argentino_token: token,
      correo_argentino_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', platform.id)

  return token
}

// ─── Customer ID ──────────────────────────────────────────────────────────────

export async function getCACustomerId(): Promise<string> {
  const { tenant, platform } = await getCorreoArgentinoConfig()
  if (tenant.correo_argentino_customer_id) return tenant.correo_argentino_customer_id

  const token = await getCAToken()
  const res = await fetch(`${CA_API}/users/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: platform.correo_argentino_user,
      password: platform.correo_argentino_password,
    }),
  })

  if (!res.ok) throw new Error(`Error validando usuario CA: ${res.status}`)

  const { customerId } = (await res.json()) as { customerId: string }

  const supabase = createServiceClient()
  await supabase
    .from('tenants')
    .update({ correo_argentino_customer_id: customerId })
    .eq('id', tenant.id)

  return customerId
}

// ─── Cotización ───────────────────────────────────────────────────────────────

export interface CADimensions {
  weight: number // gramos, min 1, max 25000
  height: number // cm
  width: number  // cm
  length: number // cm
}

export interface CARateResult {
  deliveredType: 'D' | 'S'
  productType: string
  productName: string
  price: number
  deliveryTimeMin: string
  deliveryTimeMax: string
}

export async function getShippingRates(params: {
  postalCodeOrigin: string
  postalCodeDestination: string
  dimensions: CADimensions
}): Promise<CARateResult[]> {
  const [token, customerId] = await Promise.all([getCAToken(), getCACustomerId()])

  const res = await fetch(`${CA_API}/rates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      postalCodeOrigin: params.postalCodeOrigin,
      postalCodeDestination: params.postalCodeDestination,
      dimensions: {
        weight: Math.round(params.dimensions.weight),
        height: Math.round(params.dimensions.height),
        width: Math.round(params.dimensions.width),
        length: Math.round(params.dimensions.length),
      },
    }),
  })

  if (!res.ok) throw new Error(`Error cotizando envío CA: ${res.status}`)

  const data = (await res.json()) as { rates: CARateResult[] }
  return data.rates ?? []
}

// ─── Importar envío ───────────────────────────────────────────────────────────

export interface CAImportParams {
  extOrderId: string
  orderNumber: string
  recipient: { name: string; email: string; phone?: string; cellPhone?: string }
  shipping: {
    deliveryType: 'D' | 'S'
    agency?: string
    address: {
      streetName: string
      streetNumber: string
      floor?: string
      apartment?: string
      city: string
      provinceCode: string // 1 letra — usar toCAProvinceCode()
      postalCode: string
    }
    weight: number
    declaredValue: number
    height: number
    length: number
    width: number
  }
}

export async function importShipping(params: CAImportParams): Promise<void> {
  const [token, customerId] = await Promise.all([getCAToken(), getCACustomerId()])

  const res = await fetch(`${CA_API}/shipping/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      extOrderId: params.extOrderId,
      orderNumber: params.orderNumber,
      sender: {
        name: null, phone: null, cellPhone: null, email: null,
        originAddress: {
          streetName: null, streetNumber: null, floor: null,
          apartment: null, city: null, provinceCode: null, postalCode: null,
        },
      },
      recipient: {
        name: params.recipient.name,
        email: params.recipient.email,
        phone: params.recipient.phone ?? '',
        cellPhone: params.recipient.cellPhone ?? '',
      },
      shipping: {
        deliveryType: params.shipping.deliveryType,
        productType: 'CP',
        agency: params.shipping.agency ?? null,
        address: params.shipping.address,
        weight: Math.round(params.shipping.weight),
        declaredValue: params.shipping.declaredValue,
        height: Math.round(params.shipping.height),
        length: Math.round(params.shipping.length),
        width: Math.round(params.shipping.width),
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Error importando envío CA: ${res.status} ${body}`)
  }
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export interface CATrackingEvent {
  event: string
  date: string
  branch: string
  status: string
  sign: string
}

export interface CATrackingResult {
  id: string | null
  productId: string | null
  trackingNumber: string
  events: CATrackingEvent[]
}

export async function getTracking(shippingId: string): Promise<CATrackingResult | null> {
  const token = await getCAToken()

  const res = await fetch(`${CA_API}/shipping/tracking`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ shippingId }),
  })

  if (!res.ok) return null

  const data = await res.json()
  if (Array.isArray(data) && data.length > 0) return data[0] as CATrackingResult
  if (data?.error) return null
  return data as CATrackingResult
}
