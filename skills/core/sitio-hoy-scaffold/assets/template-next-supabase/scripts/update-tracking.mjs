/**
 * update-tracking.mjs
 * Actualiza proyecto-tracking.json al finalizar un módulo.
 * Detecta automáticamente archivos modificados desde git.
 *
 * Uso:
 *   node scripts/update-tracking.mjs --modulo 1 --nombre "Layout Global"
 *   node scripts/update-tracking.mjs --modulo 1 --nombre "Layout Global" --tokens-input 38000 --tokens-output 18000
 *   node scripts/update-tracking.mjs --cierre   (cierra el proyecto con totales)
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const trackingPath = path.join(root, 'proyecto-tracking.json')
const ARG_OFFSET_MS = 3 * 60 * 60 * 1000

function argentinaISOString(date = new Date()) {
  const shifted = new Date(date.getTime() - ARG_OFFSET_MS)
  return `${shifted.toISOString().replace('Z', '')}-03:00`
}

function parseArgentinaDate(value) {
  return new Date(value)
}

const args = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg.startsWith('--')) {
    const key = arg.slice(2)
    const next = process.argv[i + 1]
    args.set(key, next && !next.startsWith('--') ? (i++, next) : true)
  }
}

// ── Inicializar si no existe ──────────────────────────────────────────────────
if (!existsSync(trackingPath)) {
  let config = { plan: 'esencial', business: { name: 'Proyecto' } }
  const configPath = path.join(root, 'sitiohoy.config.json')
  if (existsSync(configPath)) config = JSON.parse(await readFile(configPath, 'utf8'))

  const tracking = {
    proyecto: config.business?.name ?? config.project ?? 'Proyecto',
    plan: config.plan ?? 'esencial',
    modelo: process.env.AI_MODEL ?? 'claude-sonnet-4-6',
    precios_usd_por_1k_tokens: { input: 0.003, output: 0.015 },
    timezone: 'America/Argentina/Buenos_Aires',
    inicio_proyecto: argentinaISOString(),
    fin_proyecto: null,
    duracion_total_minutos: null,
    tokens_input_total: 0,
    tokens_output_total: 0,
    costo_total_usd: 0,
    modulos: [],
  }
  await writeFile(trackingPath, JSON.stringify(tracking, null, 2) + '\n')
  console.log('✅ proyecto-tracking.json inicializado')

  // Agregar a .gitignore si no está
  const gitignorePath = path.join(root, '.gitignore')
  if (existsSync(gitignorePath)) {
    const gi = await readFile(gitignorePath, 'utf8')
    if (!gi.includes('proyecto-tracking.json')) {
      await writeFile(gitignorePath, gi.trimEnd() + '\nproyecto-tracking.json\n')
    }
  }
}

const tracking = JSON.parse(await readFile(trackingPath, 'utf8'))

// ── Cierre de proyecto ────────────────────────────────────────────────────────
if (args.get('cierre')) {
  const mods = tracking.modulos
  tracking.fin_proyecto = argentinaISOString()
  tracking.duracion_total_minutos = mods.reduce((s, m) => s + (m.duracion_minutos ?? 0), 0)
  tracking.tokens_input_total = mods.reduce((s, m) => s + (m.tokens_input_estimados ?? 0), 0)
  tracking.tokens_output_total = mods.reduce((s, m) => s + (m.tokens_output_estimados ?? 0), 0)
  const p = tracking.precios_usd_por_1k_tokens
  tracking.costo_total_usd = parseFloat(
    ((tracking.tokens_input_total / 1000) * p.input + (tracking.tokens_output_total / 1000) * p.output).toFixed(4)
  )
  await writeFile(trackingPath, JSON.stringify(tracking, null, 2) + '\n')
  console.log(`\n✅ Proyecto cerrado`)
  console.log(`   Duración: ${tracking.duracion_total_minutos} min`)
  console.log(`   Costo total: $${tracking.costo_total_usd} USD`)
  process.exit(0)
}

// ── Actualizar módulo ─────────────────────────────────────────────────────────
const moduloNum = parseInt(args.get('modulo') ?? '-1', 10)
const nombre = args.get('nombre') ?? `Módulo ${moduloNum}`
const tokensInput = parseInt(args.get('tokens-input') ?? '0', 10)
const tokensOutput = parseInt(args.get('tokens-output') ?? '0', 10)

if (moduloNum < 0) {
  console.error('Uso: node scripts/update-tracking.mjs --modulo N --nombre "Nombre"')
  process.exit(1)
}

// Detectar archivos modificados desde git
let archivos_creados = []
let archivos_modificados = []
try {
  // Archivos sin stagear + stageados
  const gitStatus = execSync('git status --short', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  for (const line of gitStatus.trim().split('\n').filter(Boolean)) {
    const status = line.substring(0, 2).trim()
    const file = line.substring(3).trim()
    if (status === '?' || status === 'A') archivos_creados.push(file)
    else if (status === 'M' || status === 'AM') archivos_modificados.push(file)
  }
} catch {
  // fallback: diff con commit anterior
  try {
    const diff = execSync('git diff --name-only HEAD~1', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    archivos_modificados = diff.trim().split('\n').filter(Boolean)
  } catch { /* sin git o primer commit */ }
}

// Calcular duración desde el módulo anterior
const now = new Date()
const prevMod = tracking.modulos[tracking.modulos.length - 1]
const inicio = prevMod?.fin ?? tracking.inicio_proyecto
const duracion_minutos = Math.max(0, Math.round((now - parseArgentinaDate(inicio)) / 60000))

// Calcular costo
const p = tracking.precios_usd_por_1k_tokens
const costo = parseFloat(
  ((tokensInput / 1000) * p.input + (tokensOutput / 1000) * p.output).toFixed(4)
)

// Prevenir duplicados — si el módulo ya existe, actualizar
const existingIdx = tracking.modulos.findIndex(m => m.modulo === moduloNum)
const entry = {
  modulo: moduloNum,
  nombre,
  inicio,
  fin: argentinaISOString(now),
  duracion_minutos,
  tokens_input_estimados: tokensInput,
  tokens_output_estimados: tokensOutput,
  costo_estimado_usd: costo,
  archivos_creados,
  archivos_modificados,
  comandos_ejecutados: args.get('comandos') ? String(args.get('comandos')).split('|').map(s => s.trim()).filter(Boolean) : [],
  checks_completados: args.get('checks') ? String(args.get('checks')).split(',').map(s => s.trim()).filter(Boolean) : [],
  decisiones: args.get('decisiones') ? String(args.get('decisiones')).split('|').map(s => s.trim()).filter(Boolean) : [],
  datos_estimados: args.get('datos-estimados') ? String(args.get('datos-estimados')).split('|').map(s => s.trim()).filter(Boolean) : [],
  integraciones_verificadas: args.get('integraciones') ? String(args.get('integraciones')).split(',').map(s => s.trim()).filter(Boolean) : [],
  qa_resultado: args.get('qa') ?? '',
  bloqueos: args.get('bloqueos') ? String(args.get('bloqueos')).split('|').map(s => s.trim()).filter(Boolean) : [],
  notas: args.get('notas') ?? '',
}

if (existingIdx >= 0) {
  tracking.modulos[existingIdx] = { ...tracking.modulos[existingIdx], ...entry }
  console.log(`✅ Módulo ${moduloNum} actualizado en tracking`)
} else {
  tracking.modulos.push(entry)
  console.log(`✅ Módulo ${moduloNum} registrado en tracking`)
}

await writeFile(trackingPath, JSON.stringify(tracking, null, 2) + '\n')
console.log(`   Duración: ${duracion_minutos} min | Archivos: ${archivos_creados.length} creados, ${archivos_modificados.length} modificados`)
if (tokensInput > 0) console.log(`   Costo estimado: $${costo} USD`)
