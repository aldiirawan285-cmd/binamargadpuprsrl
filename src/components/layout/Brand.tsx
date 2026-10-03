import { Construction } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-400 text-slate-900">
        <Construction className="h-5 w-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-bold">Monitoring Patching Jalan</div>
          <div className="text-[11px] opacity-75">Bina Marga DPUPR Kab. Sarolangun</div>
        </div>
      )}
    </div>
  )
}
