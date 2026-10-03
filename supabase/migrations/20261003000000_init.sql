-- =============================================================================
-- Monitoring Pekerjaan Patching Jalan — migrasi awal
-- Jalankan di Supabase SQL Editor (atau `supabase db push`).
-- Berisi: tabel, foreign key, trigger updated_at / audit, trigger profil,
-- fungsi get_my_role(), seluruh policy RLS, bucket storage + policy-nya.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. PROFIL & ROLE
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  nama_lengkap  text not null default '',
  email         text not null default '',
  role          text check (role in ('admin', 'ppk', 'pengawas', 'pelaksana')),
  jabatan       text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on column public.profiles.role is 'NULL = menunggu persetujuan admin';

-- Role user yang sedang login (NULL bila belum disetujui / nonaktif).
-- SECURITY DEFINER agar tidak rekursif terhadap RLS tabel profiles.
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.can_read()
returns boolean language sql stable security definer set search_path = public
as $$ select public.get_my_role() in ('admin', 'ppk', 'pengawas', 'pelaksana') $$;

create or replace function public.can_write()
returns boolean language sql stable security definer set search_path = public
as $$ select public.get_my_role() in ('admin', 'pelaksana') $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.get_my_role() = 'admin', false) $$;

revoke all on function public.get_my_role() from anon;
grant execute on function public.get_my_role(), public.can_read(), public.can_write(), public.is_admin() to authenticated;

-- Profil otomatis dibuat saat user mendaftar (role = NULL / menunggu persetujuan)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama_lengkap, email, jabatan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama_lengkap', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'jabatan', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hanya admin yang boleh mengubah role / status aktif.
-- Konteks server (SQL Editor, service_role) memiliki auth.uid() NULL dan diizinkan
-- — dipakai untuk membuat admin pertama.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
      raise exception 'Hanya admin yang dapat mengubah role atau status akun';
    end if;
  end if;
  if auth.uid() is not null and auth.uid() = old.id and public.is_admin()
     and (new.role is distinct from 'admin' or not new.is_active) then
    raise exception 'Admin tidak dapat menurunkan role atau menonaktifkan akunnya sendiri';
  end if;
  new.id := old.id;
  new.email := old.email;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- -----------------------------------------------------------------------------
-- 2. FUNGSI TRIGGER UMUM
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Mengisi created_by / updated_by dari auth.uid() (tidak bisa dipalsukan client)
create or replace function public.set_audit_fields()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. DATA MASTER (dikelola admin)
-- -----------------------------------------------------------------------------
create table if not exists public.ruas_jalan (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null unique,
  kode        text,
  panjang_km  numeric(10, 3) check (panjang_km is null or panjang_km >= 0),
  keterangan  text,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.jenis_pekerjaan (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null unique,
  urutan      int not null default 0,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.material (
  id            uuid primary key default gen_random_uuid(),
  nama          text not null unique,
  satuan        text not null default 'ton' check (satuan in ('ton', 'm³', 'liter', 'sak', 'kg')),
  stok_minimum  numeric(14, 2) not null default 0 check (stok_minimum >= 0),
  is_active     boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.alat (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null,
  kode        text not null unique,
  keterangan  text,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. LAPORAN PEKERJAAN
-- -----------------------------------------------------------------------------
create table if not exists public.laporan_pekerjaan (
  id               uuid primary key default gen_random_uuid(),
  tanggal          date not null,
  ruas_jalan_id    uuid not null references public.ruas_jalan (id) on delete restrict,
  jenis_pekerjaan  text not null,
  sta_awal         text not null check (sta_awal ~ '^\d+\+\d{1,3}$'),
  sta_akhir        text not null check (sta_akhir ~ '^\d+\+\d{1,3}$'),
  sisi             text not null check (sisi in ('Kiri', 'Kanan', 'As', 'Full')),
  panjang          numeric(12, 2) not null check (panjang >= 0),
  lebar            numeric(12, 2) not null check (lebar >= 0),
  tebal            numeric(12, 2) not null check (tebal >= 0),
  luas             numeric(14, 2) generated always as (round(panjang * lebar, 2)) stored,
  volume           numeric(14, 3) generated always as (round(panjang * lebar * (tebal / 100.0), 3)) stored,
  keterangan       text,
  progres          int not null default 0 check (progres in (0, 50, 100)),
  created_by       uuid references public.profiles (id) on delete set null,
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_laporan_tanggal on public.laporan_pekerjaan (tanggal);
create index if not exists idx_laporan_ruas on public.laporan_pekerjaan (ruas_jalan_id);

create table if not exists public.foto_pekerjaan (
  id             uuid primary key default gen_random_uuid(),
  laporan_id     uuid not null references public.laporan_pekerjaan (id) on delete cascade,
  tahap_progres  int not null check (tahap_progres in (0, 50, 100)),
  storage_path   text not null unique,
  nama_file      text,
  uploaded_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);
create index if not exists idx_foto_laporan on public.foto_pekerjaan (laporan_id);

-- Progres laporan = tahap foto tertinggi yang sudah ada
create or replace function public.sync_progres_laporan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(new.laporan_id, old.laporan_id);
begin
  update public.laporan_pekerjaan l
     set progres = coalesce((select max(f.tahap_progres) from public.foto_pekerjaan f where f.laporan_id = v_id), 0)
   where l.id = v_id;
  return null;
end;
$$;

drop trigger if exists trg_foto_progres on public.foto_pekerjaan;
create trigger trg_foto_progres
  after insert or update or delete on public.foto_pekerjaan
  for each row execute function public.sync_progres_laporan();

-- uploaded_by selalu user yang login
create or replace function public.set_uploaded_by()
returns trigger language plpgsql as $$
begin
  new.uploaded_by := coalesce(auth.uid(), new.uploaded_by);
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. SURAT MASUK & KELUAR
-- -----------------------------------------------------------------------------
create table if not exists public.surat (
  id                    uuid primary key default gen_random_uuid(),
  jenis                 text not null check (jenis in ('masuk', 'keluar')),
  nomor_surat           text not null,
  tanggal_surat         date not null,
  tanggal_terima_kirim  date,
  pengirim              text,
  tujuan                text,
  perihal               text not null,
  sifat                 text not null default 'Biasa' check (sifat in ('Biasa', 'Penting', 'Segera')),
  status_tindak_lanjut  text not null default 'Belum' check (status_tindak_lanjut in ('Belum', 'Proses', 'Selesai')),
  keterangan            text,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint surat_pihak_check check (
    (jenis = 'masuk' and coalesce(pengirim, '') <> '') or
    (jenis = 'keluar' and coalesce(tujuan, '') <> '')
  )
);
create index if not exists idx_surat_tanggal on public.surat (tanggal_surat);

create table if not exists public.lampiran_surat (
  id            uuid primary key default gen_random_uuid(),
  surat_id      uuid not null references public.surat (id) on delete cascade,
  storage_path  text not null unique,
  nama_file     text not null,
  mime_type     text,
  ukuran        bigint,
  uploaded_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists idx_lampiran_surat on public.lampiran_surat (surat_id);

-- -----------------------------------------------------------------------------
-- 6. MATERIAL MASUK & KELUAR
-- -----------------------------------------------------------------------------
create table if not exists public.transaksi_material (
  id                 uuid primary key default gen_random_uuid(),
  tanggal            date not null,
  jenis_transaksi    text not null check (jenis_transaksi in ('masuk', 'keluar')),
  material_id        uuid not null references public.material (id) on delete restrict,
  satuan             text not null check (satuan in ('ton', 'm³', 'liter', 'sak', 'kg')),
  jumlah             numeric(14, 2) not null check (jumlah > 0),
  supplier           text,
  ruas_jalan_id      uuid references public.ruas_jalan (id) on delete restrict,
  nomor_surat_jalan  text,
  keterangan         text,
  foto_bukti         text[] not null default '{}',
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint transaksi_pihak_check check (
    (jenis_transaksi = 'masuk' and coalesce(supplier, '') <> '') or
    (jenis_transaksi = 'keluar' and ruas_jalan_id is not null)
  )
);
create index if not exists idx_transaksi_tanggal on public.transaksi_material (tanggal);
create index if not exists idx_transaksi_material on public.transaksi_material (material_id);

-- Stok tersedia per material (total masuk − total keluar), dihitung dalam satuan
-- default material. Transaksi dengan satuan lain dilaporkan terpisah oleh aplikasi.
create or replace view public.stok_material
with (security_invoker = true)
as
select
  m.id as material_id,
  m.nama,
  m.satuan,
  m.stok_minimum,
  coalesce(sum(t.jumlah) filter (where t.jenis_transaksi = 'masuk'), 0)  as total_masuk,
  coalesce(sum(t.jumlah) filter (where t.jenis_transaksi = 'keluar'), 0) as total_keluar,
  coalesce(sum(case when t.jenis_transaksi = 'masuk' then t.jumlah else -t.jumlah end), 0) as stok
from public.material m
left join public.transaksi_material t on t.material_id = m.id and t.satuan = m.satuan
group by m.id;

-- -----------------------------------------------------------------------------
-- 7. PEMAKAIAN ALAT
-- -----------------------------------------------------------------------------
create table if not exists public.pemakaian_alat (
  id             uuid primary key default gen_random_uuid(),
  tanggal        date not null,
  alat_id        uuid not null references public.alat (id) on delete restrict,
  kode_alat      text,
  operator       text not null,
  ruas_jalan_id  uuid references public.ruas_jalan (id) on delete restrict,
  hm_mulai       numeric(12, 2) not null check (hm_mulai >= 0),
  hm_selesai     numeric(12, 2) not null check (hm_selesai >= 0),
  jam_operasi    numeric(12, 2) generated always as (hm_selesai - hm_mulai) stored,
  bbm_liter      numeric(12, 2) not null default 0 check (bbm_liter >= 0),
  kondisi        text not null default 'Baik' check (kondisi in ('Baik', 'Rusak Ringan', 'Rusak Berat')),
  keterangan     text,
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint hm_check check (hm_selesai >= hm_mulai)
);
create index if not exists idx_pemakaian_tanggal on public.pemakaian_alat (tanggal);

-- -----------------------------------------------------------------------------
-- 8. TRIGGER AUDIT (created_by / updated_by / updated_at)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'ruas_jalan', 'jenis_pekerjaan', 'material', 'alat',
    'laporan_pekerjaan', 'surat', 'transaksi_material', 'pemakaian_alat'
  ] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format(
      'create trigger trg_audit before insert or update on public.%I
         for each row execute function public.set_audit_fields()', t);
  end loop;
end $$;

drop trigger if exists trg_uploaded_by on public.foto_pekerjaan;
create trigger trg_uploaded_by before insert on public.foto_pekerjaan
  for each row execute function public.set_uploaded_by();

drop trigger if exists trg_uploaded_by on public.lampiran_surat;
create trigger trg_uploaded_by before insert on public.lampiran_surat
  for each row execute function public.set_uploaded_by();

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
--   PPK & Pengawas : SELECT saja
--   Pelaksana      : SELECT, INSERT, UPDATE
--   Admin          : semua + kelola master & user
-- -----------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.ruas_jalan          enable row level security;
alter table public.jenis_pekerjaan     enable row level security;
alter table public.material            enable row level security;
alter table public.alat                enable row level security;
alter table public.laporan_pekerjaan   enable row level security;
alter table public.foto_pekerjaan      enable row level security;
alter table public.surat               enable row level security;
alter table public.lampiran_surat      enable row level security;
alter table public.transaksi_material  enable row level security;
alter table public.pemakaian_alat      enable row level security;

-- profiles
drop policy if exists "profil: baca milik sendiri" on public.profiles;
create policy "profil: baca milik sendiri" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profil: user aktif baca semua" on public.profiles;
create policy "profil: user aktif baca semua" on public.profiles
  for select to authenticated using (public.can_read());

drop policy if exists "profil: ubah milik sendiri" on public.profiles;
create policy "profil: ubah milik sendiri" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profil: admin ubah semua" on public.profiles;
create policy "profil: admin ubah semua" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tabel transaksi: baca semua role, tulis admin+pelaksana, hapus admin
do $$
declare
  t text;
begin
  foreach t in array array[
    'laporan_pekerjaan', 'foto_pekerjaan', 'surat', 'lampiran_surat',
    'transaksi_material', 'pemakaian_alat'
  ] loop
    execute format('drop policy if exists "baca" on public.%I', t);
    execute format('create policy "baca" on public.%I for select to authenticated using (public.can_read())', t);
    execute format('drop policy if exists "tambah" on public.%I', t);
    execute format('create policy "tambah" on public.%I for insert to authenticated with check (public.can_write())', t);
    execute format('drop policy if exists "ubah" on public.%I', t);
    execute format('create policy "ubah" on public.%I for update to authenticated using (public.can_write()) with check (public.can_write())', t);
    execute format('drop policy if exists "hapus" on public.%I', t);
    execute format('create policy "hapus" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- Data master: baca semua role, kelola admin.
do $$
declare
  t text;
begin
  foreach t in array array['ruas_jalan', 'jenis_pekerjaan', 'material', 'alat'] loop
    execute format('drop policy if exists "baca" on public.%I', t);
    execute format('create policy "baca" on public.%I for select to authenticated using (public.can_read())', t);
    execute format('drop policy if exists "tambah" on public.%I', t);
    execute format('create policy "tambah" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('drop policy if exists "ubah" on public.%I', t);
    execute format('create policy "ubah" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists "hapus" on public.%I', t);
    execute format('create policy "hapus" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- Pelaksana boleh menambah ruas jalan baru langsung dari form laporan ("ketik baru")
drop policy if exists "tambah" on public.ruas_jalan;
create policy "tambah" on public.ruas_jalan
  for insert to authenticated with check (public.can_write());

grant select on public.stok_material to authenticated;

-- -----------------------------------------------------------------------------
-- 10. STORAGE BUCKETS + POLICY
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('foto-pekerjaan', 'foto-pekerjaan', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('lampiran-surat', 'lampiran-surat', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('bukti-material', 'bukti-material', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "app: baca file" on storage.objects;
create policy "app: baca file" on storage.objects
  for select to authenticated
  using (bucket_id in ('foto-pekerjaan', 'lampiran-surat', 'bukti-material') and public.can_read());

drop policy if exists "app: unggah file" on storage.objects;
create policy "app: unggah file" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('foto-pekerjaan', 'lampiran-surat', 'bukti-material') and public.can_write());

drop policy if exists "app: ubah file" on storage.objects;
create policy "app: ubah file" on storage.objects
  for update to authenticated
  using (bucket_id in ('foto-pekerjaan', 'lampiran-surat', 'bukti-material') and public.can_write())
  with check (bucket_id in ('foto-pekerjaan', 'lampiran-surat', 'bukti-material') and public.can_write());

drop policy if exists "app: hapus file" on storage.objects;
create policy "app: hapus file" on storage.objects
  for delete to authenticated
  using (bucket_id in ('foto-pekerjaan', 'lampiran-surat', 'bukti-material') and public.is_admin());

-- -----------------------------------------------------------------------------
-- 11. DATA AWAL MASTER
-- -----------------------------------------------------------------------------
insert into public.jenis_pekerjaan (nama, urutan) values
  ('Patching/Penambalan Lubang', 1),
  ('Galian', 2),
  ('Lapis Pondasi', 3),
  ('Pengaspalan AC-WC', 4),
  ('Lainnya', 99)
on conflict (nama) do nothing;

insert into public.material (nama, satuan, stok_minimum) values
  ('Aspal/AC-WC', 'ton', 10),
  ('Agregat', 'm³', 20),
  ('Pasir', 'm³', 10),
  ('Semen', 'sak', 50),
  ('Prime Coat', 'liter', 200),
  ('Tack Coat', 'liter', 200)
on conflict (nama) do nothing;

insert into public.alat (nama, kode) values
  ('Asphalt Finisher', 'AF-01'),
  ('Tandem Roller', 'TR-01'),
  ('Pneumatic Tire Roller', 'PTR-01'),
  ('Dump Truck', 'DT-01'),
  ('Dump Truck', 'DT-02'),
  ('Excavator', 'EX-01'),
  ('Compressor', 'CP-01'),
  ('Asphalt Cutter', 'AC-01'),
  ('Stamper', 'ST-01')
on conflict (kode) do nothing;
