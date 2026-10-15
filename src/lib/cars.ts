import { useEffect, useState } from 'react'
import { homeCars } from './api'

/** Real before/after pairs for the home screen, sample car and gallery examples (public/img/cars/cars.json). */
export type Car = { slug: string; model: string; mods_en: string; mods_ru: string; mods_es?: string; before: string; after: string }

export const mods = (c: Car, lang: string) => (lang === 'ru' ? c.mods_ru : lang === 'es' ? c.mods_es || c.mods_en : c.mods_en)

const FALLBACK: Car[] = [
  { slug: 'demo', model: 'Ferrari 458', mods_en: 'Matte black, black wheels, tint', mods_ru: 'Матовый чёрный, чёрные диски, тонировка', mods_es: 'Negro mate, rines negros, polarizado', before: './img/stock.jpg', after: './img/blackout.jpg' },
]

let cache: Promise<Car[]> | null = null
export function loadCars(): Promise<Car[]> {
  // Builds the owner put on the home screen in the admin come first.
  cache ??= Promise.all([homeCars().catch(() => [] as Car[]), loadStatic()]).then(([home, rest]) => (home.length ? [...home, ...rest.filter((c) => c.slug !== 'demo')] : rest))
  return cache
}

function loadStatic(): Promise<Car[]> {
  return fetch('./img/cars/cars.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list: (Omit<Car, 'before' | 'after'> & Partial<Car>)[]) => (list.length ? list.map((c) => ({ ...c, before: c.before || `./img/cars/${c.slug}-before.jpg`, after: c.after || `./img/cars/${c.slug}-after.jpg` })) : FALLBACK))
    .catch(() => FALLBACK)
}

export function useCars() {
  const [cars, setCars] = useState<Car[]>(FALLBACK)
  useEffect(() => { loadCars().then(setCars) }, [])
  return cars
}
