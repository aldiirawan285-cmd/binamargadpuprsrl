import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, checkNumber, hasErrors, req, type Errors } from '@/components/common/Field'
import { FileDropzone } from '@/components/common/FileDropzone'
import { AttachmentList } from '@/components/common/AttachmentList'
import { RuasCombobox } from '@/components/common/RuasCombobox'
import { useMaterial } from '@/hooks/useMaster'
import { useRole } from '@/contexts/AuthContext'
import { canDelete } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { fileNameFromPath, removeFiles, uploadFiles } from '@/lib/storage'
import { fmtNum, today } from '@/lib/format'
import { errorMessage } from '@/lib/utils'
import { SATUAN, type StokMaterial, type TransaksiMaterial } from '@/types/database'

type FS = {
  tanggal: string
  jenis_transaksi: 'masuk' | 'keluar'
  material_id: string
  satuan: string
  jumlah: string
  supplier: string
  ruas_jalan_id: string
  nomor_surat_jalan: string
  keterangan: string
}

const init = (r?: TransaksiMaterial | null): FS =>
  r
    ? {
        tanggal: r.tanggal, jenis_transaksi: r.jenis_transaksi, material_id: r.material_id, satuan: r.satuan, jumlah: String(r.jumlah),
        supplier: r.supplier ?? '', ruas_jalan_id: r.ruas_jalan_id ?? '', nomor_surat_jalan: r.nomor_surat_jalan ?? '', keterangan: r.keterangan ?? '',
      }
    : { tanggal: today(), jenis_transaksi: 'masuk', material_id: '', satuan: '', jumlah: '', supplier: '', ruas_jalan_id: '', nomor_surat_jalan: '', keterangan: '' }

export function TransaksiForm({
  open, onOpenChange, row, stok,
}: { open: boolean; onOpenChange: (o: boolean) => void; row?: TransaksiMaterial | null; stok: StokMaterial[] }) {
  const qc = useQueryClient()
  const role = useRole()
  const { data: materials = [] } = useMaterial()
  const [f, setF] = useState<FS>(() => init(row))
  const [files, setFiles] = useState<File[]>([])
  const [existing, setExisting] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors<keyof FS>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setF(init(row))
      setFiles([])
      setExisting(row?.foto_bukti ?? [])
      setErrors({})
    }
  }, [open, row])

  const set = <K extends keyof FS>(k: K, v: FS[K]) => setF((s) => ({ ...s, [k]: v }))
  const masuk = f.jenis_transaksi === 'masuk'
  const activeMaterials = materials.filter((m) => m.is_active || m.id === f.material_id)
  const s = stok.find((x) => x.material_id === f.material_id)
  const stokTersedia = useMemo(() => {
    if (!s || s.satuan !== f.satuan) return null
    // Saat edit transaksi keluar, kembalikan jumlah lama ke stok agar perbandingan adil
    const lama = row && row.jenis_transaksi === 'keluar' && row.material_id === f.material_id && row.satuan === s.satuan ? Number(row.jumlah) : 0
    const lamaMasuk = row && row.jenis_transaksi === 'masuk' && row.material_id === f.material_id && row.satuan === s.satuan ? Number(row.jumlah) : 0
    return Number(s.stok) + lama - lamaMasuk
  }, [s, f.satuan, f.material_id, row])
  const melebihi = !masuk && stokTersedia != null && Number(f.jumlah) > stokTersedia

  async function submit(e: FormEvent) {
    e.preventDefault()
    const er: Errors<keyof FS> = {
      tanggal: req(f.tanggal),
      material_id: req(f.material_id),
      satuan: req(f.satuan),
      jumlah: checkNumber(f.jumlah, { positive: true }),
      supplier: masuk ? req(f.supplier) : undefined,
      ruas_jalan_id: masuk ? undefined : req(f.ruas_jalan_id),
    }
    setErrors(er)
    if (hasErrors(er)) return toast.error('Periksa kembali isian yang ditandai')
    setBusy(true)
    let uploaded: string[] = []
    try {
      const id = row?.id ?? crypto.randomUUID()
      uploaded = (await uploadFiles('bukti-material', id, files)).map((u) => u.path)
      const payload = {
        tanggal: f.tanggal,
        jenis_transaksi: f.jenis_transaksi,
        material_id: f.material_id,
        satuan: f.satuan,
        jumlah: Number(f.jumlah),
        supplier: masuk ? f.supplier.trim() : null,
        ruas_jalan_id: masuk ? null : f.ruas_jalan_id,
        nomor_surat_jalan: f.nomor_surat_jalan.trim() || null,
        keterangan: f.keterangan.trim() || null,
        foto_bukti: [...existing, ...uploaded],
      }
      const { error } = row
        ? await supabase.from('transaksi_material').update(payload).eq('id', row.id)
        : await supabase.from('transaksi_material').insert({ id, ...payload })
      if (error) throw error
      toast.success(row ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil disimpan')
      await qc.invalidateQueries({ queryKey: ['material'] })
      onOpenChange(false)
    } catch (err) {
      if (uploaded.length) await removeFiles('bukti-material', uploaded).catch(() => undefined)
      toast.error(`Gagal menyimpan: ${errorMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function removeExisting(path: string) {
    if (!row || !confirm('Hapus foto bukti ini?')) return
    const next = existing.filter((p) => p !== path)
    const { error } = await supabase.from('transaksi_material').update({ foto_bukti: next }).eq('id', row.id)
    if (error) return toast.error(errorMessage(error))
    await removeFiles('bukti-material', [path]).catch(() => undefined)
    setExisting(next)
    qc.invalidateQueries({ queryKey: ['material'] })
    toast.success('Foto bukti dihapus')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{row ? 'Edit' : 'Tambah'} Transaksi Material</DialogTitle>
          <DialogDescription>Isian bertanda * wajib diisi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal" htmlFor="tgl" required error={errors.tanggal}>
              <Input id="tgl" type="date" value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} aria-invalid={!!errors.tanggal} />
            </Field>
            <Field label="Jenis transaksi" required>
              <Select value={f.jenis_transaksi} onValueChange={(v) => set('jenis_transaksi', v as FS['jenis_transaksi'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">Material Masuk</SelectItem>
                  <SelectItem value="keluar">Material Keluar</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nama material" required error={errors.material_id}>
              <Select
                value={f.material_id}
                onValueChange={(v) => setF((st) => ({ ...st, material_id: v, satuan: materials.find((m) => m.id === v)?.satuan ?? st.satuan }))}
              >
                <SelectTrigger aria-invalid={!!errors.material_id}><SelectValue placeholder="Pilih material" /></SelectTrigger>
                <SelectContent>
                  {activeMaterials.map((m) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jumlah" htmlFor="jml" required error={errors.jumlah}>
                <Input id="jml" type="number" inputMode="decimal" min={0} step="0.01" value={f.jumlah} onChange={(e) => set('jumlah', e.target.value)} aria-invalid={!!errors.jumlah} />
              </Field>
              <Field label="Satuan" required error={errors.satuan}>
                <Select value={f.satuan} onValueChange={(v) => set('satuan', v)}>
                  <SelectTrigger aria-invalid={!!errors.satuan}><SelectValue placeholder="Satuan" /></SelectTrigger>
                  <SelectContent>{SATUAN.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            {s && (
              <div className="sm:col-span-2 -mt-2 text-xs text-muted-foreground">
                Stok tersedia: <b className="tabular text-foreground">{fmtNum(stokTersedia ?? s.stok)} {s.satuan}</b>
                {s.satuan !== f.satuan && f.satuan && (
                  <span className="ml-1 text-warn-ink">· satuan berbeda dari satuan stok ({s.satuan}); transaksi ini tidak dihitung dalam stok.</span>
                )}
              </div>
            )}
            {melebihi && (
              <div className="sm:col-span-2 flex items-center gap-2 rounded-md bg-warn-soft p-2 text-xs text-warn-ink">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Jumlah keluar melebihi stok tersedia.
              </div>
            )}
            {masuk ? (
              <Field label="Sumber / supplier" htmlFor="sup" required error={errors.supplier} className="sm:col-span-2">
                <Input id="sup" value={f.supplier} onChange={(e) => set('supplier', e.target.value)} aria-invalid={!!errors.supplier} />
              </Field>
            ) : (
              <Field label="Ruas jalan tujuan" required error={errors.ruas_jalan_id} className="sm:col-span-2">
                <RuasCombobox value={f.ruas_jalan_id} onChange={(v) => set('ruas_jalan_id', v)} invalid={!!errors.ruas_jalan_id} />
              </Field>
            )}
            <Field label="Nomor surat jalan / DO" htmlFor="sj" className="sm:col-span-2">
              <Input id="sj" value={f.nomor_surat_jalan} onChange={(e) => set('nomor_surat_jalan', e.target.value)} />
            </Field>
          </div>
          <Field label="Keterangan" htmlFor="ket">
            <Textarea id="ket" rows={2} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
          </Field>
          <Field label="Foto bukti">
            <div className="space-y-2">
              {existing.length > 0 && (
                <AttachmentList
                  bucket="bukti-material"
                  thumbs
                  items={existing.map((p) => ({ key: p, path: p, name: fileNameFromPath(p) }))}
                  onDelete={canDelete(role) ? (it) => removeExisting(it.path) : undefined}
                />
              )}
              <FileDropzone files={files} onChange={setFiles} disabled={busy} compact />
            </div>
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
