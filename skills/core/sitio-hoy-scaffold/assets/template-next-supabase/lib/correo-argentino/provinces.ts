/**
 * Códigos de provincia para la API de MiCorreo (Correo Argentino).
 * IMPORTANTE: Estos son distintos de lib/envia/provinces.ts (ISO 3166-2:AR).
 * MiCorreo usa una sola letra; ISO usa formato "AR-X".
 */
export const CA_PROVINCE_CODES: Record<string, string> = {
  salta: 'A',
  'buenos aires': 'B',
  'provincia de buenos aires': 'B',
  'ciudad autónoma de buenos aires': 'C',
  'ciudad autonoma de buenos aires': 'C',
  caba: 'C',
  'capital federal': 'C',
  'san luis': 'D',
  'entre ríos': 'E',
  'entre rios': 'E',
  'la rioja': 'F',
  'santiago del estero': 'G',
  chaco: 'H',
  'san juan': 'J',
  catamarca: 'K',
  'la pampa': 'L',
  mendoza: 'M',
  misiones: 'N',
  formosa: 'P',
  'neuquén': 'Q',
  neuquen: 'Q',
  'río negro': 'R',
  'rio negro': 'R',
  'santa fe': 'S',
  'tucumán': 'T',
  tucuman: 'T',
  chubut: 'U',
  'tierra del fuego': 'V',
  corrientes: 'W',
  'córdoba': 'X',
  cordoba: 'X',
  jujuy: 'Y',
  'santa cruz': 'Z',
}

/** Convierte nombre de provincia a código de 1 letra para MiCorreo. */
export const toCAProvinceCode = (province: string): string =>
  CA_PROVINCE_CODES[province.toLowerCase().trim()] ?? province.slice(0, 1).toUpperCase()
