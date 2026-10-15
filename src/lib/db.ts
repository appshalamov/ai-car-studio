export type HistoryItem = {
  id: string
  tool: 'car' | 'bike' | 'editor' | 'background' | 'wrap'
  title: string
  before?: string
  after: string
  prompt: string
  createdAt: number
}

const DB = 'acs'
const STORE = 'history'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('createdAt', 'createdAt')
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

export async function saveHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
  const full: HistoryItem = { ...item, id: uid(), createdAt: Date.now() }
  try { await tx('readwrite', (s) => s.put(full)) } catch (e) { console.warn('history save failed', e) }
  return full
}

export async function listHistory(): Promise<HistoryItem[]> {
  try {
    const all = await tx<HistoryItem[]>('readonly', (s) => s.getAll())
    return all.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export const deleteHistory = (id: string) => tx('readwrite', (s) => s.delete(id))
export const clearHistory = () => tx('readwrite', (s) => s.clear())
