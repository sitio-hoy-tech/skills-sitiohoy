---
skill: seo
descripcion: SEO completo — metadata, Schema.org, sitemap, robots, CWV, AI Overviews
tipo: core — Módulos 2, 3 y 6
---

# SEO Optimizado

## Metadata dinámica por ruta

```typescript
// app/(public)/catalogo/[slug]/page.tsx
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const product = await getProductBySlug(params.slug)
  if (!product) return {}

  return {
    title: `${product.name} | ${siteConfig.name}`,
    description: product.description?.slice(0, 160) ?? '',
    alternates: { canonical: `${siteConfig.url}/catalogo/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160) ?? '',
      images: [{ url: product.product_images?.[0]?.url ?? '', width: 1200, height: 630, alt: product.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      images: [product.product_images?.[0]?.url ?? ''],
    },
  }
}
```

## Schema.org por tipo de página

| Página | Schemas requeridos |
|---|---|
| Home | `Organization`, `WebSite`, `SearchAction` |
| Catálogo | `ItemList`, `BreadcrumbList` |
| Producto | `Product`, `Offer`, `BreadcrumbList` |
| Blog/CMS | `Article`, `BreadcrumbList` |
| Blog Listado | `CollectionPage`, `BreadcrumbList` |

### Schema.org para Blog Post

```typescript
// components/seo/SchemaArticle.tsx
export const SchemaArticle = ({ post, siteConfig }: Props) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Organization',
      name: siteConfig.name,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: { '@type': 'ImageObject', url: siteConfig.logo_url },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteConfig.url}/blog/${post.slug}`,
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

```typescript
// components/seo/SchemaProduct.tsx
export const SchemaProduct = ({ product, siteConfig }: Props) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.product_images?.map(i => i.url) ?? [],
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'ARS',
      availability: (product.product_variants?.some(v => v.stock > 0) ?? true)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: siteConfig.name },
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

## Sitemap dinámico

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const products = await getAllProducts()

  const blogPosts = await getAllBlogPosts() // solo published

  return [
    { url: process.env.NEXT_PUBLIC_URL!, changeFrequency: 'daily', priority: 1.0 },
    { url: `${process.env.NEXT_PUBLIC_URL}/catalogo`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${process.env.NEXT_PUBLIC_URL}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    ...products.map(p => ({
      url: `${process.env.NEXT_PUBLIC_URL}/catalogo/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...blogPosts.map(post => ({
      url: `${process.env.NEXT_PUBLIC_URL}/blog/${post.slug}`,
      lastModified: post.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}

export default sitemap
```

## robots.txt — con permisos para rastreadores IA

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next'

const robots = (): MetadataRoute.Robots => ({
  rules: [
    { userAgent: '*', allow: '/', disallow: ['/api/'] },
    { userAgent: 'GPTBot', allow: '/' },
    { userAgent: 'PerplexityBot', allow: '/' },
    { userAgent: 'Claude-Web', allow: '/' },
    { userAgent: 'Google-Extended', allow: '/' },
    { userAgent: 'Anthropic-AI', allow: '/' },
  ],
  sitemap: `${process.env.NEXT_PUBLIC_URL}/sitemap.xml`,
})

export default robots
```

## Optimización para AI Overviews / SGE

- Párrafos cortos y factuales al inicio de cada descripción de producto
- Responder las preguntas clave al inicio: ¿qué es?, ¿para qué sirve?, ¿cuánto cuesta?
- `FAQPage` schema en páginas de categoría
- Velocidad LCP < 2.5s — requisito mínimo para aparecer en AI snippets
- Sección "Sobre la empresa" visible con datos de contacto completos
- Alt text descriptivo en todas las imágenes: nunca vacío, nunca "foto1.jpg"

## Core Web Vitals — Requisitos mínimos

| Métrica | Objetivo |
|---|---|
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |
| Score Lighthouse | ≥ 90 en todas las categorías |

Verificar con Lighthouse antes de cada entrega de módulo público.
