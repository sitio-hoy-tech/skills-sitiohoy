import { spawnSync } from 'node:child_process'

const result = spawnSync('node', ['scripts/validate-supabase-remote.mjs'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
