/**
 * validate-supabase-remote.mjs
 * Valida schema remoto de Supabase. Usa psql si SUPABASE_DB_URL existe.
 * Si no, usa Supabase JS como validación básica de tablas/columnas.
 */

import { spawnSync } from 'node:child_process'

const requiredTables = [
  'tenants',
  'user_tenants',
  'categories',
  'subcategories',
  'products',
  'product_images',
  'product_variants',
  'orders',
  'order_items',
  'coupons',
  'shipping_zones',
  'contact_messages',
  'order_events',
  'payment_events',
  'platform_config',
]

const requiredColumns = {
  tenants: ['id', 'name', 'slug', 'plan', 'url', 'revalidation_secret', 'mp_access_token', 'mp_public_key', 'resend_api_key', 'contact_email', 'envia_access_token', 'correo_argentino_customer_id', 'origin_postal_code'],
  products: ['id', 'tenant_id', 'name', 'slug', 'price', 'compare_at_price', 'stock', 'stock_unlimited', 'weight_grams', 'length_cm', 'width_cm', 'height_cm', 'shipping_required'],
  orders: ['id', 'tenant_id', 'mp_payment_id', 'total', 'payer_email', 'tracking_token'],
  payment_events: ['id', 'tenant_id', 'order_id', 'provider', 'payload'],
  order_events: ['id', 'tenant_id', 'order_id', 'type', 'payload'],
  platform_config: ['id', 'correo_argentino_user', 'correo_argentino_password', 'correo_argentino_token', 'correo_argentino_token_expires_at'],
}

const errors = []
const warnings = []

function runPsql(sql) {
  const result = spawnSync('psql', [process.env.SUPABASE_DB_URL, '-At', '-c', sql], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout.trim()
}

async function validateWithPsql() {
  for (const table of requiredTables) {
    const exists = runPsql(`select exists(select 1 from information_schema.tables where table_schema='public' and table_name='${table}');`)
    if (exists !== 't') errors.push(`Falta tabla public.${table}`)
  }

  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const column of columns) {
      const exists = runPsql(`select exists(select 1 from information_schema.columns where table_schema='public' and table_name='${table}' and column_name='${column}');`)
      if (exists !== 't') errors.push(`Falta columna public.${table}.${column}`)
    }
  }

  for (const table of requiredTables) {
    const rls = runPsql(`select coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.${table}')), false);`)
    if (rls !== 't') errors.push(`RLS no habilitado en public.${table}`)
  }
}

async function validateWithSupabaseJs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    errors.push('Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY o SUPABASE_DB_URL.')
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error) errors.push(`No se pudo leer ${table}: ${error.message}`)
  }

  for (const [table, columns] of Object.entries(requiredColumns)) {
    const { error } = await supabase.from(table).select(columns.join(',')).limit(1)
    if (error) errors.push(`Columnas faltantes o inválidas en ${table}: ${error.message}`)
  }

  warnings.push('Validación Supabase JS no puede confirmar RLS. Para RLS usar SUPABASE_DB_URL + psql.')
}

if (process.env.SUPABASE_DB_URL) {
  await validateWithPsql()
} else {
  await validateWithSupabaseJs()
}

if (warnings.length) warnings.forEach(w => console.log(`WARN ${w}`))
if (errors.length) {
  errors.forEach(e => console.log(`ERR  ${e}`))
  process.exit(1)
}

console.log('Supabase remote validation OK')
