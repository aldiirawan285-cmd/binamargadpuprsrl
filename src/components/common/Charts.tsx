import type { ReactNode } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtNum } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Palet kategorikal dengan urutan tetap — warna mengikuti entitas, bukan peringkat */
export const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`)

export interface SeriesDef {
  key: string
  label: string
  color: string
  unit?: string
}

const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-axis)', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: 'var(--chart-grid)' },
} as const

export function ChartCard({
  title, description, children, loading, empty, className, actions,
}: {
  title: string
  description?: string
  children: ReactNode
  loading?: boolean
  empty?: boolean
  className?: string
  actions?: ReactNode
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : empty ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Tidak ada data pada periode ini</div>
        ) : (
          <div className="h-64 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}

function ChartTooltip({
  active, payload, label, series, fmtLabel,
}: Partial<TooltipContentProps<number, string>> & { series: SeriesDef[]; fmtLabel?: (l: string) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label != null && <div className="mb-1 font-semibold">{fmtLabel ? fmtLabel(String(label)) : String(label)}</div>}
      <div className="space-y-0.5">
        {[...payload]
          .sort((a, b) => series.findIndex((x) => x.key === a.dataKey || x.label === a.name) - series.findIndex((x) => x.key === b.dataKey || x.label === b.name))
          .map((p) => {
          const s = series.find((x) => x.key === p.dataKey) ?? series.find((x) => x.label === p.name)
          return (
            <div key={String(p.dataKey ?? p.name)} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s?.color ?? (p.payload as { fill?: string })?.fill }} />
              <span className="text-muted-foreground">{s?.label ?? p.name}</span>
              <span className="tabular ml-auto pl-3 font-medium">
                {fmtNum(Number(p.value))}
                {s?.unit ? ` ${s.unit}` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Legenda dengan urutan tetap sesuai definisi seri (bukan urutan render Recharts) */
function SeriesLegend({ series, line }: { series: SeriesDef[]; line?: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className={line ? 'h-0.5 w-3.5 rounded' : 'h-2.5 w-2.5 rounded-sm'} style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

export function TrendLineChart({
  data, xKey, series, xFormatter,
}: {
  data: Record<string, string | number>[]
  xKey: string
  series: SeriesDef[]
  xFormatter?: (v: string) => string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormatter} minTickGap={16} />
        <YAxis {...axisProps} width={56} tickFormatter={(v) => fmtNum(v, 0)} />
        <Tooltip
          cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
          content={<ChartTooltip series={series} fmtLabel={xFormatter} />}
        />
        {series.length > 1 && <Legend content={() => <SeriesLegend series={series} line />} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="linear"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={data.length <= 31 ? { r: 3, fill: s.color, strokeWidth: 0 } : false}
            activeDot={{ r: 5, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function GroupBarChart({
  data, xKey, series, stacked, horizontal, xFormatter,
}: {
  data: Record<string, string | number>[]
  xKey: string
  series: SeriesDef[]
  stacked?: boolean
  horizontal?: boolean
  xFormatter?: (v: string) => string
}) {
  const catAxis = horizontal
    ? <YAxis type="category" dataKey={xKey} {...axisProps} width={130} tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 21) + '…' : v)} />
    : <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormatter} minTickGap={8} />
  const valAxis = horizontal
    ? <XAxis type="number" {...axisProps} tickFormatter={(v) => fmtNum(v, 0)} allowDecimals={false} />
    : <YAxis {...axisProps} width={56} tickFormatter={(v) => fmtNum(v, 0)} />
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={horizontal} horizontal={!horizontal} />
        {catAxis}
        {valAxis}
        <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip series={series} fmtLabel={xFormatter} />} />
        {series.length > 1 && <Legend content={() => <SeriesLegend series={series} />} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            stackId={stacked ? 'a' : undefined}
            stroke="var(--chart-surface)"
            strokeWidth={stacked ? 1 : 0}
            radius={stacked ? (i === series.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0) : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Donut; kategori ke-8 dst. digabung menjadi "Lainnya" */
export function DonutChart({ data, unit }: { data: { name: string; value: number }[]; unit?: string }) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const items = sorted.length > 8 ? [...sorted.slice(0, 7), { name: 'Lainnya (gabungan)', value: sorted.slice(7).reduce((s, x) => s + x.value, 0) }] : sorted
  const total = items.reduce((s, x) => s + x.value, 0)
  const series: SeriesDef[] = items.map((d, i) => ({ key: d.name, label: d.name, color: SERIES[i], unit }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={items}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={1}
          stroke="var(--chart-surface)"
          strokeWidth={2}
          cy="45%"
        >
          {items.map((d, i) => (
            <Cell key={d.name} fill={SERIES[i]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip series={series} />} />
        <Legend
          formatter={(v: string) => {
            const it = items.find((x) => x.name === v)
            const pct = it && total ? Math.round((it.value / total) * 100) : 0
            return <span className="text-xs text-foreground">{v} ({pct}%)</span>
          }}
          iconType="circle"
          iconSize={8}
          itemSorter={null}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
