import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { getTenantConfig } from '@/lib/config/tenant'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Devuelve un transporter SMTP autenticado con las credenciales del tenant.
 * Host/port/secure se leen de `platform_config` para poder cambiar de proveedor sin redeploy.
 * Lanzar desde Server Actions o Route Handlers — nunca desde Client Components.
 */
export async function getSmtpTransporter(): Promise<{ transporter: Transporter; from: string } | null> {
  const config = await getTenantConfig()

  if (!config.smtp_user || !config.smtp_pass) return null

  const supabase = createServiceClient()
  const { data: platform } = await supabase
    .from('platform_config')
    .select('smtp_host, smtp_port, smtp_secure')
    .limit(1)
    .single()

  const transporter = nodemailer.createTransport({
    host: platform?.smtp_host ?? 'smtp.hostinger.com',
    port: platform?.smtp_port ?? 465,
    secure: platform?.smtp_secure ?? true,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  })

  return {
    transporter,
    from: `${config.name} <${config.smtp_user}>`,
  }
}
