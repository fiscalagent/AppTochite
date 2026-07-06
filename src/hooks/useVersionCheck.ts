import { useState, useEffect, useCallback } from 'react'
import { APP_VERSION } from '../version'

const LS_KEY = 'versionCheck_v1'
const GITHUB_OWNER = 'fiscalagent'
const GITHUB_REPO = 'AppTochite'

// APK прикрепляется к релизу отдельным воркфлоу через несколько минут после
// публикации тега. В этом окне обновление «есть», но скачать нечего (404),
// поэтому в APK-сборке hasUpdate требует наличия ассета, а перепроверка в
// этом состоянии ускоряется до получаса.
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'
const APK_ASSET_NAME = 'app-release.apk'
const APK_PENDING_RECHECK_MS = 30 * 60 * 1000

interface VersionCache {
  checkedAt: string
  latestVersion: string
  releaseUrl: string
  apkUrl: string // прямая ссылка на ассет релиза; '' — APK ещё не прикреплён
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
      const assets = (data.assets ?? []) as { name?: string; browser_download_url?: string }[]
      const apkAsset = assets.find(a => a.name === APK_ASSET_NAME)
      const next: VersionCache = {
        checkedAt: new Date().toISOString(),
        latestVersion: (data.tag_name as string)?.replace(/^v/, '') ?? APP_VERSION,
        releaseUrl: (data.html_url as string) ?? '',
        apkUrl: apkAsset?.browser_download_url ?? '',
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
      check() // eslint-disable-line react-hooks/set-state-in-effect
      return
    }
    const lastDate = new Date(cached.checkedAt).toDateString()
    const today = new Date().toDateString()
    if (lastDate !== today) {
      check()
      return
    }
    // Релиз уже виден, но APK ещё собирается — не ждём до завтра
    const apkPending = isNewer(cached.latestVersion, APP_VERSION) && !cached.apkUrl
    if (apkPending && Date.now() - new Date(cached.checkedAt).getTime() > APK_PENDING_RECHECK_MS) {
      check()
    }
  }, [check])

  const tagIsNewer = cache ? isNewer(cache.latestVersion, APP_VERSION) : false
  // В APK-сборке обновление «доступно» только когда файл реально можно скачать
  const hasUpdate = IS_CAPACITOR ? tagIsNewer && !!cache?.apkUrl : tagIsNewer

  return {
    currentVersion: APP_VERSION,
    latestVersion: cache?.latestVersion ?? null,
    releaseUrl: cache?.releaseUrl ?? '',
    apkUrl: cache?.apkUrl ?? '',
    hasUpdate,
    checking,
    checkNow: check,
    lastChecked: cache?.checkedAt ?? null,
  }
}
