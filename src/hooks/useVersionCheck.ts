import { useState, useEffect, useCallback } from 'react'
import { APP_VERSION } from '../version'

const LS_KEY = 'versionCheck_v1'
const GITHUB_OWNER = 'fiscalagent'
const GITHUB_REPO = 'AppTochite'

interface VersionCache {
  checkedAt: string
  latestVersion: string
  releaseUrl: string
}

function parseVer(v: string): [number, number, number] {
  const parts = v.replace(/^v/, '').split('.').map(Number)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

function isNewer(remote: string, local: string): boolean {
  const [ra, rb, rc] = parseVer(remote)
  const [la, lb, lc] = parseVer(local)
  if (ra !== la) return ra > la
  if (rb !== lb) return rb > lb
  return rc > lc
}

function readCache(): VersionCache | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as VersionCache) : null
  } catch {
    return null
  }
}

export function useVersionCheck() {
  const [cache, setCache] = useState<VersionCache | null>(readCache)
  const [checking, setChecking] = useState(false)

  const check = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        { headers: { Accept: 'application/vnd.github+json' } }
      )
      if (!res.ok) return
      const data = await res.json()
      const next: VersionCache = {
        checkedAt: new Date().toISOString(),
        latestVersion: (data.tag_name as string)?.replace(/^v/, '') ?? APP_VERSION,
        releaseUrl: (data.html_url as string) ?? '',
      }
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      setCache(next)
    } catch {
      // сетевая ошибка — игнорируем
    } finally {
      setChecking(false)
    }
  }, [])

  // раз в день при открытии приложения
  useEffect(() => {
    const cached = readCache()
    if (!cached) {
      check()
      return
    }
    const lastDate = new Date(cached.checkedAt).toDateString()
    const today = new Date().toDateString()
    if (lastDate !== today) check()
  }, [check])

  const hasUpdate = cache ? isNewer(cache.latestVersion, APP_VERSION) : false

  return {
    currentVersion: APP_VERSION,
    latestVersion: cache?.latestVersion ?? null,
    releaseUrl: cache?.releaseUrl ?? '',
    hasUpdate,
    checking,
    checkNow: check,
    lastChecked: cache?.checkedAt ?? null,
  }
}
