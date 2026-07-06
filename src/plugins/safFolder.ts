import { registerPlugin } from '@capacitor/core'

// Нативный SAF-плагин (только APK, реализация в android/.../SafFolderPlugin.java).
// Пишет папочный бэкап в выбранную пользователем через системный пикер папку —
// единственный способ на Android 11+ иметь видимую и переживающую удаление копию.
// В PWA-сборке модуль не грузится (зовётся только из веток IS_CAPACITOR).
export interface SafFolderPlugin {
  /** Открывает системный пикер папки; возвращает persistable tree Uri и имя. Reject 'CANCELLED' при отмене. */
  pickFolder(): Promise<{ uri: string; name: string }>
  /** Пишет (перезаписывает) текстовый файл name в папке treeUri. */
  writeFile(opts: { treeUri: string; name: string; data: string }): Promise<{ uri: string }>
  /** Читает файл name; reject 'NOT_FOUND' если файла нет, 'NO_PERMISSION' если доступ утрачен. */
  readFile(opts: { treeUri: string; name: string }): Promise<{ data: string }>
  /** Метаданные файла; reject 'NOT_FOUND' если файла нет. */
  stat(opts: { treeUri: string; name: string }): Promise<{ size: number; mtime: number }>
  /** Держится ли ещё persistable-доступ к папке на запись. */
  checkAccess(opts: { treeUri: string }): Promise<{ granted: boolean }>
}

export const SafFolder = registerPlugin<SafFolderPlugin>('SafFolder')
