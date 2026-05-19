// File System Access API type augmentation — not fully present in all TS DOM lib versions

interface FSDirectoryHandleWithPermission extends FileSystemDirectoryHandle {
  queryPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}

declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  }
}

export function supportsFileSystemAccess(): boolean {
  return 'showDirectoryPicker' in window
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({ mode: 'readwrite' })
}

export async function queryDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  return (handle as FSDirectoryHandleWithPermission).queryPermission({ mode: 'readwrite' })
}

export async function requestDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  return (handle as FSDirectoryHandleWithPermission).requestPermission({ mode: 'readwrite' })
}
