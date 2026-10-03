import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Image as ImageIcon, Package, Pencil, Plus, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterBar } from '@/components/common/FilterBar'
import { KpiCard } from '@/components/common/KpiCard'
import { ChartCard, GroupBarChart, SERIES } from '@/components/common/Charts'
import { ExportMenu } from '@/components/common/ExportMenu'
import { ConfirmDelete } from '@/components/common/ConfirmDelete'
import { SectionTitle } from '@/components/common/PageSection'
import { AttachmentList } from '@/components/common/AttachmentList'
import { useFilters } from '@/hooks/useFilters'
import { byId, useMaterial, useRuasJalan } from '@/hooks/useMaster'
import { useRole } from '@/contexts/AuthContext'
import { canDelete, canWrite } from '@/lib/permissions'
import { fmtDate, fmtDayMonth, fmtInt, fmtMonthKey, fmtNum, monthKey, today } from '@/lib/format'
import { exportCSV, exportPDF, type ExportColumn } from '@/lib/export'
import { fileNameFromPath } from '@/lib/storage'
import { errorMessage } from '@/lib/utils'
import type { StokMaterial, TransaksiMaterial } from '@/types/database'
import { deleteTransaksi, fetchStok, fetchTransaksi, stokStatus } from './api'
import { TransaksiForm } from './TransaksiForm'

const ALL = '__all__'

function StokBadge({ s }: { s: StokMaterial }) {
  const st = stokStatus(s)
  if (st === 'habis') return <Badge variant="danger"><XCircle className="h-3 w-3" /> Habis</Badge>
  if (st === 'menipis') return <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Menipis</Badge>
  return <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Aman</Badge>
}

export default function MaterialPage() {
  const qc = useQueryClient()
  const role = useRole()
  const { filters, setFilters, reset } = useFilters()
  const [jenis, setJenis] = useState('')
  const [visible, setVisible] = useState<TransaksiMaterial[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TransaksiMaterial | null>(null)
  const [deleting, setDeleting] = useState<TransaksiMaterial | null>(null)
  const [bukti, setBukti] = useState<TransaksiMaterial | null>(null)
  const [chartMaterial, setChartMaterial] = useState('')
  const [granularity, setGranularity] = useState<'hari' | 'bulan'>('hari')

  const { data: materials = [] } = useMaterial()
  const { data: ruas } = useRuasJalan()
  const matMap = useMemo(() => byId(materials), [materials])
  const ruasMap = useMemo(() => byId(ruas), [ruas])
  const { data = [], isLoading } = useQuery({ queryKey: ['material', 'transaksi', filters], queryFn: () => fetchTransaksi(filters) })
  const { data: stok = [], isLoading: stokLoading } = useQuery({ queryKey: ['material', 'stok'], queryFn: fetchStok })

  useEffect(() => {
    if (!chartMaterial && materials.length) setChartMaterial(materials[0].id)
  }, [materials, chartMaterial])

  const tableData = useMemo(() => (jenis ? data.filter((t) => t.jenis_transaksi === jenis) : data), [data, jenis])
  const menipis = stok.filter((s) => stokStatus(s) !== 'aman')
  const matName = (id: string) => matMap[id]?.nama ?? '-'
  const tujuan = (t: TransaksiMaterial) => (t.jenis_transaksi === 'masuk' ? t.supplier ?? '-' : ruasMap[t.ruas_jalan_id ?? '']?.nama ?? '-')

  const chartUnit = matMap[chartMaterial]?.satuan ?? ''
  const chart = useMemo(() => {
    const m = new Map<string, { periode: string; masuk: number; keluar: number }>()
    for (const t of data) {
      if (t.material_id !== chartMaterial || t.satuan !== chartUnit) continue
      const k = granularity === 'hari' ? t.tanggal : monthKey(t.tanggal)
      const e = m.get(k) ?? { periode: k, masuk: 0, keluar: 0 }
      e[t.jenis_transaksi] += Number(t.jumlah)
      m.set(k, e)
    }
    return [...m.values()].sort((a, b) => a.periode.localeCompare(b.periode))
  }, [data, chartMaterial, chartUnit, granularity])

  const columns: Column<TransaksiMaterial>[] = [
    { id: 'tanggal', header: 'Tanggal', cell: (t) => <span className="whitespace-nowrap">{fmtDate(t.tanggal)}</span>, sortValue: (t) => t.tanggal },
    {
      id: 'jenis', header: 'Jenis',
      cell: (t) => t.jenis_transaksi === 'masuk'
        ? <Badge variant="outline" className="gap-1"><ArrowDownToLine className="h-3 w-3" /> Masuk</Badge>
        : <Badge variant="secondary" className="gap-1"><ArrowUpFromLine className="h-3 w-3" /> Keluar</Badge>,
      sortValue: (t) => t.jenis_transaksi,
    },
    { id: 'material', header: 'Material', cell: (t) => <span className="font-medium">{matName(t.material_id)}</span>, sortValue: (t) => matName(t.material_id) },
    { id: 'jumlah', header: 'Jumlah', align: 'right', cell: (t) => `${fmtNum(t.jumlah)} ${t.satuan}`, sortValue: (t) => Number(t.jumlah) },
    { id: 'tujuan', header: 'Supplier / Ruas Tujuan', cell: tujuan, sortValue: tujuan },
    { id: 'sj', header: 'No. Surat Jalan/DO', cell: (t) => t.nomor_surat_jalan ?? '-', sortValue: (t) => t.nomor_surat_jalan },
    {
      id: 'bukti', header: 'Bukti', align: 'center',
      cell: (t) => t.foto_bukti.length
        ? <button type="button" onClick={(e) => { e.stopPropagation(); setBukti(t) }} className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"><ImageIcon className="h-3.5 w-3.5" />{t.foto_bukti.length}</button>
        : '-',
    },
  ]

  const exportCols: ExportColumn<TransaksiMaterial>[] = [
    { header: 'Tanggal', csv: (t) => t.tanggal, pdf: (t) => fmtDate(t.tanggal) },
    { header: 'Jenis', csv: (t) => (t.jenis_transaksi === 'masuk' ? 'Masuk' : 'Keluar') },
    { header: 'Material', csv: (t) => matName(t.material_id) },
    { header: 'Jumlah', csv: (t) => Number(t.jumlah), pdf: (t) => fmtNum(t.jumlah), align: 'right' },
    { header: 'Satuan', csv: (t) => t.satuan },
    { header: 'Supplier / Ruas Tujuan', csv: tujuan },
    { header: 'No. Surat Jalan/DO', csv: (t) => t.nomor_surat_jalan ?? '' },
    { header: 'Keterangan', csv: (t) => t.keterangan ?? '' },
  ]

  function rekap(rows: TransaksiMaterial[]): [string, string][] {
    const m = new Map<string, { masuk: number; keluar: number }>()
    for (const t of rows) {
      const k = `${matName(t.material_id)} (${t.satuan})`
      const e = m.get(k) ?? { masuk: 0, keluar: 0 }
      e[t.jenis_transaksi] += Number(t.jumlah)
      m.set(k, e)
    }
    return [...m.entries()].map(([k, v]) => [k, `Masuk ${fmtNum(v.masuk)} · Keluar ${fmtNum(v.keluar)}`])
  }

  const doCSV = () => {
    if (!visible.length) return toast.error('Tidak ada data untuk diexport')
    exportCSV(`transaksi-material_${today()}`, exportCols, visible)
    toast.success(`${fmtInt(visible.length)} baris diexport ke CSV`)
  }
  const doPDF = () => {
    if (!visible.length) return toast.error('Tidak ada data untuk diexport')
    exportPDF({
      filename: `transaksi-material_${today()}`,
      title: 'Laporan Material Masuk & Keluar',
      periode: filters,
      filterInfo: [filters.ruasId && `Ruas jalan: ${ruasMap[filters.ruasId]?.nama}`, jenis && `Jenis: ${jenis}`].filter(Boolean) as string[],
      columns: exportCols,
      rows: visible,
      landscape: true,
      summary: [
        ...rekap(visible),
        ...stok.map((s) => [`Stok saat ini — ${s.nama}`, `${fmtNum(s.stok)} ${s.satuan}`] as [string, string]),
      ],
    })
    toast.success('PDF berhasil dibuat')
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Dashboard Material Masuk & Keluar"
        description="Stok dihitung dari seluruh transaksi (total masuk − total keluar) dalam satuan material."
        actions={canWrite(role) && <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Tambah Data</Button>}
      />
      <FilterBar filters={filters} onChange={setFilters} onReset={() => { reset(); setJenis('') }} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Jenis material" value={fmtInt(stok.length)} icon={Package} loading={stokLoading} />
        <KpiCard label="Transaksi masuk" value={fmtInt(data.filter((t) => t.jenis_transaksi === 'masuk').length)} icon={ArrowDownToLine} loading={isLoading} hint="Sesuai filter" />
        <KpiCard label="Transaksi keluar" value={fmtInt(data.filter((t) => t.jenis_transaksi === 'keluar').length)} icon={ArrowUpFromLine} loading={isLoading} hint="Sesuai filter" />
        <KpiCard label="Stok menipis / habis" value={fmtInt(menipis.length)} icon={AlertTriangle} loading={stokLoading} tone={menipis.length ? 'crit' : 'good'} />
      </div>

      {menipis.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warn-ink/30 bg-warn-soft p-3 text-sm text-warn-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <b>Peringatan stok menipis:</b>{' '}
            {menipis.map((s) => `${s.nama} (${fmtNum(s.stok)} ${s.satuan}, min. ${fmtNum(s.stok_minimum)})`).join('; ')}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stok tersedia per material</CardTitle>
            <CardDescription className="text-xs">Batas minimum diatur admin di Manajemen User → Material</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2 sm:px-0">
            {stokLoading ? (
              <div className="px-6"><Skeleton className="h-48 w-full" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right">Min.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stok.map((s) => (
                    <TableRow key={s.material_id}>
                      <TableCell className="font-medium">{s.nama}</TableCell>
                      <TableCell className="tabular text-right whitespace-nowrap">{fmtNum(s.stok)} {s.satuan}</TableCell>
                      <TableCell className="tabular text-right text-muted-foreground">{fmtNum(s.stok_minimum)}</TableCell>
                      <TableCell><StokBadge s={s} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <ChartCard
          title="Material masuk vs keluar"
          description={chartUnit ? `Jumlah dalam ${chartUnit} per ${granularity}` : undefined}
          loading={isLoading}
          empty={!chart.length}
          className="lg:col-span-3"
          actions={
            <div className="flex flex-wrap justify-end gap-2">
              <Select value={chartMaterial} onValueChange={setChartMaterial}>
                <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Material grafik"><SelectValue placeholder="Material" /></SelectTrigger>
                <SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}</SelectContent>
              </Select>
              <Tabs value={granularity} onValueChange={(v) => setGranularity(v as 'hari' | 'bulan')}>
                <TabsList className="h-8">
                  <TabsTrigger value="hari" className="px-2 py-1 text-xs">Harian</TabsTrigger>
                  <TabsTrigger value="bulan" className="px-2 py-1 text-xs">Bulanan</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          }
        >
          <GroupBarChart
            data={chart}
            xKey="periode"
            xFormatter={granularity === 'hari' ? fmtDayMonth : fmtMonthKey}
            series={[
              { key: 'masuk', label: 'Masuk', color: SERIES[0], unit: chartUnit },
              { key: 'keluar', label: 'Keluar', color: SERIES[1], unit: chartUnit },
            ]}
          />
        </ChartCard>
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        getId={(t) => t.id}
        loading={isLoading}
        defaultSort={{ id: 'tanggal', desc: true }}
        onVisibleRowsChange={setVisible}
        searchText={(t) => `${matName(t.material_id)} ${tujuan(t)} ${t.nomor_surat_jalan ?? ''} ${t.keterangan ?? ''}`}
        searchPlaceholder="Cari material, supplier, no. DO…"
        toolbar={
          <>
            <div className="flex items-center gap-2">
              <Label className="sr-only">Jenis transaksi</Label>
              <Select value={jenis || ALL} onValueChange={(v) => setJenis(v === ALL ? '' : v)}>
                <SelectTrigger className="h-9 w-[170px]" aria-label="Filter jenis transaksi"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Masuk &amp; keluar</SelectItem>
                  <SelectItem value="masuk">Masuk</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ExportMenu onCSV={doCSV} onPDF={doPDF} />
          </>
        }
        rowActions={(t) => (
          <>
            {canWrite(role) && <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setFormOpen(true) }} aria-label="Edit"><Pencil /></Button>}
            {canDelete(role) && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(t)} aria-label="Hapus"><Trash2 /></Button>}
          </>
        )}
      />

      {canWrite(role) && <TransaksiForm open={formOpen} onOpenChange={setFormOpen} row={editing} stok={stok} />}

      <Dialog open={!!bukti} onOpenChange={(o) => !o && setBukti(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Foto bukti</DialogTitle>
            <DialogDescription>{bukti && `${matName(bukti.material_id)} · ${fmtDate(bukti.tanggal)}`}</DialogDescription>
          </DialogHeader>
          {bukti && <AttachmentList bucket="bukti-material" thumbs items={bukti.foto_bukti.map((p) => ({ key: p, path: p, name: fileNameFromPath(p) }))} />}
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus transaksi material?"
        description={deleting && <>Transaksi {deleting.jenis_transaksi} <b>{matName(deleting.material_id)}</b> {fmtNum(deleting.jumlah)} {deleting.satuan} tanggal {fmtDate(deleting.tanggal)} akan dihapus dan stok dihitung ulang.</>}
        onConfirm={async () => {
          try {
            await deleteTransaksi(deleting!)
            toast.success('Transaksi dihapus')
            await qc.invalidateQueries({ queryKey: ['material'] })
          } catch (err) {
            toast.error(`Gagal menghapus: ${errorMessage(err)}`)
          }
        }}
      />
    </div>
  )
}
