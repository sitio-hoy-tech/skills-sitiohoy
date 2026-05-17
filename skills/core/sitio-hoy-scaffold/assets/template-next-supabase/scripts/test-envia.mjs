import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const config = existsSync('sitiohoy.config.json')
  ? JSON.parse(await readFile('sitiohoy.config.json', 'utf8'))
  : { integrations: {} }

if (!config.integrations?.envia) {
  console.log('Envia.com no activo. Test omitido.')
  process.exit(0)
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_TENANT_ID', 'ENVIA_API_URL']
const missingEnv = requiredEnv.filter(key => !process.env[key])
if (missingEnv.length) {
  console.error(`Faltan env vars Envia/Supabase: ${missingEnv.join(', ')}`)
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase
  .from('tenants')
  .select('envia_access_token, origin_name, origin_phone, origin_address, origin_city, origin_state, origin_postal_code')
  .eq('id', process.env.NEXT_PUBLIC_TENANT_ID)
  .single()

if (error) throw error
const fields = ['envia_access_token', 'origin_name', 'origin_phone', 'origin_address', 'origin_city', 'origin_state', 'origin_postal_code']
const missing = fields.filter(field => !data?.[field])

if (missing.length) {
  console.error(`Envia.com incompleto: ${missing.map(field => `tenants.${field}`).join(', ')}`)
  process.exit(1)
}

console.log('Envia.com smoke OK')
