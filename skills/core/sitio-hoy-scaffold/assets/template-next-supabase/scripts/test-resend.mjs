import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const config = existsSync('sitiohoy.config.json')
  ? JSON.parse(await readFile('sitiohoy.config.json', 'utf8'))
  : { integrations: {} }

if (!config.integrations?.resend) {
  console.log('Resend no activo. Test omitido.')
  process.exit(0)
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_TENANT_ID']
const missingEnv = requiredEnv.filter(key => !process.env[key])
if (missingEnv.length) {
  console.error(`Faltan env vars Resend/Supabase: ${missingEnv.join(', ')}`)
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase
  .from('tenants')
  .select('resend_api_key')
  .eq('id', process.env.NEXT_PUBLIC_TENANT_ID)
  .single()

if (error) throw error
if (!data?.resend_api_key) {
  console.error('Resend incompleto: falta tenants.resend_api_key')
  process.exit(1)
}

console.log('Resend smoke OK')
