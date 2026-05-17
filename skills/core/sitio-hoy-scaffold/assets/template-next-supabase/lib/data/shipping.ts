import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { TAGS } from '@/lib/cache-tags'

export interface ShippingZone {
  id: string
  name: string
  provinces: string[]
  price: number
  free_above: number | null
  estimated_days: string
}

/**
 * Devuelve las zonas de envío activas del tenant.
 * Cacheado con ISR on-demand — invalida con revalidateTag(TAGS.SHIPPING, 'default').
 * Solo Plan Emprendimiento y Plan Empresa (envíos por zona fija).
 */
export const getShippingZones = unstable_cache(
  async (tenantId: string): Promise<ShippingZone[]> => {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('price', { ascending: true })

    if (error) throw new Error(`Error al obtener zonas de envío: ${error.message}`)

    return data ?? []
  },
  ['shipping-zones'],
  { tags: [TAGS.SHIPPING] },
)

/** Calcula el costo de envío para una provincia según las zonas configuradas. */
export function calculateShipping(
  zones: ShippingZone[],
  province: string,
  subtotal: number,
): { zone: ShippingZone; cost: number } | null {
  const zone = zones.find((z) => z.provinces.includes(province))
  if (!zone) return null

  const cost = zone.free_above !== null && subtotal >= zone.free_above ? 0 : zone.price

  return { zone, cost }
}
