const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

export const TAGS = {
  PRODUCTS: `products-${TENANT_ID}`,
  PRODUCT: (slug: string) => `product-${TENANT_ID}-${slug}`,
  CATEGORIES: `categories-${TENANT_ID}`,
  ORDERS: `orders-${TENANT_ID}`,
  ORDER: (id: string) => `order-${TENANT_ID}-${id}`,
  COUPONS: `coupons-${TENANT_ID}`,
  SITE_CONFIG: `site-config-${TENANT_ID}`,
  HOMEPAGE: `homepage-${TENANT_ID}`,
  SHIPPING: `shipping-zones-${TENANT_ID}`,
  TENANT: `tenant-config-${TENANT_ID}`,
} as const
