import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from './components/Toast/ToastContext'
import BottomNav from './components/BottomNav/BottomNav'
import { db } from './db/instance'
import { LocaleProvider } from './i18n'
import { ru } from './i18n/dict/ru'
import BackupScreen from './screens/Backup/BackupScreen'
import ClientCard from './screens/Clients/ClientCard'
import ClientForm from './screens/Clients/ClientForm'
import ClientList from './screens/Clients/ClientList'
import HistoryFeed from './screens/History/HistoryFeed'
import SharpeningDetail from './screens/Sharpening/SharpeningDetail'
import SharpeningForm from './screens/Sharpening/SharpeningForm'

vi.mock('./db/instance', async () => {
  const schema = await import('./db/db')
  return { ...schema, db: new schema.AppTochiteDB(`test-user-flows-${crypto.randomUUID()}`) }
})

vi.mock('./hooks/useVersionCheck', () => ({ useVersionCheck: () => ({ hasUpdate: false }) }))
vi.mock('./services/analytics', () => ({ track: async () => {}, trackSharpening: async () => {} }))

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  await db.open()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  await db.delete()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function renderAt(path: string) {
  const router = createMemoryRouter([{ element: <><Outlet /><BottomNav /></>, children: [
    { path: '/', element: <ClientList /> },
    { path: '/clients/new', element: <ClientForm /> },
    { path: '/clients/:id', element: <ClientCard /> },
    { path: '/sharpenings/new', element: <SharpeningForm /> },
    { path: '/sharpenings/:id', element: <SharpeningDetail /> },
    { path: '/history', element: <HistoryFeed /> },
    { path: '/backup', element: <BackupScreen /> },
  ] }], { initialEntries: [path] })
  await act(async () => root.render(<LocaleProvider><ToastProvider><RouterProvider router={router} /></ToastProvider></LocaleProvider>))
  return router
}

function button(label: string, scope: ParentNode = host): HTMLButtonElement {
  const found = [...scope.querySelectorAll('button')].find(candidate => candidate.textContent?.trim() === label)
  if (!found) throw new Error(`Button not found: ${label}`)
  return found
}

async function click(element: HTMLElement) {
  await act(async () => element.click())
}

async function waitFor(check: () => void) {
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
    check()
  })
}

async function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function importText(text: string) {
  const input = host.querySelector<HTMLInputElement>('input[type=file]')!
  const file = new File([text], 'backup.json', { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: async () => text })
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
}

function replaceDialog(): Element {
  const dialog = [...document.body.children].find(element =>
    element !== host && element.textContent?.includes(ru.backup.replaceConfirmTitle))
  if (!dialog) throw new Error('Replace confirmation is missing')
  return dialog
}

const date = '2026-01-01T00:00:00.000Z'
const legacyBackup = {
  version: 1,
  exportedAt: date,
  data: {
    clients: [{ id: 42, name: 'Imported Client', isSelf: false, createdAt: date }],
    sharpenings: [{ id: 17, clientId: 42, knifeBrand: 'Mora', receivedAt: date, status: 'accepted' }],
    stones: [], steels: [], knives: [],
  },
}

describe('backup screen', () => {
  it('previews a legacy import and replaces data only after confirmation', async () => {
    const originalId = await db.clients.add({ name: 'Original', isSelf: false, createdAt: new Date() })
    const router = await renderAt('/backup')
    await importText(JSON.stringify(legacyBackup))
    await click(button(ru.backup.replaceAll))
    await click(button(ru.common.cancel, replaceDialog()))
    expect(document.body.textContent).not.toContain(ru.backup.replaceConfirmTitle)
    expect(await db.clients.get(originalId)).toMatchObject({ name: 'Original' })

    await click(button(ru.backup.replaceAll))
    await click(button(ru.backup.replaceAll, replaceDialog()))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await db.clients.get(originalId)).toBeUndefined()
    expect(await db.clients.get(42)).toMatchObject({ name: 'Imported Client' })
    expect(await db.sharpenings.get(17)).toMatchObject({ clientId: 42, receivedAt: new Date(date) })
  })

  it.each(['file', 'browser'] as const)('requires consent to omit an unlinked sharpening from a %s backup', async source => {
    await db.clients.add({ id: 99, name: 'Original', isSelf: false, createdAt: new Date() })
    const unlinked = { id: 18, clientId: 99, knifeBrand: 'Unlinked knife', receivedAt: date, status: 'accepted' }
    const backup = { ...legacyBackup, data: { ...legacyBackup.data, sharpenings: [...legacyBackup.data.sharpenings, unlinked] } }
    const json = JSON.stringify(backup)
    if (source === 'browser') {
      vi.stubGlobal('navigator', {
        ...navigator,
        storage: { getDirectory: async () => ({
          getFileHandle: async (name: string) => {
            if (name !== 'apptochite-auto.json') throw new DOMException('Missing', 'NotFoundError')
            return { getFile: async () => ({ size: json.length, lastModified: Date.parse(date), text: async () => json }) }
          },
        }) },
      })
    }
    const router = await renderAt('/backup')
    if (source === 'file') {
      await importText(json)
    } else {
      await waitFor(() => expect(host.textContent).toContain(ru.backup.copyBrowser))
      await click(button(ru.backup.copyRestoreBtn))
    }
    expect(host.textContent).toContain(ru.backup.unlinkedSummary(1))
    expect(host.textContent).toContain(ru.backup.unlinkedEntry(unlinked.knifeBrand, unlinked.clientId))
    expect(button(ru.backup.merge).disabled).toBe(true)
    expect(button(ru.backup.replaceAll).disabled).toBe(true)
    expect(await db.clients.get(99)).toMatchObject({ name: 'Original' })

    const consent = [...host.querySelectorAll('label')].find(label => label.textContent?.includes(ru.backup.omitUnlinked))!
    await click(consent.querySelector<HTMLInputElement>('input[type=checkbox]')!)
    if (source === 'file') {
      await click(button(ru.backup.replaceAll))
      await click(button(ru.backup.replaceAll, replaceDialog()))
      await waitFor(() => expect(router.state.location.pathname).toBe('/'))
      expect(await db.clients.get(99)).toBeUndefined()
    } else {
      await click(button(ru.backup.merge))
      await waitFor(() => expect(host.textContent).not.toContain(ru.backup.omitUnlinked))
      expect(await db.clients.get(99)).toMatchObject({ name: 'Original' })
    }
    expect(await db.clients.get(42)).toMatchObject({ name: 'Imported Client' })
    expect(await db.sharpenings.get(17)).toMatchObject({ clientId: 42 })
    expect(await db.sharpenings.get(18)).toBeUndefined()
  })

  it('reports a failed replacement and keeps the previous data', async () => {
    const originalId = await db.clients.add({ name: 'Original', isSelf: false, createdAt: new Date() })
    vi.spyOn(db.stones, 'bulkPut').mockImplementationOnce(() => { throw new Error('Write failed') })
    await renderAt('/backup')
    await importText(JSON.stringify(legacyBackup))
    await click(button(ru.backup.replaceAll))
    await click(button(ru.backup.replaceAll, replaceDialog()))
    await waitFor(() => expect(document.body.textContent).toContain(ru.backup.restoreError))
    expect(await db.clients.get(originalId)).toMatchObject({ name: 'Original' })
    expect(await db.clients.get(42)).toBeUndefined()
    expect(await db.sharpenings.get(17)).toBeUndefined()
  })

  it('downloads a JSON backup from the export controls', async () => {
    const id = await db.clients.add({ name: 'Exported Client', isSelf: false, createdAt: new Date() })
    let downloaded: Blob | undefined
    let filename = ''
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(blob: Blob) {
        downloaded = blob
        return 'blob:test-backup'
      }
      static revokeObjectURL() {}
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      filename = this.download
    })
    await renderAt('/backup')
    await click(button(ru.backup.advancedSection))
    await click(button(ru.backup.saveBackupJson))
    await waitFor(() => expect(document.body.textContent).toContain(ru.backup.backupSaved))
    expect(filename).toMatch(/^apptochite-\d{4}-\d{2}-\d{2}\.json$/)
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(downloaded!)
    })
    expect(JSON.parse(text)).toMatchObject({ version: 2, data: { clients: [{ id, name: 'Exported Client' }] } })
  })
})

it('creates a client and a sharpening through the forms and shows the sharpening in history', async () => {
  const clientName = 'Test Client'
  const knifeBrand = 'Test Mora'
  const router = await renderAt('/clients/new')
  await type(host.querySelector<HTMLInputElement>(`input[placeholder="${ru.clients.namePlaceholder}"]`)!, clientName)
  await click(button(ru.clients.addClientBtn))
  await waitFor(() => expect(host.querySelector('a[href^="/sharpenings/new?"]')).not.toBeNull())
  await click(host.querySelector<HTMLAnchorElement>('a[href^="/sharpenings/new?"]')!)
  await type(host.querySelector<HTMLInputElement>(`input[placeholder="${ru.sharpening.knifePlaceholder}"]`)!, knifeBrand)
  await click(button(ru.sharpening.accept))
  await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/sharpenings\/\d+$/))
  await click(host.querySelector<HTMLAnchorElement>('nav a[href="/history"]')!)
  await waitFor(() => expect(host.textContent).toContain(knifeBrand))
  const client = await db.clients.where('name').equals(clientName).first()
  expect(await db.sharpenings.toArray()).toMatchObject([{ clientId: client?.id, knifeBrand, status: 'accepted' }])
})
