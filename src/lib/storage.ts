import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'
import { safeName, uid } from '@/lib/utils'

export type Bucket = 'foto-pekerjaan' | 'lampiran-surat' | 'bukti-material'

/** Kompres gambar di sisi client (maks ±1 MB, sisi terpanjang 1920 px). File non-gambar dikembalikan apa adanya. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const out = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8,
    })
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([out], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export interface UploadedFile {
  path: string
  name: string
  type: string
  size: number
}

/** Upload beberapa file ke `${prefix}/${uuid8}_${nama}` */
export async function uploadFiles(bucket: Bucket, prefix: string, files: File[], compress = true): Promise<UploadedFile[]> {
  const result: UploadedFile[] = []
  for (const original of files) {
    const file = compress ? await compressImage(original) : original
    const path = `${prefix}/${uid().slice(0, 8)}_${safeName(file.name)}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
    if (error) {
      // Bersihkan file yang sudah terunggah pada batch ini agar tidak yatim
      if (result.length) await supabase.storage.from(bucket).remove(result.map((r) => r.path))
      throw new Error(`Gagal mengunggah ${original.name}: ${error.message}`)
    }
    result.push({ path, name: file.name, type: file.type, size: file.size })
  }
  return result
}

export async function removeFiles(bucket: Bucket, paths: string[]) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) throw error
}

/** Signed URL (berlaku 1 jam) untuk banyak path sekaligus → map path → url */
export async function signedUrls(bucket: Bucket, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn)
  if (error) throw error
  const map: Record<string, string> = {}
  for (const d of data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl
  return map
}

export async function downloadBlob(bucket: Bucket, path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error || !data) throw error ?? new Error('File tidak ditemukan')
  return data
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function fileNameFromPath(path: string) {
  const base = path.split('/').pop() ?? path
  return base.replace(/^[0-9a-f]{8}_/, '')
}

/** Ubah blob gambar menjadi dataURL JPEG kecil (untuk thumbnail PDF) */
export async function blobToThumbDataUrl(blob: Blob, maxSize = 360): Promise<{ data: string; w: number; h: number }> {
  const bmp = await createImageBitmap(blob)
  const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return { data: canvas.toDataURL('image/jpeg', 0.7), w, h }
}
