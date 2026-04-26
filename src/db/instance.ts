// Re-exports everything from db.ts so app code can import from one place.
// Kept separate so tests can import AppTochiteDB without triggering the singleton.
export * from './db'
import { AppTochiteDB } from './db'

export const db = new AppTochiteDB()
// If schema upgrade is blocked by another tab running old code, reload to retry.
db.on('blocked', () => { window.location.reload() })
