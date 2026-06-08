/// <reference lib="WebWorker" />

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

// Расширяем тип ServiceWorkerGlobalScope для __WB_MANIFEST.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// Авто-обновление: при установке новой версии немедленно берём управление.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event: ExtendableEvent) =>
  event.waitUntil(self.clients.claim())
)

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA: все навигационные запросы → index.html из прекэша.
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL('/AppTochite/index.html'),
    { denylist: [/\/cleaner\.html$/, /\/guide\.html$/] }
  )
)

// ─── Periodic Background Sync ─────────────────────────────────────────────────

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string
}

const OPFS_FILENAME = 'apptochite-auto.json'
const DB_NAME = 'AppTochiteDB'

self.addEventListener('periodicsync', (event: Event) => {
  const e = event as PeriodicSyncEvent
  if (e.tag === 'backup-sync') e.waitUntil(handlePeriodicSync())
})

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'skipWaiting') self.skipWaiting()
})

async function handlePeriodicSync(): Promise<void> {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (allClients.length > 0) {
    allClients.forEach((c: Client) => c.postMessage({ type: 'periodic-backup' }))
    return
  }
  await performOPFSBackupFromSW()
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getAllFromStore(idb: IDBDatabase, store: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    try {
      const tx = idb.transaction(store, 'readonly')
      const req = tx.objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (e) { reject(e) }
  })
}

async function performOPFSBackupFromSW(): Promise<void> {
  let idb: IDBDatabase | undefined
  try {
    idb = await openIDB()
    const [clients, sharpenings, stones, steels, knives, meta] = await Promise.all([
      getAllFromStore(idb, 'clients'),
      getAllFromStore(idb, 'sharpenings'),
      getAllFromStore(idb, 'stones'),
      getAllFromStore(idb, 'steels'),
      getAllFromStore(idb, 'knives'),
      getAllFromStore(idb, 'meta'),
    ])

    const activeClients = (clients as Array<{ deletedAt?: unknown }>).filter(c => !c.deletedAt)
    if (activeClients.length === 0) return

    const json = JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      data: { clients, sharpenings, stones, steels, knives, meta },
    })

    const root = await navigator.storage.getDirectory()
    const fh = await root.getFileHandle(OPFS_FILENAME, { create: true })
    const w = await fh.createWritable()
    await w.write(json)
    await w.close()
  } catch { /* silent */ } finally {
    idb?.close()
  }
}
