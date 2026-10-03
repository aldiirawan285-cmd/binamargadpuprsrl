import { useState } from 'react'

export interface Filters {
  dari: string
  sampai: string
  ruasId: string
}

export const emptyFilters: Filters = { dari: '', sampai: '', ruasId: '' }

export function useFilters(initial: Partial<Filters> = {}) {
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters, ...initial })
  return { filters, setFilters, reset: () => setFilters({ ...emptyFilters }) }
}

/** Terapkan filter tanggal/ruas ke query Supabase */
interface Filterable<Q> {
  gte(column: string, value: unknown): Q
  lte(column: string, value: unknown): Q
  eq(column: string, value: unknown): Q
}

export function applyFilters<Q extends Filterable<Q>>(q: Q, f: Filters, dateCol: string, ruasCol?: string): Q {
  let out = q
  if (f.dari) out = out.gte(dateCol, f.dari)
  if (f.sampai) out = out.lte(dateCol, f.sampai)
  if (ruasCol && f.ruasId) out = out.eq(ruasCol, f.ruasId)
  return out
}
