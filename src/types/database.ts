export type Role = 'admin' | 'ppk' | 'pengawas' | 'pelaksana'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  ppk: 'PPK',
  pengawas: 'Pengawas',
  pelaksana: 'Pelaksana',
}

export interface Profile {
  id: string
  nama_lengkap: string
  email: string
  role: Role | null
  jabatan: string | null
  is_active: boolean
  created_at: string
}

interface Audit {
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface RuasJalan extends Audit {
  id: string
  nama: string
  kode: string | null
  panjang_km: number | null
  keterangan: string | null
  is_active: boolean
}

export interface JenisPekerjaan extends Audit {
  id: string
  nama: string
  urutan: number
  is_active: boolean
}

export const SATUAN = ['ton', 'm³', 'liter', 'sak', 'kg'] as const
export type Satuan = (typeof SATUAN)[number]

export interface Material extends Audit {
  id: string
  nama: string
  satuan: Satuan
  stok_minimum: number
  is_active: boolean
}

export interface Alat extends Audit {
  id: string
  nama: string
  kode: string
  keterangan: string | null
  is_active: boolean
}

export const SISI = ['Kiri', 'Kanan', 'As', 'Full'] as const
export const TAHAP = [0, 50, 100] as const
export type Tahap = (typeof TAHAP)[number]

export interface LaporanPekerjaan extends Audit {
  id: string
  tanggal: string
  ruas_jalan_id: string
  jenis_pekerjaan: string
  sta_awal: string
  sta_akhir: string
  sisi: (typeof SISI)[number]
  panjang: number
  lebar: number
  tebal: number
  luas: number
  volume: number
  keterangan: string | null
  progres: Tahap
}

export interface FotoPekerjaan {
  id: string
  laporan_id: string
  tahap_progres: Tahap
  storage_path: string
  nama_file: string | null
  uploaded_by: string | null
  created_at: string
}

export const SIFAT_SURAT = ['Biasa', 'Penting', 'Segera'] as const
export const STATUS_SURAT = ['Belum', 'Proses', 'Selesai'] as const

export interface Surat extends Audit {
  id: string
  jenis: 'masuk' | 'keluar'
  nomor_surat: string
  tanggal_surat: string
  tanggal_terima_kirim: string | null
  pengirim: string | null
  tujuan: string | null
  perihal: string
  sifat: (typeof SIFAT_SURAT)[number]
  status_tindak_lanjut: (typeof STATUS_SURAT)[number]
  keterangan: string | null
}

export interface LampiranSurat {
  id: string
  surat_id: string
  storage_path: string
  nama_file: string
  mime_type: string | null
  ukuran: number | null
  created_at: string
}

export interface TransaksiMaterial extends Audit {
  id: string
  tanggal: string
  jenis_transaksi: 'masuk' | 'keluar'
  material_id: string
  satuan: Satuan
  jumlah: number
  supplier: string | null
  ruas_jalan_id: string | null
  nomor_surat_jalan: string | null
  keterangan: string | null
  foto_bukti: string[]
}

export interface StokMaterial {
  material_id: string
  nama: string
  satuan: Satuan
  stok_minimum: number
  total_masuk: number
  total_keluar: number
  stok: number
}

export const KONDISI_ALAT = ['Baik', 'Rusak Ringan', 'Rusak Berat'] as const

export interface PemakaianAlat extends Audit {
  id: string
  tanggal: string
  alat_id: string
  kode_alat: string | null
  operator: string
  ruas_jalan_id: string | null
  hm_mulai: number
  hm_selesai: number
  jam_operasi: number
  bbm_liter: number
  kondisi: (typeof KONDISI_ALAT)[number]
  keterangan: string | null
}
