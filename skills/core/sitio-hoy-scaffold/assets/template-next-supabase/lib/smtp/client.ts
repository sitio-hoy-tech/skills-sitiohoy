import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { getTenantConfig } from '@/lib/config/tenant'

/**
 * Devuelve un transporter SMTP autenticado con las credenciales del tenant.
 * Lanzar desde Server Actions o Route Handlers — nunca desde Client Components.
 */
export async function getSmtpTransporter(): Promise<{ transporter: Transporter; from: string } | null> {
  const config = await getTenantConfig()

  if (!config.smtp_user || !config.smtp_pass) return null

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
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
