import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const config = existsSync('sitiohoy.config.json')
  ? JSON.parse(await readFile('sitiohoy.config.json', 'utf8'))
  : { integrations: {} }

if (!config.integrations?.correoArgentino) {
  console.log('Correo Argentino no activo. Test omitido.')
  process.exit(0)
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_TENANT_ID', 'CA_API_URL']
const missingEnv = requiredEnv.filter(key => !process.env[key])
if (missingEnv.length) {
  console.error(`Faltan env vars Correo Argentino/Supabase: ${missingEnv.join(', ')}`)
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: tenant, error: tenantError } = await supabase
  .from('tenants')
  .select('correo_argentino_customer_id, origin_name, origin_phone, origin_address, origin_city, origin_state, origin_postal_code')
  .eq('id', process.env.NEXT_PUBLIC_TENANT_ID)
  .single()

if (tenantError) throw tenantError

const { data: platform, error: platformError } = await supabase
  .from('platform_config')
  .select('correo_argentino_user, correo_argentino_password')
  .limit(1)
  .single()

if (platformError) throw platformError

const tenantFields = ['correo_argentino_customer_id', 'origin_name', 'origin_phone', 'origin_address', 'origin_city', 'origin_state', 'origin_postal_code']
const platformFields = ['correo_argentino_user', 'correo_argentino_password']
const missing = [
  ...tenantFields.filter(field => !tenant?.[field]).map(field => `tenants.${field}`),
  ...platformFields.filter(field => !platform?.[field]).map(field => `platform_config.${field}`),
]

if (missing.length) {
  console.error(`Correo Argentino incompleto: ${missing.join(', ')}`)
  process.exit(1)
}

console.log('Correo Argentino smoke OK')
