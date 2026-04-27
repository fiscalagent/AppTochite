// Технические скоупы и ключевые слова — такие коммиты не нужны пользователю в changelog
const TECH_SCOPES = ['scripts', 'ci', 'test', 'tests', 'build', 'deps']

const TECH_KEYWORDS = [
  'тест', 'test', 'eslint', 'typescript', 'ts-error', 'ts error',
  'peer-dep', 'legacy-peer', 'npm install', 'npm ci', 'worktree',
  'singleton', 'fileParallelism', 'instance.ts', 'singl',
  'для ci', 'на ci', 'в ci', 'генератор', 'generator', 'base64 префикс',
]

function isTechnical(commit) {
  if (TECH_SCOPES.includes((commit.scope || '').toLowerCase())) return true
  const low = (commit.subject || '').toLowerCase()
  return TECH_KEYWORDS.some(kw => low.includes(kw))
}

module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    ['@semantic-release/release-notes-generator', {
      writerOpts: {
        transform: (commit) => {
          if (!['feat', 'fix', 'perf'].includes(commit.type)) return false
          if (isTechnical(commit)) return false
          return commit
        },
      },
    }],
    ['@semantic-release/changelog', {
      changelogFile: 'CHANGELOG.md',
    }],
    ['@semantic-release/exec', {
      prepareCmd: 'node scripts/sync-version.mjs ${nextRelease.version}',
    }],
    ['@semantic-release/git', {
      assets: ['CHANGELOG.md', 'package.json', 'src/version.ts', 'src/data/changelog.ts'],
      message: 'chore(release): ${nextRelease.version} [skip ci]',
    }],
    '@semantic-release/github',
  ],
}
