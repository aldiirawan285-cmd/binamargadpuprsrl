import { supabase } from '@/lib/supabase'
import { applyFilters, type Filters } from '@/hooks/useFilters'
import { removeFiles, uploadFiles } from '@/lib/storage'
import type { LampiranSurat, Surat } from '@/types/database'

export type SuratRow = Surat & { lampiran_surat: LampiranSurat[] }

export async function fetchSurat(f: Filters): Promise<SuratRow[]> {
  const { data, error } = await applyFilters(
    supabase.from('surat').select('*, lampiran_surat(*)').order('tanggal_surat', { ascending: false }),
    f,
    'tanggal_surat',
  )
  if (error) throw error
  return (data ?? []) as SuratRow[]
}

export async function fetchSuratStats(monthStart: string) {
  const [masuk, keluar, belum] = await Promise.all([
    supabase.from('surat').select('id', { count: 'exact', head: true }).eq('jenis', 'masuk').gte('tanggal_surat', monthStart),
    supabase.from('surat').select('id', { count: 'exact', head: true }).eq('jenis', 'keluar').gte('tanggal_surat', monthStart),
    supabase.from('surat').select('id', { count: 'exact', head: true }).eq('status_tindak_lanjut', 'Belum'),
  ])
  const err = masuk.error ?? keluar.error ?? belum.error
  if (err) throw err
  return { masuk: masuk.count ?? 0, keluar: keluar.count ?? 0, belum: belum.count ?? 0 }
}

export async function uploadLampiran(suratId: string, files: File[]) {
  if (!files.length) return
  const up = await uploadFiles('lampiran-surat', suratId, files)
  const { error } = await supabase.from('lampiran_surat').insert(
    up.map((u) => ({ surat_id: suratId, storage_path: u.path, nama_file: u.name, mime_type: u.type, ukuran: u.size })),
  )
  if (error) {
    await removeFiles('lampiran-surat', up.map((u) => u.path)).catch(() => undefined)
    throw error
  }
}

export async function deleteLampiran(l: { id: string; storage_path: string }) {
  const { error } = await supabase.from('lampiran_surat').delete().eq('id', l.id)
  if (error) throw error
  await removeFiles('lampiran-surat', [l.storage_path]).catch(() => undefined)
}

export async function deleteSurat(row: SuratRow) {
  const { error } = await supabase.from('surat').delete().eq('id', row.id)
  if (error) throw error
  await removeFiles('lampiran-surat', row.lampiran_surat.map((l) => l.storage_path)).catch(() => undefined)
}
