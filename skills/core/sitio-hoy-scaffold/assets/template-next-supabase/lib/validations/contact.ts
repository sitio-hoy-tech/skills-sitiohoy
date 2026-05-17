import { z } from 'zod'

export const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),

  email: z.string().email('Email inválido').max(254, 'Email demasiado largo'),

  phone: z
    .string()
    .regex(/^[0-9\s\-\+\(\)]{6,20}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),

  message: z
    .string()
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(2000, 'El mensaje es demasiado largo'),

  /** Honeypot — debe estar vacío. Si tiene valor, es un bot. */
  website: z.string().max(0, 'Bot detectado').optional(),
})

export type ContactFormData = z.infer<typeof contactSchema>
