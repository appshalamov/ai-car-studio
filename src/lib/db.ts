import type { Sel } from './build'

export type Build = {
  id: string
  before: string
  after: string
  label: string
  sel: Sel
  style: string | null
  createdAt: number
}

const DB = 'carstudio'
const STORE = 'builds'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

export async function saveBuild(b: Omit<Build, 'id' | 'createdAt'>): Promise<Build> {
  const full: Build = { ...b, id: uid(), createdAt: Date.now() }
  await tx('readwrite', (s) => s.put(full))
  return full
}

export async function listBuilds(): Promise<Build[]> {
  try {
    const all = await tx<Build[]>('readonly', (s) => s.getAll())
    return all.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export const deleteBuild = (id: string) => tx('readwrite', (s) => s.delete(id))
