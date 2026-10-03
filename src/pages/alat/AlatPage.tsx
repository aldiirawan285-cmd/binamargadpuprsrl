import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Clock, Fuel, Gauge, Pencil, Plus, Trash2, Wrench, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterBar } from '@/components/common/FilterBar'
import { KpiCard, KpiGrid } from '@/components/common/KpiCard'
import { ChartCard, GroupBarChart, SERIES, TrendLineChart } from '@/components/common/Charts'
import { ExportMenu } from '@/components/common/ExportMenu'
import { ConfirmDelete } from '@/components/common/ConfirmDelete'
import { SectionTitle } from '@/components/common/PageSection'
import { applyFilters, useFilters } from '@/hooks/useFilters'
import { byId, useAlat, useRuasJalan } from '@/hooks/useMaster'
import { useRole } from '@/contexts/AuthContext'
import { canDelete, canWrite } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { fmtDate, fmtDayMonth, fmtInt, fmtNum, today } from '@/lib/format'
import { exportCSV, exportPDF, type ExportColumn } from '@/lib/export'
import { errorMessage } from '@/lib/utils'
import { KONDISI_ALAT, type PemakaianAlat } from '@/types/database'
import { PemakaianForm } from './PemakaianForm'

const ALL = '__all__'

function KondisiBadge({ v }: { v: string }) {
  if (v === 'Rusak Berat') return <Badge variant="danger"><XCircle className="h-3 w-3" /> Rusak Berat</Badge>
  if (v === 'Rusak Ringan') return <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Rusak Ringan</Badge>
  return <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Baik</Badge>
}

export default function AlatPage() {
  const qc = useQueryClient()
  const role = useRole()
  const { filters, setFilters, reset } = useFilters()
  const [alatFilter, setAlatFilter] = useState('')
  const [visible, setVisible] = useState<PemakaianAlat[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PemakaianAlat | null>(null)
  const [deleting, setDeleting] = useState<PemakaianAlat | null>(null)

  const { data: alat = [] } = useAlat()
  const { data: ruas } = useRuasJalan()
  const alatMap = useMemo(() => byId(alat), [alat])
  const ruasMap = useMemo(() => byId(ruas), [ruas])

  const { data = [], isLoading } = useQuery({
    queryKey: ['alat', 'pemakaian', filters],
    queryFn: async () => {
      const { data, error } = await applyFilters(
        supabase.from('pemakaian_alat').select('*').order('tanggal', { ascending: false }).order('created_at', { ascending: false }),
        filters,
        'tanggal',
        'ruas_jalan_id',
      )
      if (error) throw error
      return (data ?? []) as PemakaianAlat[]
    },
  })

  const rows = useMemo(() => (alatFilter ? data.filter((p) => p.alat_id === alatFilter) : data), [data, alatFilter])
  const alatLabel = (p: PemakaianAlat) => alatMap[p.alat_id]?.nama ?? '-'
  const kode = (p: PemakaianAlat) => p.kode_alat || alatMap[p.alat_id]?.kode || '-'

  const kpi = useMemo(() => {
    const jam = rows.reduce((s, p) => s + Number(p.jam_operasi), 0)
    const bbm = rows.reduce((s, p) => s + Number(p.bbm_liter), 0)
    // Kondisi terakhir per unit alat (data terbaru pada periode filter)
    const latest = new Map<string, PemakaianAlat>()
    for (const p of [...rows].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.created_at.localeCompare(b.created_at))) latest.set(p.alat_id, p)
    const kondisi = Object.fromEntries(KONDISI_ALAT.map((k) => [k, [...latest.values()].filter((p) => p.kondisi === k).length]))
    return { jam, bbm, rata: jam > 0 ? bbm / jam : 0, kondisi }
  }, [rows])

  const perAlat = useMemo(() => {
    const m = new Map<string, { alat: string; jam: number; bbm: number }>()
    for (const p of rows) {
      const k = `${alatLabel(p)} (${kode(p)})`
      const e = m.get(k) ?? { alat: k, jam: 0, bbm: 0 }
      e.jam += Number(p.jam_operasi)
      e.bbm += Number(p.bbm_liter)
      m.set(k, e)
    }
    return [...m.values()].sort((a, b) => b.jam - a.jam).slice(0, 10)
  }, [rows, alatMap])

  const perHari = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of rows) m.set(p.tanggal, (m.get(p.tanggal) ?? 0) + Number(p.jam_operasi))
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tanggal, jam]) => ({ tanggal, jam }))
  }, [rows])

  const columns: Column<PemakaianAlat>[] = [
    { id: 'tanggal', header: 'Tanggal', cell: (p) => <span className="whitespace-nowrap">{fmtDate(p.tanggal)}</span>, sortValue: (p) => p.tanggal },
    { id: 'alat', header: 'Alat', cell: (p) => <span className="font-medium">{alatLabel(p)}</span>, sortValue: alatLabel },
    { id: 'kode', header: 'Kode', cell: kode, sortValue: kode },
    { id: 'operator', header: 'Operator', cell: (p) => p.operator, sortValue: (p) => p.operator },
    { id: 'ruas', header: 'Ruas Jalan', cell: (p) => ruasMap[p.ruas_jalan_id ?? '']?.nama ?? '-', sortValue: (p) => ruasMap[p.ruas_jalan_id ?? '']?.nama },
    { id: 'hm', header: 'HM Mulai–Selesai', align: 'right', cell: (p) => <span className="whitespace-nowrap">{fmtNum(p.hm_mulai)} – {fmtNum(p.hm_selesai)}</span> },
    { id: 'jam', header: 'Jam Operasi', align: 'right', cell: (p) => fmtNum(p.jam_operasi), sortValue: (p) => Number(p.jam_operasi) },
    { id: 'bbm', header: 'BBM (L)', align: 'right', cell: (p) => fmtNum(p.bbm_liter), sortValue: (p) => Number(p.bbm_liter) },
    { id: 'kondisi', header: 'Kondisi', cell: (p) => <KondisiBadge v={p.kondisi} />, sortValue: (p) => p.kondisi },
  ]

  const exportCols: ExportColumn<PemakaianAlat>[] = [
    { header: 'Tanggal', csv: (p) => p.tanggal, pdf: (p) => fmtDate(p.tanggal) },
    { header: 'Alat', csv: alatLabel },
    { header: 'Kode', csv: kode },
    { header: 'Operator', csv: (p) => p.operator },
    { header: 'Ruas Jalan', csv: (p) => ruasMap[p.ruas_jalan_id ?? '']?.nama ?? '' },
    { header: 'HM Mulai', csv: (p) => Number(p.hm_mulai), pdf: (p) => fmtNum(p.hm_mulai), align: 'right' },
    { header: 'HM Selesai', csv: (p) => Number(p.hm_selesai), pdf: (p) => fmtNum(p.hm_selesai), align: 'right' },
    { header: 'Jam Operasi', csv: (p) => Number(p.jam_operasi), pdf: (p) => fmtNum(p.jam_operasi), align: 'right' },
    { header: 'BBM (liter)', csv: (p) => Number(p.bbm_liter), pdf: (p) => fmtNum(p.bbm_liter), align: 'right' },
    { header: 'Kondisi', csv: (p) => p.kondisi },
    { header: 'Keterangan', csv: (p) => p.keterangan ?? '' },
  ]

  const doCSV = () => {
    if (!visible.length) return toast.error('Tidak ada data untuk diexport')
    exportCSV(`pemakaian-alat_${today()}`, exportCols, visible)
    toast.success(`${fmtInt(visible.length)} baris diexport ke CSV`)
  }
  const doPDF = () => {
    if (!visible.length) return toast.error('Tidak ada data untuk diexport')
    const jam = visible.reduce((s, p) => s + Number(p.jam_operasi), 0)
    const bbm = visible.reduce((s, p) => s + Number(p.bbm_liter), 0)
    exportPDF({
      filename: `pemakaian-alat_${today()}`,
      title: 'Laporan Pemakaian Alat',
      periode: filters,
      filterInfo: [filters.ruasId && `Ruas jalan: ${ruasMap[filters.ruasId]?.nama}`, alatFilter && `Alat: ${alatMap[alatFilter]?.nama} (${alatMap[alatFilter]?.kode})`].filter(Boolean) as string[],
      columns: exportCols.filter((c) => c.header !== 'Keterangan'),
      rows: visible,
      landscape: true,
      summary: [
        ['Jumlah catatan', fmtInt(visible.length)],
        ['Total jam operasi', `${fmtNum(jam)} jam`],
        ['Total BBM', `${fmtNum(bbm)} liter`],
        ['Rata-rata BBM per jam', `${fmtNum(jam > 0 ? bbm / jam : 0)} L/jam`],
      ],
    })
    toast.success('PDF berhasil dibuat')
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Dashboard Pemakaian Alat"
        description="Jam operasi, konsumsi BBM, dan kondisi alat sesuai filter."
        actions={canWrite(role) && <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus /> Tambah Data</Button>}
      />
      <FilterBar filters={filters} onChange={setFilters} onReset={() => { reset(); setAlatFilter('') }} />

      <KpiGrid>
        <KpiCard label="Total jam operasi" value={fmtNum(kpi.jam)} unit="jam" icon={Clock} loading={isLoading} />
        <KpiCard label="Total BBM" value={fmtNum(kpi.bbm)} unit="liter" icon={Fuel} loading={isLoading} />
        <KpiCard label="Rata-rata BBM" value={fmtNum(kpi.rata)} unit="L/jam" icon={Gauge} loading={isLoading} />
        <KpiCard label="Alat kondisi baik" value={fmtInt(kpi.kondisi['Baik'])} unit="unit" icon={CheckCircle2} loading={isLoading} tone="good" hint="Kondisi terakhir" />
        <KpiCard label="Rusak ringan" value={fmtInt(kpi.kondisi['Rusak Ringan'])} unit="unit" icon={Wrench} loading={isLoading} tone={kpi.kondisi['Rusak Ringan'] ? 'warn' : undefined} hint="Kondisi terakhir" />
        <KpiCard label="Rusak berat" value={fmtInt(kpi.kondisi['Rusak Berat'])} unit="unit" icon={XCircle} loading={isLoading} tone={kpi.kondisi['Rusak Berat'] ? 'crit' : undefined} hint="Kondisi terakhir" />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Jam kerja alat per hari" description="Total jam operasi seluruh alat" loading={isLoading} empty={!perHari.length}>
          <TrendLineChart data={perHari} xKey="tanggal" xFormatter={fmtDayMonth} series={[{ key: 'jam', label: 'Jam operasi', color: SERIES[0], unit: 'jam' }]} />
        </ChartCard>
        <ChartCard title="Total jam operasi per alat" description="10 alat dengan jam operasi tertinggi" loading={isLoading} empty={!perAlat.length}>
          <GroupBarChart data={perAlat} xKey="alat" horizontal series={[{ key: 'jam', label: 'Jam operasi', color: SERIES[0], unit: 'jam' }]} />
        </ChartCard>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        getId={(p) => p.id}
        loading={isLoading}
        defaultSort={{ id: 'tanggal', desc: true }}
        onVisibleRowsChange={setVisible}
        searchText={(p) => `${alatLabel(p)} ${kode(p)} ${p.operator} ${ruasMap[p.ruas_jalan_id ?? '']?.nama ?? ''} ${p.kondisi} ${p.keterangan ?? ''}`}
        searchPlaceholder="Cari alat, operator, ruas…"
        toolbar={
          <>
            <Select value={alatFilter || ALL} onValueChange={(v) => setAlatFilter(v === ALL ? '' : v)}>
              <SelectTrigger className="h-9 w-[190px]" aria-label="Filter alat"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua alat</SelectItem>
                {alat.map((a) => <SelectItem key={a.id} value={a.id}>{a.nama} — {a.kode}</SelectItem>)}
              </SelectContent>
            </Select>
            <ExportMenu onCSV={doCSV} onPDF={doPDF} />
          </>
        }
        rowActions={(p) => (
          <>
            {canWrite(role) && <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setFormOpen(true) }} aria-label="Edit"><Pencil /></Button>}
            {canDelete(role) && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(p)} aria-label="Hapus"><Trash2 /></Button>}
          </>
        )}
      />

      {canWrite(role) && <PemakaianForm open={formOpen} onOpenChange={setFormOpen} row={editing} />}
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus data pemakaian alat?"
        description={deleting && <>Data <b>{alatLabel(deleting)} ({kode(deleting)})</b> tanggal {fmtDate(deleting.tanggal)} akan dihapus permanen.</>}
        onConfirm={async () => {
          try {
            const { error } = await supabase.from('pemakaian_alat').delete().eq('id', deleting!.id)
            if (error) throw error
            toast.success('Data dihapus')
            await qc.invalidateQueries({ queryKey: ['alat'] })
          } catch (err) {
            toast.error(`Gagal menghapus: ${errorMessage(err)}`)
          }
        }}
      />
    </div>
  )
}
