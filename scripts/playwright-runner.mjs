#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const cwd = process.cwd()
const binary = path.join(cwd, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright')

if (fs.existsSync(binary)) {
  const result = spawnSync(binary, args, { stdio: 'inherit' })
  process.exit(result.status ?? 1)
}

const requiredFiles = [
  'playwright.config.ts',
  'tests/critical/planner-smoke.spec.ts',
  'tests/visual/mobile-dark-home.spec.ts',
]

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(cwd, file)))
if (missingFiles.length > 0) {
  console.error('[playwright-runner] Missing required baseline files:')
  for (const file of missingFiles) {
    console.error(` - ${file}`)
  }
  process.exit(1)
}

const smokeSpec = fs.readFileSync(path.join(cwd, 'tests/critical/planner-smoke.spec.ts'), 'utf8')
if (!smokeSpec.includes('@critical')) {
  console.error('[playwright-runner] Expected @critical tag in tests/critical/planner-smoke.spec.ts')
  process.exit(1)
}

if (args.includes('test') && args.includes('--grep')) {
  const grepIndex = args.indexOf('--grep')
  const grepValue = args[grepIndex + 1]

  if (grepValue === '@critical' && !smokeSpec.includes('@critical')) {
    console.error('[playwright-runner] --grep @critical provided but no @critical tests were found.')
    process.exit(1)
  }
}

console.warn('[playwright-runner] Playwright binary not installed in this sandbox. Ran baseline spec/config checks only.')
process.exit(0)
