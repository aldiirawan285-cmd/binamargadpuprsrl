import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtInt } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  /** Nilai untuk sorting; kolom tanpa sortValue tidak bisa diurutkan */
  sortValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'right' | 'center'
  className?: string
}

interface Props<T> {
  data: T[]
  columns: Column<T>[]
  getId: (row: T) => string
  loading?: boolean
  /** Teks yang dicari untuk tiap baris */
  searchText?: (row: T) => string
  searchPlaceholder?: string
  toolbar?: ReactNode
  rowActions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
  selectable?: boolean
  selected?: Set<string>
  onSelectedChange?: (s: Set<string>) => void
  defaultSort?: { id: string; desc: boolean }
  emptyText?: string
  /** Dipanggil saat hasil pencarian berubah (mis. untuk export / unduh sesuai pencarian) */
  onVisibleRowsChange?: (rows: T[]) => void
}

const PAGE_SIZES = [10, 25, 50, 100]

export function DataTable<T>({
  data, columns, getId, loading, searchText, searchPlaceholder = 'Cari…', toolbar, rowActions, onRowClick,
  selectable, selected, onSelectedChange, defaultSort, emptyText = 'Belum ada data', onVisibleRowsChange,
}: Props<T>) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(defaultSort ?? null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let rows = term && searchText ? data.filter((r) => searchText(r).toLowerCase().includes(term)) : data
    if (sort) {
      const col = columns.find((c) => c.id === sort.id)
      if (col?.sortValue) {
        const sv = col.sortValue
        rows = [...rows].sort((a, b) => {
          const va = sv(a)
          const vb = sv(b)
          if (va == null && vb == null) return 0
          if (va == null) return 1
          if (vb == null) return -1
          const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'id')
          return sort.desc ? -cmp : cmp
        })
      }
    }
    return rows
  }, [data, q, sort, columns, searchText])

  // Laporkan hanya bila isi/urutan baris benar-benar berubah (kolom dibuat ulang tiap render)
  const lastVisible = useRef<T[] | null>(null)
  useEffect(() => {
    const prev = lastVisible.current
    if (prev && prev.length === filtered.length && prev.every((r, i) => r === filtered[i])) return
    lastVisible.current = filtered
    onVisibleRowsChange?.(filtered)
  }, [filtered, onVisibleRowsChange])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  useEffect(() => {
    if (page > pageCount - 1) setPage(0)
  }, [page, pageCount])
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize)

  const toggleSort = (id: string) =>
    setSort((s) => (s?.id === id ? (s.desc ? null : { id, desc: true }) : { id, desc: false }))

  const sel = selected ?? new Set<string>()
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => sel.has(getId(r)))
  const someSelected = filtered.some((r) => sel.has(getId(r)))
  const toggleAll = () => {
    const next = new Set(sel)
    if (allFilteredSelected) filtered.forEach((r) => next.delete(getId(r)))
    else filtered.forEach((r) => next.add(getId(r)))
    onSelectedChange?.(next)
  }
  const toggleOne = (id: string) => {
    const next = new Set(sel)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectedChange?.(next)
  }

  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center">
        {searchText && (
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(0)
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label="Cari data"
            />
          </div>
        )}
        {toolbar && <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">{toolbar}</div>}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  aria-label="Pilih semua hasil filter"
                />
              </TableHead>
            )}
            {columns.map((c) => (
              <TableHead key={c.id} className={cn(c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                {c.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(c.id)}
                    className={cn('inline-flex items-center gap-1 hover:text-foreground cursor-pointer', c.align === 'right' && 'flex-row-reverse')}
                  >
                    {c.header}
                    {sort?.id === c.id ? (
                      sort.desc ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  c.header
                )}
              </TableHead>
            ))}
            {rowActions && <TableHead className="sticky right-0 bg-muted text-right shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]">Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={colCount}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="py-10 text-center text-muted-foreground">
                {q ? `Tidak ada data yang cocok dengan "${q}"` : emptyText}
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((r) => {
              const id = getId(r)
              return (
                <TableRow
                  key={id}
                  data-state={sel.has(id) ? 'selected' : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={sel.has(id)} onCheckedChange={() => toggleOne(id)} aria-label="Pilih baris" />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell
                      key={c.id}
                      className={cn(c.align === 'right' && 'text-right tabular', c.align === 'center' && 'text-center', c.className)}
                    >
                      {c.cell(r)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell className="sticky right-0 bg-card text-right shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">{rowActions(r)}</div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground">
          {filtered.length === 0
            ? '0 data'
            : `${fmtInt(page * pageSize + 1)}–${fmtInt(Math.min(filtered.length, (page + 1) * pageSize))} dari ${fmtInt(filtered.length)} data`}
          {selectable && sel.size > 0 && <span className="ml-2 font-medium text-foreground">· {fmtInt(sel.size)} dipilih</span>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0) }}>
            <SelectTrigger className="h-9 w-[110px]" aria-label="Baris per halaman"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>{s} / hal</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setPage(0)} disabled={page === 0} aria-label="Halaman pertama">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="Sebelumnya">
            <ChevronLeft />
          </Button>
          <span className="tabular whitespace-nowrap px-1">{page + 1} / {pageCount}</span>
          <Button variant="outline" size="icon" onClick={() => setPage((p) => p + 1)} disabled={page >= pageCount - 1} aria-label="Berikutnya">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1} aria-label="Halaman terakhir">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
