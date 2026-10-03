import { supabase } from '@/lib/supabase'
import { applyFilters, type Filters } from '@/hooks/useFilters'
import { removeFiles } from '@/lib/storage'
import type { StokMaterial, TransaksiMaterial } from '@/types/database'

export async function fetchTransaksi(f: Filters): Promise<TransaksiMaterial[]> {
  const { data, error } = await applyFilters(
    supabase.from('transaksi_material').select('*').order('tanggal', { ascending: false }).order('created_at', { ascending: false }),
    f,
    'tanggal',
    'ruas_jalan_id',
  )
  if (error) throw error
  return (data ?? []) as TransaksiMaterial[]
}

export async function fetchStok(): Promise<StokMaterial[]> {
  const { data, error } = await supabase.from('stok_material').select('*').order('nama')
  if (error) throw error
  return (data ?? []) as StokMaterial[]
}

export async function deleteTransaksi(t: TransaksiMaterial) {
  const { error } = await supabase.from('transaksi_material').delete().eq('id', t.id)
  if (error) throw error
  await removeFiles('bukti-material', t.foto_bukti).catch(() => undefined)
}

export function stokStatus(s: StokMaterial): 'habis' | 'menipis' | 'aman' {
  if (Number(s.stok) <= 0) return 'habis'
  if (Number(s.stok) <= Number(s.stok_minimum)) return 'menipis'
  return 'aman'
}
