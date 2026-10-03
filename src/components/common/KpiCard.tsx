import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function KpiCard({
  label, value, unit, icon: Icon, hint, loading, tone,
}: {
  label: string
  value: string
  unit?: string
  icon?: LucideIcon
  hint?: string
  loading?: boolean
  tone?: 'warn' | 'crit' | 'good'
}) {
  return (
    <Card className={cn('p-4', tone === 'crit' && 'border-crit-ink/40', tone === 'warn' && 'border-warn-ink/40')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="tabular mt-1.5 text-xl font-bold sm:text-2xl">
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

export function KpiGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6', className)}>{children}</div>
}
