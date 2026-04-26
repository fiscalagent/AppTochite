// Запускается semantic-release на шаге prepare.
// Обновляет package.json, src/version.ts и добавляет запись в src/data/changelog.ts.
import { readFileSync, writeFileSync } from 'fs'

const version = process.argv[2]
if (!version) {
  console.error('Usage: node sync-version.mjs <version>')
  process.exit(1)
}

// package.json
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
pkg.version = version
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
console.log(`✓ package.json → ${version}`)

// src/version.ts
writeFileSync('src/version.ts', `export const APP_VERSION = '${version}'\n`, 'utf-8')
console.log(`✓ src/version.ts → ${version}`)

// src/data/changelog.ts — добавляем запись если её ещё нет
const changelogTs = readFileSync('src/data/changelog.ts', 'utf-8')
if (changelogTs.includes(`version: '${version}'`)) {
  console.log(`⚠ changelog.ts уже содержит v${version}, пропускаем`)
  process.exit(0)
}

const changes = parseChangelog(version)
const today = new Date().toISOString().slice(0, 10)
const escapedChanges = changes.map(c => `'${c.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)

const newEntry = `  {
    version: '${version}',
    date: '${today}',
    changes: [
      ${escapedChanges.join(',\n      ')},
    ],
  },`

const updated = changelogTs.replace(
  'export const CHANGELOG: ChangelogEntry[] = [',
  `export const CHANGELOG: ChangelogEntry[] = [\n${newEntry}`
)
writeFileSync('src/data/changelog.ts', updated, 'utf-8')
console.log(`✓ changelog.ts → ${changes.length} записей для v${version}`)

function parseChangelog(ver) {
  let md
  try {
    md = readFileSync('CHANGELOG.md', 'utf-8')
  } catch {
    return ['Исправления и улучшения']
  }

  const lines = md.split('\n')
  const results = []
  let inTarget = false

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (inTarget) break
      // строка вида: ## [1.1.0](url) (2026-05-01) или ## 1.1.0
      if (line.includes(`[${ver}]`) || line.includes(` ${ver} `)) {
        inTarget = true
      }
      continue
    }
    if (!inTarget) continue
    if (line.startsWith('### ')) continue // пропускаем заголовки секций

    if (line.startsWith('* ') || line.startsWith('- ')) {
      let text = line.slice(2).trim()
      // убираем ссылку на коммит: ([abc1234](url))
      text = text.replace(/\s*\(\[[a-f0-9]+\]\([^)]+\)\)\s*$/, '').trim()
      // убираем **scope:** если есть
      text = text.replace(/^\*\*[^*]+\*\*:\s*/, '').trim()
      if (text) results.push(text)
    }
  }

  return results.length > 0 ? results : ['Исправления и улучшения']
}
