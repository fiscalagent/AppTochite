// File System Access API type augmentation — not fully present in all TS DOM lib versions

interface FSDirectoryHandleWithPermission extends FileSystemDirectoryHandle {
  queryPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}

type WellKnownDir = 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'

declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite'; startIn?: WellKnownDir }): Promise<FileSystemDirectoryHandle>
  }
}

export function supportsFileSystemAccess(): boolean {
  return 'showDirectoryPicker' in window
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  // mode:'read' — подключение без второго окна «Разрешить изменение файлов?».
  // Его отмена даёт AbortError и подключение молча срывается. Доступ на запись
  // повышаем позже, при «Сохранить сейчас» (свежий жест → requestPermission
  // readwrite), где окно «Изменение файлов» появляется в понятном контексте.
  // startIn: 'documents' уводит от «Загрузок» (Chrome их блокирует).
  // Без id: Chrome допускает в id только буквы/цифры, дефис → TypeError.
  return window.showDirectoryPicker({ mode: 'read', startIn: 'documents' })
}

export async function queryDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<PermissionState> {
  return (handle as FSDirectoryHandleWithPermission).queryPermission({ mode })
}

export async function requestDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<PermissionState> {
  return (handle as FSDirectoryHandleWithPermission).requestPermission({ mode })
}
