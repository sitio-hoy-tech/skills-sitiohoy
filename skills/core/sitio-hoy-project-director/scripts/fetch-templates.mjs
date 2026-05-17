#!/usr/bin/env node
/**
 * SitioHoy — Template Fetcher
 *
 * Recopila templates de Next.js + Tailwind desde GitHub y la lista curada,
 * y guarda el resultado en data/templates/index.json.
 *
 * Uso:
 *   node fetch-templates.mjs
 *   node fetch-templates.mjs --github-token ghp_xxx   # más rate limit
 *   node fetch-templates.mjs --no-github              # solo lista curada
 *   node fetch-templates.mjs --verbose
 *
 * Env vars:
 *   GITHUB_TOKEN   Token opcional para 5000 req/h en vez de 60
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data', 'templates')
const OUTPUT = path.join(DATA_DIR, 'index.json')

// ── Args ──────────────────────────────────────────────────────────────────────
const args = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg.startsWith('--')) {
    const next = process.argv[i + 1]
    args.set(arg.slice(2), next && !next.startsWith('--') ? process.argv[++i] : true)
  }
}
const verbose = args.get('verbose') === true
const skipGithub = args.get('no-github') === true
const githubToken = args.get('github-token') || process.env.GITHUB_TOKEN || ''

const log = (...msg) => console.log(' ', ...msg)
const debug = (...msg) => { if (verbose) console.log('  [debug]', ...msg) }

// ── Lista curada (siempre incluida) ───────────────────────────────────────────
// Templates seleccionados a mano por relevancia para proyectos SitioHoy.
// Agregar aquí nuevos templates sin esperar el fetch de GitHub.
const CURATED = [
  {
    id: 'vercel-commerce',
    name: 'Next.js Commerce',
    source: 'curated',
    repo: 'vercel/commerce',
    demo_url: 'https://demo.vercel.store',
    preview_url: 'https://vercel.com/templates/next.js/nextjs-commerce',
    tags: ['ecommerce', 'nextjs', 'tailwind', 'shopify', 'typescript'],
    plan_fit: ['emprendimiento', 'empresa'],
    industry: ['retail', 'moda', 'tecnología'],
    description: 'E-commerce de alto rendimiento con Next.js App Router. Soporte multi-proveedor (Shopify, BigCommerce, etc.).',
    stars: 12000,
  },
  {
    id: 'taxonomy',
    name: 'Taxonomy — shadcn/ui App',
    source: 'curated',
    repo: 'shadcn-ui/taxonomy',
    demo_url: 'https://tx.shadcn.com',
    preview_url: 'https://vercel.com/templates/next.js/taxonomy',
    tags: ['nextjs', 'tailwind', 'shadcn', 'typescript', 'blog', 'saas'],
    plan_fit: ['esencial', 'emprendimiento'],
    industry: ['servicios', 'saas', 'educación'],
    description: 'App con shadcn/ui, auth, blog MDX, dashboard. Referencia para estructuras de contenido y layouts de servicios.',
    stars: 18000,
  },
  {
    id: 'nextjs-starter-medusa',
    name: 'Medusa Next.js Starter',
    source: 'curated',
    repo: 'medusajs/nextjs-starter-medusa',
    demo_url: 'https://next.medusajs.com',
    preview_url: 'https://vercel.com/templates/next.js/medusa-nextjs-starter',
    tags: ['ecommerce', 'nextjs', 'tailwind', 'medusa', 'typescript'],
    plan_fit: ['empresa'],
    industry: ['retail', 'moda', 'productos'],
    description: 'Storefront completo con carrito, checkout, cuenta de usuario. Stack muy cercano al de SitioHoy Plan Empresa.',
    stars: 3000,
  },
  {
    id: 'nextjs-portfolio',
    name: 'Portfolio con Next.js',
    source: 'curated',
    repo: 'vercel/next-portfolio',
    demo_url: 'https://portfolio-nextjs-template.vercel.app',
    preview_url: 'https://vercel.com/templates/next.js/portfolio-starter-kit',
    tags: ['nextjs', 'tailwind', 'portfolio', 'blog'],
    plan_fit: ['esencial'],
    industry: ['creativos', 'profesionales', 'servicios'],
    description: 'Portfolio minimalista con blog MDX. Referencia para layouts de presentación de servicios o catálogos simples.',
    stars: 5000,
  },
  {
    id: 'precedent',
    name: 'Precedent — Next.js Boilerplate',
    source: 'curated',
    repo: 'steven-tey/precedent',
    demo_url: 'https://precedent.dev',
    preview_url: 'https://vercel.com/templates/next.js/precedent',
    tags: ['nextjs', 'tailwind', 'typescript', 'framer-motion', 'landing'],
    plan_fit: ['esencial', 'emprendimiento'],
    industry: ['saas', 'startups', 'servicios'],
    description: 'Boilerplate moderno con animaciones Framer Motion, componentes de UI pulidos y buenas prácticas.',
    stars: 6000,
  },
  {
    id: 'dub',
    name: 'Dub — Multi-tenant SaaS',
    source: 'curated',
    repo: 'dubinc/dub',
    demo_url: 'https://dub.co',
    preview_url: 'https://github.com/dubinc/dub',
    tags: ['nextjs', 'tailwind', 'typescript', 'multitenant', 'saas'],
    plan_fit: ['empresa'],
    industry: ['saas', 'tecnología'],
    description: 'Ejemplo real de SaaS multi-tenant en producción. Muy relevante para la arquitectura multitenant de SitioHoy.',
    stars: 17000,
  },
]

// ── GitHub fetch ───────────────────────────────────────────────────────────────
const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
}

async function githubSearch(query, maxResults = 10) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${maxResults}`
  debug(`GET ${url}`)
  const res = await fetch(url, { headers: githubHeaders })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.items ?? []
}

function normalize(item, source) {
  // Inferir plan_fit a partir de topics/descripción
  const text = `${item.description ?? ''} ${(item.topics ?? []).join(' ')}`.toLowerCase()
  const planFit = []
  if (text.includes('ecommerce') || text.includes('commerce') || text.includes('shop') || text.includes('store')) {
    planFit.push('emprendimiento', 'empresa')
  }
  if (text.includes('landing') || text.includes('portfolio') || text.includes('simple')) {
    planFit.push('esencial')
  }
  if (planFit.length === 0) planFit.push('esencial', 'emprendimiento', 'empresa')

  return {
    id: item.full_name.replace('/', '--').toLowerCase(),
    name: item.name,
    source,
    repo: item.full_name,
    demo_url: item.homepage || null,
    preview_url: `https://github.com/${item.full_name}`,
    tags: item.topics ?? [],
    plan_fit: [...new Set(planFit)],
    industry: [],
    description: item.description ?? '',
    stars: item.stargazers_count,
  }
}

async function fetchFromGitHub() {
  const queries = [
    'topic:vercel-template topic:nextjs topic:tailwindcss',
    'topic:nextjs-ecommerce tailwindcss stars:>500',
    'topic:nextjs-template tailwindcss ecommerce stars:>200',
  ]

  const seen = new Set()
  const results = []

  for (const query of queries) {
    log(`Buscando en GitHub: ${query}`)
    try {
      const items = await githubSearch(query, 12)
      for (const item of items) {
        if (seen.has(item.full_name)) continue
        seen.add(item.full_name)
        results.push(normalize(item, 'github'))
      }
      // Respetar rate limit (60 req/h sin token)
      if (!githubToken) await new Promise((r) => setTimeout(r, 1200))
    } catch (err) {
      console.error(`  ✗ Error en query "${query}": ${err.message}`)
    }
  }

  return results
}

// ── Merge y dedup ─────────────────────────────────────────────────────────────
function mergeTemplates(curated, fromGithub) {
  const map = new Map()

  // Curated tiene prioridad
  for (const t of curated) map.set(t.repo, t)

  for (const t of fromGithub) {
    if (!map.has(t.repo)) {
      // Filtrar ruido: solo Next.js + Tailwind con buena reputación
      const hasNextjs = t.tags.some((tag) => tag.includes('next'))
      const hasTailwind = t.tags.some((tag) => tag.includes('tailwind'))
      if (hasNextjs && hasTailwind && t.stars >= 100) {
        map.set(t.repo, t)
      }
    }
  }

  return [...map.values()].sort((a, b) => b.stars - a.stars)
}

// ── Main ──────────────────────────────────────────────────────────────────────
log('')
log('SitioHoy — Template Fetcher')
log('')

await mkdir(DATA_DIR, { recursive: true })

let githubTemplates = []
if (!skipGithub) {
  log('Consultando GitHub API...')
  try {
    githubTemplates = await fetchFromGitHub()
    log(`  → ${githubTemplates.length} templates encontrados en GitHub`)
  } catch (err) {
    console.error(`  ✗ GitHub fetch falló: ${err.message}`)
    log('  Continuando solo con lista curada.')
  }
} else {
  log('GitHub omitido (--no-github)')
}

const all = mergeTemplates(CURATED, githubTemplates)

// Cargar index existente para preservar campos manuales (industry, notas)
let existing = {}
if (existsSync(OUTPUT)) {
  try {
    const prev = JSON.parse(await readFile(OUTPUT, 'utf8'))
    for (const t of prev.templates ?? []) existing[t.repo] = t
  } catch { /* ignorar si está corrupto */ }
}

// Merge preservando campos manuales del index anterior
const merged = all.map((t) => ({
  ...t,
  ...(existing[t.repo]
    ? {
        industry: existing[t.repo].industry?.length ? existing[t.repo].industry : t.industry,
        notes: existing[t.repo].notes,
      }
    : {}),
}))

const output = {
  updated_at: new Date().toISOString().slice(0, 10),
  total: merged.length,
  templates: merged,
}

await writeFile(OUTPUT, JSON.stringify(output, null, 2))

log('')
log(`✓ ${merged.length} templates guardados en data/templates/index.json`)
log(`  Curated: ${CURATED.length} | GitHub: ${githubTemplates.length} nuevos`)
log('')
log('Podés agregar campos manualmente en index.json (industry, notes).')
log('El script los preserva en futuras ejecuciones.')
log('')
