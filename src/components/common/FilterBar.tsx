import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRuasJalan } from '@/hooks/useMaster'
import type { Filters } from '@/hooks/useFilters'
import { startOfMonth, today, toISODate } from '@/lib/format'

const ALL = '__all__'

export function FilterBar({
  filters, onChange, onReset, showRuas = true, children,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  onReset: () => void
  showRuas?: boolean
  children?: React.ReactNode
}) {
  const { data: ruas } = useRuasJalan()
  const preset = (dari: string, sampai = today()) => onChange({ ...filters, dari, sampai })
  const d = new Date()

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="f-dari" className="text-xs">Dari tanggal</Label>
          <Input id="f-dari" type="date" value={filters.dari} max={filters.sampai || undefined}
            onChange={(e) => onChange({ ...filters, dari: e.target.value })} className="md:w-40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-sampai" className="text-xs">Sampai tanggal</Label>
          <Input id="f-sampai" type="date" value={filters.sampai} min={filters.dari || undefined}
            onChange={(e) => onChange({ ...filters, sampai: e.target.value })} className="md:w-40" />
        </div>
        {showRuas && (
          <div className="col-span-2 space-y-1.5 md:w-64">
            <Label className="text-xs">Ruas jalan</Label>
            <Select value={filters.ruasId || ALL} onValueChange={(v) => onChange({ ...filters, ruasId: v === ALL ? '' : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua ruas jalan</SelectItem>
                {ruas?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {children}
        <div className="col-span-2 flex flex-wrap gap-2 md:ml-auto">
          <Button variant="outline" size="sm" onClick={() => preset(toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 6)))}>
            7 hari
          </Button>
          <Button variant="outline" size="sm" onClick={() => preset(startOfMonth())}>Bulan ini</Button>
          <Button variant="outline" size="sm" onClick={() => preset(`${d.getFullYear()}-01-01`)}>Tahun ini</Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw /> Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
