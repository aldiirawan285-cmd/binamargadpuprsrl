import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, hasErrors, req, type Errors } from '@/components/common/Field'
import { ACCEPT_DOCS, FileDropzone } from '@/components/common/FileDropzone'
import { AttachmentList } from '@/components/common/AttachmentList'
import { useRole } from '@/contexts/AuthContext'
import { canDelete } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { today } from '@/lib/format'
import { errorMessage } from '@/lib/utils'
import { SIFAT_SURAT, STATUS_SURAT, type LampiranSurat } from '@/types/database'
import { deleteLampiran, uploadLampiran, type SuratRow } from './api'

type FS = {
  jenis: 'masuk' | 'keluar'
  nomor_surat: string
  tanggal_surat: string
  tanggal_terima_kirim: string
  pihak: string
  perihal: string
  sifat: string
  status_tindak_lanjut: string
  keterangan: string
}

const init = (jenis: 'masuk' | 'keluar', r?: SuratRow | null): FS =>
  r
    ? {
        jenis: r.jenis, nomor_surat: r.nomor_surat, tanggal_surat: r.tanggal_surat, tanggal_terima_kirim: r.tanggal_terima_kirim ?? '',
        pihak: (r.jenis === 'masuk' ? r.pengirim : r.tujuan) ?? '', perihal: r.perihal, sifat: r.sifat,
        status_tindak_lanjut: r.status_tindak_lanjut, keterangan: r.keterangan ?? '',
      }
    : {
        jenis, nomor_surat: '', tanggal_surat: today(), tanggal_terima_kirim: today(), pihak: '', perihal: '',
        sifat: 'Biasa', status_tindak_lanjut: 'Belum', keterangan: '',
      }

export function SuratForm({
  open, onOpenChange, row, jenis,
}: { open: boolean; onOpenChange: (o: boolean) => void; row?: SuratRow | null; jenis: 'masuk' | 'keluar' }) {
  const qc = useQueryClient()
  const role = useRole()
  const [f, setF] = useState<FS>(() => init(jenis, row))
  const [files, setFiles] = useState<File[]>([])
  const [existing, setExisting] = useState<LampiranSurat[]>([])
  const [errors, setErrors] = useState<Errors<keyof FS>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setF(init(jenis, row))
      setFiles([])
      setExisting(row?.lampiran_surat ?? [])
      setErrors({})
    }
  }, [open, row, jenis])

  const set = <K extends keyof FS>(k: K, v: FS[K]) => setF((s) => ({ ...s, [k]: v }))
  const masuk = f.jenis === 'masuk'

  async function submit(e: FormEvent) {
    e.preventDefault()
    const er: Errors<keyof FS> = {
      nomor_surat: req(f.nomor_surat),
      tanggal_surat: req(f.tanggal_surat),
      pihak: req(f.pihak),
      perihal: req(f.perihal),
      tanggal_terima_kirim:
        f.tanggal_terima_kirim && f.tanggal_terima_kirim < f.tanggal_surat ? 'Tidak boleh sebelum tanggal surat' : undefined,
    }
    setErrors(er)
    if (hasErrors(er)) return toast.error('Periksa kembali isian yang ditandai')
    setBusy(true)
    const payload = {
      jenis: f.jenis,
      nomor_surat: f.nomor_surat.trim(),
      tanggal_surat: f.tanggal_surat,
      tanggal_terima_kirim: f.tanggal_terima_kirim || null,
      pengirim: masuk ? f.pihak.trim() : null,
      tujuan: masuk ? null : f.pihak.trim(),
      perihal: f.perihal.trim(),
      sifat: f.sifat,
      status_tindak_lanjut: f.status_tindak_lanjut,
      keterangan: f.keterangan.trim() || null,
    }
    try {
      let id = row?.id
      if (id) {
        const { error } = await supabase.from('surat').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('surat').insert(payload).select('id').single()
        if (error) throw error
        id = data.id as string
      }
      try {
        await uploadLampiran(id!, files)
      } catch (err) {
        toast.error(`Data tersimpan, tetapi lampiran gagal diunggah: ${errorMessage(err)}`)
        await qc.invalidateQueries({ queryKey: ['surat'] })
        return
      }
      toast.success(row ? 'Surat berhasil diperbarui' : 'Surat berhasil disimpan')
      await qc.invalidateQueries({ queryKey: ['surat'] })
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
          <DialogTitle>{row ? 'Edit' : 'Tambah'} Surat {masuk ? 'Masuk' : 'Keluar'}</DialogTitle>
          <DialogDescription>Isian bertanda * wajib diisi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis surat" required>
              <Select value={f.jenis} onValueChange={(v) => set('jenis', v as FS['jenis'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">Surat Masuk</SelectItem>
                  <SelectItem value="keluar">Surat Keluar</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nomor surat" htmlFor="nomor" required error={errors.nomor_surat}>
              <Input id="nomor" value={f.nomor_surat} onChange={(e) => set('nomor_surat', e.target.value)} aria-invalid={!!errors.nomor_surat} />
            </Field>
            <Field label="Tanggal surat" htmlFor="tgl" required error={errors.tanggal_surat}>
              <Input id="tgl" type="date" value={f.tanggal_surat} onChange={(e) => set('tanggal_surat', e.target.value)} aria-invalid={!!errors.tanggal_surat} />
            </Field>
            <Field label={masuk ? 'Tanggal diterima' : 'Tanggal dikirim'} htmlFor="tgl2" error={errors.tanggal_terima_kirim}>
              <Input id="tgl2" type="date" value={f.tanggal_terima_kirim} onChange={(e) => set('tanggal_terima_kirim', e.target.value)} />
            </Field>
            <Field label={masuk ? 'Pengirim' : 'Tujuan'} htmlFor="pihak" required error={errors.pihak} className="sm:col-span-2">
              <Input id="pihak" value={f.pihak} onChange={(e) => set('pihak', e.target.value)} aria-invalid={!!errors.pihak} />
            </Field>
            <Field label="Perihal" htmlFor="perihal" required error={errors.perihal} className="sm:col-span-2">
              <Input id="perihal" value={f.perihal} onChange={(e) => set('perihal', e.target.value)} aria-invalid={!!errors.perihal} />
            </Field>
            <Field label="Sifat" required>
              <Select value={f.sifat} onValueChange={(v) => set('sifat', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SIFAT_SURAT.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status tindak lanjut" required>
              <Select value={f.status_tindak_lanjut} onValueChange={(v) => set('status_tindak_lanjut', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_SURAT.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Keterangan" htmlFor="ket">
            <Textarea id="ket" rows={2} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
          </Field>
          <Field label="Lampiran (PDF / gambar, boleh lebih dari satu)">
            <div className="space-y-2">
              {existing.length > 0 && (
                <AttachmentList
                  bucket="lampiran-surat"
                  items={existing.map((l) => ({ key: l.id, path: l.storage_path, name: l.nama_file, mime: l.mime_type, size: l.ukuran }))}
                  onDelete={
                    canDelete(role)
                      ? async (it) => {
                          if (!confirm(`Hapus lampiran "${it.name}"?`)) return
                          try {
                            await deleteLampiran({ id: it.key, storage_path: it.path })
                            setExisting((x) => x.filter((l) => l.id !== it.key))
                            qc.invalidateQueries({ queryKey: ['surat'] })
                            toast.success('Lampiran dihapus')
                          } catch (err) {
                            toast.error(errorMessage(err))
                          }
                        }
                      : undefined
                  }
                />
              )}
              <FileDropzone files={files} onChange={setFiles} accept={ACCEPT_DOCS} label="Seret file PDF / gambar ke sini atau ketuk untuk memilih" disabled={busy} />
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
