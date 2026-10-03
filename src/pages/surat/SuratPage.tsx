import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, Eye, Inbox, Paperclip, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { byId, useProfiles } from '@/hooks/useMaster'
import { useRole } from '@/contexts/AuthContext'
import { canDelete, canWrite } from '@/lib/permissions'
import { fmtDate, fmtDateTime, fmtInt, fmtMonth, fmtMonthKey, monthKey, startOfMonth, today } from '@/lib/format'
import { exportCSV, exportPDF, type ExportColumn } from '@/lib/export'
import { errorMessage } from '@/lib/utils'
import { STATUS_SURAT } from '@/types/database'
import { deleteSurat, fetchSurat, fetchSuratStats, type SuratRow } from './api'
import { SifatBadge, StatusBadge } from './SuratBadges'
import { SuratForm } from './SuratForm'

const ALL = '__all__'

export default function SuratPage() {
  const qc = useQueryClient()
  const role = useRole()
  const { filters, setFilters, reset } = useFilters()
  const [tab, setTab] = useState<'masuk' | 'keluar'>('masuk')
  const [status, setStatus] = useState('')
  const [visible, setVisible] = useState<SuratRow[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SuratRow | null>(null)
  const [deleting, setDeleting] = useState<SuratRow | null>(null)
  const [detail, setDetail] = useState<SuratRow | null>(null)
  const { data: profiles } = useProfiles()
  const userMap = byId(profiles)

  const { data = [], isLoading } = useQuery({ queryKey: ['surat', filters], queryFn: () => fetchSurat(filters) })
  const monthStart = startOfMonth()
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['surat', 'stats', monthStart], queryFn: () => fetchSuratStats(monthStart) })

  const tableData = useMemo(
    () => data.filter((s) => s.jenis === tab && (!status || s.status_tindak_lanjut === status)),
    [data, tab, status],
  )

  const perBulan = useMemo(() => {
    const m = new Map<string, { bulan: string; masuk: number; keluar: number }>()
    for (const s of data) {
      const k = monthKey(s.tanggal_surat)
      const e = m.get(k) ?? { bulan: k, masuk: 0, keluar: 0 }
      e[s.jenis]++
      m.set(k, e)
    }
    return [...m.values()].sort((a, b) => a.bulan.localeCompare(b.bulan)).slice(-12)
  }, [data])

  const statusDist = useMemo(
    () =>
      STATUS_SURAT.map((st) => ({
        status: st,
        masuk: data.filter((s) => s.jenis === 'masuk' && s.status_tindak_lanjut === st).length,
        keluar: data.filter((s) => s.jenis === 'keluar' && s.status_tindak_lanjut === st).length,
      })),
    [data],
  )

  const pihakLabel = tab === 'masuk' ? 'Pengirim' : 'Tujuan'
  const pihak = (s: SuratRow) => (s.jenis === 'masuk' ? s.pengirim : s.tujuan) ?? '-'

  const columns: Column<SuratRow>[] = [
    { id: 'nomor', header: 'Nomor Surat', cell: (s) => <span className="font-medium">{s.nomor_surat}</span>, sortValue: (s) => s.nomor_surat },
    { id: 'tgl', header: 'Tgl Surat', cell: (s) => <span className="whitespace-nowrap">{fmtDate(s.tanggal_surat)}</span>, sortValue: (s) => s.tanggal_surat },
    {
      id: 'tgl2', header: tab === 'masuk' ? 'Tgl Diterima' : 'Tgl Dikirim',
      cell: (s) => <span className="whitespace-nowrap">{fmtDate(s.tanggal_terima_kirim)}</span>, sortValue: (s) => s.tanggal_terima_kirim,
    },
    { id: 'pihak', header: pihakLabel, cell: pihak, sortValue: pihak },
    { id: 'perihal', header: 'Perihal', cell: (s) => <span className="line-clamp-2 min-w-[180px]">{s.perihal}</span>, sortValue: (s) => s.perihal },
    { id: 'sifat', header: 'Sifat', cell: (s) => <SifatBadge v={s.sifat} />, sortValue: (s) => s.sifat },
    { id: 'status', header: 'Status', cell: (s) => <StatusBadge v={s.status_tindak_lanjut} />, sortValue: (s) => s.status_tindak_lanjut },
    {
      id: 'lampiran', header: 'Lampiran', align: 'center',
      cell: (s) => s.lampiran_surat.length ? <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{s.lampiran_surat.length}</span> : '-',
      sortValue: (s) => s.lampiran_surat.length,
    },
  ]

  const exportCols: ExportColumn<SuratRow>[] = [
    { header: 'Nomor Surat', csv: (s) => s.nomor_surat },
    { header: 'Tanggal Surat', csv: (s) => s.tanggal_surat, pdf: (s) => fmtDate(s.tanggal_surat) },
    { header: tab === 'masuk' ? 'Tanggal Diterima' : 'Tanggal Dikirim', csv: (s) => s.tanggal_terima_kirim ?? '', pdf: (s) => fmtDate(s.tanggal_terima_kirim) },
    { header: pihakLabel, csv: pihak },
    { header: 'Perihal', csv: (s) => s.perihal },
    { header: 'Sifat', csv: (s) => s.sifat },
    { header: 'Status', csv: (s) => s.status_tindak_lanjut },
    { header: 'Lampiran', csv: (s) => s.lampiran_surat.length, align: 'center' },
    { header: 'Keterangan', csv: (s) => s.keterangan ?? '' },
  ]

  const title = `Daftar Surat ${tab === 'masuk' ? 'Masuk' : 'Keluar'}`
  const doCSV = () => {
    if (!visible.length) return toast.error('Tidak ada data untuk diexport')
    exportCSV(`surat-${tab}_${today()}`, exportCols, visible)
    toast.success(`${fmtInt(visible.length)} baris diexport ke CSV`)
  }
  const doPDF = () => {
    if (!visible.length) return toast.error('Tidak ada data untuk diexport')
    exportPDF({
      filename: `surat-${tab}_${today()}`,
      title,
      periode: filters,
      filterInfo: status ? [`Status tindak lanjut: ${status}`] : [],
      columns: exportCols,
      rows: visible,
      landscape: true,
      summary: [
        ['Jumlah surat', fmtInt(visible.length)],
        ...STATUS_SURAT.map((st) => [`Status ${st}`, fmtInt(visible.filter((s) => s.status_tindak_lanjut === st).length)] as [string, string]),
      ],
    })
    toast.success('PDF berhasil dibuat')
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Dashboard Surat Masuk & Keluar"
        description={`Ringkasan bulan ${fmtMonth(new Date())} dan grafik sesuai filter tanggal.`}
        actions={canWrite(role) && <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Tambah Data</Button>}
      />
      <FilterBar filters={filters} onChange={setFilters} onReset={reset} showRuas={false} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Surat masuk bulan ini" value={fmtInt(stats?.masuk)} icon={Inbox} loading={statsLoading} />
        <KpiCard label="Surat keluar bulan ini" value={fmtInt(stats?.keluar)} icon={Send} loading={statsLoading} />
        <KpiCard label="Belum ditindaklanjuti" value={fmtInt(stats?.belum)} icon={Clock} loading={statsLoading} tone={stats?.belum ? 'warn' : undefined} hint="Semua periode" />
        <KpiCard label="Total surat (filter)" value={fmtInt(data.length)} icon={Paperclip} loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Surat per bulan" description="Jumlah surat masuk dan keluar (12 bulan terakhir pada filter)" loading={isLoading} empty={!perBulan.length} className="lg:col-span-2">
          <GroupBarChart
            data={perBulan}
            xKey="bulan"
            xFormatter={fmtMonthKey}
            series={[
              { key: 'masuk', label: 'Surat masuk', color: SERIES[0], unit: 'surat' },
              { key: 'keluar', label: 'Surat keluar', color: SERIES[1], unit: 'surat' },
            ]}
          />
        </ChartCard>
        <ChartCard title="Status tindak lanjut" description="Sesuai filter tanggal" loading={isLoading} empty={!data.length}>
          <GroupBarChart
            data={statusDist}
            xKey="status"
            stacked
            series={[
              { key: 'masuk', label: 'Surat masuk', color: SERIES[0], unit: 'surat' },
              { key: 'keluar', label: 'Surat keluar', color: SERIES[1], unit: 'surat' },
            ]}
          />
        </ChartCard>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'masuk' | 'keluar')}>
        <TabsList>
          <TabsTrigger value="masuk"><Inbox className="h-4 w-4" /> Surat Masuk ({fmtInt(data.filter((s) => s.jenis === 'masuk').length)})</TabsTrigger>
          <TabsTrigger value="keluar"><Send className="h-4 w-4" /> Surat Keluar ({fmtInt(data.filter((s) => s.jenis === 'keluar').length)})</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        key={tab}
        data={tableData}
        columns={columns}
        getId={(s) => s.id}
        loading={isLoading}
        defaultSort={{ id: 'tgl', desc: true }}
        onVisibleRowsChange={setVisible}
        onRowClick={setDetail}
        searchText={(s) => `${s.nomor_surat} ${pihak(s)} ${s.perihal} ${s.keterangan ?? ''}`}
        searchPlaceholder={`Cari nomor, ${pihakLabel.toLowerCase()}, perihal…`}
        toolbar={
          <>
            <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
              <SelectTrigger className="h-9 w-[150px]" aria-label="Filter status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua status</SelectItem>
                {STATUS_SURAT.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <ExportMenu onCSV={doCSV} onPDF={doPDF} />
          </>
        }
        rowActions={(s) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => setDetail(s)} aria-label="Detail"><Eye /></Button>
            {canWrite(role) && (
              <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setFormOpen(true) }} aria-label="Edit"><Pencil /></Button>
            )}
            {canDelete(role) && (
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(s)} aria-label="Hapus"><Trash2 /></Button>
            )}
          </>
        )}
      />

      {canWrite(role) && <SuratForm open={formOpen} onOpenChange={setFormOpen} row={editing} jenis={tab} />}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Surat {detail.jenis === 'masuk' ? 'Masuk' : 'Keluar'}</DialogTitle>
                <DialogDescription>{detail.nomor_surat}</DialogDescription>
              </DialogHeader>
              <dl className="divide-y text-sm">
                {([
                  ['Tanggal surat', fmtDate(detail.tanggal_surat)],
                  [detail.jenis === 'masuk' ? 'Tanggal diterima' : 'Tanggal dikirim', fmtDate(detail.tanggal_terima_kirim)],
                  [detail.jenis === 'masuk' ? 'Pengirim' : 'Tujuan', pihak(detail)],
                  ['Perihal', detail.perihal],
                  ['Sifat', <SifatBadge key="s" v={detail.sifat} />],
                  ['Status', <StatusBadge key="t" v={detail.status_tindak_lanjut} />],
                  ['Keterangan', detail.keterangan || '-'],
                  ['Dicatat oleh', `${userMap[detail.created_by ?? '']?.nama_lengkap ?? '-'} · ${fmtDateTime(detail.created_at)}`],
                ] as [string, React.ReactNode][]).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[130px_1fr] gap-2 py-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Lampiran</h3>
                <AttachmentList
                  bucket="lampiran-surat"
                  items={detail.lampiran_surat.map((l) => ({ key: l.id, path: l.storage_path, name: l.nama_file, mime: l.mime_type, size: l.ukuran }))}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus surat?"
        description={deleting && <>Surat <b>{deleting.nomor_surat}</b> beserta {deleting.lampiran_surat.length} lampiran akan dihapus permanen.</>}
        onConfirm={async () => {
          try {
            await deleteSurat(deleting!)
            toast.success('Surat dihapus')
            await qc.invalidateQueries({ queryKey: ['surat'] })
          } catch (err) {
            toast.error(`Gagal menghapus: ${errorMessage(err)}`)
          }
        }}
      />
    </div>
  )
}
