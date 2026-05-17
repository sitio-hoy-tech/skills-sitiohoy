/**
 * Provincias argentinas — código ISO 3166-2:AR → nombre display
 * Usado para normalizar la provincia del comprador antes de cotizar envío con Envia.com
 */
export const PROVINCES: Record<string, string> = {
  'AR-B': 'Buenos Aires',
  'AR-C': 'Ciudad Autónoma de Buenos Aires',
  'AR-K': 'Catamarca',
  'AR-H': 'Chaco',
  'AR-U': 'Chubut',
  'AR-X': 'Córdoba',
  'AR-W': 'Corrientes',
  'AR-E': 'Entre Ríos',
  'AR-P': 'Formosa',
  'AR-Y': 'Jujuy',
  'AR-L': 'La Pampa',
  'AR-F': 'La Rioja',
  'AR-M': 'Mendoza',
  'AR-N': 'Misiones',
  'AR-Q': 'Neuquén',
  'AR-R': 'Río Negro',
  'AR-A': 'Salta',
  'AR-J': 'San Juan',
  'AR-D': 'San Luis',
  'AR-Z': 'Santa Cruz',
  'AR-S': 'Santa Fe',
  'AR-G': 'Santiago del Estero',
  'AR-V': 'Tierra del Fuego',
  'AR-T': 'Tucumán',
}

/** Devuelve el nombre display de la provincia o el valor original si no se encuentra. */
export function getProvinceName(isoCode: string): string {
  return PROVINCES[isoCode] ?? isoCode
}

/** Lista para usar en selects de formulario */
export const PROVINCE_OPTIONS = Object.entries(PROVINCES).map(([value, label]) => ({
  value,
  label,
}))
