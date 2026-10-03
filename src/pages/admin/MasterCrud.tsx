import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDelete } from '@/components/common/ConfirmDelete'
import { Field, checkNumber } from '@/components/common/Field'
import { supabase } from '@/lib/supabase'
import { fmtNum } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

export interface MasterField {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  required?: boolean
  options?: readonly string[]
  hint?: string
  showInTable?: boolean
}

type Row = { id: string; is_active: boolean } & Record<string, unknown>

/** CRUD generik untuk tabel master (ruas jalan, jenis pekerjaan, material, alat) */
export function MasterCrud({
  table, title, fields, queryKey, orderBy,
}: {
  table: string
  title: string
  fields: MasterField[]
  queryKey: readonly string[]
  orderBy: string
}) {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order(orderBy)
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(Object.fromEntries(fields.map((f) => [f.key, editing?.[f.key] == null ? (f.options?.[0] && f.type === 'select' ? f.options[0] : '') : String(editing[f.key])])))
    setActive(editing?.is_active ?? true)
    setErrors({})
  }, [open, editing, fields])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const er: Record<string, string | undefined> = {}
    for (const f of fields) {
      const v = form[f.key] ?? ''
      if (f.type === 'number') er[f.key] = checkNumber(v, { required: !!f.required })
      else if (f.required && !v.trim()) er[f.key] = 'Wajib diisi'
    }
    setErrors(er)
    if (Object.values(er).some(Boolean)) return
    setBusy(true)
    const payload: Record<string, unknown> = { is_active: active }
    for (const f of fields) {
      const v = (form[f.key] ?? '').trim()
      payload[f.key] = f.type === 'number' ? (v === '' ? null : Number(v)) : v || null
    }
    const { error } = editing ? await supabase.from(table).update(payload).eq('id', editing.id) : await supabase.from(table).insert(payload)
    setBusy(false)
    if (error) {
      return toast.error(error.code === '23505' ? 'Data dengan nama/kode tersebut sudah ada' : `Gagal menyimpan: ${error.message}`)
    }
    toast.success(`${title} berhasil disimpan`)
    qc.invalidateQueries({ queryKey })
    qc.invalidateQueries({ queryKey: ['material', 'stok'] })
    setOpen(false)
  }

  const columns: Column<Row>[] = [
    ...fields
      .filter((f) => f.showInTable !== false)
      .map<Column<Row>>((f) => ({
        id: f.key,
        header: f.label,
        align: f.type === 'number' ? 'right' : undefined,
        cell: (r) => (r[f.key] == null || r[f.key] === '' ? '-' : f.type === 'number' ? fmtNum(Number(r[f.key])) : String(r[f.key])),
        sortValue: (r) => (f.type === 'number' ? Number(r[f.key] ?? 0) : String(r[f.key] ?? '')),
      })),
    {
      id: 'status', header: 'Status',
      cell: (r) => (r.is_active ? <Badge variant="success">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>),
      sortValue: (r) => (r.is_active ? 1 : 0),
    },
  ]

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        getId={(r) => r.id}
        loading={isLoading}
        searchText={(r) => fields.map((f) => String(r[f.key] ?? '')).join(' ')}
        searchPlaceholder={`Cari ${title.toLowerCase()}…`}
        toolbar={<Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Plus /> Tambah {title}</Button>}
        rowActions={(r) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true) }} aria-label="Edit"><Pencil /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(r)} aria-label="Hapus"><Trash2 /></Button>
          </>
        )}
      />

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Tambah'} {title}</DialogTitle>
            <DialogDescription>Isian bertanda * wajib diisi.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} noValidate className="space-y-4">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`m-${f.key}`} required={f.required} error={errors[f.key]} hint={f.hint}>
                {f.type === 'select' ? (
                  <Select value={form[f.key] ?? ''} onValueChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}>
                    <SelectTrigger id={`m-${f.key}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`m-${f.key}`}
                    type={f.type === 'number' ? 'number' : 'text'}
                    min={f.type === 'number' ? 0 : undefined}
                    step={f.type === 'number' ? 'any' : undefined}
                    inputMode={f.type === 'number' ? 'decimal' : undefined}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    aria-invalid={!!errors[f.key]}
                  />
                )}
              </Field>
            ))}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} /> Aktif (tampil di pilihan form)
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Batal</Button>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Hapus ${title.toLowerCase()}?`}
        description={<>Data <b>{String(deleting?.[fields[0].key] ?? '')}</b> akan dihapus. Bila masih dipakai di transaksi, penghapusan ditolak — nonaktifkan saja.</>}
        onConfirm={async () => {
          const { error } = await supabase.from(table).delete().eq('id', deleting!.id)
          if (error) {
            toast.error(error.code === '23503' ? 'Tidak dapat dihapus karena masih dipakai di data transaksi. Nonaktifkan saja.' : errorMessage(error))
            return
          }
          toast.success(`${title} dihapus`)
          qc.invalidateQueries({ queryKey })
        }}
      />
    </>
  )
}
