import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_TENANT_ID: z.string().uuid(),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1),
  NEXT_PUBLIC_URL: z.string().url(),
  REVALIDATION_SECRET: z.string().min(24).optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().optional(),
  ENVIA_API_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
