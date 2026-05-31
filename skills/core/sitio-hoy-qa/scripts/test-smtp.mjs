import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const config = existsSync('sitiohoy.config.json')
  ? JSON.parse(await readFile('sitiohoy.config.json', 'utf8'))
  : { integrations: {} }

if (!config.integrations?.smtp) {
  console.log('SMTP no activo. Test omitido.')
  process.exit(0)
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_TENANT_ID']
const missingEnv = requiredEnv.filter(key => !process.env[key])
if (missingEnv.length) {
  console.error(`Faltan env vars SMTP/Supabase: ${missingEnv.join(', ')}`)
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase
  .from('tenants')
  .select('smtp_user')
  .eq('id', process.env.NEXT_PUBLIC_TENANT_ID)
  .single()

if (error) throw error
if (!data?.smtp_user) {
  console.error('SMTP incompleto: falta tenants.smtp_user')
  process.exit(1)
}

console.log('SMTP smoke OK')
