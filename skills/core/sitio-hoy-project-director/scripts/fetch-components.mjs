#!/usr/bin/env node
/**
 * SitioHoy — Component Fetcher
 *
 * Para cada template en data/templates/index.json, descarga los archivos
 * de componentes clave (Hero, ProductCard, Navbar, Footer, Checkout, Cart)
 * desde GitHub y los guarda en data/templates/components/{template-id}/.
 *
 * La skill lee estos archivos como referencia de código real al generar
 * layouts, en vez de inventar componentes desde cero.
 *
 * Uso:
 *   node fetch-components.mjs                        # todos los templates
 *   node fetch-components.mjs --id vercel-commerce   # un template específico
 *   node fetch-components.mjs --max-files 8          # límite por template
 *   node fetch-components.mjs --github-token ghp_xxx
 *
 * Env vars:
 *   GITHUB_TOKEN   Recomendado: 5000 req/h vs 60 sin token
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = path.join(__dirname, '..', 'data', 'templates')
const COMP_DIR  = path.join(DATA_DIR, 'components')
const INDEX     = path.join(DATA_DIR, 'index.json')

// ── Args ──────────────────────────────────────────────────────────────────────
const args = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg.startsWith('--')) {
    const next = process.argv[i + 1]
    args.set(arg.slice(2), next && !next.startsWith('--') ? process.argv[++i] : true)
  }
}

const filterById   = args.get('id')
const maxFiles     = Number(args.get('max-files') ?? 10)
const githubToken  = args.get('github-token') || process.env.GITHUB_TOKEN || ''
const verbose      = args.get('verbose') === true

const log   = (...m) => console.log(' ', ...m)
const debug = (...m) => { if (verbose) console.log('  [debug]', ...m) }
const ok    = (...m) => console.log('  ✓', ...m)
const warn  = (...m) => console.warn('  ⚠', ...m)
const fail  = (...m) => console.error('  ✗', ...m)

// ── GitHub helpers ────────────────────────────────────────────────────────────
const ghHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
}

async function ghGet(url) {
  debug(`GET ${url}`)
  const res = await fetch(url, { headers: ghHeaders })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub ${res.status} — ${url}`)
  return res.json()
}

async function ghRaw(repo, filePath, branch = 'main') {
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`
  debug(`RAW ${url}`)
  const res = await fetch(url)
  if (!res.ok) return null
  return res.text()
}

// Obtener branch default del repo
async function getDefaultBranch(repo) {
  const data = await ghGet(`https://api.github.com/repos/${repo}`)
  return data?.default_branch ?? 'main'
}

// Obtener árbol completo del repo (recursivo, 1 sola llamada)
async function getTree(repo, branch) {
  const data = await ghGet(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`
  )
  return data?.tree ?? []
}

// ── Patrones de componentes a buscar ─────────────────────────────────────────
// Cada entrada: { key, patterns, description }
// patterns: regex sobre el path del archivo (case-insensitive)
const COMPONENT_PATTERNS = [
  {
    key: 'hero',
    patterns: [/hero/i, /banner\.tsx?$/i, /jumbotron/i],
    description: 'Sección principal / hero de la homepage',
  },
  {
    key: 'product-card',
    patterns: [/product[\s_-]?card/i, /productcard/i, /item[\s_-]?card/i, /product[\s_-]?item/i],
    description: 'Card de producto en grilla / listado',
  },
  {
    key: 'product-detail',
    patterns: [/product[\s_-]?detail/i, /product[\s_-]?page/i, /\[slug\].*page\.tsx?$/i, /product.*\[id\]/i],
    description: 'Página de detalle de producto',
  },
  {
    key: 'navbar',
    patterns: [/navbar/i, /nav[\s_-]?bar/i, /header\.tsx?$/i, /navigation\.tsx?$/i, /topbar/i],
    description: 'Barra de navegación principal',
  },
  {
    key: 'footer',
    patterns: [/footer\.tsx?$/i, /footer\/index\.tsx?$/i],
    description: 'Pie de página',
  },
  {
    key: 'cart',
    patterns: [/cart(?!egory)/i, /basket/i, /shopping[\s_-]?bag/i],
    description: 'Carrito / drawer de compra',
  },
  {
    key: 'checkout',
    patterns: [/checkout/i],
    description: 'Flujo de checkout',
  },
  {
    key: 'homepage',
    patterns: [/^app\/page\.tsx?$/i, /^src\/app\/page\.tsx?$/i, /^pages\/index\.tsx?$/i],
    description: 'Homepage / página principal',
  },
  {
    key: 'grid',
    patterns: [/product[\s_-]?grid/i, /product[\s_-]?list/i, /catalog/i, /grid\.tsx?$/i],
    description: 'Grilla de productos / catálogo',
  },
]

// Extensiones válidas
const VALID_EXTS = ['.tsx', '.jsx', '.ts', '.js', '.css', '.module.css']

// Directorios donde buscar (ignorar node_modules, .next, dist, etc.)
const SEARCH_DIRS = ['components', 'src/components', 'app', 'src/app', 'pages', 'src/pages', 'ui', 'src/ui']

function isSearchable(filePath) {
  const ext = path.extname(filePath)
  if (!VALID_EXTS.includes(ext)) return false
  if (/node_modules|\.next|dist|\.git|coverage|__tests__|\.test\.|\.spec\./.test(filePath)) return false
  return SEARCH_DIRS.some((dir) => filePath.startsWith(dir + '/') || filePath.startsWith('src/' + dir.replace('src/', '') + '/'))
}

function matchComponent(filePath) {
  for (const { key, patterns, description } of COMPONENT_PATTERNS) {
    if (patterns.some((p) => p.test(filePath))) {
      return { key, description }
    }
  }
  return null
}

// ── Fetch componentes de un template ─────────────────────────────────────────
async function fetchTemplateComponents(template) {
  const { id, repo } = template
  log(`\n  ${id} (${repo})`)

  const destDir = path.join(COMP_DIR, id)
  await mkdir(destDir, { recursive: true })

  // Cargar manifest existente para no re-descargar sin cambios
  const manifestPath = path.join(destDir, 'manifest.json')
  let manifest = existsSync(manifestPath)
    ? JSON.parse(await readFile(manifestPath, 'utf8'))
    : { id, repo, fetched_at: null, components: {} }

  let branch
  try {
    branch = await getDefaultBranch(repo)
    debug(`branch: ${branch}`)
  } catch (e) {
    warn(`No se pudo acceder a ${repo}: ${e.message}`)
    return
  }

  let tree
  try {
    tree = await getTree(repo, branch)
  } catch (e) {
    warn(`No se pudo obtener el árbol de ${repo}: ${e.message}`)
    return
  }

  // Filtrar archivos relevantes y matchear componentes
  const candidates = {}  // key → [{ path, score }]

  for (const file of tree) {
    if (file.type !== 'blob') continue
    if (!isSearchable(file.path)) continue

    const match = matchComponent(file.path)
    if (!match) continue

    if (!candidates[match.key]) candidates[match.key] = []
    // Preferir archivos más cortos en el path (menos anidados)
    candidates[match.key].push({ path: file.path, depth: file.path.split('/').length })
  }

  // Para cada componente, tomar el candidato menos anidado
  const toFetch = []
  for (const [key, files] of Object.entries(candidates)) {
    files.sort((a, b) => a.depth - b.depth)
    toFetch.push({ key, filePath: files[0].path })
    if (toFetch.length >= maxFiles) break
  }

  if (toFetch.length === 0) {
    warn(`Sin componentes reconocidos en ${repo}`)
    return
  }

  // Descargar
  let downloaded = 0
  for (const { key, filePath } of toFetch) {
    const ext  = path.extname(filePath)
    const dest = path.join(destDir, `${key}${ext}`)

    const content = await ghRaw(repo, filePath, branch)
    if (!content) { warn(`No se pudo descargar ${filePath}`); continue }

    // Agregar header con metadata
    const header = [
      `// Source: https://github.com/${repo}/blob/${branch}/${filePath}`,
      `// Template: ${template.name}`,
      `// Component: ${key}`,
      `// Demo: ${template.demo_url ?? ''}`,
      '',
    ].join('\n')

    await writeFile(dest, header + content, 'utf8')
    manifest.components[key] = { file: `${key}${ext}`, source_path: filePath, description: COMPONENT_PATTERNS.find(p => p.key === key)?.description ?? '' }
    ok(`${key} → ${key}${ext}`)
    downloaded++

    // Respetar rate limit sin token
    if (!githubToken) await new Promise((r) => setTimeout(r, 800))
  }

  manifest.fetched_at = new Date().toISOString().slice(0, 10)
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  log(`  ${downloaded} componentes descargados`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (!existsSync(INDEX)) {
  fail('data/templates/index.json no encontrado. Ejecutar fetch-templates.mjs primero.')
  process.exit(1)
}

const { templates } = JSON.parse(await readFile(INDEX, 'utf8'))

let targets = templates.filter((t) => t.source !== 'placeholder')
if (filterById) {
  targets = targets.filter((t) => t.id === filterById)
  if (targets.length === 0) {
    fail(`Template "${filterById}" no encontrado en index.json`)
    process.exit(1)
  }
}

await mkdir(COMP_DIR, { recursive: true })

log('')
log('SitioHoy — Component Fetcher')
log(`Templates a procesar: ${targets.length}`)
if (!githubToken) warn('Sin GITHUB_TOKEN — rate limit: 60 req/h. Usar --github-token o GITHUB_TOKEN env.')
log('')

for (const template of targets) {
  try {
    await fetchTemplateComponents(template)
  } catch (e) {
    fail(`Error en ${template.id}: ${e.message}`)
  }
}

log('')
log('Componentes guardados en data/templates/components/')
log('La skill los usará como referencia al generar layouts.')
log('')
