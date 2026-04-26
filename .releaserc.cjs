// Ключевые слова технических коммитов, которые не нужны пользователю в changelog
const TECH_KEYWORDS = [
  'тест', 'test', 'eslint', 'typescript', 'ts-error', 'ts error',
  'peer-dep', 'legacy-peer', 'npm install', 'npm ci', 'ci/', 'worktree',
  'singleton', 'fileParallelism', 'instance.ts', 'singl',
  'для ci', 'на ci', 'в ci',
]

function isTechnical(subject) {
  const low = (subject || '').toLowerCase()
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
          if (isTechnical(commit.subject)) return false
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
