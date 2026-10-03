import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Archive, ImageOff, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightbox, type LightboxImage } from '@/components/common/Lightbox'
import { ConfirmDelete } from '@/components/common/ConfirmDelete'
import { byId, useProfiles, useRuasJalan } from '@/hooks/useMaster'
import { useRole } from '@/contexts/AuthContext'
import { canDelete, canWrite } from '@/lib/permissions'
import { saveBlob, signedUrls } from '@/lib/storage'
import { fmtDate, fmtDateTime, fmtNum, fmtSta, today } from '@/lib/format'
import { errorMessage } from '@/lib/utils'
import { TAHAP } from '@/types/database'
import { deleteLaporan, downloadFotoZip, fetchLaporanById } from './api'
import { LaporanForm } from './LaporanForm'
import { ProgresBadge } from './ProgresBadge'

export default function LaporanDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useRole()
  const { data: row, isLoading } = useQuery({ queryKey: ['laporan', 'detail', id], queryFn: () => fetchLaporanById(id) })
  const { data: ruas } = useRuasJalan()
  const { data: profiles } = useProfiles()
  const ruasMap = byId(ruas)
  const userMap = byId(profiles)
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [zipBusy, setZipBusy] = useState(false)

  const fotos = useMemo(
    () => [...(row?.foto_pekerjaan ?? [])].sort((a, b) => a.tahap_progres - b.tahap_progres || a.created_at.localeCompare(b.created_at)),
    [row],
  )
  const { data: urls = {}, isLoading: urlLoading } = useQuery({
    queryKey: ['signed', 'foto-pekerjaan', fotos.map((f) => f.storage_path)],
    queryFn: () => signedUrls('foto-pekerjaan', fotos.map((f) => f.storage_path)),
    enabled: fotos.length > 0,
    staleTime: 30 * 60_000,
  })
  const images: LightboxImage[] = fotos.map((f) => ({ url: urls[f.storage_path] ?? '', caption: `Progres ${f.tahap_progres}% · ${f.nama_file ?? ''}` }))

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!row)
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Laporan tidak ditemukan atau sudah dihapus.</p>
        <Button asChild variant="outline"><Link to="/laporan"><ArrowLeft /> Kembali</Link></Button>
      </div>
    )

  const ruasName = (rid: string) => ruasMap[rid]?.nama ?? '-'
  const info: [string, React.ReactNode][] = [
    ['Tanggal', fmtDate(row.tanggal)],
    ['Ruas jalan', ruasName(row.ruas_jalan_id)],
    ['Jenis pekerjaan', row.jenis_pekerjaan],
    ['Station', fmtSta(row.sta_awal, row.sta_akhir)],
    ['Sisi', row.sisi],
    ['Panjang', `${fmtNum(row.panjang)} m`],
    ['Lebar', `${fmtNum(row.lebar)} m`],
    ['Tebal', `${fmtNum(row.tebal)} cm`],
    ['Luas', `${fmtNum(row.luas)} m²`],
    ['Volume', `${fmtNum(row.volume, 3)} m³`],
    ['Progres', <ProgresBadge key="p" value={row.progres} />],
    ['Keterangan', row.keterangan || '-'],
    ['Dibuat', `${userMap[row.created_by ?? '']?.nama_lengkap ?? '-'} · ${fmtDateTime(row.created_at)}`],
    ['Terakhir diubah', `${userMap[row.updated_by ?? '']?.nama_lengkap ?? '-'} · ${fmtDateTime(row.updated_at)}`],
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft /> Kembali
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!fotos.length || zipBusy}
            onClick={async () => {
              setZipBusy(true)
              try {
                const res = await downloadFotoZip([row], ruasName)
                saveBlob(res.blob, `foto_${row.sta_awal}-${row.sta_akhir}_${today()}.zip`)
                toast.success(`${res.total - res.failed} foto diunduh`)
              } catch (err) {
                toast.error(errorMessage(err))
              } finally {
                setZipBusy(false)
              }
            }}
          >
            {zipBusy ? <Loader2 className="animate-spin" /> : <Archive />} Unduh Foto
          </Button>
          {canWrite(role) && (
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
          )}
          {canDelete(role) && (
            <Button size="sm" variant="destructive" onClick={() => setDelOpen(true)}>
              <Trash2 /> Hapus
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] gap-2 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {TAHAP.map((t) => {
            const list = fotos.map((f, i) => ({ f, i })).filter(({ f }) => f.tahap_progres === t)
            return (
              <Card key={t}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    Foto Progres {t}%
                    <span className="text-xs font-normal text-muted-foreground">{list.length} foto</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {list.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-md bg-muted p-4 text-sm text-muted-foreground">
                      <ImageOff className="h-4 w-4" /> Belum ada foto pada tahap ini
                    </div>
                  ) : (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {list.map(({ f, i }) => (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => setLightbox(i)}
                            className="block w-full overflow-hidden rounded-md border bg-muted focus:outline-none focus:ring-2 focus:ring-ring cursor-zoom-in"
                          >
                            {urls[f.storage_path] ? (
                              <img src={urls[f.storage_path]} alt={f.nama_file ?? ''} loading="lazy" className="aspect-square w-full object-cover transition-transform hover:scale-105" />
                            ) : (
                              <Skeleton className={`aspect-square w-full ${urlLoading ? '' : 'animate-none'}`} />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Lightbox images={images} index={lightbox} onIndexChange={setLightbox} onClose={() => setLightbox(null)} />
      {canWrite(role) && <LaporanForm open={editOpen} onOpenChange={setEditOpen} row={row} />}
      <ConfirmDelete
        open={delOpen}
        onOpenChange={setDelOpen}
        title="Hapus laporan pekerjaan?"
        description={`Laporan beserta ${fotos.length} foto akan dihapus permanen.`}
        onConfirm={async () => {
          try {
            await deleteLaporan(row)
            toast.success('Laporan dihapus')
            await qc.invalidateQueries({ queryKey: ['laporan'] })
            navigate('/laporan', { replace: true })
          } catch (err) {
            toast.error(`Gagal menghapus: ${errorMessage(err)}`)
          }
        }}
      />
    </div>
  )
}
