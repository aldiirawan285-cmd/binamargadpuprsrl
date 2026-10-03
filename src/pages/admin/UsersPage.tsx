import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Ban, CheckCircle2, Clock, Database, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/common/DataTable'
import { KpiCard } from '@/components/common/KpiCard'
import { SectionTitle } from '@/components/common/PageSection'
import { useAuth } from '@/contexts/AuthContext'
import { qk } from '@/hooks/useMaster'
import { supabase } from '@/lib/supabase'
import { fmtDate, fmtInt } from '@/lib/format'
import { ROLE_LABEL, SATUAN, type Profile, type Role } from '@/types/database'
import { MasterCrud } from './MasterCrud'

const PENDING = '__pending__'
const ALL = '__all__'

export default function UsersPage() {
  const qc = useQueryClient()
  const { profile: me } = useAuth()
  const [roleFilter, setRoleFilter] = useState(ALL)
  const { data = [], isLoading } = useQuery({
    queryKey: qk.profiles,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })

  const rows = useMemo(
    () => data.filter((p) => roleFilter === ALL || (roleFilter === PENDING ? !p.role : p.role === roleFilter)),
    [data, roleFilter],
  )
  const pending = data.filter((p) => !p.role).length

  async function update(p: Profile, patch: Partial<Pick<Profile, 'role' | 'is_active'>>, msg: string) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', p.id)
    if (error) return toast.error(`Gagal: ${error.message}`)
    toast.success(msg)
    qc.invalidateQueries({ queryKey: qk.profiles })
  }

  const columns: Column<Profile>[] = [
    {
      id: 'nama', header: 'Nama',
      cell: (p) => (
        <div>
          <div className="font-medium">{p.nama_lengkap || '-'}{p.id === me?.id && <span className="ml-1 text-xs text-muted-foreground">(Anda)</span>}</div>
          <div className="text-xs text-muted-foreground">{p.jabatan || '—'}</div>
        </div>
      ),
      sortValue: (p) => p.nama_lengkap,
    },
    { id: 'email', header: 'Email', cell: (p) => p.email, sortValue: (p) => p.email },
    {
      id: 'role', header: 'Role',
      cell: (p) => (
        <Select
          value={p.role ?? PENDING}
          disabled={p.id === me?.id}
          onValueChange={(v) => update(p, { role: v === PENDING ? null : (v as Role) }, `Role ${p.nama_lengkap} diubah menjadi ${v === PENDING ? 'menunggu persetujuan' : ROLE_LABEL[v as Role]}`)}
        >
          <SelectTrigger className="h-9 w-[220px]" aria-label={`Role ${p.nama_lengkap}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={PENDING}>— Menunggu persetujuan —</SelectItem>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
      sortValue: (p) => p.role ?? '',
    },
    {
      id: 'status', header: 'Status',
      cell: (p) =>
        !p.is_active ? <Badge variant="danger"><Ban className="h-3 w-3" /> Nonaktif</Badge>
        : !p.role ? <Badge variant="warning"><Clock className="h-3 w-3" /> Menunggu</Badge>
        : <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>,
      sortValue: (p) => (!p.is_active ? 0 : !p.role ? 1 : 2),
    },
    { id: 'daftar', header: 'Terdaftar', cell: (p) => <span className="whitespace-nowrap">{fmtDate(p.created_at.slice(0, 10))}</span>, sortValue: (p) => p.created_at },
  ]

  return (
    <div className="space-y-5">
      <SectionTitle title="Manajemen User & Data Master" description="Tetapkan role akun baru, nonaktifkan akun, dan kelola data master." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total pengguna" value={fmtInt(data.length)} icon={Users} loading={isLoading} />
        <KpiCard label="Menunggu persetujuan" value={fmtInt(pending)} icon={Clock} loading={isLoading} tone={pending ? 'warn' : undefined} />
        <KpiCard label="Aktif" value={fmtInt(data.filter((p) => p.role && p.is_active).length)} icon={UserCheck} loading={isLoading} />
        <KpiCard label="Admin" value={fmtInt(data.filter((p) => p.role === 'admin').length)} icon={ShieldCheck} loading={isLoading} />
      </div>

      <Tabs defaultValue="user">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="user"><Users className="h-4 w-4" /> Pengguna</TabsTrigger>
          <TabsTrigger value="ruas"><Database className="h-4 w-4" /> Ruas Jalan</TabsTrigger>
          <TabsTrigger value="jenis">Jenis Pekerjaan</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="alat">Alat</TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <DataTable
            data={rows}
            columns={columns}
            getId={(p) => p.id}
            loading={isLoading}
            defaultSort={{ id: 'status', desc: false }}
            searchText={(p) => `${p.nama_lengkap} ${p.email} ${p.jabatan ?? ''}`}
            searchPlaceholder="Cari nama atau email…"
            toolbar={
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-[200px]" aria-label="Filter role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua role</SelectItem>
                  <SelectItem value={PENDING}>Menunggu persetujuan</SelectItem>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            }
            rowActions={(p) =>
              p.id === me?.id ? null : p.is_active ? (
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => update(p, { is_active: false }, `Akun ${p.nama_lengkap} dinonaktifkan`)}>
                  <Ban /> Nonaktifkan
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => update(p, { is_active: true }, `Akun ${p.nama_lengkap} diaktifkan`)}>
                  <CheckCircle2 /> Aktifkan
                </Button>
              )
            }
          />
        </TabsContent>
        <TabsContent value="ruas">
          <MasterCrud
            table="ruas_jalan"
            title="Ruas Jalan"
            queryKey={qk.ruas}
            orderBy="nama"
            fields={[
              { key: 'nama', label: 'Nama ruas', type: 'text', required: true },
              { key: 'kode', label: 'Kode / nomor ruas', type: 'text' },
              { key: 'panjang_km', label: 'Panjang (km)', type: 'number' },
              { key: 'keterangan', label: 'Keterangan', type: 'text' },
            ]}
          />
        </TabsContent>
        <TabsContent value="jenis">
          <MasterCrud
            table="jenis_pekerjaan"
            title="Jenis Pekerjaan"
            queryKey={qk.jenis}
            orderBy="urutan"
            fields={[
              { key: 'nama', label: 'Nama jenis pekerjaan', type: 'text', required: true },
              { key: 'urutan', label: 'Urutan tampil', type: 'number', required: true },
            ]}
          />
        </TabsContent>
        <TabsContent value="material">
          <MasterCrud
            table="material"
            title="Material"
            queryKey={qk.material}
            orderBy="nama"
            fields={[
              { key: 'nama', label: 'Nama material', type: 'text', required: true },
              { key: 'satuan', label: 'Satuan stok', type: 'select', options: SATUAN, required: true },
              { key: 'stok_minimum', label: 'Batas stok minimum', type: 'number', required: true, hint: 'Peringatan muncul bila stok ≤ batas ini' },
            ]}
          />
        </TabsContent>
        <TabsContent value="alat">
          <MasterCrud
            table="alat"
            title="Alat"
            queryKey={qk.alat}
            orderBy="nama"
            fields={[
              { key: 'nama', label: 'Nama alat', type: 'text', required: true },
              { key: 'kode', label: 'Nomor / kode alat', type: 'text', required: true },
              { key: 'keterangan', label: 'Keterangan', type: 'text' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
