import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantConfig } from '@/lib/supabase/tenant'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

const TABLE_TAGS: Record<string, string[]> = {
  products: [`products-${TENANT_ID}`],
  product_images: [`products-${TENANT_ID}`],
  product_variants: [`products-${TENANT_ID}`],
  categories: [`categories-${TENANT_ID}`, `products-${TENANT_ID}`],
  coupons: [`coupons-${TENANT_ID}`],
  tenants: [`tenant-config-${TENANT_ID}`],
  shipping_zones: [`shipping-zones-${TENANT_ID}`],
}

export async function POST(req: NextRequest) {
  const tenant = await getTenantConfig()
  const secret = tenant.revalidation_secret ?? process.env.REVALIDATION_SECRET

  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let tags: string[] = []

  try {
    const body = await req.json()

    if (body?.tag && typeof body.tag === 'string') {
      tags = [body.tag]
    } else if (body?.table === 'products' && body?.slug) {
      tags = [`product-${TENANT_ID}-${body.slug}`, `products-${TENANT_ID}`]
    } else if (body?.table) {
      tags = TABLE_TAGS[body.table] ?? [`products-${TENANT_ID}`]
    } else {
      tags = [`products-${TENANT_ID}`, `categories-${TENANT_ID}`]
    }
  } catch {
    tags = [`products-${TENANT_ID}`, `categories-${TENANT_ID}`]
  }

  for (const tag of tags) {
    revalidateTag(tag, 'default')
  }

  return NextResponse.json({ ok: true, tags })
}
