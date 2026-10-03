import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Archive, CheckCircle2, CircleDashed, CircleDot, Eye, Layers, Loader2, MapPin, Pencil, Plus, Ruler, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterBar } from '@/components/common/FilterBar'
import { KpiCard, KpiGrid } from '@/components/common/KpiCard'
import { ChartCard, DonutChart, GroupBarChart, SERIES, TrendLineChart } from '@/components/common/Charts'
import { ExportMenu } from '@/components/common/ExportMenu'
import { ConfirmDelete } from '@/components/common/ConfirmDelete'
import { SectionTitle } from '@/components/common/PageSection'
import { useFilters } from '@/hooks/useFilters'
import { byId, useJenisPekerjaan, useRuasJalan } from '@/hooks/useMaster'
import { useRole } from '@/contexts/AuthContext'
import { canDelete, canWrite } from '@/lib/permissions'
import { fmtDate, fmtDayMonth, fmtInt, fmtNum, fmtSta, startOfWeek, today } from '@/lib/format'
import { exportCSV, exportPDF, type ExportColumn } from '@/lib/export'
import { saveBlob } from '@/lib/storage'
import { errorMessage } from '@/lib/utils'
import { buildPdfImageGroups, deleteLaporan, downloadFotoZip, fetchLaporan, laporanKey, type LaporanRow } from './api'
import { LaporanForm } from './LaporanForm'
import { ProgresBadge } from './ProgresBadge'

const ALL = '__all__'

export default function LaporanPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useRole()
  const { filters, setFilters, reset } = useFilters()
  const [jenisFilter, setJenisFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [granularity, setGranularity] = useState<'hari' | 'minggu'>('hari')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState<LaporanRow[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LaporanRow | null>(null)
  const [deleting, setDeleting] = useState<LaporanRow | null>(null)
  const [zipProgress, setZipProgress] = useState<string | null>(null)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfFoto, setPdfFoto] = useState(false)

  const { data: ruas } = useRuasJalan()
  const { data: jenisMaster = [] } = useJenisPekerjaan()
  const ruasMap = useMemo(() => byId(ruas), [ruas])
  const ruasName = useCallback((id: string) => ruasMap[id]?.nama ?? '-', [ruasMap])

  const { data = [], isLoading } = useQuery({ queryKey: laporanKey(filters), queryFn: () => fetchLaporan(filters) })

  // Data dashboard = filter tanggal + ruas + jenis
  const dashData = useMemo(() => (jenisFilter ? data.filter((r) => r.jenis_pekerjaan === jenisFilter) : data), [data, jenisFilter])
  // Data tabel = dashboard + filter status progres
  const tableData = useMemo(
    () => (statusFilter ? dashData.filter((r) => String(r.progres) === statusFilter) : dashData),
    [dashData, statusFilter],
  )

  const kpi = useMemo(() => {
    const k = { titik: dashData.length, luas: 0, volume: 0, p0: 0, p50: 0, p100: 0 }
    for (const r of dashData) {
      k.luas += Number(r.luas)
      k.volume += Number(r.volume)
      if (r.progres === 100) k.p100++
      else if (r.progres === 50) k.p50++
      else k.p0++
    }
    return k
  }, [dashData])

  const trend = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of dashData) {
      const key = granularity === 'hari' ? r.tanggal : startOfWeek(r.tanggal)
      m.set(key, (m.get(key) ?? 0) + Number(r.volume))
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ periode: k, volume: Math.round(v * 1000) / 1000 }))
  }, [dashData, granularity])

  const perRuas = useMemo(() => {
    const m = new Map<string, { ruas: string; p0: number; p50: number; p100: number }>()
    for (const r of dashData) {
      const name = ruasName(r.ruas_jalan_id)
      const e = m.get(name) ?? { ruas: name, p0: 0, p50: 0, p100: 0 }
      if (r.progres === 100) e.p100++
      else if (r.progres === 50) e.p50++
      else e.p0++
      m.set(name, e)
    }
    return [...m.values()].sort((a, b) => b.p0 + b.p50 + b.p100 - (a.p0 + a.p50 + a.p100)).slice(0, 10)
  }, [dashData, ruasName])

  const komposisi = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of dashData) m.set(r.jenis_pekerjaan, (m.get(r.jenis_pekerjaan) ?? 0) + 1)
    return [...m.entries()].map(([name, value]) => ({ name, value }))
  }, [dashData])

  const columns: Column<LaporanRow>[] = [
    { id: 'tanggal', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.tanggal)}</span>, sortValue: (r) => r.tanggal },
    { id: 'ruas', header: 'Ruas Jalan', cell: (r) => <span className="font-medium min-w-[120px] inline-block">{ruasName(r.ruas_jalan_id)}</span>, sortValue: (r) => ruasName(r.ruas_jalan_id) },
    { id: 'jenis', header: 'Jenis Pekerjaan', cell: (r) => r.jenis_pekerjaan, sortValue: (r) => r.jenis_pekerjaan },
    { id: 'sta', header: 'STA', cell: (r) => <span className="whitespace-nowrap">{fmtSta(r.sta_awal, r.sta_akhir)}</span>, sortValue: (r) => r.sta_awal },
    { id: 'sisi', header: 'Sisi', cell: (r) => r.sisi, className: 'hidden xl:table-cell' },
    {
      id: 'dimensi', header: 'P × L × T', align: 'right', className: 'hidden 2xl:table-cell',
      cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{fmtNum(r.panjang)} × {fmtNum(r.lebar)} × {fmtNum(r.tebal)}</span>,
    },
    { id: 'luas', header: 'Luas (m²)', align: 'right', cell: (r) => fmtNum(r.luas), sortValue: (r) => Number(r.luas) },
    { id: 'volume', header: 'Volume (m³)', align: 'right', cell: (r) => fmtNum(r.volume, 3), sortValue: (r) => Number(r.volume) },
    { id: 'progres', header: 'Progres', align: 'center', cell: (r) => <ProgresBadge value={r.progres} />, sortValue: (r) => r.progres },
    { id: 'foto', header: 'Foto', align: 'right', cell: (r) => fmtInt(r.foto_pekerjaan.length), sortValue: (r) => r.foto_pekerjaan.length },
  ]

  const exportCols: ExportColumn<LaporanRow>[] = [
    { header: 'Tanggal', csv: (r) => r.tanggal, pdf: (r) => fmtDate(r.tanggal) },
    { header: 'Ruas Jalan', csv: (r) => ruasName(r.ruas_jalan_id) },
    { header: 'Jenis Pekerjaan', csv: (r) => r.jenis_pekerjaan },
    { header: 'STA', csv: (r) => fmtSta(r.sta_awal, r.sta_akhir) },
    { header: 'Sisi', csv: (r) => r.sisi },
    { header: 'Panjang (m)', csv: (r) => Number(r.panjang), pdf: (r) => fmtNum(r.panjang), align: 'right' },
    { header: 'Lebar (m)', csv: (r) => Number(r.lebar), pdf: (r) => fmtNum(r.lebar), align: 'right' },
    { header: 'Tebal (cm)', csv: (r) => Number(r.tebal), pdf: (r) => fmtNum(r.tebal), align: 'right' },
    { header: 'Luas (m²)', csv: (r) => Number(r.luas), pdf: (r) => fmtNum(r.luas), align: 'right' },
    { header: 'Volume (m³)', csv: (r) => Number(r.volume), pdf: (r) => fmtNum(r.volume, 3), align: 'right' },
    { header: 'Progres', csv: (r) => `${r.progres}%`, align: 'center' },
    { header: 'Jml Foto', csv: (r) => r.foto_pekerjaan.length, align: 'right' },
    { header: 'Keterangan', csv: (r) => r.keterangan ?? '' },
  ]

  const exportRows = () => (selected.size ? visible.filter((r) => selected.has(r.id)) : visible)
  const filterInfo = () =>
    [
      filters.ruasId && `Ruas jalan: ${ruasName(filters.ruasId)}`,
      jenisFilter && `Jenis pekerjaan: ${jenisFilter}`,
      statusFilter && `Status progres: ${statusFilter}%`,
      selected.size > 0 && `${fmtInt(selected.size)} laporan terpilih`,
    ].filter(Boolean) as string[]

  function doCSV() {
    const rows = exportRows()
    if (!rows.length) return toast.error('Tidak ada data untuk diexport')
    exportCSV(`laporan-pekerjaan_${today()}`, exportCols, rows)
    toast.success(`${fmtInt(rows.length)} baris diexport ke CSV`)
  }

  async function doPDF() {
    const rows = exportRows()
    if (!rows.length) return toast.error('Tidak ada data untuk diexport')
    setPdfBusy(true)
    try {
      const sum = rows.reduce((a, r) => ({ luas: a.luas + Number(r.luas), volume: a.volume + Number(r.volume) }), { luas: 0, volume: 0 })
      const imageGroups = pdfFoto ? await buildPdfImageGroups(rows, ruasName) : undefined
      exportPDF({
        filename: `laporan-pekerjaan_${today()}`,
        title: 'Laporan Pekerjaan Patching Jalan',
        periode: filters,
        filterInfo: filterInfo(),
        columns: exportCols.filter((c) => c.header !== 'Keterangan'),
        rows,
        landscape: true,
        summary: [
          ['Jumlah titik / laporan', fmtInt(rows.length)],
          ['Total luas', `${fmtNum(sum.luas)} m²`],
          ['Total volume', `${fmtNum(sum.volume, 3)} m³`],
          ['Progres 0% / 50% / 100%', [0, 50, 100].map((p) => fmtInt(rows.filter((r) => r.progres === p).length)).join(' / ')],
        ],
        imageGroups,
      })
      toast.success('PDF berhasil dibuat')
      setPdfOpen(false)
    } catch (err) {
      toast.error(`Gagal membuat PDF: ${errorMessage(err)}`)
    } finally {
      setPdfBusy(false)
    }
  }

  async function doZip() {
    const rows = exportRows()
    const total = rows.reduce((s, r) => s + r.foto_pekerjaan.length, 0)
    if (!total) return toast.error('Tidak ada foto pada laporan yang dipilih / hasil filter')
    setZipProgress(`0/${total}`)
    try {
      const res = await downloadFotoZip(rows, ruasName, (d, t) => setZipProgress(`${d}/${t}`))
      saveBlob(res.blob, `foto-pekerjaan_${today()}.zip`)
      if (res.failed) toast.warning(`${res.failed} dari ${res.total} foto gagal diunduh`)
      else toast.success(`${fmtInt(res.total)} foto berhasil diunduh`)
    } catch (err) {
      toast.error(`Gagal membuat ZIP: ${errorMessage(err)}`)
    } finally {
      setZipProgress(null)
    }
  }

  const loading = isLoading

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Dashboard Laporan Pekerjaan"
        description="Ringkasan pekerjaan patching sesuai filter tanggal dan ruas jalan."
        actions={
          canWrite(role) && (
            <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> Tambah Data
            </Button>
          )
        }
      />

      <FilterBar filters={filters} onChange={(f) => { setFilters(f); setSelected(new Set()) }} onReset={() => { reset(); setJenisFilter(''); setSelected(new Set()) }}>
        <div className="col-span-2 space-y-1.5 md:w-56">
          <Label className="text-xs">Jenis pekerjaan</Label>
          <Select value={jenisFilter || ALL} onValueChange={(v) => setJenisFilter(v === ALL ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua jenis</SelectItem>
              {[...new Set([...jenisMaster.map((j) => j.nama), ...data.map((d) => d.jenis_pekerjaan)])].map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <KpiGrid>
        <KpiCard label="Total titik patching" value={fmtInt(kpi.titik)} icon={MapPin} loading={loading} />
        <KpiCard label="Total luas" value={fmtNum(kpi.luas)} unit="m²" icon={Ruler} loading={loading} />
        <KpiCard label="Total volume" value={fmtNum(kpi.volume, 3)} unit="m³" icon={Layers} loading={loading} />
        <KpiCard label="Progres 0%" value={fmtInt(kpi.p0)} unit="laporan" icon={CircleDashed} loading={loading} />
        <KpiCard label="Progres 50%" value={fmtInt(kpi.p50)} unit="laporan" icon={CircleDot} loading={loading} />
        <KpiCard label="Progres 100%" value={fmtInt(kpi.p100)} unit="laporan" icon={CheckCircle2} loading={loading} tone="good" />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Volume pekerjaan"
          description={granularity === 'hari' ? 'm³ per hari' : 'm³ per minggu (mulai Senin)'}
          loading={loading}
          empty={!trend.length}
          className="lg:col-span-2 xl:col-span-1"
          actions={
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as 'hari' | 'minggu')}>
              <TabsList className="h-8">
                <TabsTrigger value="hari" className="px-2 py-1 text-xs">Harian</TabsTrigger>
                <TabsTrigger value="minggu" className="px-2 py-1 text-xs">Mingguan</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <TrendLineChart
            data={trend}
            xKey="periode"
            series={[{ key: 'volume', label: 'Volume', color: SERIES[0], unit: 'm³' }]}
            xFormatter={(v) => (granularity === 'hari' ? fmtDayMonth(v) : `Mg ${fmtDayMonth(v)}`)}
          />
        </ChartCard>
        <ChartCard title="Progres per ruas jalan" description="Jumlah laporan per status (10 ruas teratas)" loading={loading} empty={!perRuas.length}>
          <GroupBarChart
            data={perRuas}
            xKey="ruas"
            horizontal
            stacked
            series={[
              { key: 'p0', label: '0%', color: SERIES[0], unit: 'laporan' },
              { key: 'p50', label: '50%', color: SERIES[1], unit: 'laporan' },
              { key: 'p100', label: '100%', color: SERIES[2], unit: 'laporan' },
            ]}
          />
        </ChartCard>
        <ChartCard title="Komposisi jenis pekerjaan" description="Jumlah titik per jenis" loading={loading} empty={!komposisi.length}>
          <DonutChart data={komposisi} unit="titik" />
        </ChartCard>
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        getId={(r) => r.id}
        loading={loading}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onVisibleRowsChange={setVisible}
        defaultSort={{ id: 'tanggal', desc: true }}
        onRowClick={(r) => navigate(`/laporan/${r.id}`)}
        searchText={(r) => `${ruasName(r.ruas_jalan_id)} ${r.jenis_pekerjaan} ${r.sta_awal} ${r.sta_akhir} ${r.sisi} ${r.keterangan ?? ''}`}
        searchPlaceholder="Cari ruas, jenis, STA…"
        toolbar={
          <>
            <Select value={statusFilter || ALL} onValueChange={(v) => setStatusFilter(v === ALL ? '' : v)}>
              <SelectTrigger className="h-9 w-[160px]" aria-label="Filter status progres"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua progres</SelectItem>
                <SelectItem value="0">Progres 0%</SelectItem>
                <SelectItem value="50">Progres 50%</SelectItem>
                <SelectItem value="100">Progres 100%</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={doZip} disabled={!!zipProgress}>
              {zipProgress ? <Loader2 className="animate-spin" /> : <Archive />}
              {zipProgress ? `Mengunduh ${zipProgress}` : selected.size ? `Unduh Foto (${selected.size})` : 'Unduh Foto'}
            </Button>
            <ExportMenu onCSV={doCSV} onPDF={() => setPdfOpen(true)} busy={pdfBusy} />
          </>
        }
        rowActions={(r) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/laporan/${r.id}`)} aria-label="Detail">
              <Eye />
            </Button>
            {canWrite(role) && (
              <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setFormOpen(true) }} aria-label="Edit">
                <Pencil />
              </Button>
            )}
            {canDelete(role) && (
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(r)} aria-label="Hapus">
                <Trash2 />
              </Button>
            )}
          </>
        )}
      />
      <p className="text-xs text-muted-foreground">
        Unduh Foto &amp; Export memakai laporan yang dicentang; bila tidak ada yang dicentang, dipakai semua hasil filter dan pencarian.
      </p>

      {canWrite(role) && <LaporanForm open={formOpen} onOpenChange={setFormOpen} row={editing} />}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus laporan pekerjaan?"
        description={
          deleting && (
            <>
              Laporan <b>{ruasName(deleting.ruas_jalan_id)}</b> STA {fmtSta(deleting.sta_awal, deleting.sta_akhir)} tanggal{' '}
              {fmtDate(deleting.tanggal)} beserta {deleting.foto_pekerjaan.length} foto akan dihapus permanen.
            </>
          )
        }
        onConfirm={async () => {
          try {
            await deleteLaporan(deleting!)
            toast.success('Laporan dihapus')
            setSelected((s) => { const n = new Set(s); n.delete(deleting!.id); return n })
            await qc.invalidateQueries({ queryKey: ['laporan'] })
          } catch (err) {
            toast.error(`Gagal menghapus: ${errorMessage(err)}`)
          }
        }}
      />

      <Dialog open={pdfOpen} onOpenChange={(o) => !pdfBusy && setPdfOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export PDF</DialogTitle>
            <DialogDescription>
              {fmtInt(exportRows().length)} laporan akan dicetak beserta kop, periode, tabel data, dan rekap total.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm cursor-pointer">
            <Checkbox checked={pdfFoto} onCheckedChange={(v) => setPdfFoto(v === true)} className="mt-0.5" />
            <span>
              <span className="font-medium">Sertakan thumbnail foto per tahap</span>
              <span className="block text-xs text-muted-foreground">Maks. 3 foto per tahap (0%, 50%, 100%) per laporan. Proses lebih lama.</span>
            </span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfOpen(false)} disabled={pdfBusy}>Batal</Button>
            <Button onClick={doPDF} disabled={pdfBusy}>
              {pdfBusy && <Loader2 className="animate-spin" />} {pdfBusy ? 'Menyiapkan…' : 'Buat PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
