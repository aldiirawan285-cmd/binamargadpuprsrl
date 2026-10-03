import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { useRuasJalan, qk } from '@/hooks/useMaster'
import { supabase } from '@/lib/supabase'
import { cn, errorMessage } from '@/lib/utils'
import type { RuasJalan } from '@/types/database'

/** Pilih ruas jalan dari master, atau ketik nama baru untuk ditambahkan */
export function RuasCombobox({
  value, onChange, invalid, allowCreate = true, id,
}: {
  value: string
  onChange: (id: string) => void
  invalid?: boolean
  allowCreate?: boolean
  id?: string
}) {
  const { data: ruas = [] } = useRuasJalan()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = ruas.find((r) => r.id === value)

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return ruas.filter((r) => (r.is_active || r.id === value) && (!t || r.nama.toLowerCase().includes(t) || r.kode?.toLowerCase().includes(t)))
  }, [ruas, q, value])
  const exact = ruas.some((r) => r.nama.toLowerCase() === q.trim().toLowerCase())

  async function create() {
    const nama = q.trim()
    if (!nama) return
    setBusy(true)
    const { data, error } = await supabase.from('ruas_jalan').insert({ nama }).select().single()
    setBusy(false)
    if (error) return toast.error(`Gagal menambah ruas: ${errorMessage(error)}`)
    qc.setQueryData<RuasJalan[]>(qk.ruas, (old) => [...(old ?? []), data as RuasJalan].sort((a, b) => a.nama.localeCompare(b.nama)))
    toast.success(`Ruas "${nama}" ditambahkan`)
    onChange((data as RuasJalan).id)
    setQ('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer',
            invalid && 'border-destructive',
            !selected && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{selected ? selected.nama : 'Pilih atau ketik ruas jalan…'}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <Input autoFocus placeholder="Cari / ketik nama ruas baru…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (list.length === 1) { onChange(list[0].id); setOpen(false) }
              else if (allowCreate && q.trim() && !exact) void create()
            }
          }}
        />
        <ul className="max-h-60 overflow-y-auto">
          {list.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { onChange(r.id); setOpen(false); setQ('') }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent cursor-pointer"
              >
                <Check className={cn('h-4 w-4', r.id === value ? 'opacity-100' : 'opacity-0')} />
                <span className="truncate">{r.nama}</span>
                {r.kode && <span className="ml-auto text-xs text-muted-foreground">{r.kode}</span>}
              </button>
            </li>
          ))}
          {list.length === 0 && !q && <li className="px-2 py-3 text-center text-sm text-muted-foreground">Belum ada ruas jalan</li>}
        </ul>
        {allowCreate && q.trim() && !exact && (
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="mt-1 flex w-full items-center gap-2 rounded-sm border-t px-2 pt-2 pb-1 text-left text-sm font-medium text-primary hover:bg-accent cursor-pointer"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah “{q.trim()}” sebagai ruas baru
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
