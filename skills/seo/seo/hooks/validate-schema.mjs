#!/usr/bin/env node
/**
 * Post-edit schema validation hook for Claude Code.
 *
 * Validates JSON-LD schema after file edits. Returns exit code 2 to block
 * if critical validation errors found.
 */

import { readFileSync, existsSync } from 'node:fs'
import { extname } from 'node:path'

const VALID_EXTENSIONS = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.php', '.ejs'])

const DEPRECATED_TYPES = {
  HowTo: 'deprecated September 2023',
  SpecialAnnouncement: 'deprecated July 31, 2025',
  CourseInfo: 'retired June 2025',
  EstimatedSalary: 'retired June 2025',
  LearningVideo: 'retired June 2025',
  ClaimReview: 'retired June 2025; fact-check rich results discontinued',
  VehicleListing: 'retired June 2025; vehicle listing structured data discontinued',
}

const RESTRICTED_TYPES = {
  FAQPage: 'restricted to government and healthcare sites only (Aug 2023)',
}

const PLACEHOLDERS = [
  '[Business Name]', '[City]', '[State]', '[Phone]',
  '[Address]', '[Your', '[INSERT', 'REPLACE', '[URL]', '[Email]',
]

function validateSchemaObject(obj, blockNum) {
  const errors = []
  const prefix = `Block ${blockNum}`

  if (!obj['@context']) {
    errors.push(`${prefix}: Missing @context`)
  } else if (obj['@context'] !== 'https://schema.org' && obj['@context'] !== 'http://schema.org') {
    errors.push(`${prefix}: @context should be 'https://schema.org'`)
  }

  if (!obj['@type']) {
    errors.push(`${prefix}: Missing @type`)
  }

  const text = JSON.stringify(obj).toLowerCase()
  for (const p of PLACEHOLDERS) {
    if (text.includes(p.toLowerCase())) {
      errors.push(`${prefix}: Contains placeholder text: ${p}`)
    }
  }

  const schemaType = obj['@type'] || ''
  if (DEPRECATED_TYPES[schemaType]) {
    errors.push(`${prefix}: @type '${schemaType}' is ${DEPRECATED_TYPES[schemaType]}`)
  }
  if (RESTRICTED_TYPES[schemaType]) {
    errors.push(`${prefix}: @type '${schemaType}' is ${RESTRICTED_TYPES[schemaType]}; verify site qualifies`)
  }

  return errors
}

function validateJsonLd(content) {
  const errors = []
  const pattern = /<script\s+type=["']application\/ld\+json["']\s*>(.*?)<\/script>/gis
  let match
  let blockNum = 0

  while ((match = pattern.exec(content)) !== null) {
    blockNum++
    const block = match[1].trim()

    let data
    try {
      data = JSON.parse(block)
    } catch (e) {
      errors.push(`Block ${blockNum}: Invalid JSON; ${e.message}`)
      continue
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        errors.push(...validateSchemaObject(item, blockNum))
      }
    } else if (typeof data === 'object' && data !== null) {
      errors.push(...validateSchemaObject(data, blockNum))
    }
  }

  return errors
}

function main() {
  const filepath = process.argv[2]
  if (!filepath) process.exit(0)
  if (!existsSync(filepath)) process.exit(0)
  if (!VALID_EXTENSIONS.has(extname(filepath))) process.exit(0)

  let content
  try {
    content = readFileSync(filepath, 'utf8')
  } catch {
    process.exit(0)
  }

  const errors = validateJsonLd(content)
  if (!errors.length) process.exit(0)

  const criticalKeywords = ['placeholder', 'deprecated', 'retired']
  const critical = errors.filter(e => criticalKeywords.some(kw => e.toLowerCase().includes(kw)))
  const warnings = errors.filter(e => !critical.includes(e))

  if (warnings.length) {
    console.log('⚠️  Schema validation warnings:')
    for (const w of warnings) console.log(`  - ${w}`)
  }

  if (critical.length) {
    console.log('🛑 Schema validation ERRORS (blocking):')
    for (const e of critical) console.log(`  - ${e}`)
    process.exit(2)
  }

  process.exit(1)
}

main()
