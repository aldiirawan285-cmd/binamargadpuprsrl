import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, checkNumber, hasErrors, req, type Errors } from '@/components/common/Field'
import { RuasCombobox } from '@/components/common/RuasCombobox'
import { useAlat } from '@/hooks/useMaster'
import { supabase } from '@/lib/supabase'
import { fmtNum, today } from '@/lib/format'
import { errorMessage } from '@/lib/utils'
import { KONDISI_ALAT, type PemakaianAlat } from '@/types/database'

type FS = {
  tanggal: string
  alat_id: string
  kode_alat: string
  operator: string
  ruas_jalan_id: string
  hm_mulai: string
  hm_selesai: string
  bbm_liter: string
  kondisi: string
  keterangan: string
}

const init = (r?: PemakaianAlat | null): FS =>
  r
    ? {
        tanggal: r.tanggal, alat_id: r.alat_id, kode_alat: r.kode_alat ?? '', operator: r.operator, ruas_jalan_id: r.ruas_jalan_id ?? '',
        hm_mulai: String(r.hm_mulai), hm_selesai: String(r.hm_selesai), bbm_liter: String(r.bbm_liter), kondisi: r.kondisi, keterangan: r.keterangan ?? '',
      }
    : { tanggal: today(), alat_id: '', kode_alat: '', operator: '', ruas_jalan_id: '', hm_mulai: '', hm_selesai: '', bbm_liter: '', kondisi: 'Baik', keterangan: '' }

export function PemakaianForm({ open, onOpenChange, row }: { open: boolean; onOpenChange: (o: boolean) => void; row?: PemakaianAlat | null }) {
  const qc = useQueryClient()
  const { data: alat = [] } = useAlat()
  const [f, setF] = useState<FS>(() => init(row))
  const [errors, setErrors] = useState<Errors<keyof FS>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setF(init(row))
      setErrors({})
    }
  }, [open, row])

  const set = <K extends keyof FS>(k: K, v: FS[K]) => setF((s) => ({ ...s, [k]: v }))
  const jam = f.hm_mulai !== '' && f.hm_selesai !== '' ? Number(f.hm_selesai) - Number(f.hm_mulai) : null
  const bbmPerJam = jam && jam > 0 && f.bbm_liter !== '' ? Number(f.bbm_liter) / jam : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    const er: Errors<keyof FS> = {
      tanggal: req(f.tanggal),
      alat_id: req(f.alat_id),
      operator: req(f.operator),
      hm_mulai: checkNumber(f.hm_mulai),
      hm_selesai: checkNumber(f.hm_selesai),
      bbm_liter: checkNumber(f.bbm_liter),
    }
    if (!er.hm_mulai && !er.hm_selesai && Number(f.hm_selesai) < Number(f.hm_mulai)) er.hm_selesai = 'HM selesai harus ≥ HM mulai'
    setErrors(er)
    if (hasErrors(er)) return toast.error('Periksa kembali isian yang ditandai')
    setBusy(true)
    const payload = {
      tanggal: f.tanggal,
      alat_id: f.alat_id,
      kode_alat: f.kode_alat.trim() || null,
      operator: f.operator.trim(),
      ruas_jalan_id: f.ruas_jalan_id || null,
      hm_mulai: Number(f.hm_mulai),
      hm_selesai: Number(f.hm_selesai),
      bbm_liter: Number(f.bbm_liter),
      kondisi: f.kondisi,
      keterangan: f.keterangan.trim() || null,
    }
    try {
      const { error } = row
        ? await supabase.from('pemakaian_alat').update(payload).eq('id', row.id)
        : await supabase.from('pemakaian_alat').insert(payload)
      if (error) throw error
      toast.success(row ? 'Data pemakaian alat diperbarui' : 'Data pemakaian alat disimpan')
      await qc.invalidateQueries({ queryKey: ['alat'] })
      onOpenChange(false)
    } catch (err) {
      toast.error(`Gagal menyimpan: ${errorMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{row ? 'Edit' : 'Tambah'} Pemakaian Alat</DialogTitle>
          <DialogDescription>Isian bertanda * wajib diisi. Jam operasi = HM selesai − HM mulai.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal" htmlFor="tgl" required error={errors.tanggal}>
              <Input id="tgl" type="date" value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} aria-invalid={!!errors.tanggal} />
            </Field>
            <Field label="Nama alat" required error={errors.alat_id}>
              <Select
                value={f.alat_id}
                onValueChange={(v) => setF((s) => ({ ...s, alat_id: v, kode_alat: alat.find((a) => a.id === v)?.kode ?? s.kode_alat }))}
              >
                <SelectTrigger aria-invalid={!!errors.alat_id}><SelectValue placeholder="Pilih alat" /></SelectTrigger>
                <SelectContent>
                  {alat.filter((a) => a.is_active || a.id === f.alat_id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nama} — {a.kode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nomor / kode alat" htmlFor="kode" hint="Terisi otomatis dari data alat">
              <Input id="kode" value={f.kode_alat} onChange={(e) => set('kode_alat', e.target.value)} />
            </Field>
            <Field label="Operator" htmlFor="op" required error={errors.operator}>
              <Input id="op" value={f.operator} onChange={(e) => set('operator', e.target.value)} aria-invalid={!!errors.operator} />
            </Field>
            <Field label="Ruas jalan" className="sm:col-span-2">
              <RuasCombobox value={f.ruas_jalan_id} onChange={(v) => set('ruas_jalan_id', v)} />
            </Field>
            <Field label="Jam / HM mulai" htmlFor="hm1" required error={errors.hm_mulai}>
              <Input id="hm1" type="number" inputMode="decimal" min={0} step="0.1" value={f.hm_mulai} onChange={(e) => set('hm_mulai', e.target.value)} aria-invalid={!!errors.hm_mulai} />
            </Field>
            <Field label="Jam / HM selesai" htmlFor="hm2" required error={errors.hm_selesai}>
              <Input id="hm2" type="number" inputMode="decimal" min={0} step="0.1" value={f.hm_selesai} onChange={(e) => set('hm_selesai', e.target.value)} aria-invalid={!!errors.hm_selesai} />
            </Field>
            <Field label="Pemakaian BBM (liter)" htmlFor="bbm" required error={errors.bbm_liter}>
              <Input id="bbm" type="number" inputMode="decimal" min={0} step="0.1" value={f.bbm_liter} onChange={(e) => set('bbm_liter', e.target.value)} aria-invalid={!!errors.bbm_liter} />
            </Field>
            <Field label="Kondisi alat" required>
              <Select value={f.kondisi} onValueChange={(v) => set('kondisi', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KONDISI_ALAT.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-md bg-muted p-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Jam operasi</div>
              <div className={`tabular font-semibold ${jam != null && jam < 0 ? 'text-destructive' : ''}`}>{jam == null ? '-' : `${fmtNum(jam)} jam`}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">BBM per jam</div>
              <div className="tabular font-semibold">{bbmPerJam == null ? '-' : `${fmtNum(bbmPerJam)} L/jam`}</div>
            </div>
          </div>
          <Field label="Keterangan" htmlFor="ket">
            <Textarea id="ket" rows={2} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Batal</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
