import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const config = existsSync('sitiohoy.config.json')
  ? JSON.parse(await readFile('sitiohoy.config.json', 'utf8'))
  : { integrations: {} }

if (!config.integrations?.mercadopago) {
  console.log('MercadoPago no activo. Test omitido.')
  process.exit(0)
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_TENANT_ID', 'MP_WEBHOOK_SECRET']
const missingEnv = requiredEnv.filter(key => !process.env[key])
if (missingEnv.length) {
  console.error(`Faltan env vars MercadoPago/Supabase: ${missingEnv.join(', ')}`)
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase
  .from('tenants')
  .select('mp_access_token, mp_public_key')
  .eq('id', process.env.NEXT_PUBLIC_TENANT_ID)
  .single()

if (error) throw error
const missing = []
if (!data?.mp_access_token) missing.push('tenants.mp_access_token')
if (!data?.mp_public_key) missing.push('tenants.mp_public_key')

if (missing.length) {
  console.error(`MercadoPago incompleto: ${missing.join(', ')}`)
  process.exit(1)
}

console.log('MercadoPago smoke OK')
