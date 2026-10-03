# Monitoring Pekerjaan Patching Jalan

Aplikasi web monitoring pekerjaan patching jalan — Bidang Bina Marga DPUPR Kab. Sarolangun.

**Stack:** React + Vite + TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Recharts · TanStack Query · Supabase (Auth, Postgres, Storage) · JSZip · jsPDF + jspdf-autotable · browser-image-compression.

Seluruh antarmuka berbahasa Indonesia dan responsif (bisa dipakai dari HP di lapangan; upload foto bisa langsung dari kamera).

## Fitur

| Modul | Isi |
|---|---|
| **Laporan Pekerjaan** | Form tanggal, ruas (pilih / ketik baru), jenis pekerjaan, STA, sisi, P×L×T → luas & volume otomatis, foto multi-upload per tahap 0% / 50% / 100% (drag & drop, preview, kompres di client). Progres = tahap foto tertinggi (dihitung trigger DB). Dashboard KPI + grafik volume harian/mingguan, progres per ruas, komposisi jenis. Unduh foto ZIP (`RuasJalan_STA/0%`, `/50%`, `/100%`), export CSV & PDF (kop, periode, tabel, rekap, opsi thumbnail foto). Halaman detail + galeri lightbox. |
| **Surat Masuk & Keluar** | Tab masuk/keluar, sifat, status tindak lanjut, lampiran PDF/gambar (multi). KPI bulan ini, belum ditindaklanjuti, grafik per bulan. CSV/PDF. |
| **Material Masuk & Keluar** | Transaksi masuk (supplier) / keluar (ruas tujuan), no. surat jalan/DO, foto bukti. Stok = total masuk − total keluar (view `stok_material`), peringatan stok menipis (batas minimum per material), grafik masuk vs keluar. CSV/PDF. |
| **Pemakaian Alat** | Alat + kode, operator, ruas, HM mulai/selesai → jam operasi otomatis, BBM, kondisi. KPI jam, BBM, rata-rata L/jam, jumlah alat per kondisi terakhir, grafik jam kerja per hari & per alat. CSV/PDF. |
| **Manajemen User** (admin) | Tetapkan role, aktif/nonaktifkan akun, kelola master ruas jalan, jenis pekerjaan, material (satuan & stok minimum), alat. |

### Role & hak akses

| Role | Lihat & export/unduh | Tambah & edit | Hapus | Manajemen user & master |
|---|:-:|:-:|:-:|:-:|
| PPK, Pengawas | ✅ | – | – | – |
| Pelaksana | ✅ | ✅ | – | – (boleh menambah ruas jalan baru dari form) |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Belum disetujui / nonaktif | – | – | – | – |

Hak akses diterapkan **dua lapis**: UI menyembunyikan tombol sesuai role, dan **Row Level Security** Supabase di setiap tabel serta bucket storage (fungsi `get_my_role()`). Pendaftar baru tidak memilih role; profil dibuat otomatis oleh trigger dengan role kosong ("menunggu persetujuan admin"). Hanya admin yang bisa mengubah role/status (dijaga trigger), dan admin tidak bisa menurunkan/menonaktifkan dirinya sendiri.

## Setup

### 1. Buat proyek Supabase

1. Buat proyek di <https://supabase.com/dashboard>.
2. Buka **SQL Editor**, tempel seluruh isi [`supabase/migrations/20261003000000_init.sql`](supabase/migrations/20261003000000_init.sql), lalu **Run**.
   Migrasi ini membuat semua tabel, foreign key, trigger (`updated_at`, `created_by`/`updated_by`, profil otomatis, progres foto), fungsi `get_my_role()`, seluruh policy RLS, 3 bucket storage privat (`foto-pekerjaan`, `lampiran-surat`, `bukti-material`) beserta policy-nya, dan data awal master (jenis pekerjaan, material, alat). Aman dijalankan ulang.
   *Alternatif dengan Supabase CLI:* `supabase link --project-ref <ref>` lalu `supabase db push`.
3. **Authentication → URL Configuration**: isi *Site URL* dengan alamat aplikasi (mis. `http://localhost:5173` saat pengembangan) agar tautan konfirmasi email kembali ke aplikasi.
4. (Opsional) **Authentication → Providers → Email**: matikan *Confirm email* bila tidak ingin verifikasi email.

### 2. Konfigurasi aplikasi

```bash
cp .env.example .env
```

Isi `.env` dari **Project Settings → API**:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

> Jangan pernah memasukkan `service_role` key ke `.env` frontend.

### 3. Jalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build produksi ke dist/
```

Untuk hosting statis (Vercel, Netlify, dsb.) arahkan semua path ke `index.html` (SPA fallback) dan set dua variabel `VITE_SUPABASE_*` di pengaturan hosting.

### 4. Membuat akun admin pertama

1. Buka aplikasi → **Daftar**, isi nama, email, dan kata sandi (konfirmasi email bila diaktifkan).
   Akun akan berstatus *menunggu persetujuan*.
2. Di Supabase **SQL Editor** jalankan:

   ```sql
   update public.profiles
   set role = 'admin', is_active = true
   where email = 'email-admin@contoh.go.id';
   ```

   (Query dari SQL Editor berjalan tanpa `auth.uid()`, sehingga diizinkan oleh trigger pelindung role.)
3. Login ulang (atau klik **Periksa lagi**). Selanjutnya admin menetapkan role pengguna lain dari menu **Manajemen User**.

## Struktur

```
supabase/migrations/   migrasi SQL lengkap (tabel, trigger, RLS, storage)
src/
  components/ui/       komponen shadcn/ui
  components/common/   DataTable, FilterBar, KPI, grafik, upload, lightbox, export
  components/layout/   sidebar + header
  contexts/            AuthContext (session + profil/role)
  hooks/               data master & filter
  lib/                 supabase client, format angka/tanggal Indonesia, storage, export CSV/PDF
  pages/               auth, laporan, surat, material, alat, admin
```

## Catatan teknis

- Foto dikompres di browser (maks ±1 MB, sisi terpanjang 1920 px, JPEG) sebelum diunggah ke `foto-pekerjaan/{laporan_id}/{progres}/{nama_file}`. Bucket bersifat privat; foto ditampilkan lewat *signed URL*.
- `luas`, `volume`, dan `jam_operasi` adalah *generated column* di database, sehingga selalu konsisten dengan input.
- Stok dihitung dalam satuan default material; transaksi dengan satuan berbeda tidak dihitung ke stok (form memberi peringatan).
- CSV memakai pemisah `;` dan desimal koma agar langsung terbaca di Excel berlokal Indonesia.
- Akun nonaktif tetap bisa login ke Supabase Auth, tetapi RLS menolak semua akses data dan UI menampilkan halaman "Akun dinonaktifkan". Untuk memblokir login sepenuhnya, gunakan *Ban user* di dashboard Supabase.
