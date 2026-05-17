import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'

const args = new Map()
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i]
  if (arg.startsWith('--')) {
    const next = process.argv[i + 1]
    args.set(arg.slice(2), next && !next.startsWith('--') ? process.argv[++i] : true)
  }
}

const root = process.cwd()
const configPath = path.join(root, 'sitiohoy.config.json')
const briefPath = path.join(root, 'brief.md')

if (!existsSync(configPath)) {
  console.error('Falta sitiohoy.config.json. Ejecutar sitio-hoy-briefing primero.')
  process.exit(1)
}

const config = JSON.parse(await readFile(configPath, 'utf8'))
const brief = existsSync(briefPath) ? await readFile(briefPath, 'utf8') : ''
const outDir = path.join(root, '.sitiohoy', 'launch')
await mkdir(outDir, { recursive: true })

const slugify = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const deterministicUuid = (value) => {
  const bytes = crypto.createHash('sha256').update(value).digest()
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const pickBriefValue = (label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return brief.match(new RegExp(`^- ${escaped}:\\s*(.*)$`, 'mi'))?.[1]?.trim() ?? ''
}

const project = config.project ?? 'SitioHoy'
const slug = config.slug || slugify(project)
const plan = config.plan ?? 'esencial'
const tenantId = config.tenantId || deterministicUuid(`sitiohoy:${slug}`)
const siteUrl = String(args.get('domain') || config.siteUrl || '').replace(/\/$/, '')
const repo = String(args.get('repo') || slug)
const org = String(args.get('org') || 'ORG_GITHUB')
const adminEmail = String(args.get('admin-email') || `admin${slug}@sitiohoy.com.ar`)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9@._-]+/g, '-')
const adminPassword = crypto.randomBytes(18).toString('base64url')
const maxProducts = config.limits?.maxProducts ?? (plan === 'esencial' ? 50 : plan === 'emprendimiento' ? 200 : 1000)
const catalogDefaults = config.catalog ?? {}
const defaultWeightGrams = Number(catalogDefaults.defaultWeightGrams || 500)
const defaultDimensions = catalogDefaults.defaultDimensionsCm ?? {}
const defaultLengthCm = Number(defaultDimensions.length || 20)
const defaultWidthCm = Number(defaultDimensions.width || 15)
const defaultHeightCm = Number(defaultDimensions.height || 8)
const categories = (pickBriefValue('Categorias') || 'Destacados, Novedades')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 4)

// ── Image resolution ──────────────────────────────────────────────────────────
// Busca imágenes relevantes al rubro sin llamadas a LLM.
// Prioridad:
//   1. UNSPLASH_ACCESS_KEY definida → Unsplash Search API (1 request/categoría, máx 4)
//   2. Sin key → source.unsplash.com por keyword (gratis, sin auth)
//   3. Flag --no-images → placehold.co (comportamiento original)

const noImages = args.get('no-images')
const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

// Keyword de negocio: se toma de config.keywords, config.description, o el nombre del proyecto
const businessKeyword = String(config.keywords ?? config.description ?? project)
  .replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, ' ')
  .trim()
  .split(/\s+/)
  .slice(0, 3)
  .join(' ')

async function resolveImagesForCategory(category, count) {
  if (noImages) {
    return Array.from({ length: count }, (_, i) =>
      `https://placehold.co/900x1100/png?text=${encodeURIComponent(category)}+${i + 1}`,
    )
  }

  const keyword = `${category} ${businessKeyword}`.trim()

  if (unsplashKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=portrait`,
        { headers: { Authorization: `Client-ID ${unsplashKey}` } },
      )
      if (res.ok) {
        const data = await res.json()
        const photos = data.results ?? []
        if (photos.length > 0) {
          // Si vienen menos fotos de las necesarias, rota desde el principio
          return Array.from({ length: count }, (_, i) => photos[i % photos.length].urls.regular)
        }
      }
    } catch {
      // cae a source.unsplash.com
    }
  }

  // Sin key: source.unsplash.com — gratis, sin auth, keyword-based.
  // sig=i garantiza imágenes distintas para productos de la misma categoría.
  return Array.from({ length: count }, (_, i) =>
    `https://source.unsplash.com/900x1100/?${encodeURIComponent(keyword)}&sig=${i}`,
  )
}

// Resolver imágenes por categoría (máx 4 llamadas a Unsplash si hay key)
const categoryImages = {}
for (const category of categories) {
  categoryImages[category] = await resolveImagesForCategory(category, 3)
}

const integrations = config.integrations ?? {}
const envRows = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'https://PROJECT_REF.supabase.co'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  ['NEXT_PUBLIC_TENANT_ID', tenantId],
  ['NEXT_PUBLIC_SITE_NAME', project],
  ['NEXT_PUBLIC_URL', siteUrl || `https://${repo}.vercel.app`],
  ['MP_WEBHOOK_SECRET', integrations.mercadopago ? 'MP_WEBHOOK_SECRET' : ''],
  ['ENVIA_API_URL', integrations.envia ? 'https://api-test.envia.com' : ''],
  ['CA_API_URL', integrations.correoArgentino ? 'https://apitest.correoargentino.com.ar/micorreo/v1' : ''],
]

const demoProducts = categories.flatMap((category, categoryIndex) =>
  Array.from({ length: 3 }, (_, index) => ({
    category,
    name: `${category} ${index + 1}`,
    slug: slugify(`${category}-${index + 1}`),
    description: `Producto demo para validar grilla, cards, detalle y responsive de ${project}.`,
    price: 12000 + categoryIndex * 2500 + index * 900,
    compare_at_price: index === 0 ? 15900 + categoryIndex * 2500 : null,
    weight_grams: defaultWeightGrams,
    length_cm: defaultLengthCm,
    width_cm: defaultWidthCm,
    height_cm: defaultHeightCm,
    shipping_required: true,
    featured: categoryIndex === 0,
    image_url: categoryImages[category][index],
  })),
)

const sqlLiteral = (value) => {
  if (value === null || value === undefined || value === '') return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return `'${String(value).replaceAll("'", "''")}'`
}

const categorySql = categories
  .map((category, index) => `  (${sqlLiteral(tenantId)}::uuid, ${sqlLiteral(category)}, ${sqlLiteral(slugify(category))}, ${index}, true)`)
  .join(',\n')

const productSql = demoProducts
  .map(
    (product) => `  (
    ${sqlLiteral(tenantId)}::uuid,
    (SELECT id FROM public.categories WHERE tenant_id = ${sqlLiteral(tenantId)}::uuid AND slug = ${sqlLiteral(slugify(product.category))} LIMIT 1),
    ${sqlLiteral(product.name)},
    ${sqlLiteral(product.slug)},
    ${sqlLiteral(product.description)},
    ${sqlLiteral(product.price)},
    ${sqlLiteral(product.compare_at_price)},
    ${sqlLiteral(product.weight_grams)},
    ${sqlLiteral(product.length_cm)},
    ${sqlLiteral(product.width_cm)},
    ${sqlLiteral(product.height_cm)},
    ${sqlLiteral(product.shipping_required)},
    true,
    ${sqlLiteral(product.featured)}
  )`,
  )
  .join(',\n')

const imageSql = demoProducts
  .map(
    (product, index) => `  (
    ${sqlLiteral(tenantId)}::uuid,
    (SELECT id FROM public.products WHERE tenant_id = ${sqlLiteral(tenantId)}::uuid AND slug = ${sqlLiteral(product.slug)} LIMIT 1),
    ${sqlLiteral(product.image_url)},
    ${sqlLiteral(product.name)},
    ${index}
  )`,
  )
  .join(',\n')

const seedSql = `-- Demo data SitioHoy
-- Reemplazar cuando lleguen productos reales del cliente.

INSERT INTO public.tenants (id, name, slug, plan, status, max_products, url)
VALUES (${sqlLiteral(tenantId)}::uuid, ${sqlLiteral(project)}, ${sqlLiteral(slug)}, ${sqlLiteral(plan)}, 'active', ${sqlLiteral(maxProducts)}, ${sqlLiteral(siteUrl)})
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  max_products = EXCLUDED.max_products,
  url = EXCLUDED.url,
  updated_at = now();

INSERT INTO public.categories (tenant_id, name, slug, position, active)
VALUES
${categorySql}
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  active = EXCLUDED.active;

INSERT INTO public.products (
  tenant_id,
  category_id,
  name,
  slug,
  description,
  price,
  compare_at_price,
  weight_grams,
  length_cm,
  width_cm,
  height_cm,
  shipping_required,
  active,
  featured
)
VALUES
${productSql}
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  weight_grams = EXCLUDED.weight_grams,
  length_cm = EXCLUDED.length_cm,
  width_cm = EXCLUDED.width_cm,
  height_cm = EXCLUDED.height_cm,
  shipping_required = EXCLUDED.shipping_required,
  active = EXCLUDED.active,
  featured = EXCLUDED.featured,
  updated_at = now();

DELETE FROM public.product_images
WHERE tenant_id = ${sqlLiteral(tenantId)}::uuid
  AND url LIKE 'https://placehold.co/%';

INSERT INTO public.product_images (tenant_id, product_id, url, alt, position)
VALUES
${imageSql};
`

const provisionScript = `import { createClient } from '@supabase/supabase-js'

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAIL']
for (const key of required) {
  if (!process.env[key]) {
    console.error(\`Falta env var: \${key}\`)
    process.exit(1)
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const tenant = {
  id: process.env.NEXT_PUBLIC_TENANT_ID || '${tenantId}',
  name: process.env.TENANT_NAME || '${project.replaceAll("'", "\\'")}',
  slug: process.env.TENANT_SLUG || '${slug}',
  plan: process.env.TENANT_PLAN || '${plan}',
  status: 'active',
  max_products: Number(process.env.TENANT_MAX_PRODUCTS || ${Number(maxProducts) || 1000}),
  url: process.env.NEXT_PUBLIC_URL || '${siteUrl}',
}

const password = process.env.ADMIN_PASSWORD
if (!password) {
  console.error('Falta ADMIN_PASSWORD. Usar un secreto temporal y rotarlo luego.')
  process.exit(1)
}

const { data: tenantRow, error: tenantError } = await supabase
  .from('tenants')
  .upsert(tenant, { onConflict: 'slug' })
  .select('id')
  .single()

if (tenantError) throw tenantError

const { data: userData, error: userError } = await supabase.auth.admin.createUser({
  email: process.env.ADMIN_EMAIL,
  password,
  email_confirm: true,
  user_metadata: { tenant_id: tenantRow.id, role: 'owner' },
  app_metadata: { tenant_id: tenantRow.id, role: 'owner' },
})

if (userError && !String(userError.message).toLowerCase().includes('already registered')) {
  throw userError
}

let userId = userData?.user?.id
if (!userId) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw listError
  userId = listed.users.find((user) => user.email === process.env.ADMIN_EMAIL)?.id
}

if (!userId) {
  throw new Error('No se pudo resolver el usuario admin.')
}

const { error: linkError } = await supabase
  .from('user_tenants')
  .upsert({ user_id: userId, tenant_id: tenantRow.id, role: 'owner' }, { onConflict: 'user_id,tenant_id' })

if (linkError) throw linkError

console.log(JSON.stringify({ tenantId: tenantRow.id, adminUserId: userId }, null, 2))
`

const envExample = envRows.map(([key, value]) => `${key}=${value}`).join('\n')
const updatedConfig = {
  ...config,
  tenantId,
  siteUrl: siteUrl || config.siteUrl || '',
}

const commands = `#!/usr/bin/env bash
set -euo pipefail

# 1) GitHub
gh repo create ${org}/${repo} --private --source=. --remote=origin --push

# 2) Supabase migraciones
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push

# 3) Supabase tenant/admin
ADMIN_EMAIL="${adminEmail}" ADMIN_PASSWORD="$(node -p "require('./.sitiohoy/launch/admin-credentials.local.json').password")" node .sitiohoy/launch/provision-supabase.mjs

# 4) Supabase datos demo
# El seed demo ya fue escrito en supabase/migrations/003_seed_demo_data.sql.
# Cualquier cambio posterior se aplica con Supabase CLI, no con SQL Editor.
supabase db push

# 5) Vercel
vercel link --yes --project ${repo}
vercel env pull .env.vercel.local
# Cargar variables desde .sitiohoy/launch/vercel-env.example con vercel env add o dashboard.
vercel deploy
vercel deploy --prod

# 6) QA visual final
# Levantar servidor local o usar preview/production URL y revisar .sitiohoy/qa/visual/
SITE_URL="${siteUrl || `https://${repo}.vercel.app`}" npm run sitiohoy:visual-audit
`

const launchPlan = `# Launch Plan - ${project}

## Identidad

- Proyecto: ${project}
- Slug: ${slug}
- Plan: ${plan}
- Tenant ID: ${tenantId}
- Admin email: ${adminEmail}
- GitHub: ${org}/${repo}
- URL esperada: ${siteUrl || `https://${repo}.vercel.app`}

## Orden recomendado

1. Revisar QA final.
2. Crear repo GitHub y hacer push inicial.
3. Crear/vincular proyecto Supabase con CLI y aplicar migraciones con \`supabase db push\`.
4. Ejecutar provisioning tenant/admin.
5. Cargar productos demo con imágenes Unsplash vía migración \`003_seed_demo_data.sql\`.
6. Importar repo en Vercel.
7. Cargar env vars en Vercel.
8. Deploy preview.
9. Deploy production.
10. Ejecutar auditoría visual responsive con el sitio deployado o servidor local activo.
11. Configurar dominio, webhooks y compra/formulario de prueba.

## Comandos

Ver \`.sitiohoy/launch/commands.sh\`.

## Checks criticos

- [ ] \`tenantId\` copiado a \`sitiohoy.config.json\` y Vercel como \`NEXT_PUBLIC_TENANT_ID\`.
- [ ] Fila \`tenants\` existe para \`${slug}\`.
- [ ] Usuario admin existe en Supabase Auth.
- [ ] \`user_tenants\` asocia admin con tenant como \`owner\`.
- [ ] Productos demo se ven bien en home, catalogo y detalle.
- [ ] \`SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit\` ejecutado sin errores y screenshots revisados.
- [ ] Pesos/dimensiones de productos están cargados o marcados como estimados.
- [ ] Cualquier cambio subido a Supabase se aplicó con Supabase CLI.
- [ ] No hay secretos reales en Git.
- [ ] Webhooks MercadoPago apuntan a Production si corresponde.
`

await writeFile(path.join(outDir, 'launch-plan.md'), launchPlan)
await writeFile(path.join(outDir, 'commands.sh'), commands, { mode: 0o755 })
await writeFile(path.join(outDir, 'vercel-env.example'), `${envExample}\n`)
await writeFile(path.join(outDir, 'provision-supabase.mjs'), provisionScript)
await writeFile(path.join(outDir, 'demo-products.json'), `${JSON.stringify(demoProducts, null, 2)}\n`)
await writeFile(path.join(outDir, 'seed-demo-data.sql'), seedSql)
await mkdir(path.join(root, 'supabase', 'migrations'), { recursive: true })
await writeFile(path.join(root, 'supabase', 'migrations', '003_seed_demo_data.sql'), seedSql)
await writeFile(path.join(outDir, 'admin-credentials.local.json'), `${JSON.stringify({ email: adminEmail, password: adminPassword, note: 'Credenciales admin generadas para provisioning. No commitear.' }, null, 2)}\n`)

const gitignorePath = path.join(root, '.gitignore')
const ignoredCredential = '.sitiohoy/launch/admin-credentials.local.json'
if (existsSync(gitignorePath)) {
  const gitignore = await readFile(gitignorePath, 'utf8')
  if (!gitignore.includes(ignoredCredential)) {
    await writeFile(gitignorePath, `${gitignore.trimEnd()}\n${ignoredCredential}\n`)
  }
} else {
  await writeFile(gitignorePath, `${ignoredCredential}\n`)
}
await writeFile(configPath, `${JSON.stringify(updatedConfig, null, 2)}\n`)

console.log('sitiohoy.config.json')
console.log('.sitiohoy/launch/launch-plan.md')
console.log('.sitiohoy/launch/commands.sh')
console.log('.sitiohoy/launch/vercel-env.example')
console.log('.sitiohoy/launch/provision-supabase.mjs')
console.log('.sitiohoy/launch/demo-products.json')
console.log('.sitiohoy/launch/seed-demo-data.sql')
console.log('.sitiohoy/launch/admin-credentials.local.json')
console.log('supabase/migrations/003_seed_demo_data.sql')
