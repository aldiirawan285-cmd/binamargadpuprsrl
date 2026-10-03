import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, checkNumber, hasErrors, req, type Errors } from '@/components/common/Field'
import { FileDropzone } from '@/components/common/FileDropzone'
import { RuasCombobox } from '@/components/common/RuasCombobox'
import { useJenisPekerjaan } from '@/hooks/useMaster'
import { useRole } from '@/contexts/AuthContext'
import { canDelete } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { signedUrls } from '@/lib/storage'
import { fmtNum, normalizeSta, staToMeter, today } from '@/lib/format'
import { errorMessage } from '@/lib/utils'
import { SISI, TAHAP, type FotoPekerjaan, type Tahap } from '@/types/database'
import { deleteFoto, uploadFotoLaporan, type LaporanRow, type PendingFotos } from './api'

type FormState = {
  tanggal: string
  ruas_jalan_id: string
  jenis_pekerjaan: string
  jenis_lain: string
  sta_awal: string
  sta_akhir: string
  sisi: string
  panjang: string
  lebar: string
  tebal: string
  keterangan: string
}

const LAINNYA = 'Lainnya'

function initial(row?: LaporanRow | null, jenisList: string[] = []): FormState {
  if (!row)
    return {
      tanggal: today(), ruas_jalan_id: '', jenis_pekerjaan: '', jenis_lain: '', sta_awal: '', sta_akhir: '',
      sisi: '', panjang: '', lebar: '', tebal: '', keterangan: '',
    }
  const known = jenisList.includes(row.jenis_pekerjaan)
  return {
    tanggal: row.tanggal,
    ruas_jalan_id: row.ruas_jalan_id,
    jenis_pekerjaan: known ? row.jenis_pekerjaan : LAINNYA,
    jenis_lain: known ? '' : row.jenis_pekerjaan,
    sta_awal: row.sta_awal,
    sta_akhir: row.sta_akhir,
    sisi: row.sisi,
    panjang: String(row.panjang),
    lebar: String(row.lebar),
    tebal: String(row.tebal),
    keterangan: row.keterangan ?? '',
  }
}

const STA_RE = /^\d+\+\d{1,3}$/
const emptyPending = (): PendingFotos => ({ 0: [], 50: [], 100: [] })

export function LaporanForm({ open, onOpenChange, row }: { open: boolean; onOpenChange: (o: boolean) => void; row?: LaporanRow | null }) {
  const qc = useQueryClient()
  const role = useRole()
  const { data: jenis = [] } = useJenisPekerjaan()
  const jenisNames = useMemo(() => jenis.filter((j) => j.is_active || j.nama === row?.jenis_pekerjaan).map((j) => j.nama), [jenis, row])
  const [f, setF] = useState<FormState>(() => initial(row, jenisNames))
  const [pending, setPending] = useState<PendingFotos>(emptyPending)
  const [existing, setExisting] = useState<FotoPekerjaan[]>([])
  const [errors, setErrors] = useState<Errors<keyof FormState>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setF(initial(row, jenisNames))
      setPending(emptyPending())
      setExisting(row?.foto_pekerjaan ?? [])
      setErrors({})
    }
  }, [open, row])

  const { data: urls = {} } = useQuery({
    queryKey: ['signed', 'foto-pekerjaan', existing.map((e) => e.storage_path)],
    queryFn: () => signedUrls('foto-pekerjaan', existing.map((e) => e.storage_path)),
    enabled: open && existing.length > 0,
    staleTime: 30 * 60_000,
  })

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }))
  const p = Number(f.panjang) || 0
  const l = Number(f.lebar) || 0
  const t = Number(f.tebal) || 0
  const luas = p * l
  const volume = p * l * (t / 100)
  const progresPreview = Math.max(
    0,
    ...TAHAP.filter((tp) => pending[tp].length > 0 || existing.some((e) => e.tahap_progres === tp)),
  )

  function validate() {
    const e: Errors<keyof FormState> = {
      tanggal: req(f.tanggal),
      ruas_jalan_id: req(f.ruas_jalan_id),
      jenis_pekerjaan: req(f.jenis_pekerjaan),
      jenis_lain: f.jenis_pekerjaan === LAINNYA && !f.jenis_lain.trim() ? 'Sebutkan jenis pekerjaan' : undefined,
      sta_awal: req(f.sta_awal) ?? (STA_RE.test(f.sta_awal.trim()) ? undefined : 'Format STA: 0+100'),
      sta_akhir: req(f.sta_akhir) ?? (STA_RE.test(f.sta_akhir.trim()) ? undefined : 'Format STA: 0+150'),
      sisi: req(f.sisi),
      panjang: checkNumber(f.panjang),
      lebar: checkNumber(f.lebar),
      tebal: checkNumber(f.tebal),
    }
    if (!e.sta_awal && !e.sta_akhir && staToMeter(f.sta_akhir) < staToMeter(f.sta_awal)) e.sta_akhir = 'STA akhir harus ≥ STA awal'
    setErrors(e)
    return !hasErrors(e)
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return toast.error('Periksa kembali isian yang ditandai')
    setBusy(true)
    const payload = {
      tanggal: f.tanggal,
      ruas_jalan_id: f.ruas_jalan_id,
      jenis_pekerjaan: f.jenis_pekerjaan === LAINNYA ? f.jenis_lain.trim() : f.jenis_pekerjaan,
      sta_awal: normalizeSta(f.sta_awal),
      sta_akhir: normalizeSta(f.sta_akhir),
      sisi: f.sisi,
      panjang: Number(f.panjang),
      lebar: Number(f.lebar),
      tebal: Number(f.tebal),
      keterangan: f.keterangan.trim() || null,
    }
    try {
      let id = row?.id
      if (id) {
        const { error } = await supabase.from('laporan_pekerjaan').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('laporan_pekerjaan').insert(payload).select('id').single()
        if (error) throw error
        id = data.id as string
      }
      try {
        await uploadFotoLaporan(id!, pending)
      } catch (err) {
        toast.error(`Data tersimpan, tetapi sebagian foto gagal diunggah: ${errorMessage(err)}`)
        await qc.invalidateQueries({ queryKey: ['laporan'] })
        setBusy(false)
        return
      }
      toast.success(row ? 'Laporan berhasil diperbarui' : 'Laporan berhasil disimpan')
      await qc.invalidateQueries({ queryKey: ['laporan'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(`Gagal menyimpan: ${errorMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function removeExisting(foto: FotoPekerjaan) {
    if (!confirm('Hapus foto ini secara permanen?')) return
    try {
      await deleteFoto(foto)
      setExisting((x) => x.filter((e) => e.id !== foto.id))
      toast.success('Foto dihapus')
      qc.invalidateQueries({ queryKey: ['laporan'] })
    } catch (err) {
      toast.error(`Gagal menghapus foto: ${errorMessage(err)}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{row ? 'Edit Laporan Pekerjaan' : 'Tambah Laporan Pekerjaan'}</DialogTitle>
          <DialogDescription>Isian bertanda * wajib diisi. Luas dan volume dihitung otomatis.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal pekerjaan" htmlFor="tanggal" required error={errors.tanggal}>
              <Input id="tanggal" type="date" value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} aria-invalid={!!errors.tanggal} />
            </Field>
            <Field label="Nama ruas jalan" required error={errors.ruas_jalan_id} hint="Pilih dari daftar atau ketik nama ruas baru">
              <RuasCombobox value={f.ruas_jalan_id} onChange={(v) => set('ruas_jalan_id', v)} invalid={!!errors.ruas_jalan_id} />
            </Field>
            <Field label="Jenis pekerjaan" required error={errors.jenis_pekerjaan}>
              <Select value={f.jenis_pekerjaan} onValueChange={(v) => set('jenis_pekerjaan', v)}>
                <SelectTrigger aria-invalid={!!errors.jenis_pekerjaan}><SelectValue placeholder="Pilih jenis pekerjaan" /></SelectTrigger>
                <SelectContent>
                  {jenisNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                  {!jenisNames.includes(LAINNYA) && <SelectItem value={LAINNYA}>{LAINNYA}</SelectItem>}
                </SelectContent>
              </Select>
            </Field>
            {f.jenis_pekerjaan === LAINNYA && (
              <Field label="Sebutkan jenis pekerjaan" htmlFor="jenis_lain" required error={errors.jenis_lain}>
                <Input id="jenis_lain" value={f.jenis_lain} onChange={(e) => set('jenis_lain', e.target.value)} aria-invalid={!!errors.jenis_lain} />
              </Field>
            )}
            <Field label="Sisi" required error={errors.sisi}>
              <SisiSelect value={f.sisi} onChange={(v) => set('sisi', v)} invalid={!!errors.sisi} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="STA awal" htmlFor="sta_awal" required error={errors.sta_awal}>
                <Input id="sta_awal" placeholder="0+100" value={f.sta_awal} onChange={(e) => set('sta_awal', e.target.value)} aria-invalid={!!errors.sta_awal} />
              </Field>
              <Field label="STA akhir" htmlFor="sta_akhir" required error={errors.sta_akhir}>
                <Input id="sta_akhir" placeholder="0+150" value={f.sta_akhir} onChange={(e) => set('sta_akhir', e.target.value)} aria-invalid={!!errors.sta_akhir} />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Panjang (m)" htmlFor="panjang" required error={errors.panjang}>
              <Input id="panjang" type="number" inputMode="decimal" min={0} step="0.01" value={f.panjang} onChange={(e) => set('panjang', e.target.value)} aria-invalid={!!errors.panjang} />
            </Field>
            <Field label="Lebar (m)" htmlFor="lebar" required error={errors.lebar}>
              <Input id="lebar" type="number" inputMode="decimal" min={0} step="0.01" value={f.lebar} onChange={(e) => set('lebar', e.target.value)} aria-invalid={!!errors.lebar} />
            </Field>
            <Field label="Tebal (cm)" htmlFor="tebal" required error={errors.tebal}>
              <Input id="tebal" type="number" inputMode="decimal" min={0} step="0.1" value={f.tebal} onChange={(e) => set('tebal', e.target.value)} aria-invalid={!!errors.tebal} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-md bg-muted p-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Luas</div>
              <div className="tabular font-semibold">{fmtNum(luas)} m²</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Volume</div>
              <div className="tabular font-semibold">{fmtNum(volume, 3)} m³</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Progres</div>
              <div className="font-semibold">{progresPreview}%</div>
            </div>
          </div>

          <Field label="Keterangan" htmlFor="keterangan">
            <Textarea id="keterangan" rows={2} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
          </Field>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Foto progres pekerjaan</h3>
              <p className="text-xs text-muted-foreground">
                Boleh lebih dari satu foto per tahap. Foto dikompres otomatis sebelum diunggah. Progres laporan mengikuti tahap foto tertinggi.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {TAHAP.map((tp: Tahap) => {
                const ex = existing.filter((e) => e.tahap_progres === tp)
                return (
                  <div key={tp} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Progres {tp}%</span>
                      <span className="text-xs text-muted-foreground">{ex.length + pending[tp].length} foto</span>
                    </div>
                    {ex.length > 0 && (
                      <ul className="grid grid-cols-3 gap-1.5">
                        {ex.map((foto) => (
                          <li key={foto.id} className="relative overflow-hidden rounded border bg-muted">
                            {urls[foto.storage_path] ? (
                              <img src={urls[foto.storage_path]} alt={foto.nama_file ?? ''} className="aspect-square w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="aspect-square" />
                            )}
                            {canDelete(role) && (
                              <button
                                type="button"
                                onClick={() => removeExisting(foto)}
                                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-1 text-white hover:bg-destructive cursor-pointer"
                                aria-label="Hapus foto tersimpan"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <FileDropzone
                      compact
                      label="Tambah foto"
                      files={pending[tp]}
                      onChange={(files) => setPending((pd) => ({ ...pd, [tp]: files }))}
                      disabled={busy}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Batal</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SisiSelect({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-invalid={invalid}><SelectValue placeholder="Pilih sisi" /></SelectTrigger>
      <SelectContent>
        {SISI.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
