import JSZip from 'jszip'
import { supabase } from '@/lib/supabase'
import { applyFilters, type Filters } from '@/hooks/useFilters'
import { blobToThumbDataUrl, downloadBlob, fileNameFromPath, removeFiles, uploadFiles } from '@/lib/storage'
import { safeName } from '@/lib/utils'
import { fmtDate } from '@/lib/format'
import { TAHAP, type FotoPekerjaan, type LaporanPekerjaan, type Tahap } from '@/types/database'
import type { PdfImageGroup } from '@/lib/export'

export type LaporanRow = LaporanPekerjaan & { foto_pekerjaan: FotoPekerjaan[] }

export const laporanKey = (f?: Filters) => (f ? ['laporan', f] : ['laporan'])

export async function fetchLaporan(f: Filters): Promise<LaporanRow[]> {
  const q = applyFilters(
    supabase.from('laporan_pekerjaan').select('*, foto_pekerjaan(*)').order('tanggal', { ascending: false }).order('created_at', { ascending: false }),
    f,
    'tanggal',
    'ruas_jalan_id',
  )
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as LaporanRow[]
}

export async function fetchLaporanById(id: string): Promise<LaporanRow | null> {
  const { data, error } = await supabase.from('laporan_pekerjaan').select('*, foto_pekerjaan(*)').eq('id', id).maybeSingle()
  if (error) throw error
  return data as LaporanRow | null
}

export type PendingFotos = Record<Tahap, File[]>

/** Upload foto baru per tahap ke `{laporan_id}/{progres}/{nama_file}` lalu catat di tabel foto_pekerjaan */
export async function uploadFotoLaporan(laporanId: string, pending: PendingFotos) {
  for (const tahap of TAHAP) {
    const files = pending[tahap]
    if (!files.length) continue
    const uploaded = await uploadFiles('foto-pekerjaan', `${laporanId}/${tahap}`, files)
    const { error } = await supabase.from('foto_pekerjaan').insert(
      uploaded.map((u) => ({ laporan_id: laporanId, tahap_progres: tahap, storage_path: u.path, nama_file: u.name })),
    )
    if (error) {
      await removeFiles('foto-pekerjaan', uploaded.map((u) => u.path)).catch(() => undefined)
      throw error
    }
  }
}

export async function deleteFoto(foto: FotoPekerjaan) {
  const { error } = await supabase.from('foto_pekerjaan').delete().eq('id', foto.id)
  if (error) throw error
  await removeFiles('foto-pekerjaan', [foto.storage_path]).catch(() => undefined)
}

export async function deleteLaporan(row: LaporanRow) {
  const paths = row.foto_pekerjaan.map((f) => f.storage_path)
  const { error } = await supabase.from('laporan_pekerjaan').delete().eq('id', row.id)
  if (error) throw error
  await removeFiles('foto-pekerjaan', paths).catch(() => undefined)
}

export const tahapLabel = (t: number) => `${t}%`

/**
 * Unduh semua foto laporan terpilih dalam satu ZIP.
 * Struktur: RuasJalan_STA/0%/…, /50%/…, /100%/…
 */
export async function downloadFotoZip(rows: LaporanRow[], ruasName: (id: string) => string, onProgress?: (done: number, total: number) => void) {
  const zip = new JSZip()
  const used = new Set<string>()
  const all = rows.flatMap((r) => r.foto_pekerjaan.map((f) => ({ r, f })))
  let done = 0
  let failed = 0

  const folderOf = new Map<string, string>()
  for (const r of rows) {
    let base = safeName(`${ruasName(r.ruas_jalan_id)}_STA ${r.sta_awal}-${r.sta_akhir}`)
    if (used.has(base)) base = `${base}_${r.tanggal}`
    let n = 2
    let name = base
    while (used.has(name)) name = `${base}_${n++}`
    used.add(name)
    folderOf.set(r.id, name)
  }

  // Unduh paralel terbatas (4 sekaligus)
  const queue = [...all]
  async function worker() {
    while (queue.length) {
      const { r, f } = queue.shift()!
      try {
        const blob = await downloadBlob('foto-pekerjaan', f.storage_path)
        zip.file(`${folderOf.get(r.id)}/${tahapLabel(f.tahap_progres)}/${fileNameFromPath(f.storage_path)}`, blob)
      } catch {
        failed++
      }
      onProgress?.(++done, all.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, all.length) }, worker))
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, total: all.length, failed }
}

/** Siapkan thumbnail foto per tahap untuk lampiran PDF (maks. `perTahap` foto per tahap) */
export async function buildPdfImageGroups(rows: LaporanRow[], ruasName: (id: string) => string, perTahap = 3): Promise<PdfImageGroup[]> {
  const groups: PdfImageGroup[] = []
  for (const r of rows) {
    const sections: PdfImageGroup['sections'] = []
    for (const t of TAHAP) {
      const fotos = r.foto_pekerjaan.filter((f) => f.tahap_progres === t).slice(0, perTahap)
      const images = []
      for (const f of fotos) {
        try {
          images.push(await blobToThumbDataUrl(await downloadBlob('foto-pekerjaan', f.storage_path)))
        } catch {
          /* lewati foto yang gagal */
        }
      }
      sections.push({ label: tahapLabel(t), images })
    }
    groups.push({ title: `${fmtDate(r.tanggal)} · ${ruasName(r.ruas_jalan_id)} · STA ${r.sta_awal} s/d ${r.sta_akhir} (${r.sisi})`, sections })
  }
  return groups
}
