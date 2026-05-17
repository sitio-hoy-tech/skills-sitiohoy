/**
 * optimize-assets.mjs
 * Optimiza imágenes de _assets-cliente/ para producción.
 * Sin dependencias npm — usa sharp si está disponible, sino avisa.
 *
 * Usage: node scripts/optimize-assets.mjs [--quality 80] [--max-width 1920]
 */

import { existsSync } from 'node:fs'
import { readdir, stat, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const ASSETS_DIR = path.join(root, '_assets-cliente')
const OUTPUT_DIR = path.join(root, 'public', 'assets')
const REPORT_PATH = path.join(root, '.sitiohoy', 'asset-report.json')

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const idx = args.indexOf(name)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
}

const MAX_WIDTH = parseInt(getArg('--max-width', '1920'))
const QUALITY = parseInt(getArg('--quality', '80'))

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'])

async function walkDir(dir) {
  const entries = []
  if (!existsSync(dir)) return entries
  const items = await readdir(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      entries.push(...await walkDir(fullPath))
    } else if (IMAGE_EXTS.has(path.extname(item.name).toLowerCase())) {
      entries.push(fullPath)
    }
  }
  return entries
}

async function getFileSize(filePath) {
  const s = await stat(filePath)
  return s.size
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

async function main() {
  console.log('\n  🖼️  SitioHoy Asset Optimizer\n')

  if (!existsSync(ASSETS_DIR)) {
    console.log('  ⚠️  No existe _assets-cliente/. Nada que optimizar.')
    process.exit(0)
  }

  const files = await walkDir(ASSETS_DIR)
  if (files.length === 0) {
    console.log('  ⚠️  No se encontraron imágenes en _assets-cliente/')
    process.exit(0)
  }

  console.log(`  Encontradas: ${files.length} imágenes`)
  console.log(`  Calidad: ${QUALITY}%`)
  console.log(`  Ancho máximo: ${MAX_WIDTH}px\n`)

  let sharp = null
  try {
    sharp = (await import('sharp')).default
    console.log('  ✓ sharp disponible — optimización completa\n')
  } catch {
    console.log('  ⚠️  sharp no instalado — solo se copiarán los archivos sin optimizar')
    console.log('  Para optimización completa: npm install -D sharp\n')
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  const report = { processed: [], skipped: [], totalOriginal: 0, totalOptimized: 0, timestamp: new Date().toISOString() }

  for (const filePath of files) {
    const relativePath = path.relative(ASSETS_DIR, filePath)
    const ext = path.extname(filePath).toLowerCase()
    const destDir = path.join(OUTPUT_DIR, path.dirname(relativePath))
    await mkdir(destDir, { recursive: true })

    const originalSize = await getFileSize(filePath)
    report.totalOriginal += originalSize

    if (ext === '.svg') {
      // SVGs: copy as-is
      const destPath = path.join(OUTPUT_DIR, relativePath)
      await copyFile(filePath, destPath)
      report.totalOptimized += originalSize
      report.processed.push({ file: relativePath, original: originalSize, optimized: originalSize, savings: '0%' })
      console.log(`  → ${relativePath} (SVG, copiado)`)
      continue
    }

    if (!sharp) {
      // No sharp: just copy
      const destPath = path.join(OUTPUT_DIR, relativePath)
      await copyFile(filePath, destPath)
      report.totalOptimized += originalSize
      report.skipped.push({ file: relativePath, reason: 'sharp no disponible' })
      console.log(`  → ${relativePath} (copiado sin optimizar)`)
      continue
    }

    try {
      const webpName = relativePath.replace(/\.[^.]+$/, '.webp')
      const destPath = path.join(OUTPUT_DIR, webpName)

      const img = sharp(filePath)
      const metadata = await img.metadata()

      let pipeline = img
      if (metadata.width && metadata.width > MAX_WIDTH) {
        pipeline = pipeline.resize(MAX_WIDTH)
      }

      await pipeline.webp({ quality: QUALITY }).toFile(destPath)

      const optimizedSize = await getFileSize(destPath)
      report.totalOptimized += optimizedSize
      const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1)
      report.processed.push({ file: relativePath, output: webpName, original: originalSize, optimized: optimizedSize, savings: `${savings}%` })
      console.log(`  ✓ ${relativePath} → ${webpName} (${formatBytes(originalSize)} → ${formatBytes(optimizedSize)}, -${savings}%)`)
    } catch (err) {
      const destPath = path.join(OUTPUT_DIR, relativePath)
      await copyFile(filePath, destPath)
      report.totalOptimized += originalSize
      report.skipped.push({ file: relativePath, reason: err.message })
      console.log(`  ⚠️ ${relativePath} (error: ${err.message}, copiado sin optimizar)`)
    }
  }

  // Write report
  await mkdir(path.dirname(REPORT_PATH), { recursive: true })
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + '\n')

  const totalSavings = report.totalOriginal > 0
    ? ((1 - report.totalOptimized / report.totalOriginal) * 100).toFixed(1)
    : '0'

  console.log(`\n  ─────────────────────────────────`)
  console.log(`  Total original:  ${formatBytes(report.totalOriginal)}`)
  console.log(`  Total optimizado: ${formatBytes(report.totalOptimized)}`)
  console.log(`  Ahorro total:    ${totalSavings}%`)
  console.log(`  Reporte:         .sitiohoy/asset-report.json`)
  console.log(`  Output:          public/assets/\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
