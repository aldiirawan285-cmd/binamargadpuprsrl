import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Alat, JenisPekerjaan, Material, Profile, RuasJalan } from '@/types/database'

async function fetchAll<T>(table: string, order: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').order(order)
  if (error) throw error
  return (data ?? []) as T[]
}

export const qk = {
  ruas: ['master', 'ruas_jalan'] as const,
  jenis: ['master', 'jenis_pekerjaan'] as const,
  material: ['master', 'material'] as const,
  alat: ['master', 'alat'] as const,
  profiles: ['profiles'] as const,
}

export const useRuasJalan = () => useQuery({ queryKey: qk.ruas, queryFn: () => fetchAll<RuasJalan>('ruas_jalan', 'nama') })
export const useJenisPekerjaan = () =>
  useQuery({ queryKey: qk.jenis, queryFn: () => fetchAll<JenisPekerjaan>('jenis_pekerjaan', 'urutan') })
export const useMaterial = () => useQuery({ queryKey: qk.material, queryFn: () => fetchAll<Material>('material', 'nama') })
export const useAlat = () => useQuery({ queryKey: qk.alat, queryFn: () => fetchAll<Alat>('alat', 'nama') })
export const useProfiles = () => useQuery({ queryKey: qk.profiles, queryFn: () => fetchAll<Profile>('profiles', 'nama_lengkap') })

/** Map id → item untuk lookup cepat */
export function byId<T extends { id: string }>(list: T[] | undefined): Record<string, T> {
  const m: Record<string, T> = {}
  for (const x of list ?? []) m[x.id] = x
  return m
}
